import { NextResponse } from 'next/server';
import { authenticateAndRequireRole } from '@/lib/auth/api-auth';
import { logger } from '@/lib/logger';
import { createAdminClient } from '@/lib/supabase/admin';

/**
 * POST /api/payments/manual-approval
 * 
 * Permite a un admin aprobar manualmente un pago en efectivo.
 * Marca el pago como confirmado sin pasar por MercadoPago.
 * 
 * @route POST /api/payments/manual-approval
 * @access Admin only
 * 
 * @param {Object} request.body
 * @param {string} request.body.userId - ID del usuario que pagó
 * @param {number} request.body.amount - Monto pagado en ARS
 * @param {string} request.body.concept - Concepto del pago (ej: "Cuota Mensual Enero 2025")
 * @param {string} [request.body.notes] - Notas adicionales del admin
 * 
 * @returns {Object} 200 - Pago aprobado exitosamente
 * @returns {Object} 401 - No autorizado
 * @returns {Object} 403 - No tiene permisos de admin
 * @returns {Object} 500 - Error del servidor
 * 
 * @example
 * // Request
 * POST /api/payments/manual-approval
 * {
 *   "userId": "user_123",
 *   "amount": 15000,
 *   "concept": "Cuota Mensual Enero 2025",
 *   "notes": "Pago en efectivo recibido por recepción"
 * }
 * 
 * // Response
 * {
 *   "success": true,
 *   "paymentId": "payment_abc123",
 *   "message": "Pago aprobado exitosamente"
 * }
 */export async function POST(request: Request) {
    try {
        // Verificar autenticación y rol de admin
        const { user, profile, supabase, error } = await authenticateAndRequireRole(
            request,
            ['admin']
        );

        if (error) return error;

        // Blindaje contra gimnasio_id NULL para admin
        if (profile?.role !== 'superadmin' && !profile?.gimnasio_id) {
            return NextResponse.json({
                error: 'Forbidden',
                message: 'Administrador sin gimnasio asignado'
            }, { status: 403 });
        }

        // Obtener datos del request
        const { userId, amount, concept, notes, gymId } = await request.json();

        // Resolver gimnasio
        let targetGymId = profile?.gimnasio_id;
        if (profile?.role === 'superadmin') {
            if (!gymId) {
                return NextResponse.json({
                    error: 'Missing gymId',
                    message: 'El gymId es requerido para superadmins'
                }, { status: 400 });
            }
            targetGymId = gymId;
        }

        // Validaciones robustas
        if (!userId || !amount || !concept) {
            return NextResponse.json({
                error: 'Missing required fields',
                message: 'userId, amount, and concept are required'
            }, { status: 400 });
        }

        // Validar que el monto sea válido
        const numericAmount = Number(amount);
        if (isNaN(numericAmount) || numericAmount <= 0) {
            return NextResponse.json({
                error: 'Invalid amount',
                message: 'El monto debe ser un número positivo'
            }, { status: 400 });
        }

        // Validar que el userId exista y pertenezca al mismo gimnasio
        const { data: targetUser, error: userCheckError } = await supabase!
            .from('perfiles')
            .select('id, gimnasio_id')
            .eq('id', userId)
            .single();

        if (userCheckError || !targetUser) {
            return NextResponse.json({
                error: 'User not found',
                message: `Usuario con ID ${userId} no encontrado`
            }, { status: 404 });
        }

        if (profile?.role !== 'superadmin' && targetUser.gimnasio_id !== targetGymId) {
            return NextResponse.json({
                error: 'Forbidden',
                message: 'El socio especificado no pertenece a tu gimnasio'
            }, { status: 403 });
        }

        // Crear registro de pago en Supabase
        const { data: payment, error: paymentError } = await supabase!
            .from('pagos')
            .insert({
                usuario_id: userId,
                gimnasio_id: targetGymId, // Inyección del gimnasio_id
                monto: numericAmount,
                moneda: 'ARS', // Siempre ARS para pagos manuales
                concepto: concept,
                notas: notes || '',
                estado: 'approved',
                metodo_pago: 'cash',
                proveedor_pago: 'manual',
                aprobado_por: user!.id,
                aprobado_en: new Date().toISOString()
            })
            .select()
            .single();

        if (paymentError) {
            logger.error('Error creating payment record', { error: paymentError.message, userId, amount: numericAmount });
            return NextResponse.json({
                error: 'Payment creation failed',
                message: paymentError.message,
                details: paymentError.details || 'Error al crear el registro de pago'
            }, { status: 500 });
        }

        // Usar la función RPC para aprobar con reglas de negocio (mantiene ciclo de facturación)
        // Se ejecuta usando createAdminClient para poseer privilegios de service_role tras la revocación de execute a usuarios autenticados
        const adminClient = createAdminClient();
        const { data: approvalData, error: approvalError } = await adminClient
            .rpc('aprobar_pago_con_reglas', {
                p_pago_id: payment.id,
                p_admin_id: user!.id
            });

        if (approvalError) {
            logger.error('Error aprobando pago con RPC', { error: approvalError.message, paymentId: payment.id });
            return NextResponse.json({
                error: 'Payment approval logic failed',
                message: approvalError.message
            }, { status: 500 });
        }

        // El resultado de la RPC incluye la fecha
        const membershipEndDate = approvalData.fecha_fin_membresia;

        logger.info('Pago manual aprobado con reglas', {
            paymentId: payment.id,
            userId,
            amount: numericAmount,
            approvedBy: user!.id,
            newEndDate: membershipEndDate
        });

        return NextResponse.json({
            success: true,
            paymentId: payment.id,
            message: 'Pago aprobado exitosamente',
            membershipEndDate: membershipEndDate
        });

    } catch (error) {
        logger.error('Error en aprobación manual de pago', { error: error instanceof Error ? error.message : String(error) });
        const errorMessage = error instanceof Error ? error.message : 'Error al procesar el pago';
        return NextResponse.json({
            error: 'Payment approval failed',
            message: errorMessage
        }, { status: 500 });
    }
}

/**
 * GET /api/payments/manual-approval
 * 
 * Lista todos los pagos manuales aprobados.
 * 
 * @route GET /api/payments/manual-approval
 * @access Admin only
 * 
 * @returns {Object} 200 - Lista de pagos
 * @returns {Object} 401 - No autorizado
 * @returns {Object} 403 - No tiene permisos de admin
 */
export async function GET(request: Request) {
    try {
        // Verificar autenticación y rol de admin
        const { user, profile, supabase, error } = await authenticateAndRequireRole(
            request,
            ['admin']
        );

        if (error) return error;

        // Blindaje contra gimnasio_id NULL para admin
        if (profile?.role !== 'superadmin' && !profile?.gimnasio_id) {
            return NextResponse.json({
                error: 'Forbidden',
                message: 'Administrador sin gimnasio asignado'
            }, { status: 403 });
        }

        const { searchParams } = new URL(request.url);
        const urlGym = searchParams.get('gymId');
        let targetGymId = profile?.gimnasio_id;

        if (profile?.role === 'superadmin' && urlGym) {
            targetGymId = urlGym;
        }

        let query = supabase!
            .from('pagos')
            .select(`
                *,
                user:perfiles!usuario_id (id, nombre_completo, email:correo),
                approver:perfiles!aprobado_por (id, nombre_completo, email:correo)
            `)
            .eq('metodo_pago', 'cash');

        if (targetGymId) {
            query = query.eq('gimnasio_id', targetGymId);
        }

        const { data: payments, error: paymentsError } = await query
            .order('creado_en', { ascending: false })
            .limit(100);

        if (paymentsError) {
            logger.error('Error fetching manual payments', { error: paymentsError.message });
            return NextResponse.json({
                error: 'Failed to fetch payments',
                message: paymentsError.message
            }, { status: 500 });
        }

        return NextResponse.json({
            success: true,
            payments: payments || []
        });

    } catch (error) {
        logger.error('Error obteniendo pagos manuales', { error: error instanceof Error ? error.message : String(error) });
        const errorMessage = error instanceof Error ? error.message : 'Error al obtener pagos';
        return NextResponse.json({
            error: 'Failed to fetch payments',
            message: errorMessage
        }, { status: 500 });
    }
}
