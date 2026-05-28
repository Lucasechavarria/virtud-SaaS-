import { NextResponse } from 'next/server';
import * as Sentry from "@sentry/nextjs";
import { aiService } from '@/services/ai.service';
import { RoutineAIResponse } from '@/lib/config/gemini';
import { authenticateAndRequireRole } from '@/lib/auth/api-auth';
import { userGoalsService } from '@/services/user-goals.service';
import { gymEquipmentService } from '@/services/gym-equipment.service';
import { embed } from 'ai';
import { google } from '@ai-sdk/google';

/**
 * POST /api/ai/generate-routine
 * 
 * Genera una rutina de entrenamiento personalizada completa usando Google Gemini AI.
 * Integra información médica, objetivos, inventario del gimnasio y genera plan nutricional.
 * 
 * @route POST /api/ai/generate-routine
 * @access Protected (requiere autenticación y rol coach/admin)
 */
export async function POST(request: Request) {
    try {
        // Verificar autenticación y rol (Estudiantes pueden solicitar, Coaches/Admins pueden generar directamente)
        const { user, profile, supabase, error } = await authenticateAndRequireRole(
            request,
            ['member', 'coach', 'admin']
        );

        if (error) return error;

        // Verificar API key de Gemini
        if (!process.env.GEMINI_API_KEY) {
            return NextResponse.json({
                error: 'Server missing GEMINI_API_KEY'
            }, { status: 500 });
        }

        // Parsear y validar body
        const { studentId, goalId, goal, coachNotes, includeNutrition = true, templateKey } = await request.json();

        // --- CONTROL DE CUOTAS IA (Q3 Goal A) ---
        if (profile?.gimnasio_id) {
            const { consumeAIQuota } = await import('@/lib/ai/quota-gate');
            const quotaCheck = await consumeAIQuota(
                profile.gimnasio_id,
                user.id,
                'routine'
            );

            if (!quotaCheck.allowed) {
                return NextResponse.json({
                    error: quotaCheck.error || 'Cuota de IA insuficiente'
                }, { status: 403 });
            }
        }
        // ----------------------------------------

        // Acepta tanto goal (string) como goalId (database ID) para flexibilidad
        if (!studentId || (!goalId && !goal)) {
            return NextResponse.json({
                error: 'Missing required fields: studentId and (goalId or goal)'
            }, { status: 400 });
        }

        let userGoal;
        let goalText = '';

        // Si se proporciona goalId, buscar en BD
        if (goalId) {
            userGoal = await userGoalsService.getById(goalId);

            if (!userGoal || userGoal.user_id !== studentId) {
                return NextResponse.json({
                    error: 'Goal not found or does not belong to student'
                }, { status: 404 });
            }
            goalText = userGoal.primary_goal;
        } else {
            // Modo demo: usar goal string directamente
            goalText = goal;
            userGoal = {
                primary_goal: goal,
                training_frequency_per_week: 4,
                time_per_session_minutes: 60,
                duration_weeks: 8,
                coach_notes: coachNotes || '',
            };
        }

        // 1. Obtener información completa del alumno
        const { data: studentProfile, error: profileError } = await supabase
            .from('perfiles')
            .select('*')
            .eq('id', studentId)
            .single();

        if (profileError || !studentProfile) {
            return NextResponse.json({
                error: 'Student not found'
            }, { status: 404 });
        }

        // 3. Obtener inventario del gimnasio disponible
        const gymEquipment = await gymEquipmentService.getAvailable();


        // 4. RAG: Búsqueda Semántica de Rutinas Existentes (Memoria a Largo Plazo)
        let historicContext = '';
        try {
            const embedTextContext = `Objetivo: ${goalText}`;
            const { embedding } = await embed({
                model: google.textEmbeddingModel('text-embedding-004'),
                value: embedTextContext
            });
            
            const { data: matchedRoutines } = await supabase.rpc('match_rutinas', {
                query_embedding: `[${embedding.join(',')}]`,
                match_threshold: 0.7,
                match_count: 3,
                p_usuario_id: studentId
            });
            
            if (matchedRoutines && matchedRoutines.length > 0) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                historicContext = matchedRoutines.map((r: any) => `- ${r.nombre} (Similitud: ${Math.round(r.similarity*100)}%)`).join('\n');
            }
        } catch (ragError) {
            console.warn('RAG Retrieval failed, falling back to clean generation:', ragError);
        }

        // 5. Generar prompt y llamar a Gemini usando el servicio unificado
        const prompt = aiService.buildPrompt({
            studentProfile,
            userGoal,
            gymEquipment,
            coachNotes,
            includeNutrition,
            templateKey,
            historicContext
        });

        const aiResponse = await aiService.generateRoutineFromPrompt(prompt) as RoutineAIResponse;

        // --- MIDDLEWARE DE SEGURIDAD MÉDICA (Fase 8) ---
        // Validamos el plan generado por Gemini Pro mediante una instancia de Gemini Flash.
        const safetyCheck = await aiService.validatePlanSafety(aiResponse, studentProfile.informacion_medica);
        
        if (!safetyCheck.safe) {
            return NextResponse.json({
                error: 'Seguridad Médica Comprometida',
                message: safetyCheck.warning || 'La IA detectó ejercicios contraindicados para tu ficha médica.'
            }, { status: 422 });
        }
        // -----------------------------------------------

        // Mapear metadatos de la nueva estructura
        const metadata = aiResponse.rutina_metadata;
        const routineName = metadata.objetivo_principal || goalText || 'Rutina Personalizada';

        // 6. Generar Embedding Computacional (Vector) de la rutina completa usando text-embedding-004
        let rutinaEmbedding: number[] | null = null;
        try {
            const embedTextContext = `Objetivo: ${goalText}. Tipo Rutina: ${routineName}. Notas médicas: ${aiResponse.aviso_legal?.mensaje_profesor || ''}. Días: ${aiResponse.rutina.length}`;
            const { embedding } = await embed({
                model: google.textEmbeddingModel('text-embedding-004'),
                value: embedTextContext
            });
            rutinaEmbedding = embedding;
        } catch (embedError) {
            console.warn('Silent fail for embedding generation. Proceeding without vectors:', embedError);
        }

        const { data: routine, error: routineError } = await supabase
            .from('rutinas')
            .insert({
                usuario_id: studentId,
                entrenador_id: profile.role === 'member' ? null : user.id,
                objetivo_usuario_id: goalId || null,
                nombre: routineName,
                objetivo: goalText, // Mapped to 'objetivo'
                duracion_semanas: 4, // Default
                generada_por_ia: true,
                prompt_ia: prompt,
                embedding: rutinaEmbedding ? `[${rutinaEmbedding.join(',')}]` : null, // pgvector sintax array
                estado: profile.role === 'member' ? 'pendiente_aprobacion' : 'aprobada', // Enum match? check schema enums or string
                consideraciones_medicas: aiResponse.aviso_legal?.mensaje_profesor || '',
                equipamiento_usado: gymEquipment.map(eq => eq.id),
                esta_activa: profile.role === 'member' ? false : true,
                // description: JSON.stringify({...}) // Check if 'descripcion' exists in schema? 'rutinas' schema had 'descripcion'? No, specific view didn't show 'descripcion'. 
                // Wait! Line 1467 says 'descripcion: string | null' in 'logros'? No, 'rutinas' lines 118-180?
                // Let's re-read 'rutinas' from lines 1400-1427 (from Step 5320 output).
                // Row: nombre, objetivo, plan_nutricional_id, ultima_vista_en, user_goal_id, usuario_id.
                // NO 'descripcion' in Row!
                // But previously `files` view (Step 5320) showed Row keys.
                // It showed: nombre, objetivo, plan_nutricional_id, ultima_vista_en, user_goal_id, usuario_id.
                // AND: ai_prompt, aprobado_por, cantidad_vistas, consideraciones_medicas, created_at, duracion_semanas, entrenador_id, equipamiento_usado, esta_activa, estado, fecha_aprobacion, generado_por_ia, id.
                // Total keys: nombre, objetivo, plan_nutricional_id, ... 
                // There is NO 'descripcion' or 'description' in 'rutinas' table definition!
                // So I must remove 'description'.
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
            } as any)
            .select()
            .single();

        if (routineError) throw routineError;

        // 8. Guardar ejercicios (Aplanando la estructura de bloques)
        const exercises = [];
        let globalOrder = 1;

        for (const diaData of aiResponse.rutina || []) {
            const dayNumber = diaData.dia;

            for (const bloque of diaData.bloques || []) {
                for (const exercise of bloque.ejercicios || []) {
                    exercises.push({
                        rutina_id: routine.id,
                        nombre: exercise.nombre,
                        instrucciones: `${exercise.indicaciones_tecnicas}. Tempo: ${exercise.tempo}. Alternativa: ${exercise.alternativa_sin_equipo}. Bloque: ${bloque.nombre}. Puntaje: ${exercise.puntaje_base}. Alertas: ${exercise.alertas_medicas || ''}`,
                        grupo_muscular: diaData.grupo_muscular,
                        equipamiento: exercise.equipamiento ? [exercise.equipamiento] : [],
                        series: exercise.series,
                        repeticiones: String(exercise.repeticiones),
                        descanso_segundos: exercise.descanso_segundos || bloque.tiempo_recomendado_segundos || 0,
                        dia_numero: dayNumber,
                        orden_en_dia: globalOrder++,
                        // removed name, description, routine_id, muscle_group, equipment, sets, reps, rest_seconds, day_number, order_in_day
                    });
                }
            }
        }

        if (exercises.length > 0) {
            const { error: exercisesError } = await supabase
                .from('ejercicios')
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                .insert(exercises as any);

            if (exercisesError) throw exercisesError;
        }

        // 9. Guardar plan nutricional si se solicitó
        let nutritionPlan = null;
        if (includeNutrition && aiResponse.plan_nutricional) {
            const { data: nutrition, error: nutritionError } = await supabase
                .from('planes_nutricionales')
                .insert({
                    usuario_id: studentId,
                    entrenador_id: profile.role === 'member' ? null : user.id,
                    rutina_id: routine.id,
                    calorias_diarias: aiResponse.plan_nutricional.calorias_diarias,
                    gramos_proteina: aiResponse.plan_nutricional.macros.proteinas_gramos,
                    gramos_carbohidratos: aiResponse.plan_nutricional.macros.carbohidratos_gramos,
                    gramos_grasas: aiResponse.plan_nutricional.macros.grasas_gramos,
                    comidas: aiResponse.plan_nutricional.comidas,
                    suplementos: [], // Not returned by AI currently
                    esta_activo: true
                })
                .select()
                .single();

            if (nutritionError) throw nutritionError;

            nutritionPlan = nutrition;

            // Vincular plan nutricional con rutina
            await supabase
                .from('rutinas')
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                .update({ plan_nutricional_id: nutrition.id } as any)
                .eq('id', routine.id);
        }

        return NextResponse.json({
            success: true,
            routine: {
                ...routine,
                exercises: exercises, // Devolver ejercicios para previsualización
                exerciseCount: exercises.length,
            },
            rawAI: aiResponse, // Devolver respuesta completa para lógica interactiva en frontend
            nutritionPlan,
            message: 'Rutina generada exitosamente. Pendiente de aprobación del coach.'
        });

    } catch (error) {
        console.error('AI Generation Error:', error);

        // Capture specific error details for Sentry
        const errorMessage = error instanceof Error ? error.message : 'Error generating routine';
        const errorStack = error instanceof Error ? error.stack : undefined;

        // Ya no intentamos parsear el request aquí para evitar crashes secundarios
        Sentry.captureException(error, {
            extra: {
                errorMessage,
                errorStack,
                context: 'AI Routine Generation'
            }
        });

        return NextResponse.json({
            success: false,
            error: errorMessage
        }, { status: 500 });
    }
}
