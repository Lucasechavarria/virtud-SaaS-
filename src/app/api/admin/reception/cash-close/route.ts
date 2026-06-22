import { NextResponse } from 'next/server';
import { authenticateAndRequireRole } from '@/lib/auth/api-auth';
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

        if (profile?.role !== 'superadmin' && !profile?.gimnasio_id) {
            return NextResponse.json({ error: 'No tienes un gimnasio asignado' }, { status: 403 });
        }

        const body = await request.json();
        const {
            montoInicial,
            ventasEfectivo,
            ventasTarjeta,
            ventasQR,
            egresos,
            efectivoDeclarado,
            tarjetaDeclarado,
            qrDeclarado,
            diferenciaEfectivo,
            diferenciaTarjeta,
            diferenciaQR,
            fechaApertura,
            fechaCierre
        } = body;

        // Validar que se hayan declarado los montos
        if (efectivoDeclarado === undefined || tarjetaDeclarado === undefined || qrDeclarado === undefined) {
            return NextResponse.json({ error: 'Faltan montos de declaración física' }, { status: 400 });
        }

        const adminClient = createAdminClient();
        const targetGymId = profile?.gimnasio_id;

        const recepcionistaNombre = profile?.nombre_completo || `${profile?.nombre || 'Recepcionista'} ${profile?.apellido || ''}`.trim();

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
                    monto_inicial: Number(montoInicial || 0),
                    ventas_efectivo: Number(ventasEfectivo || 0),
                    ventas_tarjeta: Number(ventasTarjeta || 0),
                    ventas_qr: Number(ventasQR || 0),
                    egresos: egresos || [],
                    efectivo_declarado: Number(efectivoDeclarado),
                    tarjeta_declarado: Number(tarjetaDeclarado),
                    qr_declarado: Number(qrDeclarado),
                    diferencia_efectivo: Number(diferenciaEfectivo || 0),
                    diferencia_tarjeta: Number(diferenciaTarjeta || 0),
                    diferencia_qr: Number(diferenciaQR || 0),
                    fecha_apertura: fechaApertura,
                    fecha_cierre: fechaCierre || new Date().toISOString(),
                    recepcionista: recepcionistaNombre
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
