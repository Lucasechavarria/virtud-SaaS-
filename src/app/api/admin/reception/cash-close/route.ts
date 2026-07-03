import { NextResponse } from 'next/server';
import { authenticateAndRequireRole, resolveGymIdForAdmin } from '@/lib/auth/api-auth';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

/**
 * POST /api/admin/reception/cash-close
 * Registra y audita el cierre de caja (arqueo) de un turno de recepción.
 */
export async function POST(request: Request) {
    try {
        const { error: authError, profile, user } = await authenticateAndRequireRole(request, ['admin', 'superadmin', 'recepcion']);
        if (authError) return authError;

        const { searchParams } = new URL(request.url);
        const body = await request.json();
        const {
            efectivoDeclarado,
            tarjetaDeclarado,
            qrDeclarado
        } = body;
        const urlGym = searchParams.get('gymId') || body.gymId || body.gym;

        // Validar que se hayan declarado los montos
        if (efectivoDeclarado === undefined || tarjetaDeclarado === undefined || qrDeclarado === undefined) {
            return NextResponse.json({ error: 'Faltan montos de declaración física' }, { status: 400 });
        }

        const adminClient = createAdminClient();
        const { targetGymId, errorResponse } = await resolveGymIdForAdmin(profile, urlGym);
        if (errorResponse) return errorResponse;

        if (!targetGymId) {
            return NextResponse.json({ error: 'Gimnasio no especificado' }, { status: 400 });
        }

        // 1. Validar que posea un turno de caja activo para cerrar
        const { data: lastEvent, error: eventError } = await adminClient
            .from('auditoria_global' as any)
            .select('*')
            .eq('gimnasio_id', targetGymId)
            .eq('usuario_id', user!.id)
            .in('accion', ['apertura_caja_recepcion', 'cierre_caja_recepcion'])
            .order('creado_en', { ascending: false })
            .limit(1)
            .maybeSingle();

        if (eventError) {
            console.error('Error al obtener último evento de caja para el cierre:', eventError);
            return NextResponse.json({ error: 'Error al consultar estado previo de caja' }, { status: 500 });
        }

        if (!lastEvent || lastEvent.accion !== 'apertura_caja_recepcion') {
            return NextResponse.json({ error: 'No posees un turno de caja activo para cerrar' }, { status: 400 });
        }

        const aperturaId = lastEvent.id;
        const fechaAperturaDb = lastEvent.creado_en;
        const detallesApertura = lastEvent.detalles || {};
        const montoInicialDb = Number(detallesApertura.monto_inicial || 0);
        const egresosDb = detallesApertura.egresos || [];
        const totalEgresosDb = egresosDb.reduce((acc: number, curr: any) => acc + Number(curr.monto || 0), 0);

        // 2. Consultar ventas reales de la base de datos (aprobadas en este turno)
        const { data: payments, error: paymentsError } = await adminClient
            .from('pagos')
            .select('monto, metodo_pago')
            .eq('gimnasio_id', targetGymId)
            .eq('aprobado_por', user!.id)
            .eq('estado', 'approved')
            .gte('aprobado_en', fechaAperturaDb);

        if (paymentsError) {
            console.error('Error al consultar ventas reales para el cierre:', paymentsError);
            return NextResponse.json({ error: 'Error al validar las ventas en la base de datos' }, { status: 500 });
        }

        let ventasEfectivoReal = 0;
        let ventasTarjetaReal = 0;
        let ventasQRReal = 0;

        (payments || []).forEach((p: any) => {
            const m = Number(p.monto || 0);
            if (p.metodo_pago === 'efectivo') ventasEfectivoReal += m;
            else if (p.metodo_pago === 'tarjeta') ventasTarjetaReal += m;
            else if (p.metodo_pago === 'qr' || p.metodo_pago === 'transferencia') ventasQRReal += m;
        });

        // 3. Calcular balances y diferencias en base a declaración física del cajero
        const efDec = Number(efectivoDeclarado || 0);
        const tjDec = Number(tarjetaDeclarado || 0);
        const qrDec = Number(qrDeclarado || 0);

        const efEsperado = montoInicialDb + ventasEfectivoReal - totalEgresosDb;
        const tjEsperado = ventasTarjetaReal;
        const qrEsperado = ventasQRReal;

        const difEf = efDec - efEsperado;
        const difTj = tjDec - tjEsperado;
        const difQr = qrDec - qrEsperado;

        // Obtener el nombre completo del recepcionista de perfiles
        const { data: userProfile } = await adminClient
            .from('perfiles')
            .select('nombre_completo')
            .eq('id', user.id)
            .single();

        const recepcionistaNombre = userProfile?.nombre_completo || 'Recepcionista';

        // Registrar auditoría de cierre de caja
        const { error: auditError } = await adminClient
            .from('auditoria_global' as any)
            .insert({
                accion: 'cierre_caja_recepcion',
                entidad_tipo: 'gimnasio',
                entidad_id: targetGymId,
                usuario_id: user!.id,
                gimnasio_id: targetGymId,
                detalles: {
                    monto_inicial: montoInicialDb,
                    ventas_efectivo: ventasEfectivoReal,
                    ventas_tarjeta: ventasTarjetaReal,
                    ventas_qr: ventasQRReal,
                    egresos: egresosDb,
                    efectivo_declarado: efDec,
                    tarjeta_declarado: tjDec,
                    qr_declarado: qrDec,
                    diferencia_efectivo: difEf,
                    diferencia_tarjeta: difTj,
                    diferencia_qr: difQr,
                    fecha_apertura: fechaAperturaDb,
                    fecha_cierre: new Date().toISOString(),
                    recepcionista: recepcionistaNombre,
                    apertura_id: aperturaId
                }
            });

        if (auditError) {
            console.error('Error al registrar auditoría de cierre de caja:', auditError);
            return NextResponse.json({ error: 'Error al guardar el arqueo de caja en la base de datos' }, { status: 500 });
        }

        return NextResponse.json({
            success: true,
            message: 'Arqueo de caja y cierre de turno registrado exitosamente'
        });

    } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        console.error('Unexpected error in POST cash-close:', error);
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
