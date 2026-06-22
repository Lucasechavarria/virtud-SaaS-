import { NextResponse } from 'next/server';
import { authenticateAndRequireRole } from '@/lib/auth/api-auth';
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

        if (profile?.role !== 'superadmin' && !profile?.gimnasio_id) {
            return NextResponse.json({ error: 'No tienes un gimnasio asignado' }, { status: 403 });
        }

        const body = await request.json();
        const { montoInicial } = body;

        if (montoInicial === undefined || isNaN(Number(montoInicial))) {
            return NextResponse.json({ error: 'Monto inicial requerido' }, { status: 400 });
        }

        const adminClient = createAdminClient();
        const targetGymId = profile?.gimnasio_id;
        const recepcionistaNombre = profile?.nombre_completo || `${profile?.nombre || 'Recepcionista'} ${profile?.apellido || ''}`.trim();

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
