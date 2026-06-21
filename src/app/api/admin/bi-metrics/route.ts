import { NextResponse } from 'next/server';
import { authenticateAndRequireRole } from '@/lib/auth/api-auth';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    try {
        const { error: authError, profile } = await authenticateAndRequireRole(request, ['admin', 'superadmin']);
        if (authError) return authError;

        const { searchParams } = new URL(request.url);
        let gymId = searchParams.get('gymId');
        const period = searchParams.get('period') || '30D';

        if (!gymId) {
            return NextResponse.json({ error: 'Gym ID is required' }, { status: 400 });
        }

        const adminClient = createAdminClient();

        // Resolver slug → UUID si el gymId recibido no es un UUID (el frontend envía tenantSlug)
        const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
        if (!UUID_REGEX.test(gymId)) {
            const { data: gym } = await adminClient
                .from('gimnasios')
                .select('id')
                .eq('slug', gymId)
                .single();
            if (!gym) {
                return NextResponse.json({ error: 'Gimnasio no encontrado' }, { status: 404 });
            }
            gymId = gym.id;
        }

        // Blindaje BOLA: admin local solo puede ver sus propias métricas
        if (profile?.role !== 'superadmin') {
            const requesterGymId = profile?.gimnasio_id;
            if (!requesterGymId) {
                return NextResponse.json({ error: 'Forbidden: Administrador sin gimnasio asignado' }, { status: 403 });
            }
            if (requesterGymId !== gymId) {
                return NextResponse.json({ error: 'Forbidden: No tienes acceso a las estadísticas de este gimnasio' }, { status: 403 });
            }
        }

        // 1. Definir periodos de tiempo
        const now = new Date();
        let daysCurrent = 30;
        let marketingBudget = 150000; // Presupuesto mensual estimado en ARS

        switch (period) {
            case '7D':
                daysCurrent = 7;
                marketingBudget = 35000;
                break;
            case '30D':
                daysCurrent = 30;
                marketingBudget = 150000;
                break;
            case '90D':
                daysCurrent = 90;
                marketingBudget = 450000;
                break;
            case '12M':
                daysCurrent = 365;
                marketingBudget = 1800000;
                break;
        }

        const startDate = new Date(now.getTime() - daysCurrent * 24 * 60 * 60 * 1000);
        const previousStartDate = new Date(now.getTime() - 2 * daysCurrent * 24 * 60 * 60 * 1000);

        // Formatos ISO
        const nowISO = now.toISOString();
        const startDateISO = startDate.toISOString();
        const previousStartDateISO = previousStartDate.toISOString();

        // 2. Ejecutar consultas en paralelo para máxima eficiencia
        const [
            { data: paymentsData, error: paymentsError },
            { data: storeSalesData, error: storeSalesError },
            { data: currentNewMembersData, error: currentNewMembersError },
            { data: previousNewMembersData, error: previousNewMembersError },
            { data: activeMembersCount, error: activeMembersError },
            { data: expiredMembersCount, error: expiredMembersError },
            { data: historicalPaymentsData, error: historicalPaymentsError }
        ] = await Promise.all([
            // Pagos del periodo actual y anterior
            adminClient
                .from('pagos')
                .select('monto, concepto, creado_en')
                .eq('gimnasio_id', gymId)
                .in('estado', ['approved', 'aprobado'])
                .gte('creado_en', previousStartDateISO),

            // Ventas de la tienda en periodo actual y anterior
            adminClient
                .from('ventas_tienda')
                .select('monto_total, creado_en')
                .eq('gimnasio_id', gymId)
                .gte('creado_en', previousStartDateISO),

            // Nuevos alumnos periodo actual
            adminClient
                .from('perfiles')
                .select('id')
                .eq('gimnasio_id', gymId)
                .eq('rol', 'member')
                .gte('creado_en', startDateISO)
                .lte('creado_en', nowISO),

            // Nuevos alumnos periodo anterior
            adminClient
                .from('perfiles')
                .select('id')
                .eq('gimnasio_id', gymId)
                .eq('rol', 'member')
                .gte('creado_en', previousStartDateISO)
                .lt('creado_en', startDateISO),

            // Alumnos activos hoy
            adminClient
                .from('perfiles')
                .select('id', { count: 'exact', head: true })
                .eq('gimnasio_id', gymId)
                .eq('rol', 'member')
                .eq('estado_membresia', 'active'),

            // Alumnos inactivos cuya membresía venció en los periodos correspondientes
            adminClient
                .from('perfiles')
                .select('id, fecha_fin_membresia')
                .eq('gimnasio_id', gymId)
                .eq('rol', 'member')
                .not('estado_membresia', 'eq', 'active')
                .gte('fecha_fin_membresia', previousStartDateISO),

            // Pagos históricos para LTV
            adminClient
                .from('pagos')
                .select('monto, usuario_id')
                .eq('gimnasio_id', gymId)
                .in('estado', ['approved', 'aprobado'])
        ]);

        if (paymentsError) throw paymentsError;
        if (storeSalesError) throw storeSalesError;
        if (currentNewMembersError) throw currentNewMembersError;
        if (previousNewMembersError) throw previousNewMembersError;
        if (historicalPaymentsError) throw historicalPaymentsError;

        // 3. Procesar Ingresos de Membresías (excluir conceptos que digan 'Venta Tienda')
        const isStoreConcept = (concept: string) => {
            return (concept || '').toLowerCase().includes('venta tienda');
        };

        let currentMembresiaIncome = 0;
        let previousMembresiaIncome = 0;

        paymentsData?.forEach(p => {
            const date = new Date(p.creado_en);
            const amt = Number(p.monto) || 0;
            if (!isStoreConcept(p.concepto)) {
                if (date >= startDate) {
                    currentMembresiaIncome += amt;
                } else {
                    previousMembresiaIncome += amt;
                }
            }
        });

        // 4. Procesar Ingresos de la Tienda (sumar ventas_tienda y pagos que digan 'Venta Tienda')
        let currentStoreIncome = 0;
        let previousStoreIncome = 0;

        // Sumamos de la tabla ventas_tienda
        storeSalesData?.forEach(s => {
            const date = new Date(s.creado_en);
            const amt = Number(s.monto_total) || 0;
            if (date >= startDate) {
                currentStoreIncome += amt;
            } else {
                previousStoreIncome += amt;
            }
        });

        // Sumamos de la tabla pagos en caso de que haya registros duplicados o pagos directos del mostrador POS
        paymentsData?.forEach(p => {
            const date = new Date(p.creado_en);
            const amt = Number(p.monto) || 0;
            if (isStoreConcept(p.concepto)) {
                if (date >= startDate) {
                    currentStoreIncome += amt;
                } else {
                    previousStoreIncome += amt;
                }
            }
        });

        // 5. Calcular MRR (Mensualizado según el periodo)
        // MRR = ingresos de membresía mensuales
        const factorMensual = 30 / daysCurrent;
        const currentMRR = currentMembresiaIncome * factorMensual;
        const previousMRR = previousMembresiaIncome * factorMensual;

        let mrrTrendPercent = 0;
        if (previousMRR > 0) {
            mrrTrendPercent = ((currentMRR - previousMRR) / previousMRR) * 100;
        } else if (currentMRR > 0) {
            mrrTrendPercent = 100;
        }

        // 6. Calcular CAC (Costo de Adquisición de Clientes)
        const currentNewMembers = currentNewMembersData?.length || 0;
        const previousNewMembers = previousNewMembersData?.length || 0;

        const currentCAC = currentNewMembers > 0 ? (marketingBudget / currentNewMembers) : 0;
        const previousCAC = previousNewMembers > 0 ? (marketingBudget / previousNewMembers) : 0;

        let cacTrendPercent = 0;
        if (previousCAC > 0) {
            cacTrendPercent = ((currentCAC - previousCAC) / previousCAC) * 100;
        } else if (currentCAC > 0) {
            cacTrendPercent = 100;
        }

        // 7. Calcular Churn Rate (Deserción)
        const activeToday = activeMembersCount?.length || 0;

        // Socios que vencieron en el periodo actual
        const currentDeserted = expiredMembersCount?.filter(m => {
            const fin = new Date(m.fecha_fin_membresia);
            return fin >= startDate && fin <= now;
        }).length || 0;

        // Socios que vencieron en el periodo anterior
        const previousDeserted = expiredMembersCount?.filter(m => {
            const fin = new Date(m.fecha_fin_membresia);
            return fin >= previousStartDate && fin < startDate;
        }).length || 0;

        // Denominadores seguros
        const currentChurnDenominator = activeToday + currentDeserted;
        const previousChurnDenominator = (activeToday + currentDeserted) + previousDeserted; // Estimación simple

        const currentChurnRate = currentChurnDenominator > 0 ? (currentDeserted / currentChurnDenominator) * 100 : 0;
        const previousChurnRate = previousChurnDenominator > 0 ? (previousDeserted / previousChurnDenominator) * 100 : 0;

        let churnTrendPercent = 0;
        if (previousChurnRate > 0) {
            churnTrendPercent = ((currentChurnRate - previousChurnRate) / previousChurnRate) * 100;
        } else if (currentChurnRate > 0) {
            churnTrendPercent = 100;
        }

        // 8. Calcular LTV (Lifetime Value)
        // LTV actual = Recaudación acumulada por membresías / cantidad de socios únicos que han pagado
        let historicalMembresiaTotal = 0;
        const uniquePayingUsers = new Set<string>();

        historicalPaymentsData?.forEach(p => {
            if (!isStoreConcept(p.concepto)) {
                historicalMembresiaTotal += Number(p.monto) || 0;
                if (p.usuario_id) {
                    uniquePayingUsers.add(p.usuario_id);
                }
            }
        });

        const totalPayingUsers = uniquePayingUsers.size || 1;
        const currentLTV = historicalMembresiaTotal / totalPayingUsers;

        // LTV anterior: descontando los pagos del periodo actual
        let historicalMembresiaTotalPrevious = 0;
        const uniquePayingUsersPrevious = new Set<string>();

        // Filtramos para obtener los pagos históricos realizados ANTES del periodo actual
        historicalPaymentsData?.forEach(p => {
            if (!isStoreConcept(p.concepto) && p.creado_en) {
                const payDate = new Date(p.creado_en);
                if (payDate < startDate) {
                    historicalMembresiaTotalPrevious += Number(p.monto) || 0;
                    if (p.usuario_id) {
                        uniquePayingUsersPrevious.add(p.usuario_id);
                    }
                }
            }
        });

        const totalPayingUsersPrevious = uniquePayingUsersPrevious.size || 1;
        const previousLTV = historicalMembresiaTotalPrevious / totalPayingUsersPrevious;

        let ltvTrendPercent = 0;
        if (previousLTV > 0) {
            ltvTrendPercent = ((currentLTV - previousLTV) / previousLTV) * 100;
        } else if (currentLTV > 0) {
            ltvTrendPercent = 100;
        }

        // 9. Agrupar Flujo de Caja en exactamente 10 bloques (barras para el frontend)
        const cashFlowData: Array<{ fecha: string; ingresos: number }> = [];
        const intervalMs = (now.getTime() - startDate.getTime()) / 10;

        for (let i = 0; i < 10; i++) {
            const blockStart = new Date(startDate.getTime() + i * intervalMs);
            const blockEnd = new Date(startDate.getTime() + (i + 1) * intervalMs);

            // Sumamos pagos y ventas de tienda en este intervalo
            let blockTotal = 0;

            paymentsData?.forEach(p => {
                const payDate = new Date(p.creado_en);
                if (payDate >= blockStart && payDate < blockEnd) {
                    blockTotal += Number(p.monto) || 0;
                }
            });

            storeSalesData?.forEach(s => {
                const saleDate = new Date(s.creado_en);
                if (saleDate >= blockStart && saleDate < blockEnd) {
                    blockTotal += Number(s.monto_total) || 0;
                }
            });

            // Formatear etiqueta de fecha legible
            let dateLabel = '';
            if (period === '7D' || period === '30D') {
                dateLabel = blockStart.toLocaleDateString('es-AR', { day: '2-digit', month: 'short' });
            } else if (period === '90D') {
                dateLabel = blockStart.toLocaleDateString('es-AR', { day: '2-digit', month: 'short' });
            } else {
                dateLabel = blockStart.toLocaleDateString('es-AR', { month: 'short', year: '2-digit' });
            }

            cashFlowData.push({
                fecha: dateLabel,
                ingresos: Math.round(blockTotal)
            });
        }

        // 10. Estructurar la respuesta
        const totalIncome = currentMembresiaIncome + currentStoreIncome;
        const membershipPercent = totalIncome > 0 ? Math.round((currentMembresiaIncome / totalIncome) * 100) : 100;
        const storePercent = totalIncome > 0 ? Math.round((currentStoreIncome / totalIncome) * 100) : 0;

        return NextResponse.json({
            success: true,
            metrics: {
                ltv: {
                    value: `$${Math.round(currentLTV).toLocaleString('es-AR')}`,
                    trend: `${ltvTrendPercent >= 0 ? '+' : ''}${ltvTrendPercent.toFixed(1)}%`,
                    raw: currentLTV
                },
                cac: {
                    value: `$${Math.round(currentCAC).toLocaleString('es-AR')}`,
                    trend: `${cacTrendPercent >= 0 ? '+' : ''}${cacTrendPercent.toFixed(1)}%`,
                    raw: currentCAC
                },
                churn: {
                    value: `${currentChurnRate.toFixed(1)}%`,
                    trend: `${churnTrendPercent >= 0 ? '+' : ''}${churnTrendPercent.toFixed(1)}%`,
                    raw: currentChurnRate
                },
                mrr: {
                    value: `$${Math.round(currentMRR).toLocaleString('es-AR')}`,
                    trend: `${mrrTrendPercent >= 0 ? '+' : ''}${mrrTrendPercent.toFixed(1)}%`,
                    raw: currentMRR
                }
            },
            incomeSources: {
                membershipPercent,
                storePercent,
                membershipTotal: currentMembresiaIncome,
                storeTotal: currentStoreIncome
            },
            cashFlow: cashFlowData
        });

    } catch (error: any) {
        console.error('❌ GET BI-Metrics Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
