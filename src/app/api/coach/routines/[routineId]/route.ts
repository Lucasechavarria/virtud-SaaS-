import { NextResponse } from 'next/server';
import { authenticateAndRequireRole } from '@/lib/auth/api-auth';

interface ExerciseUpdatePayload {
    id: string;
    nombre: string;
    series: number;
    repeticiones: string;
    descanso_segundos: number;
    descripcion?: string;
}

/**
 * PUT /api/coach/routines/[routineId]
 * 
 * Permite al coach modificar en tiempo real los parámetros de una rutina ya asignada
 * (tales como nombre, descripción, series, repeticiones, descansos y notas de ejercicios).
 */
export async function PUT(
    request: Request,
    { params }: { params: { routineId: string } }
) {
    try {
        const { routineId } = params;

        const { user, profile, supabase, error } = await authenticateAndRequireRole(
            request,
            ['coach', 'admin']
        );

        if (error) return error;
        if (!supabase || !user || !profile) {
            throw new Error('No se pudo inicializar la sesión o el cliente de Supabase');
        }

        const targetGymId = profile.gimnasio_id;
        if (!targetGymId) {
            return NextResponse.json({ error: 'El usuario no tiene un gimnasio asignado.' }, { status: 400 });
        }

        const body = await request.json();
        const { name, description, exercises } = body as {
            name?: string;
            description?: string;
            exercises?: ExerciseUpdatePayload[];
        };

        // 1. Validar existencia y pertenencia de la rutina
        // Para asegurar multi-tenant, podemos cruzar con perfiles para garantizar que el alumno
        // de la rutina pertenece al mismo gimnasio del coach.
        const { data: dbRoutine, error: dbRoutineError } = await supabase
            .from('rutinas')
            .select(`
                id,
                usuario_id,
                perfiles!usuario_id (
                    gimnasio_id
                )
            `)
            .eq('id', routineId)
            .single();

        if (dbRoutineError || !dbRoutine) {
            return NextResponse.json({ error: 'Rutina no encontrada o no autorizada.' }, { status: 404 });
        }

        const studentProfile = Array.isArray(dbRoutine.perfiles) 
            ? dbRoutine.perfiles[0] 
            : dbRoutine.perfiles as any;

        if (!studentProfile || studentProfile.gimnasio_id !== targetGymId) {
            return NextResponse.json({ error: 'Acceso no autorizado: Aislamiento multi-tenant activo.' }, { status: 403 });
        }

        // 2. Actualizar metadatos principales de la rutina
        const updateFields: Record<string, any> = {};
        if (name) updateFields.nombre = name;
        if (description) updateFields.descripcion = description;
        updateFields.actualizado_en = new Date().toISOString();

        const { error: routineUpdateError } = await supabase
            .from('rutinas')
            .update(updateFields)
            .eq('id', routineId);

        if (routineUpdateError) {
            throw routineUpdateError;
        }

        // 3. Actualizar los ejercicios en paralelo si se especificaron
        if (exercises && Array.isArray(exercises) && exercises.length > 0) {
            const exerciseOperations = exercises.map(async (ex) => {
                if (!ex.id) return; // Omitir si no tiene ID (no insertamos nuevos por ahora para evitar problemas de orden)

                const { error: exUpdateError } = await supabase
                    .from('ejercicios')
                    .update({
                        nombre: ex.nombre,
                        series: ex.series,
                        repeticiones: ex.repeticiones,
                        descanso_segundos: ex.descanso_segundos,
                        descripcion: ex.descripcion || null
                    })
                    .eq('id', ex.id)
                    .eq('rutina_id', routineId); // Blindaje de seguridad adicional

                if (exUpdateError) throw exUpdateError;
            });

            await Promise.all(exerciseOperations);
        }

        return NextResponse.json({
            success: true,
            message: 'Rutina y ejercicios actualizados correctamente.'
        });

    } catch (error) {
        console.error(`❌ Error PUT /api/coach/routines/${params.routineId}:`, error);
        return NextResponse.json({
            error: error instanceof Error ? error.message : 'Error interno al modificar la rutina'
        }, { status: 500 });
    }
}
