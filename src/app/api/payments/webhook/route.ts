import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';
import crypto from 'crypto';
import type { MercadoPagoPayment, MercadoPagoWebhookNotification } from '@/types/mercadopago';

/**
 * Valida la firma HMAC de notificaciones de MercadoPago
 */
function validateMercadoPagoSignature(
    rawBody: string, 
    xSignature: string | null, 
    xRequestId: string | null,
    secret: string | undefined
): boolean {
    if (!xSignature || !secret) return false;
    
    try {
        const parts = xSignature.split(',');
        const ts = parts.find(p => p.startsWith('ts='))?.split('=')?.[1];
        const v1 = parts.find(p => p.startsWith('v1='))?.split('=')?.[1];
        
        if (!ts || !v1) return false;
        
        const bodyObj = JSON.parse(rawBody);
        const resourceId = bodyObj?.data?.id;
        if (!resourceId) return false;

        const signedTemplate = `id:${resourceId};request-id:${xRequestId};ts:${ts};`;
        const expected = crypto.createHmac('sha256', secret)
            .update(signedTemplate)
            .digest('hex');
            
        return crypto.timingSafeEqual(Buffer.from(v1), Buffer.from(expected));
    } catch (_) {
        return false;
    }
}

/**
 * Helper para obtener el gimnasio_id de un socio
 */
async function getUserGymId(supabase: any, userId: string): Promise<string> {
    const { data: userProfile, error } = await supabase
        .from('perfiles')
        .select('gimnasio_id')
        .eq('id', userId)
        .single();

    if (error || !userProfile?.gimnasio_id) {
        logger.error('Error al obtener el gimnasio del usuario o gimnasio no asignado', { userId, error });
        throw new Error('Socio no encontrado o no tiene un gimnasio asignado');
    }
    return userProfile.gimnasio_id;
}

/**
 * POST /api/payments/webhook
 * 
 * Webhook de MercadoPago para notificaciones de pagos.
 * Procesa pagos aprobados, pendientes y rechazados con validación HMAC.
 */
export async function POST(request: Request) {
    try {
        const xSignature = request.headers.get('x-signature');
        const xRequestId = request.headers.get('x-request-id');
        const rawBody = await request.text();

        // 1. Validar la firma HMAC de MercadoPago
        const secret = process.env.MERCADOPAGO_WEBHOOK_SECRET;
        if (process.env.NODE_ENV === 'production' || secret) {
            if (!validateMercadoPagoSignature(rawBody, xSignature, xRequestId, secret)) {
                logger.warn('Webhook de MercadoPago rechazado: firma inválida o faltante');
                return NextResponse.json({ error: 'Firma inválida' }, { status: 401 });
            }
        } else {
            logger.warn('Advertencia: Webhook de MercadoPago procesado sin validar firma (secreto no configurado en entorno local)');
        }

        const body = JSON.parse(rawBody);
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

        // Obtener gimnasio del socio
        const gymId = await getUserGymId(supabase, userId);

        // 🔐 Idempotency Check: Ver si el pago ya fue procesado como 'aprobado'
        const { data: existingPayment } = await supabase
            .from('pagos')
            .select('estado')
            .eq('id', payment.id.toString())
            .single();

        if (existingPayment?.estado === 'approved') {
            logger.info('♻️ Pago ya procesado previamente. Omitiendo duplicidad.', { paymentId: payment.id });
            return;
        }

        // Guardar pago en Supabase con gimnasio_id
        const { error: paymentError } = await supabase
            .from('pagos')
            .upsert({
                id: payment.id.toString(),
                usuario_id: userId,
                gimnasio_id: gymId, // Inyección de Tenant
                monto: payment.transaction_amount,
                moneda: payment.currency_id || 'ARS',
                estado: 'approved',
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
 * Maneja pagos pendientes
 */
async function handlePendingPayment(payment: MercadoPagoPayment, userId: string) {
    try {
        const supabase = await createClient();

        // Validaciones
        if (!payment.id || !userId) {
            throw new Error('Payment ID y User ID son requeridos');
        }

        // Obtener gimnasio del socio
        const gymId = await getUserGymId(supabase, userId);

        // Guardar pago pendiente con gimnasio_id
        const { error: paymentError } = await supabase
            .from('pagos')
            .upsert({
                id: payment.id.toString(),
                usuario_id: userId,
                gimnasio_id: gymId, // Inyección de Tenant
                monto: payment.transaction_amount,
                moneda: payment.currency_id || 'ARS',
                estado: 'pending',
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
 */
async function handleRejectedPayment(payment: MercadoPagoPayment, userId: string) {
    try {
        const supabase = await createClient();

        // Validaciones
        if (!payment.id || !userId) {
            throw new Error('Payment ID y User ID son requeridos');
        }

        // Obtener gimnasio del socio
        const gymId = await getUserGymId(supabase, userId);

        // Guardar pago rechazado para auditoría con gimnasio_id
        const { error: paymentError } = await supabase
            .from('pagos')
            .upsert({
                id: payment.id.toString(),
                usuario_id: userId,
                gimnasio_id: gymId, // Inyección de Tenant
                monto: payment.transaction_amount,
                moneda: payment.currency_id || 'ARS',
                estado: 'rejected',
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
                    rejection_reason: payment.status_detail
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
