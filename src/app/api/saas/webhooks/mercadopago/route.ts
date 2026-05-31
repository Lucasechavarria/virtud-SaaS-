import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import type { MercadoPagoPayment } from '@/types/mercadopago';
import type { SupabaseClient } from '@supabase/supabase-js';

// ==========================================
// 1. HELPERS COMPUTACIONALES PUROS (SRP)
// ==========================================

/**
 * Calcula la fecha del próximo vencimiento respetando el aniversario original de forma retroactiva.
 * Si el gimnasio tiene una fecha de vencimiento a futuro, le sumamos los 30 días a esa fecha.
 * Si ya expiró, le sumamos 30 días a partir de hoy (fecha de pago).
 */
function calculateNextPaymentDate(currentExpiryDateISO: string | null): Date {
    const today = new Date();
    
    if (currentExpiryDateISO) {
        const currentExpiry = new Date(currentExpiryDateISO);
        // Si el vencimiento original es en el futuro, sumamos a partir de esa fecha (aniversario fijo)
        if (currentExpiry > today) {
            const nextDate = new Date(currentExpiry);
            nextDate.setDate(nextDate.getDate() + 30);
            return nextDate;
        }
    }
    
    // Si ya venció o está inactivo, el periodo mensual de servicio inicia hoy
    const nextDate = new Date(today);
    nextDate.setDate(nextDate.getDate() + 30);
    return nextDate;
}

// ==========================================
// 2. MANEJADORES DE ESTADO (Strategy Pattern)
// ==========================================

/**
 * Procesa la lógica de pagos Aprobados (híbrido Suscripción vs Créditos)
 */
async function handleApprovedPayment(
    supabase: SupabaseClient,
    gymId: string,
    payment: MercadoPagoPayment,
    paymentId: string
): Promise<NextResponse> {
    
    // 1. OBTENER EL PERFIL DE FACTURACIÓN Y ESTADO ACTUAL DEL GIMNASIO
    const { data: gymData, error: gymFetchError } = await supabase
        .from('gimnasios')
        .select('fecha_proximo_pago, modelo_facturacion, saldo_creditos')
        .eq('id', gymId)
        .maybeSingle();

    if (gymFetchError) throw gymFetchError;

    const modeloFacturacion = gymData?.modelo_facturacion || 'subscription';
    
    // Detectar si el pago es una recarga de créditos (por metadata o por modelo)
    const isCreditReload = modeloFacturacion === 'credits' || payment.metadata?.tipo_pago === 'credit_reload';

    if (isCreditReload) {
        // ==========================================
        // RUTA A: FACTURACIÓN POR CONSUMO (CRÉDITOS)
        // ==========================================
        
        // Calcular créditos adquiridos (Metadata explícita o conversión $1 = 100 créditos)
        const creditosComprados = payment.metadata?.creditos_comprados 
            ? Number(payment.metadata.creditos_comprados)
            : Math.round(payment.transaction_amount * 100);

        const saldoActual = gymData?.saldo_creditos || 0;
        const nuevoSaldo = saldoActual + creditosComprados;

        // REGISTRAR EN EL LEDGER DE CRÉDITOS PRIMERO (Idempotencia atómica en DB por UNIQUE constraint)
        const { error: ledgerError } = await supabase
            .from('saas_creditos_ledger')
            .insert({
                gimnasio_id: gymId,
                cantidad: creditosComprados,
                concepto: `Recarga de créditos (Ref: ${paymentId})`,
                saldo_resultante: nuevoSaldo,
                referencia_externa: paymentId.toString(), // Clave única para evitar duplicidades
                creado_en: new Date().toISOString()
            });

        if (ledgerError) {
            // Código 23505: Violación de restricción única en Postgres
            if (ledgerError.code === '23505') {
                console.log(`[Idempotency Ledger] Webhook SaaS: Recarga ${paymentId} ya procesada. Omitiendo duplicado.`);
                return NextResponse.json({ success: true, message: 'Recarga de créditos ya procesada (Idempotencia)' });
            }
            throw ledgerError;
        }

        // ACTUALIZAR SALDO Y ACTIVAR GIMNASIO
        const { error: gymUpdateError } = await supabase
            .from('gimnasios')
            .update({
                saldo_creditos: nuevoSaldo,
                estado_pago_saas: 'active',
                es_activo: true
            })
            .eq('id', gymId);

        if (gymUpdateError) throw gymUpdateError;

        console.log(`[SaaS Billing] Gimnasio ${gymId} recargó ${creditosComprados} créditos. Nuevo Saldo: ${nuevoSaldo}`);

    } else {
        // ==========================================
        // RUTA B: SUSCRIPCIÓN MENSUAL TRADICIONAL
        // ==========================================
        
        const currentExpiry = gymData?.fecha_proximo_pago || null;
        const nextPaymentDate = calculateNextPaymentDate(currentExpiry);

        // REGISTRAR EN HISTORIAL CONTABLE (Idempotencia atómica en DB por UNIQUE en referencia_externa)
        const { error: historyError } = await supabase
            .from('saas_pagos_historial')
            .insert({
                gimnasio_id: gymId,
                monto: payment.transaction_amount,
                moneda: payment.currency_id,
                estado: 'approved',
                fecha_pago: new Date().toISOString(),
                referencia_externa: paymentId.toString(), // UNIQUE Constraint
                tipo_pago: payment.payment_method_id,
                periodo_inicio: new Date().toISOString(),
                periodo_fin: nextPaymentDate.toISOString(),
                metadata: {
                    mp_id: payment.id,
                    status_detail: payment.status_detail,
                    payer_email: payment.payer?.email
                }
            });

        if (historyError) {
            if (historyError.code === '23505') {
                console.log(`[Idempotency Shield] Webhook SaaS: Pago ${paymentId} ya registrado en historial. Abortando.`);
                return NextResponse.json({ success: true, message: 'Pago de suscripción ya procesado (Idempotencia)' });
            }
            throw historyError;
        }

        // ACTUALIZAR FECHA DE EXPIRACIÓN Y LIMPIAR LA PRÓRROGA
        const { error: gymUpdateError } = await supabase
            .from('gimnasios')
            .update({
                estado_pago_saas: 'active',
                fecha_proximo_pago: nextPaymentDate.toISOString(),
                fecha_limite_prorroga: null, // Limpiamos la prórroga al concretarse el pago
                es_activo: true
            })
            .eq('id', gymId);

        if (gymUpdateError) throw gymUpdateError;

        console.log(`[SaaS Billing] Gimnasio ${gymId} extendió vencimiento al ${nextPaymentDate.toISOString()}`);
    }

    // 5. ACTUALIZACIÓN ATÓMICA DE INGRESOS (UPSERT en un solo paso de red para SaaS Metrics)
    const hoy = new Date().toISOString().split('T')[0];
    try {
        await supabase.rpc('update_saas_metrics_on_payment', {
            p_amount: payment.transaction_amount,
            p_fecha: hoy
        });
    } catch (_e) {
        // Fallback optimizado en Edge mediante un único UPSERT
        const { error: upsertError } = await supabase
            .from('saas_metrics')
            .upsert({
                fecha: hoy,
                ingresos_totales_mes: payment.transaction_amount,
                mrr: isCreditReload ? 0 : payment.transaction_amount // MRR solo aplica a suscripciones estables
            }, { onConflict: 'fecha' });
            
        if (upsertError) console.error('[Metrics Upsert Warning] Error en actualización manual de métricas:', upsertError);
    }

    return NextResponse.json({ success: true, message: 'Pago procesado exitosamente' });
}

/**
 * Procesa la lógica de pagos Rechazados o Cancelados
 */
async function handleRejectedPayment(
    supabase: SupabaseClient,
    gymId: string,
    payment: MercadoPagoPayment,
    paymentId: string
): Promise<NextResponse> {
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

    // Capturar y silenciar si ya existía el registro para evitar responder error a MP
    if (historyError && historyError.code !== '23505') throw historyError;

    return NextResponse.json({ success: true, message: 'Pago fallido registrado' });
}

// ==========================================
// 3. ORQUESTADOR PRINCIPAL (POST Webhook)
// ==========================================

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { type } = body;

        // 1. Filtrar únicamente eventos de pago
        if (type !== 'payment') {
            return NextResponse.json({ message: 'Tipo de notificación no procesado' });
        }

        const paymentId = body.data?.id;
        if (!paymentId) return NextResponse.json({ error: 'No ID provided' }, { status: 400 });

        const accessToken = process.env.MP_ACCESS_TOKEN || process.env.MERCADOPAGO_ACCESS_TOKEN;

        // 2. Consultar el pago de forma segura en la API de MercadoPago
        const mpResponse = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
            headers: { 'Authorization': `Bearer ${accessToken}` }
        });

        if (!mpResponse.ok) throw new Error('Error consultando pago en MP');
        const payment = (await mpResponse.json()) as MercadoPagoPayment;

        const gymId = payment.external_reference;
        if (!gymId) {
            console.error('Webhook SaaS: Pago sin external_reference (gymId)', paymentId);
            return NextResponse.json({ error: 'No gym reference' }, { status: 400 });
        }

        // BYPASS DE RLS: Usamos Admin Client en el servidor para evitar bloqueos de RLS
        const supabase = createAdminClient();

        // 3. Enrutar según el estado usando el Mapeador de Estrategias
        if (payment.status === 'approved') {
            return await handleApprovedPayment(supabase, gymId, payment, paymentId);
        } else if (payment.status === 'rejected' || payment.status === 'cancelled') {
            return await handleRejectedPayment(supabase, gymId, payment, paymentId);
        }

        return NextResponse.json({ message: 'Estado de pago no requiere acción' });

    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        console.error('SaaS Webhook Error:', error);
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
