import { NextResponse } from 'next/server';
import { authenticateAndRequireRole } from '@/lib/auth/api-auth';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

/**
 * GET /api/saas-admin/metrics/history
 * Retorna el historial de métricas para gráficas y el snapshot más reciente.
 */
export async function GET(request: Request) {
    try {
        const { error: authError } = await authenticateAndRequireRole(request, ['superadmin']);
        if (authError) return authError;

        const supabase = createAdminClient();

        // Obtener los últimos 30 días de métricas
        const { data: rawHistory, error: historyError } = await supabase
            .from('saas_metrics')
            .select('*')
            .order('fecha', { ascending: true })
            .limit(30);

        if (historyError) throw historyError;

        // El más reciente
        const { data: rawLatest, error: latestError } = await supabase
            .from('saas_metrics')
            .select('*')
            .order('fecha', { ascending: false })
            .limit(1)
            .single();

        if (latestError && latestError.code !== 'PGRST116') { // Ignorar si no hay datos aún
            console.error('Latest metrics error:', latestError);
        }

        // Mapear historial calculando los gastos e ingresos
        const history = (rawHistory || []).map(row => {
            const mrr = row.mrr || 0;
            const videos = row.videos_procesados_hoy || 0;
            const rutinas = row.rutinas_ia_hoy || 0;
            const ingresos = row.ingresos_totales_mes || mrr;
            
            const gastosAlojamiento = 49.00;
            const gastosIA = (videos * 0.05) + (rutinas * 0.01);
            const gastosTotales = gastosAlojamiento + gastosIA;
            const gananciaNeta = ingresos - gastosTotales;

            return {
                ...row,
                videos_procesados: videos,
                rutinas_ia: rutinas,
                ingresos_totales_mes: ingresos,
                gastos_alojamiento: gastosAlojamiento,
                gastos_ia: gastosIA,
                gastos_totales: gastosTotales,
                ganancia_neta: gananciaNeta,
                mrr: ingresos // Para compatibilidad con la gráfica de MRR
            };
        });

        // Mapear el registro más reciente
        let latest = null;
        if (rawLatest) {
            const mrr = rawLatest.mrr || 0;
            const videos = rawLatest.videos_procesados_hoy || 0;
            const rutinas = rawLatest.rutinas_ia_hoy || 0;
            const ingresos = rawLatest.ingresos_totales_mes || mrr;
            
            const gastosAlojamiento = 49.00;
            const gastosIA = (videos * 0.05) + (rutinas * 0.01);
            const gastosTotales = gastosAlojamiento + gastosIA;
            const gananciaNeta = ingresos - gastosTotales;

            latest = {
                ...rawLatest,
                videos_procesados: videos,
                rutinas_ia: rutinas,
                ingresos_totales_mes: ingresos,
                gastos_alojamiento: gastosAlojamiento,
                gastos_ia: gastosIA,
                gastos_totales: gastosTotales,
                ganancia_neta: gananciaNeta,
                mrr: ingresos
            };
        }

        return NextResponse.json({
            history,
            latest
        });

    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        console.error('Metrics History Error:', error);
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
