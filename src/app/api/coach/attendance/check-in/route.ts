import { NextResponse } from 'next/server';
import { authenticateAndRequireRole } from '@/lib/auth/api-auth';

/**
 * POST /api/coach/attendance/check-in
 * 
 * Registra el ingreso (check-in) laboral del coach a su jornada laboral en el gimnasio.
 */
export async function POST(request: Request) {
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

        // 1. Validar que el coach no tenga ya un turno abierto
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

        if (activeSession) {
            return NextResponse.json({ error: 'Ya tienes un turno activo registrado.' }, { status: 400 });
        }

        // 2. Iniciar jornada laboral insertando en la tabla 'asistencias'
        const checkInTime = new Date().toISOString();
        const { data: newSession, error: insertError } = await supabase
            .from('asistencias')
            .insert({
                usuario_id: user.id,
                gimnasio_id: targetGymId,
                rol_asistencia: 'coach',
                entrada: checkInTime,
                salida: null,
                source: 'coach_work_checkin'
            })
            .select()
            .single();

        if (insertError) {
            throw insertError;
        }

        return NextResponse.json({
            success: true,
            message: 'Entrada registrada exitosamente. ¡Que tengas una excelente jornada!',
            attendance: {
                id: newSession.id,
                check_in: newSession.entrada
            }
        });

    } catch (error) {
        console.error('❌ Error POST /api/coach/attendance/check-in:', error);
        return NextResponse.json({
            error: error instanceof Error ? error.message : 'Error interno al registrar el ingreso del coach'
        }, { status: 500 });
    }
}
