import { NextResponse } from 'next/server';
import { authenticateAndRequireRole } from '@/lib/auth/api-auth';

/**
 * GET /api/coach/students/[id]/fatigue-index
 * 
 * Calcula el índice matemático de fatiga y riesgo de sobreentrenamiento de un alumno específico,
 * cruzando los datos subjetivos de RPE (registros_de_ejercicio) y biométricos de sueño/fatiga (registros_recuperacion)
 * correspondientes a los últimos 7 días.
 */
export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const studentId = id;

        // Blindaje contra IDs no-UUID (ej. demos o pruebas locales) para evitar 500 de Postgres
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (!uuidRegex.test(studentId)) {
            return NextResponse.json({
                success: true,
                alumnoId: studentId,
                indiceFatiga: 3.5,
                estado: 'recuperacion_optima',
                factores: {
                    rpePromedioSemanal: 5.5,
                    promedioHorasSueno: 7.5,
                    calidadSuenoPromedio: 4.0,
                    nivelEstresAcumulado: 3.0,
                    nivelFatigaAcumulado: 3.0
                },
                recomendacion: 'Datos de demostración. Estado estable. Continuar con el volumen programado.'
            });
        }

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

        const now = new Date();
        const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const sevenDaysAgoStr = sevenDaysAgo.toISOString().split('T')[0];

        // 1. Consultar registros de recuperación del alumno en los últimos 7 días
        const { data: recoveryLogs, error: recoveryError } = await supabase
            .from('registros_recuperacion')
            .select('horas_sueno, calidad_sueno, nivel_estres, nivel_fatiga, fecha')
            .eq('usuario_id', studentId)
            .gte('fecha', sevenDaysAgoStr)
            .order('fecha', { ascending: false });

        if (recoveryError) {
            throw recoveryError;
        }

        // 2. Consultar sesiones de entrenamiento de los últimos 7 días
        const { data: sessions, error: sessionsError } = await supabase
            .from('sesiones_de_entrenamiento')
            .select('id')
            .eq('usuario_id', studentId)
            .gte('creado_en', sevenDaysAgo.toISOString());

        if (sessionsError) {
            throw sessionsError;
        }

        const sessionIds = sessions?.map(s => s.id) || [];

        // 3. Consultar registros de dificultad de ejercicio (RPE)
        const { data: exerciseLogs, error: exerciseError } = sessionIds.length > 0
            ? await supabase
                .from('registros_de_ejercicio')
                .select('puntuacion_dificultad, fue_completado')
                .in('sesion_id', sessionIds)
            : { data: [], error: null };

        if (exerciseError) {
            throw exerciseError;
        }

        // 4. Computar promedios en CPU
        // A. Sueño & Recuperación subjetiva
        let sleepHrsAvg = 0;
        let sleepQualityAvg = 0;
        let stressAvg = 0;
        let fatigueAvg = 0;

        if (recoveryLogs && recoveryLogs.length > 0) {
            const count = recoveryLogs.length;
            sleepHrsAvg = recoveryLogs.reduce((acc, l) => acc + Number(l.horas_sueno || 0), 0) / count;
            sleepQualityAvg = recoveryLogs.reduce((acc, l) => acc + (l.calidad_sueno || 0), 0) / count;
            stressAvg = recoveryLogs.reduce((acc, l) => acc + (l.nivel_estres || 0), 0) / count;
            fatigueAvg = recoveryLogs.reduce((acc, l) => acc + (l.nivel_fatiga || 0), 0) / count;
        }

        // B. RPE de entrenamientos
        let rpeAvg = 0;
        const validRpeLogs = exerciseLogs?.filter(l => l.puntuacion_dificultad !== null && l.puntuacion_dificultad > 0) || [];
        if (validRpeLogs.length > 0) {
            rpeAvg = validRpeLogs.reduce((acc, l) => acc + (l.puntuacion_dificultad || 0), 0) / validRpeLogs.length;
        }

        // 5. Algoritmo de Índice de Fatiga (Escala 1.0 - 10.0)
        // RPE (40%), Sueño Penalizado (20%), Estrés Subjetivo (20%), Fatiga Subjetiva (20%)
        const rpeScore = rpeAvg || 6.0; // Fallback si no hay entrenamientos: RPE moderado
        
        // Sueño: 8 horas es ideal (penalización 0). Menos de 5 horas es pésimo (penalización 10).
        const sleepScore = sleepHrsAvg > 0 
            ? Math.max(0, Math.min(10, (8 - sleepHrsAvg) * 2.5 + (5 - sleepQualityAvg) * 1.0)) 
            : 3.0; // Fallback si no hay registros

        const stressScore = stressAvg || 4.0;
        const fatigueScore = fatigueAvg || 4.0;

        const fatigueIndex = (rpeScore * 0.4) + (sleepScore * 0.2) + (stressScore * 0.2) + (fatigueScore * 0.2);
        const finalIndex = Math.min(10, Math.max(1, Math.round(fatigueIndex * 10) / 10));

        // 6. Clasificación de Estado & Recomendación
        let estado: 'recuperacion_optima' | 'fatiga_moderada' | 'riesgo_sobreentrenamiento' = 'recuperacion_optima';
        let recomendacion = 'Estado estable. Capacidad de entrenamiento al 100%. Continuar con el volumen programado.';

        if (finalIndex >= 5.0 && finalIndex < 7.5) {
            estado = 'fatiga_moderada';
            recomendacion = 'Fatiga acumulada moderada. Se aconseja regular la intensidad de las series finales (mantener RPE < 8) y priorizar la higiene del sueño.';
        } else if (finalIndex >= 7.5) {
            estado = 'riesgo_sobreentrenamiento';
            recomendacion = 'Programar semana de descarga (deload) reduciendo cargas axiales y disminuyendo el volumen total al 50% para evitar lesiones.';
        }

        return NextResponse.json({
            success: true,
            alumnoId: studentId,
            indiceFatiga: finalIndex,
            estado,
            factores: {
                rpePromedioSemanal: Math.round(rpeScore * 10) / 10,
                promedioHorasSueno: Math.round(sleepHrsAvg * 10) / 10,
                calidadSuenoPromedio: Math.round(sleepQualityAvg * 10) / 10,
                nivelEstresAcumulado: Math.round(stressScore * 10) / 10,
                nivelFatigaAcumulado: Math.round(fatigueScore * 10) / 10
            },
            recomendacion
        });

    } catch (error) {
        const { id } = await params;
        console.error(`❌ Error GET /api/coach/students/${id}/fatigue-index:`, error);
        return NextResponse.json({
            error: error instanceof Error ? error.message : 'Error interno al calcular el índice de fatiga'
        }, { status: 500 });
    }
}