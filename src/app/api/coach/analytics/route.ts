import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import type { ClassBooking, _Routine, _RoutineExercise, MonthlyAttendance } from '@/types/analytics';

export async function GET(req: Request) {
    try {
        const supabase = await createClient();
        const { searchParams } = new URL(req.url);
        const studentId = searchParams.get('studentId');
        const viewMode = searchParams.get('mode') || 'individual'; // individual, group

        // 1. Auth & Verify Coach
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { data: profileData } = await supabase.from('perfiles').select('rol').eq('id', user.id).single();
        const profile = profileData as { rol: string } | null;
        if (!profile || (profile.rol !== 'coach' && profile.rol !== 'admin')) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        // 2. Fetch Attendance Data
        let attendanceQuery = supabase
            .from('reservas_de_clase')
            .select('fecha, estado')
            .in('estado', ['attended', 'confirmed', 'no_show']);

        if (studentId && viewMode === 'individual') {
            attendanceQuery = attendanceQuery.eq('usuario_id', studentId);
        }

        const { data: bookings } = await attendanceQuery;

        // Convertir a tipo compatible (solo tenemos fecha y estado del query)
        const bookingsData = (bookings || []).map((b: { fecha: string; estado: string }) => ({
            fecha: b.fecha,
            estado: b.estado as any // Force cast if strict check fails or use 'as ClassBooking["estado"]'
        }));
        const attendanceMetrics = processAttendance(bookingsData as Pick<ClassBooking, 'fecha' | 'estado'>[]);

        // 3. Fetch Measurements / Physical Progress
        let measurementsData = [];
        if (studentId && viewMode === 'individual') {
            const { data } = await supabase
                .from('mediciones')
                .select('*')
                .eq('usuario_id', studentId)
                .order('registrado_en', { ascending: true });
            measurementsData = data || [];
        } else {
            // Global averages or summary if needed
        }

        // 4. Fetch Training Volume (Prescribed)
        let volumeData = [];
        const { data: upcomingClasses } = await supabase
            .from('horarios_de_clase')
            .select(`
                *,
                actividades (nombre, url_imagen),
                reservas_de_clase (count)
            `);
        let routinesQuery = supabase
            .from('rutinas')
            .select(`
                id,
                nombre,
                usuario_id,
                ejercicios (series, repeticiones)
            `)
            .eq('esta_activa', true);

        if (studentId && viewMode === 'individual') {
            routinesQuery = routinesQuery.eq('usuario_id', studentId);
        }

        const { data: routines } = await routinesQuery;

        // Cálculo de volumen con validaciones robustas
        const totalPrescribedVolume = (routines as { ejercicios: { series: number; repeticiones: string | number }[] }[])?.reduce((acc, routine) => {
            // Validar que routine tenga la estructura esperada
            if (!routine || !Array.isArray(routine.ejercicios)) {
                // console.warn('⚠️ Rutina sin ejercicios válidos:', routine?.id);
                return acc;
            }

            const routineVolume = routine.ejercicios.reduce((sAcc: number, ex: { series: number; repeticiones: string | number }) => {
                // Validar series
                if (!ex.series || ex.series <= 0) {
                    // console.warn('⚠️ Ejercicio sin series válidos:', ex);
                    return sAcc;
                }

                // Parsear repeticiones de forma segura (puede ser "10", "8-12", "AMRAP")
                let reps = 10; // Valor por defecto
                if (ex.repeticiones) {
                    const repsStr = String(ex.repeticiones);
                    // Si es un rango como "8-12", tomar el promedio
                    if (repsStr.includes('-')) {
                        const [min, max] = repsStr.split('-').map((r: string) => parseInt(r.trim()));
                        if (!isNaN(min) && !isNaN(max)) {
                            reps = Math.round((min + max) / 2);
                        }
                    } else if (repsStr.toLowerCase() !== 'amrap') {
                        // Si es un número simple
                        const parsedReps = parseInt(repsStr);
                        if (!isNaN(parsedReps) && parsedReps > 0) {
                            reps = parsedReps;
                        }
                    }
                }

                return sAcc + (ex.series * reps);
            }, 0);

            return acc + routineVolume;
        }, 0) || 0;

        console.log('📊 Analytics calculados:', {
            studentId,
            viewMode,
            totalPrescribedVolume,
            attendanceRate: calculateAttendanceRate(bookingsData)
        });

        return NextResponse.json({
            success: true,
            metrics: {
                attendance: attendanceMetrics,
                measurements: measurementsData,
                prescribedVolume: totalPrescribedVolume,
                summary: {
                    attendanceRate: calculateAttendanceRate(bookingsData as any),
                    totalAttended: bookingsData?.filter(b => b.estado === 'attended' || b.estado === 'asistida').length || 0,
                }
            }
        });

    } catch (_error) {
        const err = _error as Error;
        console.error('❌ Analytics API Error:', err);
        const errorMessage = err.message || 'Error al calcular analytics';

        // Logging mejorado para debugging
        const { searchParams } = new URL(req.url);
        console.error('Context:', {
            studentId: searchParams.get('studentId'),
            mode: searchParams.get('mode'),
            error: errorMessage
        });

        // Opcional: Integración con Sentry si está disponible
        try {
            const Sentry = require('@sentry/nextjs');
            Sentry.captureException(err, {
                extra: {
                    studentId: searchParams.get('studentId'),
                    mode: searchParams.get('mode')
                }
            });
        } catch (_sentryError) {
            // Sentry no disponible, continuar sin él
        }

        return NextResponse.json({
            error: 'Internal Server Error',
            message: errorMessage
        }, { status: 500 });
    }
}

/**
 * Procesa datos de asistencia y calcula métricas por mes
 * @param bookings - Array de bookings de clases (solo necesita fecha y estado)
 * @returns Array de métricas mensuales de asistencia
 */
function processAttendance(bookings: Pick<ClassBooking, 'fecha' | 'estado'>[]): MonthlyAttendance[] {
    const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    const currentYear = new Date().getFullYear();

    // Validación de entrada
    if (!Array.isArray(bookings)) {
        console.warn('⚠️ processAttendance recibió datos inválidos');
        return months.map(m => ({ month: m, rate: 0, attended: 0, total: 0 }));
    }

    const result = bookings.reduce((acc: Record<string, { month: string; attended: number; total: number }>, booking) => {
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

        // Solo procesar bookings del año actual
        if (date.getFullYear() !== currentYear) return acc;

        const month = months[date.getMonth()];
        if (!acc[month]) acc[month] = { month, attended: 0, total: 0 };

        acc[month].total++;
        if (booking.estado === 'attended' || booking.estado === 'asistida') acc[month].attended++;
        return acc;
    }, {});

    return months.map(m => {
        const data = result[m] || { month: m, attended: 0, total: 0 };
        return {
            month: m,
            rate: data.total > 0 ? Math.round((data.attended / data.total) * 100) : 0,
            attended: data.attended,
            total: data.total
        };
    });
}

/**
 * Calcula la tasa de asistencia general
 * @param bookings - Array de bookings de clases (solo necesita estado)
 * @returns Porcentaje de asistencia (0-100)
 */
function calculateAttendanceRate(bookings: Pick<ClassBooking, 'estado'>[]): number {
    // Validación de entrada
    if (!Array.isArray(bookings) || bookings.length === 0) {
        return 0;
    }

    const attended = bookings.filter(b => b && (b.estado === 'attended' || b.estado === 'asistida')).length;

    // Prevenir división por cero
    if (bookings.length === 0) return 0;

    return Math.round((attended / bookings.length) * 100);
}
