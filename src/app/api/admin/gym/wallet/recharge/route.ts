import { NextResponse } from 'next/server';
import { authenticateAndRequireRole } from '@/lib/auth/api-auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { logger } from '@/lib/logger';

export async function POST(request: Request) {
    try {
        // 1. Autenticar y requerir rol de 'admin' o 'superadmin'
        const { supabase: userClient, error: authError, user } = await authenticateAndRequireRole(request, ['admin', 'superadmin']);
        if (authError || !user) return authError || NextResponse.json({ error: 'No autorizado' }, { status: 401 });

        const adminClient = createAdminClient();

        // 2. Obtener el gimnasio asociado a este perfil de usuario
        const { data: profile, error: profileError } = await adminClient
            .from('perfiles')
            .select('gimnasio_id')
            .eq('id', user.id)
            .single();

        if (profileError || !profile?.gimnasio_id) {
            return NextResponse.json({ error: 'El usuario no pertenece a ningún gimnasio activo.' }, { status: 400 });
        }

        const gymId = profile.gimnasio_id;

        // 3. Capturar parámetros del body
        const { amount, limiteAlertaSaldo, metodoCobroExcedentes } = await request.json();

        // 4. Obtener la configuración actual del gimnasio
        const { data: gym, error: gymError } = await adminClient
            .from('gimnasios')
            .select('nombre, configuracion')
            .eq('id', gymId)
            .single();

        if (gymError || !gym) {
            return NextResponse.json({ error: 'Gimnasio no encontrado' }, { status: 404 });
        }

        const config = (gym.configuracion || {}) as Record<string, any>;

        // Inicializar variables si no existen
        if (config.saldo_creditos === undefined) config.saldo_creditos = 0;
        if (config.limite_alerta_saldo === undefined) config.limite_alerta_saldo = 10;
        if (config.metodo_cobro_excedentes === undefined) config.metodo_cobro_excedentes = 'postpago';
        if (!config.historial_recargas) config.historial_recargas = [];

        // 5. Aplicar cambios
        let message = 'Configuraciones de facturación guardadas.';
        
        if (amount && Number(amount) > 0) {
            const rechargeAmount = Number(amount);
            config.saldo_creditos = Number((Number(config.saldo_creditos) + rechargeAmount).toFixed(2));
            
            // Inyectar en el historial de transacciones de la wallet
            config.historial_recargas.push({
                fecha: new Date().toISOString(),
                monto: rechargeAmount,
                metodo: 'Carga Sandbox MP'
            });
            message = `¡Carga exitosa! Se han acreditado $${rechargeAmount.toFixed(2)} USD a tu AI Wallet.`;
        }

        if (limiteAlertaSaldo !== undefined) {
            config.limite_alerta_saldo = Number(limiteAlertaSaldo);
        }

        if (metodoCobroExcedentes !== undefined) {
            config.metodo_cobro_excedentes = metodoCobroExcedentes === 'prepago' ? 'prepago' : 'postpago';
        }

        // 5b. Sincronizar alertas del monedero en caliente según el saldo actual y umbral (SSOT)
        const threshold = Number(config.limite_alerta_saldo ?? 10.0);
        const currentSaldo = Number(config.saldo_creditos ?? 0.0);
        const modeloFacturacion = config.modelo_facturacion || 'membresia';
        const metodoCobro = config.metodo_cobro_excedentes || 'postpago';

        if ((modeloFacturacion === 'consumo' || modeloFacturacion === 'hibrido') && metodoCobro === 'prepago') {
            if (currentSaldo < threshold) {
                const alertas = config.alertas_sistema || [];
                const tieneAlerta = alertas.some((a: any) => a.tipo === 'saldo_bajo' && a.activo !== false);
                if (!tieneAlerta) {
                    config.alertas_sistema = [
                        ...alertas,
                        {
                            id: Math.random().toString(36).substring(2, 11),
                            tipo: 'saldo_bajo',
                            prioridad: 'alta',
                            mensaje: `¡Alerta de AI Wallet! Tu saldo prepago de créditos de IA ($${currentSaldo.toFixed(2)} USD) es menor al límite configurado de $${threshold.toFixed(2)} USD.`,
                            fecha: new Date().toISOString(),
                            activo: true
                        }
                    ];
                }
            } else {
                const alertas = config.alertas_sistema || [];
                config.alertas_sistema = alertas.map((a: any) => 
                    a.tipo === 'saldo_bajo' ? { ...a, activo: false, resuelta_en: new Date().toISOString() } : a
                );
            }
        } else {
            // Si el método no es prepago, desactivar cualquier alerta de saldo bajo
            const alertas = config.alertas_sistema || [];
            config.alertas_sistema = alertas.map((a: any) => 
                a.tipo === 'saldo_bajo' ? { ...a, activo: false, resuelta_en: new Date().toISOString() } : a
            );
        }

        // 6. Persistir en la base de datos
        const { data: updatedGym, error: updateError } = await adminClient
            .from('gimnasios')
            .update({ configuracion: config })
            .eq('id', gymId)
            .select('id, nombre, configuracion')
            .single();

        if (updateError) throw updateError;

        return NextResponse.json({
            success: true,
            message,
            configuracion: updatedGym.configuracion
        });

    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        logger.error('Wallet Recharge Error:', { error: message });
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
