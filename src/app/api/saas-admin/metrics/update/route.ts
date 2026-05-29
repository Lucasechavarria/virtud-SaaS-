import { NextResponse } from 'next/server';
import { authenticateAndRequireRole } from '@/lib/auth/api-auth';
import { createAdminClient } from '@/lib/supabase/admin';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

const settingsPath = path.join(process.cwd(), 'src', 'lib', 'data', 'saas_settings.json');

function getSettings() {
    try {
        if (fs.existsSync(settingsPath)) {
            const data = fs.readFileSync(settingsPath, 'utf-8');
            return JSON.parse(data);
        }
    } catch (_e) {
        // Fallback
    }
    return {
        costo_alojamiento_fijo: 49.00,
        costo_por_video_ia: 0.05,
        costo_por_rutina_ia: 0.01
    };
}

/**
 * GET /api/saas-admin/metrics/update
 * Calcula y guarda un snapshot de las métricas SaaS del día con extrema resiliencia para producción.
 */
export async function GET(request: Request) {
    try {
        const { error: authError } = await authenticateAndRequireRole(request, ['superadmin']);
        if (authError) return authError;

        const supabase = createAdminClient();

        // 1. Calcular MRR Estimado con try-catch (resiliencia por si falta la vista en producción)
        let mrr = 0;
        try {
            const { data: mrrData } = await supabase.from('saas_mrr_actual' as any).select('*').single();
            if (mrrData) {
                mrr = (mrrData as any)?.mrr_estimado || 0;
            }
        } catch (_err) {
            // Fallback a 0
        }

        // 2. Contar gimnasios por estado
        const { count: activeGyms } = await supabase.from('gimnasios').select('id', { count: 'exact', head: true }).eq('estado_pago_saas', 'active');
        const { count: suspendedGyms } = await supabase.from('gimnasios').select('id', { count: 'exact', head: true }).eq('estado_pago_saas', 'suspended');

        // 3. Contar alumnos totales
        const { count: totalStudents } = await supabase.from('perfiles').select('id', { count: 'exact', head: true }).eq('rol', 'member');

        // 3b. Contar consumos de IA (Videos Biomecánicos procesados y Rutinas Generadas) con fallbacks
        let videosProcesados = 0;
        let rutinasIA = 0;
        try {
            const [{ count: videosCount }, { count: rutinasCount }] = await Promise.all([
                supabase.from('videos_ejercicio').select('id', { count: 'exact', head: true }).eq('estado', 'analizado'),
                supabase.from('rutinas').select('id', { count: 'exact', head: true })
            ]);
            videosProcesados = videosCount || 0;
            rutinasIA = rutinasCount || 0;
        } catch (_err) {
            // Fallback a 0
        }

        // 3c. Calcular Ingresos Reales SaaS con try-catch cruzado (saas_pagos_historial vs pagos_saas)
        const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
        let realSaaSRevenue = 0;

        try {
            const { data: saasPayments, error: saasPayError } = await supabase
                .from('saas_pagos_historial' as any)
                .select('monto')
                .eq('estado', 'completado')
                .gte('creado_en', startOfMonth);
            
            if (saasPayError) throw saasPayError;
            realSaaSRevenue = (saasPayments as any)?.reduce((acc: number, curr: any) => acc + Number(curr.monto), 0) || 0;
        } catch (_err) {
            // Fallback a pagos_saas
            try {
                const { data: saasPayments2 } = await supabase
                    .from('pagos_saas' as any)
                    .select('monto_final')
                    .eq('estado', 'completado')
                    .gte('creado_en', startOfMonth);
                realSaaSRevenue = saasPayments2?.reduce((acc, curr) => acc + Number((curr as any).monto_final), 0) || 0;
            } catch (_err2) {
                // Silencioso
            }
        }
        
        const ingresosTotales = realSaaSRevenue > 0 ? realSaaSRevenue : mrr;

        // 3d. Calcular Gastos basados en los Costes Operativos Editables
        const sysSettings = getSettings();
        const costoAlojamiento = Number(sysSettings.costo_alojamiento_fijo ?? 49.00);
        const costoIA = (videosProcesados * Number(sysSettings.costo_por_video_ia ?? 0.05)) + (rutinasIA * Number(sysSettings.costo_por_rutina_ia ?? 0.01));
        const gastosTotales = costoAlojamiento + costoIA;
        const gananciaNeta = ingresosTotales - gastosTotales;

        // 4. Intentar guardar el snapshot en la base de datos (con try-catch)
        try {
            await supabase.from('saas_metrics' as any).upsert({
                fecha: new Date().toISOString().split('T')[0],
                mrr,
                gyms_activos: activeGyms || 0,
                gyms_suspendidos: suspendedGyms || 0,
                total_alumnos: totalStudents || 0,
                ingresos_totales_mes: ingresosTotales,
                rutinas_ia_hoy: rutinasIA,
                videos_procesados_hoy: videosProcesados
            }, { onConflict: 'fecha' });
        } catch (_err) {
            // No bloquea la respuesta si la tabla no existe o falla por RLS
        }

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
