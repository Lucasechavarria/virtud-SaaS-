import { NextResponse } from 'next/server';
import { authenticateAndRequireRole } from '@/lib/auth/api-auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { logger } from '@/lib/logger';
import { revalidateTag } from 'next/cache';

export async function POST(request: Request) {
    try {
        const { error: authError } = await authenticateAndRequireRole(request, ['superadmin']);
        if (authError) return authError;

        const {
            id,
            nombre,
            slug,
            es_activo,
            logo_url,
            color_primario,
            plan_id,
            estado_pago_saas,
            config_visual,
            modulos_activos,
            configuracion
        } = await request.json();

        if (!id) {
            return NextResponse.json({ error: 'ID de gimnasio requerido' }, { status: 400 });
        }

        const supabase = createAdminClient();

        // 1. Validar si el Super Admin ajustó manualmente el saldo de AI Wallet
        let prevSaldo = 0;
        try {
            const { data: oldGym } = await supabase
                .from('gimnasios')
                .select('configuracion')
                .eq('id', id)
                .is('deleted_at', null)
                .single();
            if (oldGym) {
                const oldConfig = oldGym.configuracion as any;
                prevSaldo = Number(oldConfig?.saldo_creditos ?? 0.0);
            }
        } catch (_err) {
            // Silencioso: Fallback si el gimnasio no existe o error en base de datos
        }

        const newConfig = (configuracion || {}) as Record<string, any>;
        const newSaldo = Number(newConfig.saldo_creditos ?? 0.0);
        const diff = newSaldo - prevSaldo;

        if (Math.abs(diff) >= 0.01) {
            if (!newConfig.historial_recargas) newConfig.historial_recargas = [];
            newConfig.historial_recargas.push({
                fecha: new Date().toISOString(),
                monto: diff,
                metodo: diff > 0 
                    ? 'Ajuste manual del Super Admin (Abono)' 
                    : 'Ajuste manual del Super Admin (Débito)'
            });
        }

        // 1b. Sincronizar alertas del monedero en caliente según el saldo actual y umbral (SSOT)
        const threshold = Number(newConfig.limite_alerta_saldo ?? 10.0);
        const modeloFacturacion = newConfig.modelo_facturacion || 'membresia';
        const metodoCobro = newConfig.metodo_cobro_excedentes || 'postpago';

        if ((modeloFacturacion === 'consumo' || modeloFacturacion === 'hibrido') && metodoCobro === 'prepago') {
            if (newSaldo < threshold) {
                const alertas = newConfig.alertas_sistema || [];
                const tieneAlerta = alertas.some((a: any) => a.tipo === 'saldo_bajo' && a.activo !== false);
                if (!tieneAlerta) {
                    newConfig.alertas_sistema = [
                        ...alertas,
                        {
                            id: Math.random().toString(36).substring(2, 11),
                            tipo: 'saldo_bajo',
                            prioridad: 'alta',
                            mensaje: `¡Alerta de AI Wallet! Tu saldo prepago de créditos de IA ($${newSaldo.toFixed(2)} USD) es menor al límite configurado de $${threshold.toFixed(2)} USD.`,
                            fecha: new Date().toISOString(),
                            activo: true
                        }
                    ];
                }
            } else {
                const alertas = newConfig.alertas_sistema || [];
                newConfig.alertas_sistema = alertas.map((a: any) => 
                    a.tipo === 'saldo_bajo' ? { ...a, activo: false, resuelta_en: new Date().toISOString() } : a
                );
            }
        } else {
            // Si el método no es prepago, desactivar cualquier alerta de saldo bajo
            const alertas = newConfig.alertas_sistema || [];
            newConfig.alertas_sistema = alertas.map((a: any) => 
                a.tipo === 'saldo_bajo' ? { ...a, activo: false, resuelta_en: new Date().toISOString() } : a
            );
        }

        const { data: gym, error: gymError } = await supabase
            .from('gimnasios')
            .update({
                nombre,
                slug,
                es_activo,
                logo_url,
                color_primario,
                plan_id,
                estado_pago_saas,
                config_visual,
                modulos_activos,
                configuracion: newConfig
            })
            .eq('id', id)
            .is('deleted_at', null)
            .select()
            .single();

        if (gymError || !gym) {
            return NextResponse.json({ error: 'Gimnasio no encontrado o inactivo en la red' }, { status: 404 });
        }

        if (gym?.slug) {
            (revalidateTag as any)(`gym-brand-${gym.slug}`);
            logger.info(`[Admin Purge] Caché purgada para el gimnasio tras actualización general: ${gym.slug}`);
        }

        return NextResponse.json({ success: true, gym });

    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        logger.error('Update Gym Error:', { error: message });
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
