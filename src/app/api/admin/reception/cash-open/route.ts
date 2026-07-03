import { NextResponse } from 'next/server';
import { authenticateAndRequireRole, resolveGymIdForAdmin } from '@/lib/auth/api-auth';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

/**
 * POST /api/admin/reception/cash-open
 * Registra y audita la apertura de caja de un turno de recepción.
 */
export async function POST(request: Request) {
    try {
        const { error: authError, profile, user } = await authenticateAndRequireRole(request, ['admin', 'superadmin', 'recepcion']);
        if (authError) return authError;

        const { searchParams } = new URL(request.url);
        const body = await request.json();
        const { montoInicial } = body;
        const urlGym = searchParams.get('gymId') || body.gymId || body.gym;

        if (montoInicial === undefined || isNaN(Number(montoInicial))) {
            return NextResponse.json({ error: 'Monto inicial requerido y debe ser numérico' }, { status: 400 });
        }

        if (Number(montoInicial) < 0) {
            return NextResponse.json({ error: 'El monto inicial no puede ser negativo' }, { status: 400 });
        }

        const adminClient = createAdminClient();
        const { targetGymId, errorResponse } = await resolveGymIdForAdmin(profile, urlGym);
        if (errorResponse) return errorResponse;

        if (!targetGymId) {
            return NextResponse.json({ error: 'Gimnasio no especificado' }, { status: 400 });
        }

        // Obtener el nombre completo del recepcionista de perfiles
        const { data: userProfile } = await adminClient
            .from('perfiles')
            .select('nombre_completo')
            .eq('id', user.id)
            .single();

        const recepcionistaNombre = userProfile?.nombre_completo || 'Recepcionista';

        // Validar si el recepcionista ya tiene un turno de caja abierto
        const { data: lastEvent, error: eventError } = await adminClient
            .from('auditoria_global' as any)
            .select('accion')
            .eq('gimnasio_id', targetGymId)
            .eq('usuario_id', user.id)
            .in('accion', ['apertura_caja_recepcion', 'cierre_caja_recepcion'])
            .order('creado_en', { ascending: false })
            .limit(1)
            .maybeSingle();

        if (eventError) {
            console.error('Error al verificar estado previo de caja:', eventError);
            return NextResponse.json({ error: 'Error al consultar estado de caja en la base de datos' }, { status: 500 });
        }

        if (lastEvent && lastEvent.accion === 'apertura_caja_recepcion') {
            return NextResponse.json({ error: 'Ya posees un turno de caja abierto para esta sucursal' }, { status: 400 });
        }

        // Registrar auditoría de apertura de caja
        const { error: auditError } = await adminClient
            .from('auditoria_global' as any)
            .insert({
                accion: 'apertura_caja_recepcion',
                entidad_tipo: 'gimnasio',
                entidad_id: targetGymId,
                usuario_id: user!.id,
                gimnasio_id: targetGymId,
                detalles: {
                    monto_inicial: Number(montoInicial),
                    recepcionista: recepcionistaNombre,
                    fecha_apertura: new Date().toISOString()
                }
            });

        if (auditError) {
            console.error('Error al registrar auditoría de apertura de caja:', auditError);
            return NextResponse.json({ error: 'Error al registrar la apertura de caja en la base de datos' }, { status: 500 });
        }

        return NextResponse.json({
            success: true,
            message: 'Apertura de caja registrada exitosamente'
        });

    } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        console.error('Unexpected error in POST cash-open:', error);
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
