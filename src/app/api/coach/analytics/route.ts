import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import type { ClassBooking, MonthlyAttendance } from '@/types/analytics';

// ==========================================
// 1. HELPERS COMPUTACIONALES PUROS (SRP)
// ==========================================

/**
 * Parseador matemático de repeticiones de series de ejercicios.
 * Soporta de forma robusta números simples, rangos de repeticiones ("8-12") y texto como "AMRAP".
 */
export function parseRepetitions(repeticiones: string | number | undefined): number {
    if (!repeticiones) return 10; // Valor por defecto
    
    const repsStr = String(repeticiones).trim();
    
    // Caso de rango: "8-12" -> tomar el promedio
    if (repsStr.includes('-')) {
        const [min, max] = repsStr.split('-').map(r => parseInt(r.trim(), 10));
        if (!isNaN(min) && !isNaN(max)) {
            return Math.round((min + max) / 2);
        }
    } 
    
    // Caso de AMRAP o texto no numérico de entrenamiento
    if (repsStr.toLowerCase() === 'amrap' || isNaN(Number(repsStr))) {
        return 10; // Valor de esfuerzo por defecto
    }

    // Caso de número simple
    const parsedReps = parseInt(repsStr, 10);
    return !isNaN(parsedReps) && parsedReps > 0 ? parsedReps : 10;
}

/**
 * Calcula el volumen prescrito acumulado en base a ejercicios de rutinas activas
 */
function calculateRoutinesVolume(routines: any[]): number {
    if (!Array.isArray(routines)) return 0;

    return routines.reduce((totalVolume, routine) => {
        if (!routine || !Array.isArray(routine.ejercicios)) return totalVolume;

        const routineVolume = routine.ejercicios.reduce((exAcc: number, ex: any) => {
            const series = Number(ex.series);
            if (isNaN(series) || series <= 0) return exAcc;

            const reps = parseRepetitions(ex.repeticiones);
            return exAcc + (series * reps);
        }, 0);

        return totalVolume + routineVolume;
    }, 0);
}

// ==========================================
// 2. ORQUESTADOR PRINCIPAL (GET Request)
// ==========================================

export async function GET(req: Request) {
    try {
        const supabase = await createClient();
        const { searchParams } = new URL(req.url);
        const studentId = searchParams.get('studentId');
        const viewMode = searchParams.get('mode') || 'individual';

        // 1. AUTENTICACIÓN Y VERIFICACIÓN DE ROL DE COACH (Fase Síncrona de Seguridad)
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { data: profileData } = await supabase
            .from('perfiles')
            .select('rol')
            .eq('id', user.id)
            .single();

        const profile = profileData as { rol: string } | null;
        if (!profile || (profile.rol !== 'coach' && profile.rol !== 'admin')) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        // 2. PARALELIZACIÓN MASIVA DE DATOS (Promise.all - Resuelve el Waterfall de Red)
        const isIndividual = studentId && viewMode === 'individual';

        // Preparar consultas de forma diferida (lazy evaluation)
        let attendanceQuery = supabase
            .from('reservas_de_clase')
            .select('fecha, estado')
            .in('estado', ['attended', 'confirmed', 'no_show']);

        if (isIndividual) {
            attendanceQuery = attendanceQuery.eq('usuario_id', studentId);
        }

        const measurementsPromise = isIndividual
            ? supabase.from('mediciones')
                .select('*')
                .eq('user_id', studentId)
                .order('registrado_en', { ascending: true })
            : Promise.resolve({ data: [] });

        const recentRoutinesPromise = isIndividual
            ? (supabase.from('rutinas') as any)
                .select('*, ejercicios:ejercicios_rutina(series, repeticiones)')
                .eq('user_id', studentId)
                .order('creado_en', { ascending: false })
                .limit(5)
            : Promise.resolve({ data: [] });

        const activeRoutinesQuery = (supabase.from('rutinas') as any)
            .select('id, nombre, user_id, ejercicios:ejercicios_rutina(series, repeticiones)')
            .eq('esta_activa', true);

        const activeRoutinesPromise = isIndividual
            ? activeRoutinesQuery.eq('user_id', studentId)
            : activeRoutinesQuery;

        // Ejecutar paralelamente en un solo viaje de red concurrente
        const [
            bookingsResult,
            measurementsResult,
            recentRoutinesResult,
            activeRoutinesResult
        ] = await Promise.all([
            attendanceQuery,
            measurementsPromise,
            recentRoutinesPromise,
            activeRoutinesPromise
        ]);

        const bookings = bookingsResult.data || [];
        const measurementsData = measurementsResult.data || [];
        const activeRoutines = activeRoutinesResult.data || [];

        // 3. PROCESAMIENTO OPTIMIZADO EN CPU (O(N) lineal y modular)
        const bookingsData = bookings.map((b: any) => ({
            fecha: b.fecha,
            estado: b.estado
        }));

        const attendanceMetrics = processAttendance(bookingsData);
        const totalPrescribedVolume = calculateRoutinesVolume(activeRoutines);

        return NextResponse.json({
            success: true,
            metrics: {
                attendance: attendanceMetrics,
                measurements: measurementsData,
                prescribedVolume: totalPrescribedVolume,
                summary: {
                    attendanceRate: calculateAttendanceRate(bookingsData),
                    totalAttended: bookingsData.filter(b => b.estado === 'attended').length,
                }
            }
        });

    } catch (_error) {
        const err = _error as Error;
        console.error('❌ Analytics API Error:', err);
        
        // Log contextual
        const { searchParams } = new URL(req.url);
        const studentId = searchParams.get('studentId');
        
        // Degradación con gracia mediante envío opcional a Sentry
        try {
            const Sentry = require('@sentry/nextjs');
            Sentry.captureException(err, {
                extra: { studentId, mode: searchParams.get('mode') }
            });
        } catch (_) {}

        return NextResponse.json({
            error: 'Internal Server Error',
            message: err.message || 'Error al calcular analytics'
        }, { status: 500 });
    }
}

// ==========================================
// HELPERS DE PROCESAMIENTO (CPU Optimizados)
// ==========================================

function processAttendance(bookings: Pick<ClassBooking, 'fecha' | 'estado'>[]): MonthlyAttendance[] {
    const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    const currentYear = new Date().getFullYear();

    if (!Array.isArray(bookings)) {
        return months.map(m => ({ month: m, rate: 0, attended: 0, total: 0 }));
    }

    // Acumular asistencias del año en curso en un solo paso
    const result = bookings.reduce((acc: Record<string, { month: string; attended: number; total: number }>, booking) => {
        if (!booking || !booking.fecha) return acc;

        // Optimización CPU: Evitar instanciar objeto Date si el año no coincide (Substring ultra rápido)
        const bookingYear = booking.fecha.substring(0, 4);
        if (bookingYear !== String(currentYear)) return acc;

        const date = new Date(booking.fecha);
        if (isNaN(date.getTime())) return acc;

        const month = months[date.getMonth()];
        if (!acc[month]) acc[month] = { month, attended: 0, total: 0 };

        acc[month].total++;
        if (booking.estado === 'attended') {
            acc[month].attended++;
        }
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

function calculateAttendanceRate(bookings: Pick<ClassBooking, 'estado'>[]): number {
    if (!Array.isArray(bookings) || bookings.length === 0) return 0;
    
    const attended = bookings.filter(b => b && b.estado === 'attended').length;
    return Math.round((attended / bookings.length) * 100);
}
