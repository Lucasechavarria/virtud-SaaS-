import { NextResponse } from 'next/server';
import { authenticateAndRequireRole, resolveGymIdForAdmin } from '@/lib/auth/api-auth';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

/**
 * POST /api/admin/reception/cash-egreso
 * Registra un egreso de efectivo (gasto de caja chica) dentro del turno activo.
 */
export async function POST(request: Request) {
    try {
        const { error: authError, profile, user } = await authenticateAndRequireRole(request, ['admin', 'superadmin', 'recepcion']);
        if (authError) return authError;

        const { searchParams } = new URL(request.url);
        const body = await request.json();
        const {
            monto,
            concepto
        } = body;
        const urlGym = searchParams.get('gymId') || body.gymId || body.gym;

        if (!monto || isNaN(Number(monto)) || Number(monto) <= 0 || !concepto || !concepto.trim()) {
            return NextResponse.json({ error: 'Monto y concepto válidos son requeridos' }, { status: 400 });
        }

        const adminClient = createAdminClient();
        const { targetGymId, errorResponse } = await resolveGymIdForAdmin(profile, urlGym);
        if (errorResponse) return errorResponse;

        if (!targetGymId) {
            return NextResponse.json({ error: 'Gimnasio no especificado' }, { status: 400 });
        }

        // 1. Obtener la última apertura de caja activa
        const { data: lastApertura, error: eventError } = await adminClient
            .from('auditoria_global' as any)
            .select('*')
            .eq('gimnasio_id', targetGymId)
            .eq('usuario_id', user.id)
            .eq('accion', 'apertura_caja_recepcion')
            .order('creado_en', { ascending: false })
            .limit(1)
            .maybeSingle();

        if (eventError || !lastApertura) {
            return NextResponse.json({ error: 'No hay un turno de caja activo' }, { status: 400 });
        }

        // 2. Validar que no se haya cerrado posteriormente
        const { data: lastCierre } = await adminClient
            .from('auditoria_global' as any)
            .select('creado_en')
            .eq('gimnasio_id', targetGymId)
            .eq('usuario_id', user.id)
            .eq('accion', 'cierre_caja_recepcion')
            .order('creado_en', { ascending: false })
            .limit(1)
            .maybeSingle();

        if (lastCierre && new Date(lastCierre.creado_en) > new Date(lastApertura.creado_en)) {
            return NextResponse.json({ error: 'El turno de caja ya se encuentra cerrado' }, { status: 400 });
        }

        const egresosPrevios = lastApertura.detalles?.egresos || [];
        const totalEgresosPrevios = egresosPrevios.reduce((acc: number, curr: any) => acc + Number(curr.monto || 0), 0);
        const montoInicial = Number(lastApertura.detalles?.monto_inicial || 0);

        // Consultar las ventas en efectivo aprobadas en este turno
        const { data: payments, error: paymentsError } = await adminClient
            .from('pagos')
            .select('monto')
            .eq('gimnasio_id', targetGymId)
            .eq('aprobado_por', user.id)
            .eq('estado', 'approved')
            .eq('metodo_pago', 'efectivo')
            .gte('aprobado_en', lastApertura.creado_en);

        if (paymentsError) {
            console.error('Error al verificar ventas en efectivo para egreso:', paymentsError);
            return NextResponse.json({ error: 'Error al verificar ventas en efectivo en la base de datos' }, { status: 500 });
        }

        const totalVentasEfectivo = (payments || []).reduce((acc: number, curr: any) => acc + Number(curr.monto || 0), 0);
        const efectivoDisponible = montoInicial + totalVentasEfectivo - totalEgresosPrevios;

        if (Number(monto) > efectivoDisponible) {
            return NextResponse.json({ 
                error: `Saldo de efectivo insuficiente en la caja chica. Efectivo disponible: $${efectivoDisponible}` 
            }, { status: 400 });
        }

        const nuevoEgreso = {
            id: `${Date.now()}-${Math.random()}`,
            concepto: concepto.trim(),
            monto: Number(monto),
            fecha: new Date().toISOString()
        };
        
        const { error: rpcError } = await adminClient.rpc('registrar_egreso_caja', {
            p_apertura_id: lastApertura.id,
            p_egreso: nuevoEgreso
        });

        if (rpcError) {
            console.error('Error al registrar egreso de caja con RPC:', rpcError);
            return NextResponse.json({ error: 'Error al registrar el egreso en la base de datos' }, { status: 500 });
        }

        return NextResponse.json({
            success: true,
            egreso: nuevoEgreso
        });

    } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        console.error('Unexpected error in POST cash-egreso:', error);
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
