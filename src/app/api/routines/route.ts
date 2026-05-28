import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

/**
 * @swagger
 * /api/routines:
 *   post:
 *     summary: Crea una nueva rutina de entrenamiento
 *     description: Permite a un entrenador crear una rutina para un alumno, incluyendo ejercicios, series y repeticiones.
 *     tags:
 *       - Rutinas
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - studentId
 *               - name
 *               - exercises
 *             properties:
 *               studentId:
 *                 type: string
 *                 description: ID del alumno
 *               name:
 *                 type: string
 *                 description: Nombre de la rutina
 *               goal:
 *                 type: string
 *               duration:
 *                 type: integer
 *                 description: Duración en semanas
 *               description:
 *                 type: string
 *               exercises:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     name:
 *                       type: string
 *                     sets:
 *                       type: string
 *                     reps:
 *                       type: string
 *     responses:
 *       200:
 *         description: Rutina creada exitosamente
 *       400:
 *         description: Faltan campos requeridos
 *       401:
 *         description: No autorizado
 *       500:
 *         description: Error interno del servidor
 */
export async function POST(req: Request) {
    try {
        const supabase = await createClient();

        // 1. Get Current User (Coach)
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        const {
            studentId,
            name,
            goal,
            duration,
            exercises, // Array of exercises from the generator
            description,
            nutritionPlanId
        } = body;

        if (!studentId || !name || !exercises || exercises.length === 0) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // 2. Create Routine
        const { data: routine, error: routineError } = await supabase
            .from('rutinas')
            .insert({
                usuario_id: studentId, // Assigned to student
                entrenador_id: user.id, // Created by current coach
                nombre: name,
                objetivo: goal,
                descripcion: description,
                duracion_semanas: parseInt(duration) || 4,
                esta_activa: true, // Set as active by default
                generada_por_ia: body.generatedByAI || false,
                plan_nutricional_id: nutritionPlanId || null
            })
            .select()
            .single();

        if (routineError) {
            console.error('Error creating routine:', routineError);
            throw routineError;
        }

        // 3. Prepare Exercises Data
        // The structure from RoutineGenerator might differ slightly from DB.
        // We need to map it carefully.
        // Accessing the exercises array properly.

        const exercisesToInsert = exercises.map((ex: Record<string, any>, index: number) => ({
            rutina_id: routine.id,
            nombre: ex.name || ex.exercise, // Handle different naming conventions
            descripcion: ex.notes,
            series: parseInt(ex.sets) || 3,
            repeticiones: ex.reps?.toString() || '10',
            descanso_segundos: parseInt(ex.rest) || 60,
            grupo_muscular: ex.muscle_group || null,
            equipamiento: ex.equipment ? [ex.equipment] : [],
            dia_numero: ex.day_number || 1, // Default to day 1 if not specified
            orden_en_dia: index + 1
        }));

        // 4. Insert Exercises (Con select para obtener los IDs autogenerados)
        const { data: insertedExercises, error: exercisesError } = await supabase
            .from('ejercicios')
            .insert(exercisesToInsert)
            .select();

        if (exercisesError) {
            console.error('Error inserting exercises:', exercisesError);
            throw exercisesError;
        }

        // 5. Normalización Gradual (Dual-Write en tabla intermedia ejercicios_equipamiento)
        if (insertedExercises && insertedExercises.length > 0) {
            try {
                for (const ex of insertedExercises) {
                    if (ex.equipamiento && ex.equipamiento.length > 0) {
                        for (const eqNombre of ex.equipamiento) {
                            const { data: eqItem } = await supabase
                                .from('equipamiento')
                                .select('id')
                                .ilike('nombre', `%${eqNombre}%`)
                                .limit(1)
                                .maybeSingle();

                            if (eqItem) {
                                await supabase
                                    .from('ejercicios_equipamiento')
                                    .insert({
                                        ejercicio_id: ex.id,
                                        equipamiento_id: eqItem.id,
                                        es_opcional: false
                                    });
                            }
                        }
                    }
                }
            } catch (err) {
                // Fail-Safe: Si la inserción en la tabla intermedia falla, no bloqueamos la creación de la rutina
                console.error('[Routine API - Normalization Fallback] Error populating ejercicios_equipamiento:', err);
            }
        }

        return NextResponse.json({ success: true, routineId: routine.id });

    } catch (error) {
        console.error('Routine API Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
