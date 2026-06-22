import { NextResponse } from 'next/server';
import { authenticateAndRequireRole } from '@/lib/auth/api-auth';
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

        let targetGymId = profile?.gimnasio_id;
        const adminClient = createAdminClient();

        if (profile?.role === 'superadmin' && gymId) {
            const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
            if (UUID_REGEX.test(gymId)) {
                targetGymId = gymId;
            } else {
                // Resolver slug a UUID
                const { data: gym } = await adminClient
                    .from('gimnasios')
                    .select('id')
                    .eq('slug', gymId)
                    .single();
                if (gym) targetGymId = gym.id;
            }
        }

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
        const montoMembresia = membresia ? Number(membresia.precio) : 0;
        const montoRPC = Number(montoTotalCobrado) - montoMembresia;

        // A. Ejecutar el RPC para productos, cuotas y abono CC (si el monto es > 0 o hay ítems)
        if (montoRPC > 0 || formattedProducts.length > 0 || (pagosSaldar && pagosSaldar.length > 0)) {
            const { data: rpcVentaId, error: txError } = await adminClient.rpc('procesar_venta_pos', {
                p_gimnasio_id: targetGymId,
                p_vendedor_id: user!.id,
                p_socio_id: socioId || null,
                p_productos: formattedProducts,
                p_pagos_saldar: pagosSaldar || [],
                p_monto_abono_cc: Number(montoAbonoCC || 0),
                p_metodo_pago: metodoPago,
                p_monto_total: montoRPC
            });

            if (txError) {
                console.error('Error in POS sales transaction:', txError);
                return NextResponse.json({
                    error: txError.message || 'Error al procesar la venta en la base de datos',
                    details: txError.details
                }, { status: 400 });
            }
            ventaId = rpcVentaId;
        }

        // B. Procesar la venta de la membresía de manera directa si se especifica y hay un socio
        if (membresia && socioId) {
            // 1. Obtener la membresía actual del socio para soportar renovaciones anticipadas sin pérdida de días
            const { data: currentProfile } = await adminClient
                .from('perfiles')
                .select('fecha_fin_membresia, estado_membresia')
                .eq('id', socioId)
                .single();

            let fechaInicio = new Date();
            if (currentProfile?.estado_membresia === 'active' && currentProfile.fecha_fin_membresia) {
                const currentEndDate = new Date(currentProfile.fecha_fin_membresia);
                if (currentEndDate > fechaInicio) {
                    fechaInicio = currentEndDate;
                }
            }

            const fechaFin = new Date(fechaInicio);
            fechaFin.setMonth(fechaFin.getMonth() + (Number(membresia.duracionMeses) || 1));

            // 2. Actualizar el perfil del socio con el nuevo plan
            const { error: profileError } = await adminClient
                .from('perfiles')
                .update({
                    plan_id: membresia.planId,
                    estado_membresia: 'active',
                    fecha_fin_membresia: fechaFin.toISOString()
                })
                .eq('id', socioId);

            if (profileError) {
                console.error('Error al activar membresía del alumno:', profileError);
                return NextResponse.json({ error: 'Error al activar membresía del alumno' }, { status: 400 });
            }

            // 3. Crear el registro contable en la tabla pagos como 'approved'
            const { error: pagoError } = await adminClient
                .from('pagos')
                .insert({
                    usuario_id: socioId,
                    gimnasio_id: targetGymId,
                    monto: montoMembresia,
                    concepto: `Adquisición Plan: ${membresia.nombre}`,
                    metodo_pago: metodoPago,
                    estado: 'approved',
                    aprobado_por: user!.id,
                    aprobado_en: new Date().toISOString()
                });

            if (pagoError) {
                console.error('Error al registrar pago de membresía:', pagoError);
                return NextResponse.json({ error: 'Error al registrar pago de membresía' }, { status: 400 });
            }
        }

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
