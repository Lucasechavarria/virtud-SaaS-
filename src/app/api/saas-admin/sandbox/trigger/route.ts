import { NextResponse } from 'next/server';
import { authenticateAndRequireRole } from '@/lib/auth/api-auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { calculateGymMonthlyBill } from '@/lib/saas/billing-calculator';

export const dynamic = 'force-dynamic';

/**
 * POST /api/saas-admin/sandbox/trigger
 * Dispara eventos de simulación financiera u operativa de infraestructura con blindaje total para producción.
 */
export async function POST(request: Request) {
    try {
        const { user, error: authError } = await authenticateAndRequireRole(request, ['superadmin']);
        if (authError) return authError;

        if (!user) {
            return NextResponse.json({ error: 'User profiles verification failed' }, { status: 401 });
        }

        const { action, gymId } = await request.json();

        if (!action) {
            return NextResponse.json({ error: 'Missing action parameter' }, { status: 400 });
        }

        const supabase = createAdminClient();

        // Obtener datos del gimnasio si se pasa gymId (con try-catch sutil)
        let gymName = 'Gimnasio Red';
        if (gymId) {
            try {
                const { data: gym } = await supabase
                    .from('gimnasios')
                    .select('nombre')
                    .eq('id', gymId)
                    .single();
                if (gym) gymName = gym.nombre;
            } catch (_err) {
                // Fallback a nombre por defecto
            }
        }

        // ACCIÓN 1: Simular Pago de Gimnasio
        if (action === 'simulate_payment') {
            if (!gymId) {
                return NextResponse.json({ error: 'Missing gymId for payment simulation' }, { status: 400 });
            }

            let amount = 0;
            let finalAmount = 0;
            let discount = 0;

            try {
                const bill = await calculateGymMonthlyBill(gymId);
                amount = bill.basePrice;
                discount = bill.discountPercent;
                finalAmount = bill.totalAmount;

                // Si cobra excedentes postpago y se debitaron créditos al final de mes, persistir en base de datos
                if (bill.pagadoConCreditos && bill.pagadoConCreditos > 0 && bill.metodoCobroExcedentes === 'postpago') {
                    const { data: gymData } = await supabase
                        .from('gimnasios')
                        .select('configuracion')
                        .eq('id', gymId)
                        .single();

                    if (gymData) {
                        const config = (gymData.configuracion || {}) as Record<string, any>;
                        config.saldo_creditos = Number(Math.max(0, Number(config.saldo_creditos ?? 0) - bill.pagadoConCreditos).toFixed(2));
                        
                        if (!config.historial_recargas) config.historial_recargas = [];
                        config.historial_recargas.push({
                            fecha: new Date().toISOString(),
                            monto: -bill.pagadoConCreditos,
                            metodo: 'Débito Automático IA'
                        });

                        await supabase
                            .from('gimnasios')
                            .update({ configuracion: config })
                            .eq('id', gymId);
                    }
                }
            } catch (err) {
                if (process.env.NODE_ENV !== 'development') {
                    throw err;
                }
                amount = Math.floor(Math.random() * 50) + 49;
                discount = Math.random() > 0.7 ? 10 : 0;
                finalAmount = amount - (amount * discount / 100);
            }

            let payment = null;

            try {
                const { data, error: pError } = await supabase
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
                payment = data;
            } catch (err) {
                if (process.env.NODE_ENV !== 'development') {
                    throw err;
                }
                // Fallback robusto en caliente si la tabla o relaciones no existen
                payment = {
                    id: 'sim_pay_' + Math.random().toString(36).substr(2, 9),
                    gimnasio_id: gymId,
                    monto: amount,
                    monto_final: finalAmount,
                    descuento_aplicado: discount,
                    estado: 'completado',
                    metodo_pago: 'mercadopago',
                    fecha_pago: new Date().toISOString()
                };
            }

            try {
                // Intentar actualizar el estado de pago del gimnasio
                const nextPaymentDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
                await supabase
                    .from('gimnasios')
                    .update({
                        estado_pago_saas: 'active',
                        fecha_proximo_pago: nextPaymentDate
                    })
                    .eq('id', gymId);
            } catch (_err) {
                // Silencioso
            }

            try {
                // Intentar actualizar o insertar métricas globales para reflejar el ingreso de hoy
                const todayStr = new Date().toISOString().split('T')[0];
                const { data: metric } = (await supabase
                    .from('saas_metrics' as any)
                    .select('*')
                    .eq('fecha', todayStr)
                    .maybeSingle()) as any;

                if (metric) {
                    await supabase
                        .from('saas_metrics' as any)
                        .update({
                            ingresos_totales_mes: Number(metric.ingresos_totales_mes || 0) + finalAmount,
                            mrr: Number(metric.mrr || 0) + finalAmount
                        })
                        .eq('id', metric.id);
                } else {
                    await supabase
                        .from('saas_metrics' as any)
                        .insert({
                            fecha: todayStr,
                            ingresos_totales_mes: finalAmount,
                            mrr: finalAmount,
                            gyms_activos: 1
                        });
                }
            } catch (_err) {
                // Silencioso
            }

            return NextResponse.json({
                success: true,
                message: `Cobro SaaS de $${finalAmount.toFixed(2)} USD simulado con éxito para "${gymName}".`,
                payment
            });
        }

        // ACCIÓN 2: Simular Alerta Caída/Soporte
        if (action === 'simulate_alert') {
            if (!gymId) {
                return NextResponse.json({ error: 'Missing gymId for support simulation' }, { status: 400 });
            }

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
            let ticket = null;

            try {
                const { data, error: tError } = await supabase
                    .from('tickets_soporte_saas' as any)
                    .insert({
                        gimnasio_id: gymId,
                        usuario_id: user.id,
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
                ticket = data;
            } catch (err) {
                if (process.env.NODE_ENV !== 'development') {
                    throw err;
                }
                // Fallback robusto en caliente si la tabla o relaciones no existen o fallan por claves foráneas
                ticket = {
                    id: 'sim_ticket_' + Math.random().toString(36).substr(2, 9),
                    gimnasio_id: gymId,
                    usuario_id: user.id,
                    asunto: alertSubjects[idx],
                    descripcion: alertDescs[idx],
                    prioridad: 'critica',
                    estado: 'abierto',
                    categoria: 'tecnico',
                    creado_en: new Date().toISOString()
                };
            }

            return NextResponse.json({
                success: true,
                message: `Alerta técnica crítica simulada para "${gymName}" e inyectada con éxito en la mesa de ayuda B2B.`,
                ticket
            });
        }

        // ACCIÓN 3: Sincronización Manual de Métricas
        if (action === 'sync_metrics') {
            const todayStr = new Date().toISOString().split('T')[0];
            let totalGyms = 3;
            let activeGyms = 2;

            try {
                const { data: gymCount } = await supabase.from('gimnasios').select('id, es_activo');
                if (gymCount) {
                    totalGyms = gymCount.length;
                    activeGyms = gymCount.filter(g => g.es_activo).length;
                }
            } catch (_err) {
                // Silencioso
            }

            let snapshot = null;

            try {
                const { data, error: mError } = await supabase
                    .from('saas_metrics' as any)
                    .upsert({
                        fecha: todayStr,
                        gyms_activos: activeGyms,
                        gyms_suspendidos: totalGyms - activeGyms,
                        nuevos_gyms_hoy: 0,
                        creado_en: new Date().toISOString()
                    }, { onConflict: 'fecha' })
                    .select()
                    .single();

                if (mError) throw mError;
                snapshot = data;
            } catch (err) {
                if (process.env.NODE_ENV !== 'development') {
                    throw err;
                }
            }

            if (!snapshot) {
                snapshot = {
                    fecha: todayStr,
                    gyms_activos: activeGyms,
                    gyms_suspendidos: totalGyms - activeGyms,
                    nuevos_gyms_hoy: 0
                };
            }

            return NextResponse.json({
                success: true,
                message: 'Infraestructura SaaS sincronizada manualmente. Snapshot general de métricas recalculado con éxito.',
                snapshot
            });
        }

        return NextResponse.json({ error: `Simulando acción desconocida: ${action}` }, { status: 400 });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        console.error('❌ Sandbox Trigger Error:', error);
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
