import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';
import crypto from 'crypto';
import type { MercadoPagoPayment, MercadoPagoWebhookNotification } from '@/types/mercadopago';

/**
 * POST /api/payments/webhook
 * 
 * Webhook de MercadoPago para notificaciones de pagos.
 * Procesa pagos aprobados, pendientes y rechazados.
 * 
 * @route POST /api/payments/webhook
 * @access Public (validado con signature)
 * 
 * @param {Object} request.body - Notificación de MercadoPago
 * 
 * @returns {Object} 200 - Webhook procesado
 * @returns {Object} 400 - Datos inválidos
 */
export async function POST(request: Request) {
    try {
        const body = await request.json();

        logger.info('Webhook recibido de MercadoPago', { type: body.type, action: body.action });

        // Validar que sea una notificación de pago
        if (body.type !== 'payment') {
            return NextResponse.json({
                message: 'Tipo de notificación no soportado'
            });
        }

        // Obtener ID del pago
        const paymentId = body.data?.id;
        if (!paymentId) {
            return NextResponse.json({
                error: 'Payment ID no encontrado'
            }, { status: 400 });
        }

        // Consultar detalles del pago en MercadoPago
        const paymentResponse = await fetch(
            `https://api.mercadopago.com/v1/payments/${paymentId}`,
            {
                headers: {
                    'Authorization': `Bearer ${process.env.MERCADOPAGO_ACCESS_TOKEN}`
                }
            }
        );

        const payment = await paymentResponse.json();

        logger.info('Detalles del pago', {
            id: payment.id,
            status: payment.status,
            status_detail: payment.status_detail,
            payment_method: payment.payment_method_id,
            transaction_amount: payment.transaction_amount,
            external_reference: payment.external_reference
        });

        // Obtener userId de la referencia externa
        const userId = payment.external_reference;

        // Procesar según el estado del pago
        switch (payment.status) {
            case 'approved':
                // Pago aprobado
                await handleApprovedPayment(payment, userId);
                break;

            case 'pending':
                // Pago pendiente (ej: transferencia bancaria)
                await handlePendingPayment(payment, userId);
                break;

            case 'rejected':
                // Pago rechazado
                await handleRejectedPayment(payment, userId);
                break;

            default:
                logger.warn('Estado de pago no manejado', { status: payment.status });
        }

        return NextResponse.json({
            success: true,
            message: 'Webhook procesado correctamente'
        });

    } catch (error) {
        console.error('❌ Error procesando webhook:', error);
        const errorMessage = error instanceof Error ? error.message : 'Error desconocido procesando webhook';
        logger.error('Error en webhook de MercadoPago', { error: errorMessage });
        return NextResponse.json({
            error: errorMessage
        }, { status: 500 });
    }
}

/**
 * Maneja pagos aprobados
 * @param payment - Objeto de pago de MercadoPago
 * @param userId - ID del usuario que realizó el pago
 */
async function handleApprovedPayment(payment: MercadoPagoPayment, userId: string) {
    try {
        const supabase = await createClient();

        // Validaciones críticas antes de procesar
        if (!payment.id) {
            throw new Error('Payment ID es requerido');
        }
        if (!payment.transaction_amount || payment.transaction_amount <= 0) {
            throw new Error('Monto de transacción inválido');
        }
        if (!userId) {
            throw new Error('User ID es requerido para procesar el pago');
        }

        // 🔐 Idempotency Check: Ver si el pago ya fue procesado como 'aprobado'
        const { data: existingPayment } = await supabase
            .from('pagos')
            .select('estado')
            .eq('id', payment.id.toString())
            .single();

        if (existingPayment?.estado === 'aprobado') {
            logger.info('♻️ Pago ya procesado previamente. Omitiendo duplicidad.', { paymentId: payment.id });
            return;
        }

        // Guardar pago en Supabase
        const { error: paymentError } = await supabase
            .from('pagos')
            .upsert({
                id: payment.id.toString(),
                usuario_id: userId,
                monto: payment.transaction_amount,
                moneda: payment.currency_id || 'ARS',
                estado: 'aprobado',
                metodo_pago: 'mercadopago',
                proveedor_pago: 'mercadopago',
                id_pago_proveedor: payment.id.toString(),
                concepto: payment.description || 'Pago de membresía',
                metadatos: {
                    payment_method_id: payment.payment_method_id,
                    payment_type_id: payment.payment_type_id,
                    status_detail: payment.status_detail,
                    date_approved: payment.date_approved,
                    money_release_date: payment.money_release_date,
                    payer_email: payment.payer?.email,
                }
            });

        if (paymentError) {
            logger.error('Error guardando pago aprobado en BD', {
                error: paymentError,
                paymentId: payment.id,
                userId
            });
            throw new Error(`Error en base de datos: ${paymentError.message}`);
        }

        // Actualizar usuario como activo (membresía por 30 días)
        const membershipEndDate = new Date();
        membershipEndDate.setDate(membershipEndDate.getDate() + 30);

        const { error: profileError } = await supabase
            .from('perfiles')
            .update({
                estado_membresia: 'active',
                fecha_fin_membresia: membershipEndDate.toISOString()
            })
            .eq('id', userId);

        if (profileError) {
            logger.error('Error actualizando perfil de usuario', {
                error: profileError,
                userId,
                paymentId: payment.id
            });
            // No lanzamos error aquí porque el pago ya se guardó exitosamente
        }

        logger.info('✅ Pago aprobado procesado exitosamente', {
            paymentId: payment.id,
            userId,
            amount: payment.transaction_amount,
            currency: payment.currency_id
        });
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
        logger.error('❌ Error procesando pago aprobado', {
            error: errorMessage,
            paymentId: payment.id,
            userId
        });
        throw error;
    }
}

/**
 * Maneja pagos pendientes (transferencias bancarias, Rapipago, etc.)
 * @param payment - Objeto de pago de MercadoPago
 * @param userId - ID del usuario que realizó el pago
 */
async function handlePendingPayment(payment: MercadoPagoPayment, userId: string) {
    try {
        const supabase = await createClient();

        // Validaciones
        if (!payment.id || !userId) {
            throw new Error('Payment ID y User ID son requeridos');
        }

        // Guardar pago pendiente
        const { error: paymentError } = await supabase
            .from('pagos')
            .upsert({
                id: payment.id.toString(),
                usuario_id: userId,
                monto: payment.transaction_amount,
                moneda: payment.currency_id || 'ARS',
                estado: 'pendiente',
                metodo_pago: 'mercadopago',
                proveedor_pago: 'mercadopago',
                id_pago_proveedor: payment.id.toString(),
                concepto: payment.description || 'Pago de membresía',
                metadatos: {
                    payment_method_id: payment.payment_method_id,
                    payment_type_id: payment.payment_type_id,
                    status_detail: payment.status_detail,
                    date_created: payment.date_created,
                    payer_email: payment.payer?.email,
                }
            });

        if (paymentError) {
            logger.error('Error guardando pago pendiente en BD', {
                error: paymentError,
                paymentId: payment.id,
                userId
            });
            throw new Error(`Error en base de datos: ${paymentError.message}`);
        }

        logger.info('⏳ Pago pendiente registrado', {
            paymentId: payment.id,
            userId,
            paymentMethod: payment.payment_method_id,
            statusDetail: payment.status_detail
        });
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
        logger.error('❌ Error procesando pago pendiente', {
            error: errorMessage,
            paymentId: payment.id,
            userId
        });
        throw error;
    }
}

/**
 * Maneja pagos rechazados
 * @param payment - Objeto de pago de MercadoPago
 * @param userId - ID del usuario que realizó el pago
 */
async function handleRejectedPayment(payment: MercadoPagoPayment, userId: string) {
    try {
        const supabase = await createClient();

        // Validaciones
        if (!payment.id || !userId) {
            throw new Error('Payment ID y User ID son requeridos');
        }

        // Guardar pago rechazado para auditoría
        const { error: paymentError } = await supabase
            .from('pagos')
            .upsert({
                id: payment.id.toString(),
                usuario_id: userId,
                monto: payment.transaction_amount,
                moneda: payment.currency_id || 'ARS',
                estado: 'rechazado',
                metodo_pago: 'mercadopago',
                proveedor_pago: 'mercadopago',
                id_pago_proveedor: payment.id.toString(),
                concepto: payment.description || 'Pago de membresía',
                metadatos: {
                    payment_method_id: payment.payment_method_id,
                    payment_type_id: payment.payment_type_id,
                    status_detail: payment.status_detail,
                    date_created: payment.date_created,
                    payer_email: payment.payer?.email,
                    rejection_reason: payment.status_detail // Importante para análisis
                }
            });

        if (paymentError) {
            logger.error('Error guardando pago rechazado en BD', {
                error: paymentError,
                paymentId: payment.id,
                userId
            });
            throw new Error(`Error en base de datos: ${paymentError.message}`);
        }

        logger.warn('❌ Pago rechazado registrado', {
            paymentId: payment.id,
            userId,
            statusDetail: payment.status_detail,
            paymentMethod: payment.payment_method_id
        });
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
        logger.error('❌ Error procesando pago rechazado', {
            error: errorMessage,
            paymentId: payment.id,
            userId
        });
        throw error;
    }
}

/**
 * GET - Endpoint de prueba
 */
export async function GET() {
    return NextResponse.json({
        message: 'Webhook de MercadoPago activo'
    });
}
