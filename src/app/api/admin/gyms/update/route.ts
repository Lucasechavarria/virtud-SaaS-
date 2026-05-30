import { NextResponse } from 'next/server';
import { authenticateAndRequireRole } from '@/lib/auth/api-auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { logger } from '@/lib/logger';

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
                .single();
            if (oldGym) {
                const oldConfig = oldGym.configuracion as any;
                prevSaldo = Number(oldConfig?.saldo_creditos ?? 0.0);
            }
        } catch (_err) {}

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
            .select()
            .single();

        if (gymError) throw gymError;

        return NextResponse.json({ success: true, gym });

    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        logger.error('Update Gym Error:', { error: message });
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
