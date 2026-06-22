import { NextResponse } from 'next/server';
import { authenticateAndRequireRole } from '@/lib/auth/api-auth';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/users/[id]/account-status
 * Obtiene el estado de cuenta corriente, deudas y membresía de un socio específico.
 */
export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> | { id: string } }
) {
    try {
        const resolvedParams = params instanceof Promise ? await params : params;
        const studentId = resolvedParams.id;
        
        if (!studentId) {
            return NextResponse.json({ error: 'ID de alumno es requerido' }, { status: 400 });
        }

        const { error: authError, profile, supabase } = await authenticateAndRequireRole(request, ['admin', 'superadmin', 'recepcion', 'coach']);
        if (authError) return authError;

        // Blindaje contra gimnasio_id NULL para admin locales / recepcion / coach
        if (profile?.role !== 'superadmin' && !profile?.gimnasio_id) {
            return NextResponse.json({ error: 'Forbidden: Administrador sin gimnasio asignado' }, { status: 403 });
        }

        const adminClient = createAdminClient();

        // 1. Obtener el perfil del alumno para verificar pertenencia al gimnasio
        const { data: student, error: studentError } = await adminClient
            .from('perfiles')
            .select('id, gimnasio_id, nombre_completo, correo, dni, estado_membresia, fecha_fin_membresia')
            .eq('id', studentId)
            .single();

        if (studentError || !student) {
            return NextResponse.json({ error: 'Alumno no encontrado' }, { status: 404 });
        }

        // Control de Aislamiento Multi-tenant
        if (profile?.role !== 'superadmin' && student.gimnasio_id !== profile?.gimnasio_id) {
            return NextResponse.json({ error: 'Forbidden: El alumno pertenece a otra sucursal' }, { status: 403 });
        }

        // 2. Obtener saldo de cuenta corriente y facturas/pagos pendientes en paralelo
        const [cuentaResult, pagosResult] = await Promise.all([
            adminClient
                .from('cuentas_corrientes')
                .select('saldo_actual, limite_credito')
                .eq('alumno_id', studentId)
                .maybeSingle(),
            adminClient
                .from('pagos')
                .select('id, monto, concepto, creado_en')
                .eq('usuario_id', studentId)
                .eq('estado', 'pendiente')
        ]);

        const cuenta = cuentaResult.data;
        const pagosPendientes = pagosResult.data || [];

        const saldoCuentaCorriente = cuenta ? Number(cuenta.saldo_actual) : 0;
        const limiteCredito = cuenta ? Number(cuenta.limite_credito) : 0;

        // Calcular deuda total (saldo negativo en cuenta corriente + pagos pendientes)
        let deudaTotal = 0;
        if (saldoCuentaCorriente < 0) {
            deudaTotal += Math.abs(saldoCuentaCorriente);
        }
        const sumaPagosPendientes = pagosPendientes.reduce((acc, p) => acc + Number(p.monto), 0);
        deudaTotal += sumaPagosPendientes;

        return NextResponse.json({
            student: {
                id: student.id,
                nombre_completo: student.nombre_completo,
                correo: student.correo,
                dni: student.dni,
                estado_membresia: student.estado_membresia,
                fecha_fin_membresia: student.fecha_fin_membresia
            },
            saldoCuentaCorriente,
            limiteCredito,
            pagosPendientes,
            deudaTotal
        });

    } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        console.error('Unexpected error in GET student account-status:', error);
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
