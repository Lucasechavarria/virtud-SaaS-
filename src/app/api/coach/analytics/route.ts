import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import type { ClassBooking } from '@/types/analytics';

export function parseRepetitions(repeticiones: string | number | undefined): number {
    if (!repeticiones) return 10;
    const repsStr = String(repeticiones).trim();
    if (repsStr.includes(',')) {
        const parts = repsStr.split(',').map(p => parseInt(p.trim(), 10)).filter(p => !isNaN(p));
        return parts.length > 0 ? Math.round(parts.reduce((a, b) => a + b, 0) / parts.length) : 10;
    }
    if (repsStr.includes('-')) {
        const [min, max] = repsStr.split('-').map(r => parseInt(r.trim(), 10));
        if (!isNaN(min) && !isNaN(max)) {
            return Math.round((min + max) / 2);
        }
    } 
    const parsedReps = parseInt(repsStr, 10);
    return !isNaN(parsedReps) && parsedReps > 0 ? parsedReps : 10;
}

export function parseWeights(peso: string | number | undefined): number {
    if (!peso) return 0;
    const pesoStr = String(peso).trim();
    if (pesoStr.includes(',')) {
        const parts = pesoStr.split(',').map(p => parseFloat(p.trim())).filter(p => !isNaN(p));
        return parts.length > 0 ? parts.reduce((a, b) => a + b, 0) / parts.length : 0;
    }
    const parsed = parseFloat(pesoStr);
    return !isNaN(parsed) ? parsed : 0;
}

export async function GET(req: Request) {
    try {
        const supabase = await createClient();
        const { searchParams } = new URL(req.url);
        const studentId = searchParams.get('studentId');
        const viewMode = searchParams.get('mode') || 'individual';

        // 1. AUTENTICACIÓN Y VERIFICACIÓN DE ROL
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { data: profile } = await supabase
            .from('perfiles')
            .select('rol, gimnasio_id')
            .eq('id', user.id)
            .single() as any;

        if (!profile || (profile.rol !== 'coach' && profile.rol !== 'admin')) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const targetGymId = profile.gimnasio_id;
        const isIndividual = studentId && viewMode === 'individual';

        // 2. QUERY CONSTRUCCION
        let attendanceQuery = (supabase as any)
            .from('reservas_de_clase')
            .select(`
                fecha,
                estado,
                usuario_id,
                perfiles:usuario_id (nombre_completo),
                horarios_de_clase!inner (
                    gimnasio_id,
                    actividades (tipo)
                )
            `)
            .in('estado', ['asistida', 'reservada', 'no_show']);

        let volumeQuery = (supabase as any)
            .from('sesiones_de_entrenamiento')
            .select(`
                id,
                usuario_id,
                gimnasio_id,
                hora_inicio,
                perfiles:usuario_id (nombre_completo),
                logs:registros_de_ejercicio(
                    repeticiones_reales,
                    peso_real,
                    series_reales,
                    puntuacion_dificultad,
                    ejercicio:ejercicio_id(nombre)
                )
            `)
            .eq('estado', 'completed');

        let measurementsQuery = (supabase as any)
            .from('mediciones')
            .select('*')
            .order('registrado_en', { ascending: true });

        let videosQuery = (supabase as any)
            .from('videos_ejercicio')
            .select('usuario_id, gimnasio_id, correcciones_ia')
            .eq('estado', 'analizado');

        if (profile.role !== 'superadmin' && targetGymId) {
            attendanceQuery = attendanceQuery.eq('horarios_de_clase.gimnasio_id', targetGymId);
            volumeQuery = volumeQuery.eq('gimnasio_id', targetGymId);
            measurementsQuery = measurementsQuery.eq('gimnasio_id', targetGymId);
            videosQuery = videosQuery.eq('gimnasio_id', targetGymId);
        }

        if (isIndividual) {
            attendanceQuery = attendanceQuery.eq('usuario_id', studentId);
            volumeQuery = volumeQuery.eq('usuario_id', studentId);
            measurementsQuery = measurementsQuery.eq('usuario_id', studentId);
            videosQuery = videosQuery.eq('usuario_id', studentId);
        }

        // Ejecutar promesas
        const [
            attendanceRes,
            volumeRes,
            measurementsRes,
            videosRes
        ] = await Promise.all([
            attendanceQuery,
            volumeQuery,
            measurementsQuery,
            videosQuery
        ]);

        const bookings = attendanceRes.data || [];
        const sessions = volumeRes.data || [];
        const measurements = measurementsRes.data || [];
        const videos = videosRes.data || [];

        // 3. PROCESAMIENTO DE LAS MÉTRICAS

        // 3.1 Volumen Semanal (Carga Total) y RPE
        // Agrupamos por semana de los últimos 6 meses o últimas 6 semanas
        const weeklyTonnage: Record<string, { kg: number, rpeSum: number, rpeCount: number }> = {};
        
        sessions.forEach((s: any) => {
            const date = new Date(s.hora_inicio);
            if (isNaN(date.getTime())) return;
            
            // Obtener etiqueta de semana (ej: "Sem A", "Sem B" etc o número de semana)
            const weekLabel = `Sem ${getWeekNumber(date)}`;
            if (!weeklyTonnage[weekLabel]) {
                weeklyTonnage[weekLabel] = { kg: 0, rpeSum: 0, rpeCount: 0 };
            }

            s.logs?.forEach((log: any) => {
                const reps = parseRepetitions(log.repeticiones_reales);
                const weight = parseWeights(log.peso_real);
                const sets = log.series_reales || 1;
                const volume = reps * weight * sets;

                weeklyTonnage[weekLabel].kg += volume;

                if (log.puntuacion_dificultad) {
                    weeklyTonnage[weekLabel].rpeSum += log.puntuacion_dificultad;
                    weeklyTonnage[weekLabel].rpeCount++;
                }
            });
        });

        // Ordenar y limitar a las últimas 6 semanas con volumen
        const weeks = Object.keys(weeklyTonnage).sort().slice(-6);
        const volumeData = weeks.map(w => {
            const data = weeklyTonnage[w];
            return {
                week: w,
                kg: Math.round(isIndividual ? data.kg : (data.kg / Math.max(1, new Set(sessions.map(s => s.usuario_id)).size))),
                rpe: data.rpeCount > 0 ? Math.round((data.rpeSum / data.rpeCount) * 10) / 10 : 7
            };
        });

        // Si no hay datos, rellenar con un fallback
        if (volumeData.length === 0) {
            for (let i = 1; i <= 6; i++) {
                volumeData.push({ week: `Sem ${i}`, kg: 0, rpe: 0 });
            }
        }

        // 3.2 Perfil Atleta (Radar)
        let totalFuerza = 0;
        let cardioCount = 0;
        let movilidadCount = 0;
        let potenciaCount = 0;
        let resistenciaCount = sessions.length;

        bookings.forEach((b: any) => {
            if (b.estado !== 'asistida') return;
            const classType = b.horarios_de_clase?.actividades?.tipo || '';
            if (['cardio', 'martial_arts', 'hiit', 'funcional'].includes(classType)) cardioCount++;
            if (['yoga', 'stretching', 'mobility'].includes(classType)) movilidadCount++;
            if (['powerlifting', 'crossfit', 'potencia'].includes(classType)) potenciaCount++;
        });

        // Técnica (biomechanical video scores)
        let techniqueSum = 0;
        let techniqueCount = 0;
        videos.forEach((v: any) => {
            const score = v.correcciones_ia?.puntaje_general || v.correcciones_ia?.analisis?.puntaje_tecnico;
            if (score) {
                techniqueSum += score;
                techniqueCount++;
            }
        });

        const numStudents = isIndividual ? 1 : Math.max(1, new Set(bookings.map(b => b.usuario_id)).size);
        const techniqueAvg = techniqueCount > 0 ? (techniqueSum / techniqueCount) : 70;

        // Calcular volumen total para Fuerza
        let totalVolumeAll = 0;
        sessions.forEach((s: any) => {
            s.logs?.forEach((log: any) => {
                totalVolumeAll += parseRepetitions(log.repeticiones_reales) * parseWeights(log.peso_real) * (log.series_reales || 1);
            });
        });

        const avgVolumePerStudent = totalVolumeAll / numStudents;
        // Escalar a escala radar (max 150)
        const fuerzaScore = Math.min(150, Math.round((avgVolumePerStudent / 20000) * 150));
        const cardioScore = Math.min(150, Math.round((cardioCount / numStudents) * 15));
        const movilidadScore = Math.min(150, Math.round((movilidadCount / numStudents) * 15));
        const potenciaScore = Math.min(150, Math.round((potenciaCount / numStudents) * 15));
        const resistenciaScore = Math.min(150, Math.round((resistenciaCount / numStudents) * 10));
        const tecnicaScore = Math.min(150, Math.round((techniqueAvg / 100) * 150));

        const skillsData = [
            { subject: 'Fuerza', A: fuerzaScore || 50, fullMark: 150 },
            { subject: 'Cardio', A: cardioScore || 50, fullMark: 150 },
            { subject: 'Movilidad', A: movilidadScore || 50, fullMark: 150 },
            { subject: 'Potencia', A: potenciaScore || 50, fullMark: 150 },
            { subject: 'Resistencia', A: resistenciaScore || 50, fullMark: 150 },
            { subject: 'Técnica', A: tecnicaScore || 50, fullMark: 150 }
        ];

        // 3.3 Progresión 1RM
        // Agrupar por mes
        const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
        const progressByMonth: Record<string, { squat: number, deadlift: number, bench: number }> = {};

        sessions.forEach((s: any) => {
            const date = new Date(s.hora_inicio);
            if (isNaN(date.getTime())) return;
            const monthName = months[date.getMonth()];

            if (!progressByMonth[monthName]) {
                progressByMonth[monthName] = { squat: 0, deadlift: 0, bench: 0 };
            }

            s.logs?.forEach((log: any) => {
                const name = (log.ejercicio?.nombre || '').toLowerCase();
                const reps = parseRepetitions(log.repeticiones_reales);
                const weight = parseWeights(log.peso_real);
                if (weight <= 0) return;

                // Epley Formula for 1RM
                const estimated1RM = weight * (1 + reps / 30);

                if (name.includes('squat') || name.includes('sentadilla')) {
                    progressByMonth[monthName].squat = Math.max(progressByMonth[monthName].squat, estimated1RM);
                } else if (name.includes('deadlift') || name.includes('peso muerto')) {
                    progressByMonth[monthName].deadlift = Math.max(progressByMonth[monthName].deadlift, estimated1RM);
                } else if (name.includes('bench') || name.includes('press banca') || name.includes('pecho')) {
                    progressByMonth[monthName].bench = Math.max(progressByMonth[monthName].bench, estimated1RM);
                }
            });
        });

        // Obtener los meses ordenados en los que hay registros, o últimos 6 meses por defecto
        const currentMonthIdx = new Date().getMonth();
        const last6Months = [];
        for (let i = 5; i >= 0; i--) {
            const idx = (currentMonthIdx - i + 12) % 12;
            last6Months.push(months[idx]);
        }

        const progressData = last6Months.map(m => {
            const data = progressByMonth[m] || { squat: 0, deadlift: 0, bench: 0 };
            return {
                name: m,
                squat: data.squat > 0 ? Math.round(data.squat) : 80, // fallbacks razonables si no hay datos
                deadlift: data.deadlift > 0 ? Math.round(data.deadlift) : 100,
                bench: data.bench > 0 ? Math.round(data.bench) : 60
            };
        });

        // 3.4 Rankings
        const volumeByUser: Record<string, { name: string; volume: number }> = {};
        sessions.forEach((s: any) => {
            const uId = s.usuario_id;
            const uName = s.perfiles?.nombre_completo || 'Atleta Anónimo';
            if (!volumeByUser[uId]) {
                volumeByUser[uId] = { name: uName, volume: 0 };
            }
            s.logs?.forEach((log: any) => {
                const reps = parseRepetitions(log.repeticiones_reales);
                const weight = parseWeights(log.peso_real);
                const sets = log.series_reales || 1;
                volumeByUser[uId].volume += reps * weight * sets;
            });
        });
        const topVolume = Object.values(volumeByUser)
            .sort((a, b) => b.volume - a.volume)
            .slice(0, 3)
            .map(item => ({
                name: item.name,
                volume: Math.round(item.volume / 1000)
            }));

        const streakByUser: Record<string, { name: string; count: number }> = {};
        bookings.forEach((b: any) => {
            if (b.estado !== 'asistida') return;
            const uId = b.usuario_id;
            const uName = b.perfiles?.nombre_completo || 'Atleta Anónimo';
            if (!streakByUser[uId]) {
                streakByUser[uId] = { name: uName, count: 0 };
            }
            streakByUser[uId].count++;
        });
        const topStreak = Object.values(streakByUser)
            .sort((a, b) => b.count - a.count)
            .slice(0, 3)
            .map(item => ({
                name: item.name,
                streak: item.count
            }));

        // 3.5 Summary
        const attendedBookings = bookings.filter((b: any) => b.estado === 'asistida');
        const attendanceRate = bookings.length > 0 ? Math.round((attendedBookings.length / bookings.length) * 100) : 0;

        return NextResponse.json({
            success: true,
            metrics: {
                volume: volumeData,
                skills: skillsData,
                progress: progressData,
                measurements: measurements.map((m: any) => ({
                    recorded_at: m.registrado_en,
                    weight: m.peso,
                    body_fat: m.grasa_corporal
                })),
                prescribedVolume: totalVolumeAll,
                summary: {
                    attendanceRate,
                    totalAttended: attendedBookings.length
                },
                topVolume,
                topStreak
            }
        });

    } catch (error) {
        console.error('❌ Analytics API Error:', error);
        return NextResponse.json({
            error: 'Internal Server Error',
            message: error instanceof Error ? error.message : 'Error al procesar métricas'
        }, { status: 500 });
    }
}

function getWeekNumber(d: Date): number {
    const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    const dayNum = date.getUTCDay() || 7;
    date.setUTCDate(date.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
    return Math.ceil((((date.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}
