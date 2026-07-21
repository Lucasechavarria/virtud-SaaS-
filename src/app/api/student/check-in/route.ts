import { NextResponse } from 'next/server';
import { authenticateAndRequireRole } from '@/lib/auth/api-auth';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
    try {
        // 1. Autenticar al alumno que escanea o envía el PIN
        const { user, profile, error } = await authenticateAndRequireRole(
            request,
            ['member', 'admin', 'coach', 'recepcion', 'superadmin']
        );

        if (error || !user || !profile) {
            return NextResponse.json({
                status: 'denied',
                reason: 'unauthorized',
                message: 'Debes iniciar sesión para ingresar'
            }, { status: 401 });
        }

        const body = await request.json();
        const { gymToken, pinCode, gymSlug } = body;

        if (!gymToken && !pinCode) {
            return NextResponse.json({
                status: 'denied',
                reason: 'invalid',
                message: 'Debes escanear el QR o ingresar el PIN de 6 dígitos del gimnasio'
            }, { status: 400 });
        }

        const adminClient = createAdminClient();

        // 2. Cargar perfil del alumno completo
        const { data: student, error: studentError } = await adminClient
            .from('perfiles')
            .select('*, gimnasios(nombre)')
            .eq('id', user.id)
            .single();

        if (studentError || !student) {
            return NextResponse.json({
                status: 'denied',
                reason: 'invalid',
                message: 'Perfil de alumno no encontrado'
            });
        }

        // Obtener el plan del socio para mostrar en los datos de la respuesta
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
            nombre: student.nombre_completo || `${student.nombre || ''} ${student.apellido || ''}`.trim() || student.correo || 'Socio VIRTUD',
            avatar: student.url_avatar || null,
            plan: planName,
            gymName: student.gimnasios?.nombre || 'Virtud Gym'
        };

        const targetGymId = student.gimnasio_id;

        // 3. Validar estado de Membresía
        if (student.estado_membresia !== 'active') {
            return NextResponse.json({
                status: 'denied',
                reason: 'inactive',
                message: 'Membresía Inactiva o Vencida',
                member: memberInfo
            });
        }

        // 4. Validar Ficha Médica (SSOT: exencion_aceptada || parq_firmado)
        const hasMedicalWaiver = Boolean(student.exencion_aceptada || student.parq_firmado);
        if (!hasMedicalWaiver) {
            return NextResponse.json({
                status: 'denied',
                reason: 'medico',
                message: 'Falta Apto Médico (PAR-Q)',
                member: memberInfo
            });
        }

        // 5. Validar Deudas
        const { data: cuenta } = await adminClient
            .from('cuentas_corrientes')
            .select('saldo_actual')
            .eq('alumno_id', student.id)
            .maybeSingle();

        let totalDeuda = 0;
        if (cuenta && cuenta.saldo_actual < 0) {
            totalDeuda += Math.abs(cuenta.saldo_actual);
        }

        const { data: pagosPendientes } = await adminClient
            .from('pagos')
            .select('monto')
            .eq('usuario_id', student.id)
            .eq('estado', 'pendiente');

        if (pagosPendientes && pagosPendientes.length > 0) {
            totalDeuda += pagosPendientes.reduce((acc, p) => acc + Number(p.monto), 0);
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

        // 6. Validar Anti-Passback (15 min entre asistencias)
        const haceQuinceMinutos = new Date(Date.now() - 15 * 60 * 1000).toISOString();
        const { data: recentCheckIn } = await adminClient
            .from('asistencias')
            .select('entrada')
            .eq('usuario_id', student.id)
            .gte('entrada', haceQuinceMinutos)
            .limit(1)
            .maybeSingle();

        if (recentCheckIn) {
            return NextResponse.json({
                status: 'denied',
                reason: 'passback',
                message: 'Ya registraste tu ingreso recientemente',
                member: memberInfo
            });
        }

        // 7. Insertar Asistencia
        const { data: nuevaAsistencia, error: asistenciaError } = await adminClient
            .from('asistencias')
            .insert({
                usuario_id: student.id,
                gimnasio_id: targetGymId,
                rol_asistencia: 'member',
                entrada: new Date().toISOString(),
                source: gymToken ? 'gym_qr_scan' : 'gym_pin_input'
            })
            .select()
            .single();

        if (asistenciaError) {
            console.error('Error al insertar asistencia:', asistenciaError);
            return NextResponse.json({
                status: 'denied',
                reason: 'error',
                message: 'Error al registrar la asistencia',
                member: memberInfo
            });
        }

        // 8. Actualizar Racha de Gamificación
        const { data: gamificacion } = await adminClient
            .from('gamificacion_del_usuario')
            .select('racha_actual, puntos_totales')
            .eq('usuario_id', student.id)
            .maybeSingle();

        const nuevaRacha = (gamificacion?.racha_actual || 0) + 1;
        const nuevosPuntos = (gamificacion?.puntos_totales || 0) + 50;

        await adminClient
            .from('gamificacion_del_usuario')
            .upsert({
                usuario_id: student.id,
                gimnasio_id: targetGymId,
                racha_actual: nuevaRacha,
                puntos_totales: nuevosPuntos,
                actualizado_en: new Date().toISOString()
            });

        return NextResponse.json({
            status: 'allowed',
            message: '¡Acceso Autorizado!',
            racha: nuevaRacha,
            puntosGanados: 50,
            member: memberInfo
        });

    } catch (error: any) {
        console.error('❌ Error en Check-In del Alumno:', error);
        return NextResponse.json({
            status: 'denied',
            reason: 'server_error',
            message: error.message || 'Error en el servidor'
        }, { status: 500 });
    }
}
