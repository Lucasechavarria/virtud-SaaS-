import { NextResponse } from 'next/server';
import { authenticateAndRequireRole } from '@/lib/auth/api-auth';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

/**
 * GET /api/saas-admin/metrics/update
 * Calcula y guarda un snapshot de las métricas SaaS del día.
 */
export async function GET(request: Request) {
    try {
        const { error: authError } = await authenticateAndRequireRole(request, ['superadmin']);
        if (authError) return authError;

        const supabase = createAdminClient();

        // 1. Calcular MRR Estimado (basado en gimnasios activos y sus planes)
        const { data: mrrData } = await supabase.from('saas_mrr_actual' as any).select('*').single();
        const mrr = (mrrData as any)?.mrr_estimado || 0;

        // 2. Contar gimnasios por estado
        const { count: activeGyms } = await supabase.from('gimnasios').select('id', { count: 'exact', head: true }).eq('estado_pago_saas', 'active');
        const { count: suspendedGyms } = await supabase.from('gimnasios').select('id', { count: 'exact', head: true }).eq('estado_pago_saas', 'suspended');

        // 3. Contar alumnos totales
        const { count: totalStudents } = await supabase.from('perfiles').select('id', { count: 'exact', head: true }).eq('rol', 'alumno');

        // 3b. Contar consumos de IA (Videos Biomecánicos procesados y Rutinas Generadas)
        const [{ count: videosCount }, { count: rutinasCount }] = await Promise.all([
            supabase.from('videos_ejercicio').select('id', { count: 'exact', head: true }).eq('estado', 'analizado'),
            supabase.from('rutinas').select('id', { count: 'exact', head: true })
        ]);

        const videosProcesados = videosCount || 0;
        const rutinasIA = rutinasCount || 0;

        // 3c. Calcular Ingresos Reales SaaS (Pagos de membresías SaaS de gimnasios aprobados este mes)
        const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
        const { data: saasPayments } = await supabase
            .from('saas_pagos_historial')
            .select('monto')
            .eq('estado', 'completado')
            .gte('creado_en', startOfMonth);
        
        const realSaaSRevenue = saasPayments?.reduce((acc, curr) => acc + Number(curr.monto), 0) || 0;
        const ingresosTotales = realSaaSRevenue > 0 ? realSaaSRevenue : mrr;

        // 3d. Calcular Gastos (Alojamiento base + Consumo de IA)
        const costoAlojamiento = 49.00; // Vercel Pro ($20) + Supabase Pro ($29)
        const costoIA = (videosProcesados * 0.05) + (rutinasIA * 0.01); // $0.05 por análisis de video, $0.01 por consulta LLM de rutinas
        const gastosTotales = costoAlojamiento + costoIA;
        const gananciaNeta = ingresosTotales - gastosTotales;

        // 4. Intentar guardar el snapshot
        const { error: upsertError } = await supabase.from('saas_metrics').upsert({
            fecha: new Date().toISOString().split('T')[0],
            mrr,
            gyms_activos: activeGyms || 0,
            gyms_suspendidos: suspendedGyms || 0,
            total_alumnos: totalStudents || 0,
            ingresos_totales_mes: ingresosTotales,
            rutinas_ia_hoy: rutinasIA,
            videos_procesados_hoy: videosProcesados
        }, { onConflict: 'fecha' });

        if (upsertError) throw upsertError;

        return NextResponse.json({
            success: true,
            metrics: {
                mrr,
                gyms_activos: activeGyms || 0,
                gyms_suspendidos: suspendedGyms || 0,
                total_alumnos: totalStudents || 0,
                videos_procesados: videosProcesados,
                rutinas_ia: rutinasIA,
                ingresos_totales_mes: ingresosTotales,
                gastos_alojamiento: costoAlojamiento,
                gastos_ia: costoIA,
                gastos_totales: gastosTotales,
                ganancia_neta: gananciaNeta
            }
        });

    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        console.error('Metrics Update Error:', error);
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
