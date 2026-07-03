import { NextResponse } from 'next/server';
import { authenticateAndRequireRole, resolveGymIdForAdmin } from '@/lib/auth/api-auth';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

/**
 * POST /api/admin/sales
 * Procesa un cobro unificado del POS: productos de tienda, saldado de cuotas y abono a cuenta corriente.
 */
export async function POST(request: Request) {
    try {
        const { error: authError, profile, user } = await authenticateAndRequireRole(request, ['admin', 'superadmin', 'recepcion']);
        if (authError) return authError;

        const body = await request.json();
        const {
            socioId,
            productos, // Array de { producto_id, cantidad, precio_unitario }
            pagosSaldar, // Array de UUIDs de pagos a saldar
            montoAbonoCC, // Abono extra a la cuenta corriente
            metodoPago, // 'efectivo', 'tarjeta', 'qr'
            montoTotalCobrado,
            gymId,
            membresia // { planId: string, precio: number, nombre: string, duracionMeses: number }
        } = body;

        // Validaciones iniciales
        if (!metodoPago || montoTotalCobrado === undefined) {
            return NextResponse.json({ error: 'Faltan campos obligatorios (metodoPago, montoTotalCobrado)' }, { status: 400 });
        }

        const validMethods = ['efectivo', 'tarjeta', 'qr', 'transferencia'];
        if (!validMethods.includes(metodoPago)) {
            return NextResponse.json({ error: 'Método de pago inválido. Permitidos: efectivo, tarjeta, qr, transferencia' }, { status: 400 });
        }

        // Blindaje contra gimnasio_id NULL para admin locales / recepcionista
        if (profile?.role !== 'superadmin' && !profile?.gimnasio_id) {
            return NextResponse.json({ error: 'Forbidden: Administrador sin gimnasio asignado' }, { status: 403 });
        }

        const adminClient = createAdminClient();
        const { targetGymId, errorResponse } = await resolveGymIdForAdmin(profile, gymId);
        if (errorResponse) return errorResponse;

        if (!targetGymId) {
            return NextResponse.json({ error: 'Gimnasio no asignado o no especificado' }, { status: 403 });
        }

        // Validar pertenencia del socio al gimnasio si se especifica socioId y no es superadmin
        if (socioId && profile?.role !== 'superadmin') {
            const { data: targetProfile, error: profileError } = await adminClient
                .from('perfiles')
                .select('gimnasio_id')
                .eq('id', socioId)
                .single();

            if (profileError || !targetProfile) {
                return NextResponse.json({ error: 'Socio no encontrado' }, { status: 400 });
            }

            if (targetProfile.gimnasio_id !== targetGymId) {
                return NextResponse.json({ error: 'Forbidden: El socio especificado no pertenece a tu gimnasio' }, { status: 403 });
            }
        }

        // Limpiar y formatear productos para el RPC
        const formattedProducts = (productos || []).map((p: any) => ({
            producto_id: p.producto_id || p.id,
            cantidad: Number(p.cantidad),
            precio_unitario: Number(p.precio_unitario || p.precio)
        }));

        let ventaId = null;

        // Ejecutar el RPC unificado procesar_venta_pos_v2 para productos, cuotas, membresía y abono CC
        const { data: rpcVentaId, error: txError } = await adminClient.rpc('procesar_venta_pos_v2', {
            p_gimnasio_id: targetGymId,
            p_vendedor_id: user!.id,
            p_socio_id: socioId || null,
            p_productos: formattedProducts,
            p_pagos_saldar: pagosSaldar || [],
            p_monto_abono_cc: Number(montoAbonoCC || 0),
            p_membresia: membresia || null,
            p_metodo_pago: metodoPago,
            p_monto_total: Number(montoTotalCobrado)
        });

        if (txError) {
            console.error('Error in POS sales transaction:', txError);
            return NextResponse.json({
                error: txError.message || 'Error al procesar la venta en la base de datos',
                details: txError.details
            }, { status: 400 });
        }
        ventaId = rpcVentaId;

        return NextResponse.json({
            success: true,
            message: 'Transacción POS completada exitosamente',
            ventaId
        }, { status: 200 });

    } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        console.error('Unexpected error in POST sales:', error);
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
