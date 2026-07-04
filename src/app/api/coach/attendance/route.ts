import { NextResponse } from 'next/server';
import { authenticateAndRequireRole } from '@/lib/auth/api-auth';

interface AttendanceItem {
    reserva_id: string;
    estado: 'asistida' | 'no_show' | 'reservada';
}

/**
 * GET /api/coach/attendance
 * 
 * Devuelve la sesión laboral activa del coach si se encuentra en turno.
 * Filtra en la tabla 'asistencias' por el id del coach logueado, rol 'coach' y salida nula.
 */
export async function GET(request: Request) {
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

        // Buscar sesión laboral activa del coach (salida es nula)
        const { data, error: dbError } = await supabase
            .from('asistencias')
            .select('id, entrada')
            .eq('usuario_id', user.id)
            .eq('gimnasio_id', targetGymId)
            .eq('rol_asistencia', 'coach')
            .is('salida', null)
            .order('entrada', { ascending: false })
            .limit(1)
            .maybeSingle();

        if (dbError) {
            throw dbError;
        }

        if (data) {
            return NextResponse.json({
                success: true,
                activeSession: {
                    id: data.id,
                    check_in: data.entrada
                }
            });
        }

        return NextResponse.json({
            success: true,
            activeSession: null
        });

    } catch (error) {
        console.error('❌ Error GET /api/coach/attendance:', error);
        return NextResponse.json({
            error: error instanceof Error ? error.message : 'Error interno al consultar la jornada laboral del coach'
        }, { status: 500 });
    }
}

/**
 * POST /api/coach/attendance
 * 
 * Registra la asistencia o inasistencia (no-show) de los alumnos a una clase específica.
 * Si el estado es 'asistida', inserta el registro correspondiente en la tabla 'asistencias'
 * para disparar el trigger de gamificación y racha.
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

        const body = await request.json();
        const { attendances } = body as { attendances: AttendanceItem[] };

        if (!attendances || !Array.isArray(attendances) || attendances.length === 0) {
            return NextResponse.json({ error: 'Lista de asistencias requerida y no debe estar vacía.' }, { status: 400 });
        }

        const reservaIds = attendances.map(a => a.reserva_id);

        // 1. Obtener los detalles de las reservas para validar propiedad y seguridad
        const { data: dbBookings, error: dbBookingsError } = await supabase
            .from('reservas_de_clase')
            .select('id, usuario_id, gimnasio_id, estado, fecha')
            .in('id', reservaIds)
            .eq('gimnasio_id', targetGymId);

        if (dbBookingsError) {
            throw dbBookingsError;
        }

        if (!dbBookings || dbBookings.length === 0) {
            return NextResponse.json({ error: 'Reservas no encontradas o no corresponden al gimnasio del coach.' }, { status: 404 });
        }

        const operations = attendances.map(async (item) => {
            const bookingInfo = dbBookings.find(b => b.id === item.reserva_id);
            if (!bookingInfo) return; // Saltar si no coincide con las reservas del gimnasio

            // Evitar reinserciones si ya estaba marcada como asistida en la base de datos
            const yaAsistido = bookingInfo.estado === 'asistida';

            // A. Actualizar estado de la reserva
            const { error: updateError } = await supabase
                .from('reservas_de_clase')
                .update({
                    estado: item.estado,
                    actualizado_en: new Date().toISOString()
                })
                .eq('id', item.reserva_id);

            if (updateError) throw updateError;

            // B. Registrar en asistencias para disparar racha si pasa a 'asistida' y no estaba previamente marcado
            if (item.estado === 'asistida' && !yaAsistido) {
                const { error: insertAsistenciaError } = await supabase
                    .from('asistencias')
                    .insert({
                        usuario_id: bookingInfo.usuario_id,
                        gimnasio_id: targetGymId,
                        rol_asistencia: 'member',
                        entrada: new Date().toISOString(),
                        source: 'coach_checkin'
                    });

                if (insertAsistenciaError) {
                    console.error(`Error al insertar asistencia para el alumno ${bookingInfo.usuario_id}:`, insertAsistenciaError);
                }
            }

            // C. Si se cambia de 'asistida' a otra cosa (corrección de error), borrar el registro de asistencia de hoy si existe
            if (item.estado !== 'asistida' && yaAsistido) {
                // Eliminar asistencia del mismo día
                await supabase
                    .from('asistencias')
                    .delete()
                    .eq('usuario_id', bookingInfo.usuario_id)
                    .eq('gimnasio_id', targetGymId)
                    .eq('source', 'coach_checkin')
                    .gte('entrada', `${bookingInfo.fecha}T00:00:00`)
                    .lte('entrada', `${bookingInfo.fecha}T23:59:59`);
            }
        });

        await Promise.all(operations);

        return NextResponse.json({
            success: true,
            message: 'Asistencias procesadas exitosamente.'
        });

    } catch (error) {
        console.error('❌ Error POST /api/coach/attendance:', error);
        return NextResponse.json({
            error: error instanceof Error ? error.message : 'Error interno al guardar las asistencias'
        }, { status: 500 });
    }
}

/**
 * PATCH /api/coach/attendance
 * 
 * Registra una justificación de falta laboral para el coach.
 */
export async function PATCH(request: Request) {
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

        const body = await request.json();
        const { reason } = body as { reason: string };

        if (!reason) {
            return NextResponse.json({ error: 'El motivo de la falta es requerido.' }, { status: 400 });
        }

        // Insertar registro de ausencia justificada en la tabla 'asistencias'
        const { data, error: insertError } = await supabase
            .from('asistencias')
            .insert({
                usuario_id: user.id,
                gimnasio_id: targetGymId,
                rol_asistencia: 'coach',
                entrada: new Date().toISOString(),
                salida: new Date().toISOString(),
                source: `absence: ${reason}`
            })
            .select()
            .single();

        if (insertError) {
            throw insertError;
        }

        return NextResponse.json({
            success: true,
            message: 'Ausencia justificada registrada correctamente.',
            absenceRecord: data
        });

    } catch (error) {
        console.error('❌ Error PATCH /api/coach/attendance:', error);
        return NextResponse.json({
            error: error instanceof Error ? error.message : 'Error interno al reportar falta justificada del coach'
        }, { status: 500 });
    }
}
