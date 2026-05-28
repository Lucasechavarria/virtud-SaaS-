import { NextResponse } from 'next/server';
import { authenticateAndRequireRole } from '@/lib/auth/api-auth';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

/**
 * POST /api/saas-admin/sandbox/trigger
 * Dispara eventos de simulación financiera u operativa de infraestructura.
 */
export async function POST(request: Request) {
    try {
        const { error: authError } = await authenticateAndRequireRole(request, ['superadmin']);
        if (authError) return authError;

        const { action, gymId } = await request.json();

        if (!action) {
            return NextResponse.json({ error: 'Missing action parameter' }, { status: 400 });
        }

        const supabase = createAdminClient();

        // Obtener datos del gimnasio si se pasa gymId
        let gymName = 'Gimnasio Red';
        if (gymId) {
            const { data: gym } = await supabase
                .from('gimnasios')
                .select('nombre')
                .eq('id', gymId)
                .single();
            if (gym) gymName = gym.nombre;
        }

        if (action === 'simulate_payment') {
            if (!gymId) {
                return NextResponse.json({ error: 'Missing gymId for payment simulation' }, { status: 400 });
            }

            // 1. Simular el cobro de la membresía SaaS
            const amount = Math.floor(Math.random() * 50) + 49; // Entre 49 y 99 USD
            const discount = Math.random() > 0.7 ? 10 : 0;
            const finalAmount = amount - (amount * discount / 100);

            const { data: payment, error: pError } = await supabase
                .from('pagos_saas' as any)
                .insert({
                    gimnasio_id: gymId,
                    monto: amount,
                    monto_final: finalAmount,
                    descuento_aplicado: discount,
                    estado: 'completado',
                    metodo_pago: 'mercadopago',
                    fecha_pago: new Date().toISOString(),
                    periodo_inicio: new Date().toISOString().split('T')[0],
                    periodo_fin: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
                })
                .select()
                .single();

            if (pError) throw pError;

            // 2. Actualizar el estado de pago del gimnasio
            const nextPaymentDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
            const { error: gError } = await supabase
                .from('gimnasios')
                .update({
                    estado_pago_saas: 'active',
                    fecha_proximo_pago: nextPaymentDate
                })
                .eq('id', gymId);

            if (gError) throw gError;

            // 3. Actualizar o insertar métricas globales para reflejar el ingreso de hoy
            const todayStr = new Date().toISOString().split('T')[0];
            const { data: metric } = (await supabase
                .from('saas_metrics' as any)
                .select('*')
                .eq('fecha', todayStr)
                .maybeSingle()) as any;

            if (metric) {
                // Actualizar métricas existentes agregando el ingreso
                await supabase
                    .from('saas_metrics' as any)
                    .update({
                        ingresos_totales_mes: Number(metric.ingresos_totales_mes || 0) + finalAmount,
                        mrr: Number(metric.mrr || 0) + finalAmount
                    })
                    .eq('id', metric.id);
            } else {
                // Crear el registro de métricas de hoy
                await supabase
                    .from('saas_metrics' as any)
                    .insert({
                        fecha: todayStr,
                        ingresos_totales_mes: finalAmount,
                        mrr: finalAmount,
                        gyms_activos: 1
                    });
            }

            return NextResponse.json({
                success: true,
                message: `Cobro SaaS de $${finalAmount.toFixed(2)} USD simulado con éxito para "${gymName}".`,
                payment
            });
        }

        if (action === 'simulate_alert') {
            if (!gymId) {
                return NextResponse.json({ error: 'Missing gymId for support simulation' }, { status: 400 });
            }

            // Inyectar un ticket crítico simulado en la bandeja de Soporte B2B
            const alertSubjects = [
                'Fallo de latencia crítica en análisis de video biomecánico',
                'Error 502 Bad Gateway al registrar asistencias via QR',
                'Desconexión imprevista del gateway de cobros MercadoPago',
                'Exceso crítico de alumnos concurrentes - Límite de plan superado'
            ];
            const alertDescs = [
                'El servicio de análisis en la nube no responde a la carga de videos biomecánicos desde la sucursal central.',
                'Los alumnos reportan pantalla negra al intentar escanear el código QR de entrada en los molinetes.',
                'Los cobros automáticos están fallando con error de autenticación del SDK. Se requiere revisión inmediata del token.',
                'El gimnasio ha superado su límite de alumnos concurrentes activos del plan contratado. Se sugiere ajuste de cuota.'
            ];

            const idx = Math.floor(Math.random() * alertSubjects.length);

            const { data: ticket, error: tError } = await supabase
                .from('tickets_soporte_saas' as any)
                .insert({
                    gimnasio_id: gymId,
                    asunto: alertSubjects[idx],
                    descripcion: alertDescs[idx],
                    prioridad: 'critica',
                    estado: 'abierto',
                    categoria: 'tecnico',
                    creado_en: new Date().toISOString(),
                    actualizado_en: new Date().toISOString()
                })
                .select()
                .single();

            if (tError) throw tError;

            return NextResponse.json({
                success: true,
                message: `Alerta técnica crítica simulada para "${gymName}" e inyectada con éxito en la mesa de ayuda B2B.`,
                ticket
            });
        }

        if (action === 'sync_metrics') {
            // Sincronización manual forzada: actualizamos la fecha del snapshot de saas_metrics más reciente para forzar el recálculo
            const todayStr = new Date().toISOString().split('T')[0];
            const { data: gymCount } = await supabase.from('gimnasios').select('id, es_activo');
            const totalGyms = gymCount?.length || 0;
            const activeGyms = gymCount?.filter(g => g.es_activo).length || 0;

            const { data: metric, error: mError } = await supabase
                .from('saas_metrics' as any)
                .insert({
                    fecha: todayStr,
                    gyms_activos: activeGyms,
                    gyms_suspendidos: totalGyms - activeGyms,
                    nuevos_gyms_hoy: 0,
                    creado_en: new Date().toISOString()
                })
                .select();

            return NextResponse.json({
                success: true,
                message: 'Infraestructura SaaS sincronizada manualmente. Snapshot general de métricas recalculado con éxito.',
                snapshot: metric?.[0] || null
            });
        }

        return NextResponse.json({ error: `Simulando acción desconocida: ${action}` }, { status: 400 });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        console.error('❌ Sandbox Trigger Error:', error);
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
