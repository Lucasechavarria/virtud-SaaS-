import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import type { MercadoPagoPayment } from '@/types/mercadopago';

/**
 * POST /api/saas/webhooks/mercadopago
 * Webhook para recibir notificaciones de pagos de suscripción de Gimnasios (SaaS)
 */
export async function POST(request: Request) {
    try {
        const body = await request.json();
        const action = body.action;
        const type = body.type;

        // Solo procesamos eventos de pago
        if (type !== 'payment') {
            return NextResponse.json({ message: 'Tipo de notificación no procesado' });
        }

        const paymentId = body.data?.id;
        if (!paymentId) return NextResponse.json({ error: 'No ID provided' }, { status: 400 });

        const accessToken = process.env.MP_ACCESS_TOKEN || process.env.MERCADOPAGO_ACCESS_TOKEN;

        // 1. Consultar el pago en MercadoPago
        const mpResponse = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
            headers: {
                'Authorization': `Bearer ${accessToken}`
            }
        });

        if (!mpResponse.ok) throw new Error('Error consultando pago en MP');
        const payment = (await mpResponse.json()) as MercadoPagoPayment;

        const gymId = payment.external_reference;
        if (!gymId) {
            console.error('Webhook SaaS: Pago sin external_reference (gymId)', paymentId);
            return NextResponse.json({ error: 'No gym reference' }, { status: 400 });
        }

        const supabase = createAdminClient();

        // 2. Procesar según estado
        if (payment.status === 'approved') {
            // [IDEMPOTENCY CHECK] Evitar duplicaciones de ingresos y métricas falsas
             const { data: existingPayment } = await supabase
                .from('saas_pagos_historial')
                .select('id')
                .eq('referencia_externa', paymentId.toString())
                .eq('estado', 'approved')
                .maybeSingle();

            if (existingPayment) {
                console.log(`[Idempotency] Webhook SaaS: Pago ${paymentId} procesado previamente. Omitiendo recuento.`);
                return NextResponse.json({ success: true, message: 'Pago ya procesado (Idempotencia)' });
            }

            // CALCULAR PRÓXIMA FECHA DE PAGO (30 días desde hoy o desde la fecha anterior si aún no venció)
            // Para simplicidad, 30 días desde hoy.
            const nextPaymentDate = new Date();
            nextPaymentDate.setDate(nextPaymentDate.getDate() + 30);

            // A. Actualizar Gimnasio
            const { error: gymUpdateError } = await supabase
                .from('gimnasios')
                .update({
                    estado_pago_saas: 'active',
                    fecha_proximo_pago: nextPaymentDate.toISOString(),
                    es_activo: true // Aseguramos que esté activo si pagó
                })
                .eq('id', gymId);

            if (gymUpdateError) throw gymUpdateError;

            // B. Registrar en Historial de Pagos SaaS
            const { error: historyError } = await supabase
                .from('saas_pagos_historial')
                .insert({
                    gimnasio_id: gymId,
                    monto: payment.transaction_amount,
                    moneda: payment.currency_id,
                    estado: 'approved',
                    fecha_pago: new Date().toISOString(),
                    referencia_externa: paymentId.toString(),
                    tipo_pago: payment.payment_method_id,
                    periodo_inicio: new Date().toISOString(),
                    periodo_fin: nextPaymentDate.toISOString(),
                    metadata: {
                        mp_id: payment.id,
                        status_detail: payment.status_detail,
                        payer_email: payment.payer?.email
                    }
                });

            if (historyError) console.error('Error registrando historial SaaS:', historyError);

            // C. Auditoría
            // D. Actualizar Métricas SaaS (MRR e Ingresos)
            const hoy = new Date().toISOString().split('T')[0];
            try {
                // @ts-ignore - RPC might not be in types yet
                await (supabase.rpc as any)('update_saas_metrics_on_payment', {
                    p_amount: payment.transaction_amount,
                    p_fecha: hoy
                });
            } catch (_e) {
                console.warn('RPC update_saas_metrics_on_payment no disponible, usando fallback manual');
            }

            // Fallback (UPSERT manual)
            const { data: currentMetrics } = await supabase
                .from('saas_metrics')
                .select('ingresos_totales_mes')
                .eq('fecha', hoy)
                .maybeSingle();

            if (!currentMetrics) {
                await supabase.from('saas_metrics').insert({
                    fecha: hoy,
                    ingresos_totales_mes: payment.transaction_amount,
                    mrr: payment.transaction_amount
                });
            } else {
                await supabase
                    .from('saas_metrics')
                    .update({
                        ingresos_totales_mes: (currentMetrics.ingresos_totales_mes || 0) + payment.transaction_amount
                    })
                    .eq('fecha', hoy);
            }

        } else if (payment.status === 'rejected' || payment.status === 'cancelled') {
            // Opcional: Notificar al admin del gimnasio o marcar como deuda si ya venció
            const { error: historyError } = await supabase
                .from('saas_pagos_historial')
                .insert({
                    gimnasio_id: gymId,
                    monto: payment.transaction_amount,
                    moneda: payment.currency_id,
                    estado: payment.status,
                    fecha_pago: new Date().toISOString(),
                    referencia_externa: paymentId.toString(),
                    metadata: { mp_id: payment.id, status_detail: payment.status_detail }
                });
        }

        return NextResponse.json({ success: true });

    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        console.error('SaaS Webhook Error:', error);
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
