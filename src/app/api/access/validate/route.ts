import { NextResponse } from 'next/server';
import { authenticateAndRequireRole } from '@/lib/auth/api-auth';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
    try {
        // Solo administradores o personal de recepción pueden validar el acceso
        const { error: authError, profile } = await authenticateAndRequireRole(request, ['admin', 'recepcion', 'superadmin']);
        if (authError) return authError;

        const body = await request.json();
        const { token, socioId } = body;

        if (!token && !socioId) {
            return NextResponse.json({ error: 'Token o socioId requerido' }, { status: 400 });
        }

        const adminClient = createAdminClient();
        let student;
        let qrData: any = null;

        if (token) {
            // 1. Buscar el token dinámico y el perfil del alumno correspondiente
            const { data: qrResult, error: qrError } = await adminClient
                .from('accesos_qr')
                .select('*, profile:perfiles!alumno_id(*)')
                .eq('token_dinamico', token)
                .eq('usado', false)
                .single();

            if (qrError || !qrResult) {
                return NextResponse.json({
                    status: 'denied',
                    reason: 'invalid',
                    message: 'QR Inválido o ya utilizado'
                });
            }

            // 2. Verificar expiración del token (vigencia de 30 segundos)
            const expiraEn = new Date(qrResult.expira_en);
            if (expiraEn.getTime() < Date.now()) {
                return NextResponse.json({
                    status: 'denied',
                    reason: 'invalid',
                    message: 'Código QR Expirado'
                });
            }

            student = qrResult.profile;
            qrData = qrResult;
        } else {
            // Cargar directamente el perfil del alumno (búsqueda manual)
            const { data: studentProfile, error: studentError } = await adminClient
                .from('perfiles')
                .select('*')
                .eq('id', socioId)
                .single();

            if (studentError || !studentProfile) {
                return NextResponse.json({
                    status: 'denied',
                    reason: 'invalid',
                    message: 'Socio no encontrado'
                });
            }
            student = studentProfile;
        }

        if (!student) {
            return NextResponse.json({
                status: 'denied',
                reason: 'invalid',
                message: 'Socio no encontrado'
            });
        }

        // Obtener el plan del socio para mostrar en la interfaz
        let planName = 'Sin Plan';
        if (student.plan_id) {
            const { data: planData } = await adminClient
                .from('planes_gimnasio')
                .select('nombre')
                .eq('id', student.plan_id)
                .single();
            if (planData) planName = planData.nombre;
        }

        const memberInfo = {
            id: student.id,
            nombre: student.nombre_completo || `${student.nombre || ''} ${student.apellido || ''}`.trim() || student.correo || 'Socio sin nombre',
            avatar: student.url_avatar || null,
            plan: planName
        };

        // Validación de Aislamiento de Sucursales (inter-gimnasio QR Access Block)
        // El alumno solo puede registrar ingreso en la sucursal a la que pertenece
        if (profile?.gimnasio_id && student.gimnasio_id !== profile.gimnasio_id) {
            return NextResponse.json({
                status: 'denied',
                reason: 'wrong_gym',
                message: 'El alumno pertenece a otra sucursal',
                member: memberInfo
            });
        }

        // 3. Validación: Membresía Activa
        if (student.estado_membresia !== 'active') {
            return NextResponse.json({
                status: 'denied',
                reason: 'inactive',
                message: 'Membresía Inactiva',
                member: memberInfo
            });
        }

        // 4. Validación: Apto Médico (PAR-Q) firmado
        if (!student.parq_firmado) {
            return NextResponse.json({
                status: 'denied',
                reason: 'medico',
                message: 'Falta Apto Médico (PAR-Q)',
                member: memberInfo
            });
        }

        // 5. Validación: Deudas
        // A. Consultar saldo de cuenta corriente
        const { data: cuenta } = await adminClient
            .from('cuentas_corrientes')
            .select('saldo_actual')
            .eq('alumno_id', student.id)
            .maybeSingle();

        let totalDeuda = 0;
        if (cuenta && cuenta.saldo_actual < 0) {
            totalDeuda += Math.abs(cuenta.saldo_actual);
        }

        // B. Consultar facturas/pagos pendientes
        const { data: pagosPendientes } = await adminClient
            .from('pagos')
            .select('monto')
            .eq('usuario_id', student.id)
            .eq('estado', 'pendiente');

        if (pagosPendientes && pagosPendientes.length > 0) {
            const sumPendientes = pagosPendientes.reduce((acc, p) => acc + Number(p.monto), 0);
            totalDeuda += sumPendientes;
        }

        if (totalDeuda > 0) {
            return NextResponse.json({
                status: 'denied',
                reason: 'deuda',
                message: 'Posee Saldo Adeudado',
                deuda: totalDeuda,
                member: memberInfo
            });
        }

        // 6. Autorización Exitosa
        // A. Quemar el token si se utilizó QR
        if (token && qrData) {
            const { error: qrUpdateError } = await adminClient
                .from('accesos_qr')
                .update({ usado: true })
                .eq('id', qrData.id);

            if (qrUpdateError) {
                console.error('Error al invalidar token QR:', qrUpdateError);
                return NextResponse.json({
                    status: 'denied',
                    reason: 'invalid',
                    message: 'Error al procesar el código QR'
                });
            }
        }

        // B. Registrar asistencia en la base de datos
        const { error: asistenciaError } = await adminClient
            .from('asistencias')
            .insert({
                usuario_id: student.id,
                gimnasio_id: token && qrData ? qrData.gimnasio_id : student.gimnasio_id,
                rol_asistencia: 'member',
                entrada: new Date().toISOString(),
                source: token ? 'qr' : 'reception_manual'
            });

        if (asistenciaError) {
            console.error('Error al insertar asistencia:', asistenciaError);
            
            // Rollback del token si se utilizó QR
            if (token && qrData) {
                await adminClient
                    .from('accesos_qr')
                    .update({ usado: false })
                    .eq('id', qrData.id);
            }

            return NextResponse.json({
                status: 'denied',
                reason: 'invalid',
                message: 'Error al registrar la asistencia'
            });
        }

        // C. Obtener racha actual para felicitar al alumno
        const { data: gamificacion } = await adminClient
            .from('gamificacion_del_usuario')
            .select('racha_actual')
            .eq('usuario_id', student.id)
            .maybeSingle();

        return NextResponse.json({
            status: 'allowed',
            message: 'Acceso Autorizado',
            racha: gamificacion?.racha_actual || 0,
            member: memberInfo
        });

    } catch (error: any) {
        console.error('❌ Check-in validation error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
