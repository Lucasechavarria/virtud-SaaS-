import { NextResponse } from 'next/server';
import { authenticateAndRequireRole } from '@/lib/auth/api-auth';
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

        if (profile?.role !== 'superadmin' && !profile?.gimnasio_id) {
            return NextResponse.json({ error: 'No tienes un gimnasio asignado' }, { status: 403 });
        }

        const body = await request.json();
        const { concepto, monto } = body;

        if (!concepto || monto === undefined || isNaN(Number(monto)) || Number(monto) <= 0) {
            return NextResponse.json({ error: 'Concepto y monto válidos requeridos' }, { status: 400 });
        }

        const targetGymId = profile?.gimnasio_id;
        const adminClient = createAdminClient();

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

        // 3. Añadir el egreso a los detalles
        const detalles = lastApertura.detalles || {};
        const egresos = detalles.egresos || [];
        const nuevoEgreso = {
            id: `${Date.now()}-${Math.random()}`,
            concepto: concepto.trim(),
            monto: Number(monto),
            fecha: new Date().toISOString()
        };
        
        detalles.egresos = [...egresos, nuevoEgreso];

        const { error: updateError } = await adminClient
            .from('auditoria_global' as any)
            .update({ detalles })
            .eq('id', lastApertura.id);

        if (updateError) {
            console.error('Error al actualizar egresos de caja:', updateError);
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
