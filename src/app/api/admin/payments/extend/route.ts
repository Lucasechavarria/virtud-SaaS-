import { NextResponse } from 'next/server';
import { authenticateAndRequireRole } from '@/lib/auth/api-auth';
import { createAdminClient } from '@/lib/supabase/admin';

/**
 * POST /api/admin/payments/extend
 * 
 * Permite a un admin aplicar una prórroga de 7 días a un pago.
 * Máximo 2 prórrogas por pago.
 * 
 * @route POST /api/admin/payments/extend
 * @access Admin only
 * 
 * @param {Object} request.body
 * @param {string} request.body.paymentId - ID del pago a prorrogar
 * 
 * @returns {Object} 200 - Prórroga aplicada exitosamente
 * @returns {Object} 400 - Error de validación o límite alcanzado
 * @returns {Object} 401 - No autorizado
 */
export async function POST(request: Request) {
    try {
        const { user, profile, supabase, error } = await authenticateAndRequireRole(request, ['admin', 'superadmin']);
        if (error || !supabase || !user) return error || NextResponse.json({ error: 'No autorizado' }, { status: 401 });

        // Blindaje contra gimnasio_id NULL para admin locales
        if (profile?.role !== 'superadmin' && !profile?.gimnasio_id) {
            return NextResponse.json({
                error: 'Forbidden',
                message: 'Administrador sin gimnasio asignado'
            }, { status: 403 });
        }

        const { paymentId } = await request.json();

        if (!paymentId) {
            return NextResponse.json({
                error: 'Missing paymentId',
                message: 'El ID del pago es requerido'
            }, { status: 400 });
        }

        // Consultar el pago para validar pertenencia al mismo gimnasio
        const { data: payment, error: paymentError } = await supabase
            .from('pagos')
            .select('gimnasio_id')
            .eq('id', paymentId)
            .single();

        if (paymentError || !payment) {
            return NextResponse.json({
                error: 'Payment not found',
                message: 'El pago especificado no existe'
            }, { status: 404 });
        }

        // Si es admin local, exigir coincidencia estricta de gimnasio_id
        if (profile?.role !== 'superadmin' && payment.gimnasio_id !== profile.gimnasio_id) {
            return NextResponse.json({
                error: 'Forbidden',
                message: 'No tienes permisos para prorrogar este pago'
            }, { status: 403 });
        }

        // Instanciar Admin Client para invocar la RPC securizada con privilegios de service_role
        const adminClient = createAdminClient();
        const { data, error: rpcError } = await adminClient.rpc('solicitar_prorroga_pago', {
            p_pago_id: paymentId,
            p_admin_id: user.id
        });

        if (rpcError) {
            console.error('Error aplicando prórroga:', rpcError);
            return NextResponse.json({
                error: 'Database error',
                message: rpcError.message
            }, { status: 500 });
        }

        // Verificar si la función devolvió un error lógico
        if (data && data.error) {
            return NextResponse.json({
                error: 'Extension failed',
                message: data.error
            }, { status: 400 });
        }

        return NextResponse.json({
            success: true,
            data
        });

    } catch (error) {
        console.error('Error en endpoint de prórroga:', error);
        return NextResponse.json({
            error: 'Server error',
            message: 'Error interno del servidor'
        }, { status: 500 });
    }
}
