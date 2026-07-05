import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import type { ClassBooking } from '@/types/analytics';

/**
 * @swagger
 * /api/student/dashboard:
 *   get:
 *     summary: Obtiene el resumen del dashboard del estudiante
 *     description: Retorna mediciones recientes, asistencia, rutina activa y estado del perfil.
 *     tags:
 *       - Estudiantes
 *     responses:
 *       200:
 *         description: Datos del dashboard obtenidos exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 measurements:
 *                   type: array
 *                   description: Últimas 10 mediciones corporales
 *                 bookings:
 *                   type: array
 *                   description: Asistencias recientes confirmadas
 *                 activeRoutine:
 *                   type: object
 *                   description: Rutina activa actual con sus ejercicios
 *                 profile:
 *                   type: object
 *                   description: Estado del perfil del usuario (membresía, exención, etc.)
 *       401:
 *         description: No autorizado (Usuario no logueado)
 *       500:
 *         description: Error interno del servidor
 */
export async function GET() {
    try {
        const supabase = await createClient();

        // 1. Get Current User
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // 2-6. Fetch All Data in Parallel
        const [
            { data: measurements },
            { data: bookings },
            { data: activeRoutine },
            { data: profile },
            { data: sessionLogs }
        ] = await Promise.all([
            // Progress
            (supabase as any)
                .from('mediciones')
                .select('id, peso, grasa_corporal, musculo_esqueletico, registrado_en')
                .eq('usuario_id', user.id)
                .order('registrado_en', { ascending: true })
                .limit(10),

            // Attendance
            (supabase as any)
                .from('reservas_de_clase')
                .select('fecha')
                .eq('usuario_id', user.id)
                .eq('estado', 'asistida')
                .gte('fecha', new Date(new Date().setMonth(new Date().getMonth() - 6)).toISOString().split('T')[0]),

            // Active Routine
            (supabase as any)
                .from('rutinas')
                .select('*')
                .eq('usuario_id', user.id)
                .eq('esta_activa', true)
                .maybeSingle(),

            // Profile
            (supabase as any)
                .from('perfiles')
                .select('exencion_aceptada, nombre_completo, url_avatar, fecha_fin_membresia, estado_membresia, gender, informacion_medica, gimnasios(nombre)')
                .eq('id', user.id)
                .single(),

            // Volume
            (supabase as any)
                .from('sesiones_de_entrenamiento')
                .select(`
                    id,
                    hora_inicio,
                    logs:registros_de_ejercicio(
                        repeticiones_reales,
                        peso_real,
                        series_reales
                    )
                `)
                .eq('usuario_id', user.id)
                .eq('estado', 'completed')
                .order('hora_inicio', { ascending: true })
                .limit(20)
        ]);


        // Process Attendance Data for Chart
        const bookingsData: Pick<ClassBooking, 'fecha'>[] = bookings || [];
        const attendanceByMonth = processAttendance(bookingsData);

        // Process Volume Data for Chart
        const volumeByWeek = processVolume(sessionLogs || []);

        return NextResponse.json({
            progress: measurements || [],
            attendance: attendanceByMonth,
            routine: activeRoutine || null,
            volume: volumeByWeek,
            profile: profile ? {
                ...profile,
                exencion_aceptada: profile.exencion_aceptada || false
            } : null
        });

    } catch (error) {
        console.error('❌ Dashboard API Error:', error);
        const errorMessage = error instanceof Error ? error.message : 'Error al cargar dashboard';
        return NextResponse.json({
            error: 'Internal Server Error',
            message: errorMessage
        }, { status: 500 });
    }
}

/**
 * Procesa datos de asistencia y agrupa por mes
 * @param bookings - Array de bookings (solo necesita fecha)
 * @returns Array con conteo de asistencias por mes
 */
function processAttendance(bookings: Pick<ClassBooking, 'fecha'>[]): Array<{ month: string; count: number }> {
    const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

    // Validación de entrada
    if (!Array.isArray(bookings)) {
        console.warn('⚠️ processAttendance recibió datos inválidos');
        return months.map(m => ({ month: m, count: 0 }));
    }

    const result = bookings.reduce((acc: Record<string, number>, booking) => {
        // Validar estructura del booking
        if (!booking || !booking.fecha) {
            console.warn('⚠️ Booking sin fecha:', booking);
            return acc;
        }

        const date = new Date(booking.fecha);

        // Validar fecha válida
        if (isNaN(date.getTime())) {
            console.warn('⚠️ Fecha inválida en booking:', booking.fecha);
            return acc;
        }

        const month = months[date.getMonth()];
        if (!acc[month]) acc[month] = 0;
        acc[month]++;
        return acc;
    }, {});

    return months.map(m => ({ month: m, count: result[m] || 0 }));
}

interface WorkoutSessionLog {
    id: string;
    hora_inicio: string;
    logs: Array<{
        repeticiones_reales: string;
        peso_real: number | string;
        series_reales: number;
    }>;
}

/**
 * Calcula el tonelaje total (volumen) por sesión
 */
function processVolume(sessions: WorkoutSessionLog[]): Array<{ week: string; volume: number; fecha: string }> {
    return sessions.map(session => {
        let totalVolume = 0;
        session.logs?.forEach((log) => {
            const reps = parseInt(log.repeticiones_reales) || 0;
            const weight = typeof log.peso_real === 'string' ? parseFloat(log.peso_real) : log.peso_real || 0;
            const sets = log.series_reales || 1;
            totalVolume += (reps * weight * sets);
        });

        return {
            week: new Date(session.hora_inicio).toLocaleDateString(undefined, { day: '2-digit', month: '2-digit' }),
            volume: Math.round(totalVolume),
            fecha: session.hora_inicio
        };
    });
}
