import { NextResponse } from 'next/server';
import { authenticateAndRequireRole } from '@/lib/auth/api-auth';

/**
 * PUT /api/coach/attendance/check-out
 * 
 * Registra la salida (check-out) de la jornada laboral activa del coach.
 */
export async function PUT(request: Request) {
    try {
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

        // 1. Obtener la sesión laboral activa (salida nula)
        const { data: activeSession, error: checkError } = await supabase
            .from('asistencias')
            .select('id')
            .eq('usuario_id', user.id)
            .eq('gimnasio_id', targetGymId)
            .eq('rol_asistencia', 'coach')
            .is('salida', null)
            .maybeSingle();

        if (checkError) {
            throw checkError;
        }

        if (!activeSession) {
            return NextResponse.json({ error: 'No tienes ningún turno activo abierto para el día de hoy.' }, { status: 400 });
        }

        // 2. Cerrar la jornada actualizando la columna 'salida'
        const checkOutTime = new Date().toISOString();
        const { error: updateError } = await supabase
            .from('asistencias')
            .update({
                salida: checkOutTime
            })
            .eq('id', activeSession.id);

        if (updateError) {
            throw updateError;
        }

        return NextResponse.json({
            success: true,
            message: 'Salida registrada correctamente. ¡Que tengas un excelente descanso!'
        });

    } catch (error) {
        console.error('❌ Error PUT /api/coach/attendance/check-out:', error);
        return NextResponse.json({
            error: error instanceof Error ? error.message : 'Error interno al registrar la salida del coach'
        }, { status: 500 });
    }
}
