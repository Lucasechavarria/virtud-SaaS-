import { NextResponse } from 'next/server';
import { authenticateAndRequireRole } from '@/lib/auth/api-auth';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/reception/cash-status
 * Obtiene el estado del turno de caja del cajero actual (usuario) en su gimnasio
 * a partir de la tabla auditoria_global y calcula las ventas dinámicamente.
 */
export async function GET(request: Request) {
    try {
        const { error: authError, profile, user } = await authenticateAndRequireRole(request, ['admin', 'superadmin', 'recepcion']);
        if (authError) return authError;

        if (profile?.role !== 'superadmin' && !profile?.gimnasio_id) {
            return NextResponse.json({ error: 'No tienes un gimnasio asignado' }, { status: 403 });
        }

        const { searchParams } = new URL(request.url);
        const urlGym = searchParams.get('gymId');

        let targetGymId = profile?.gimnasio_id;
        const adminClient = createAdminClient();

        if (profile?.role === 'superadmin' && urlGym) {
            const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(urlGym);
            if (isUUID) {
                targetGymId = urlGym;
            } else {
                const { data: gym } = await adminClient
                    .from('gimnasios')
                    .select('id')
                    .eq('slug', urlGym)
                    .is('deleted_at', null)
                    .single();
                if (gym) targetGymId = gym.id;
            }
        }

        if (!targetGymId) {
            return NextResponse.json({ error: 'Gimnasio no especificado' }, { status: 400 });
        }

        // 1. Buscar el último evento de caja (Apertura o Cierre) en auditoria_global
        const { data: lastEvent, error: eventError } = await adminClient
            .from('auditoria_global' as any)
            .select('*')
            .eq('gimnasio_id', targetGymId)
            .eq('usuario_id', user.id)
            .in('accion', ['apertura_caja_recepcion', 'cierre_caja_recepcion'])
            .order('creado_en', { ascending: false })
            .limit(1)
            .maybeSingle();

        if (eventError) {
            console.error('Error al obtener último evento de caja:', eventError);
            return NextResponse.json({ error: 'Error al consultar el estado de caja' }, { status: 500 });
        }

        const isOpen = lastEvent && lastEvent.accion === 'apertura_caja_recepcion';

        if (!isOpen) {
            return NextResponse.json({
                isOpen: false,
                montoInicial: 0,
                fechaApertura: null,
                egresos: [],
                ventasEfectivo: 0,
                ventasTarjeta: 0,
                ventasQR: 0
            });
        }

        const detalles = lastEvent.detalles || {};
        const montoInicial = Number(detalles.monto_inicial || 0);
        const fechaApertura = lastEvent.creado_en;
        const egresos = detalles.egresos || [];

        // 2. Consultar las ventas reales del turno en pagos
        const { data: payments, error: paymentsError } = await adminClient
            .from('pagos')
            .select('monto, metodo_pago')
            .eq('gimnasio_id', targetGymId)
            .eq('aprobado_por', user.id)
            .eq('estado', 'approved')
            .gte('creado_en', fechaApertura);

        if (paymentsError) {
            console.error('Error al consultar ventas de caja:', paymentsError);
            return NextResponse.json({ error: 'Error al consultar las ventas del turno' }, { status: 500 });
        }

        let ventasEfectivo = 0;
        let ventasTarjeta = 0;
        let ventasQR = 0;

        (payments || []).forEach((p: any) => {
            const m = Number(p.monto || 0);
            if (p.metodo_pago === 'efectivo') ventasEfectivo += m;
            else if (p.metodo_pago === 'tarjeta') ventasTarjeta += m;
            else if (p.metodo_pago === 'qr' || p.metodo_pago === 'transferencia') ventasQR += m;
        });

        return NextResponse.json({
            isOpen: true,
            montoInicial,
            fechaApertura,
            egresos,
            ventasEfectivo,
            ventasTarjeta,
            ventasQR,
            aperturaId: lastEvent.id
        });

    } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        console.error('Unexpected error in GET cash-status:', error);
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
