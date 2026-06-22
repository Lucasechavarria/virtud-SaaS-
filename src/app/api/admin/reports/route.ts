import { authenticateAndRequireRole } from '@/lib/auth/api-auth';
import { NextResponse, type NextRequest } from 'next/server';

interface TemporalChartData {
    name: string;
    value: number;
}

export async function GET(request: NextRequest) {
    try {
        // 1. Autenticar y requerir rol administrativo
        const { supabase, error: authError, profile } = await authenticateAndRequireRole(request, ['admin', 'superadmin']);
        if (authError || !supabase) return authError || NextResponse.json({ error: 'No autorizado' }, { status: 401 });

        // 2. Blindaje contra gimnasio_id NULL para admin (superadmin puede no tener gimnasio asignado)
        if (profile?.role !== 'superadmin' && !profile?.gimnasio_id) {
            return NextResponse.json({ error: 'Forbidden: Administrador sin gimnasio asignado' }, { status: 403 });
        }

        const { searchParams } = new URL(request.url);
        const range = searchParams.get('range') || '6months';
        const urlGym = searchParams.get('gymId');

        let targetGymId = profile?.gimnasio_id;

        if (urlGym) {
            if (profile?.role === 'superadmin') {
                // El superadmin puede ver cualquier gimnasio — resolver slug→UUID
                const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
                if (UUID_REGEX.test(urlGym)) {
                    targetGymId = urlGym;
                } else {
                    const { createAdminClient } = await import('@/lib/supabase/admin');
                    const adminClient = createAdminClient();
                    const { data: gym } = await adminClient
                        .from('gimnasios')
                        .select('id')
                        .eq('slug', urlGym)
                        .single();
                    if (gym) targetGymId = gym.id;
                }
            } else if (profile?.gimnasio_id) {
                // Admin local: ignorar el gymId externo, usar el propio
                targetGymId = profile.gimnasio_id;
            }
        }

        const today = new Date();
        let startDate = new Date();
        let isLifetime = false;

        // 3. Resolver límites temporales de forma dinámica
        if (range === 'week') {
            startDate.setDate(today.getDate() - 6);
        } else if (range === 'month') {
            startDate.setDate(today.getDate() - 29);
        } else if (range === 'quarter') {
            startDate.setDate(today.getDate() - 89);
        } else if (range === 'year') {
            startDate = new Date(today.getFullYear(), 0, 1); // 1 de Enero del año actual
        } else if (range === 'lifetime') {
            isLifetime = true;
            startDate = new Date(2020, 0, 1); // Rango de inicio por defecto para datos históricos amplios
        } else {
            // Por defecto: 6months
            startDate.setMonth(today.getMonth() - 5);
            startDate.setDate(1);
        }
        
        startDate.setHours(0, 0, 0, 0);
        const startDateISO = startDate.toISOString();

        // Calcular el inicio del mes actual para métricas de "nuevos" del mes
        const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        startOfMonth.setHours(0, 0, 0, 0);
        const startOfMonthISO = startOfMonth.toISOString();

        // 4. Preparar consultas filtradas explícitamente para asegurar aislamiento multi-tenant y usar índices
        let totalMembersQuery = supabase
            .from('perfiles')
            .select('*', { count: 'exact', head: true })
            .eq('rol', 'member');

        let newMembersQuery = supabase
            .from('perfiles')
            .select('*', { count: 'exact', head: true })
            .eq('rol', 'member')
            .gte('creado_en' as any, startOfMonthISO);

        let attendanceQuery = supabase
            .from('reservas_de_clase')
            .select('*, perfiles!inner(gimnasio_id)', { count: 'exact', head: true })
            .eq('estado', 'attended')
            .gte('fecha', startOfMonthISO);

        let paymentsQuery = isLifetime 
            ? supabase.from('pagos').select('monto, creado_en').eq('estado', 'approved')
            : supabase.from('pagos').select('monto, creado_en').eq('estado', 'approved').gte('creado_en', startDateISO);

        let userDatesQuery = isLifetime 
            ? supabase.from('perfiles').select('creado_en').eq('rol', 'member').order('creado_en', { ascending: true })
            : supabase.from('perfiles').select('creado_en').eq('rol', 'member').gte('creado_en' as any, startDateISO).order('creado_en', { ascending: true });

        // Aplicar filtros de gimnasio si corresponde
        if (targetGymId) {
            totalMembersQuery = totalMembersQuery.eq('gimnasio_id', targetGymId);
            newMembersQuery = newMembersQuery.eq('gimnasio_id', targetGymId);
            attendanceQuery = attendanceQuery.eq('perfiles.gimnasio_id', targetGymId);
            paymentsQuery = paymentsQuery.eq('gimnasio_id', targetGymId);
            userDatesQuery = userDatesQuery.eq('gimnasio_id', targetGymId);
        }

        // 5. PARALELIZACIÓN DE CONSULTAS (Promise.all)
        const [
            totalMembersResult,
            newMembersResult,
            attendanceResult,
            paymentsResult,
            userDatesResult
        ] = await Promise.all([
            totalMembersQuery,
            newMembersQuery,
            attendanceQuery,
            paymentsQuery,
            userDatesQuery
        ]);

        // Validar Errores del SDK
        if (totalMembersResult.error) throw totalMembersResult.error;
        if (newMembersResult.error) throw newMembersResult.error;
        if (attendanceResult.error) throw attendanceResult.error;
        if (paymentsResult.error) throw paymentsResult.error;
        if (userDatesResult.error) throw userDatesResult.error;

        const totalMembers = totalMembersResult.count || 0;
        const newMembers = newMembersResult.count || 0;
        const attendanceCount = attendanceResult.count || 0;
        const payments = paymentsResult.data || [];
        const userDates = userDatesResult.data || [];

        // 4. CÁLCULO OPTIMIZADO EN UN SOLO RECORRIDO O(N)
        let totalRevenue = 0;
        let totalExpenses = 0;

        payments.forEach((p: any) => {
            if (p.monto > 0) {
                totalRevenue += p.monto;
            } else if (p.monto < 0) {
                totalExpenses += Math.abs(p.monto);
            }
        });

        const netRevenue = totalRevenue - totalExpenses;

        // 5. AGREGACIÓN TEMPORAL DE ALTO RENDIMIENTO (Unificada y DRY)
        const growthData = aggregateTemporalData(userDates, 'creado_en', () => 1, range);
        const revenueData = aggregateTemporalData(payments, 'creado_en', (p: any) => p.monto, range);

        return NextResponse.json({
            metrics: {
                revenue: Number(totalRevenue.toFixed(2)),
                expenses: Number(totalExpenses.toFixed(2)),
                net: Number(netRevenue.toFixed(2)),
                active_members: totalMembers,
                new_members: newMembers,
                attendance_rate: attendanceCount
            },
            charts: {
                growth: growthData,
                revenue: revenueData
            }
        });

    } catch (_error) {
        console.error('Reports Error:', _error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

// ==========================================
// HELPERS DE RENDIMIENTO (Procesador Temporal)
// ==========================================

/**
 * Agrupa y acumula datos cronológicamente por mes o año con optimización extrema de CPU
 */
function aggregateTemporalData<T>(
    records: T[],
    dateField: keyof T,
    valueExtractor: (item: T) => number,
    range: string
): TemporalChartData[] {
    const today = new Date();
    const tempMap: Record<string, number> = {};
    const keysOrder: string[] = [];

    // 1. Inicializar la estructura y orden cronológico de las claves
    if (range === 'lifetime') {
        const currentYear = today.getFullYear();
        for (let i = 4; i >= 0; i--) {
            const yearKey = String(currentYear - i);
            tempMap[yearKey] = 0;
            keysOrder.push(yearKey);
        }
    } else if (range === 'week') {
        // Agrupar por días de la semana
        for (let i = 6; i >= 0; i--) {
            const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() - i);
            const dayKey = d.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric' });
            tempMap[dayKey] = 0;
            keysOrder.push(dayKey);
        }
    } else if (range === 'month') {
        // Agrupar por 4 semanas
        keysOrder.push('Semana 1', 'Semana 2', 'Semana 3', 'Semana 4');
        keysOrder.forEach(k => { tempMap[k] = 0; });
    } else if (range === 'quarter') {
        // Agrupar por meses (últimos 3 meses)
        for (let i = 2; i >= 0; i--) {
            const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
            const monthKey = d.toLocaleString('es-ES', { month: 'short' });
            tempMap[monthKey] = 0;
            keysOrder.push(monthKey);
        }
    } else {
        // Agrupar por Meses (Últimos 6 meses o los meses transcurridos del año actual)
        const totalMonths = range === 'year' ? today.getMonth() + 1 : 6;
        for (let i = totalMonths - 1; i >= 0; i--) {
            const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
            const monthKey = d.toLocaleString('es-ES', { month: 'short' });
            tempMap[monthKey] = 0;
            keysOrder.push(monthKey);
        }
    }

    // 2. Acumular en un solo paso lineal O(N)
    const conversionCache: Record<string, string> = {};

    records.forEach(item => {
        const dateStr = item[dateField] as unknown as string;
        if (!dateStr) return;
        const itemDate = new Date(dateStr);

        if (range === 'lifetime') {
            const yearKey = dateStr.substring(0, 4);
            if (tempMap[yearKey] !== undefined) {
                tempMap[yearKey] += valueExtractor(item);
            }
        } else if (range === 'week') {
            const dayKey = itemDate.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric' });
            if (tempMap[dayKey] !== undefined) {
                tempMap[dayKey] += valueExtractor(item);
            }
        } else if (range === 'month') {
            // Calcular a qué semana pertenece de los últimos 28-30 días
            const diffTime = today.getTime() - itemDate.getTime();
            const diffDays = Math.floor(diffTime / (24 * 60 * 60 * 1000));
            if (diffDays >= 0 && diffDays < 28) {
                const weekIndex = 4 - Math.floor(diffDays / 7); // 1, 2, 3 o 4
                const weekKey = `Semana ${weekIndex}`;
                if (tempMap[weekKey] !== undefined) {
                    tempMap[weekKey] += valueExtractor(item);
                }
            }
        } else if (range === 'quarter') {
            const monthKey = itemDate.toLocaleString('es-ES', { month: 'short' });
            if (tempMap[monthKey] !== undefined) {
                tempMap[monthKey] += valueExtractor(item);
            }
        } else {
            const yearMonth = dateStr.substring(0, 7);
            if (!conversionCache[yearMonth]) {
                conversionCache[yearMonth] = itemDate.toLocaleString('es-ES', { month: 'short' });
            }
            const monthKey = conversionCache[yearMonth];
            if (tempMap[monthKey] !== undefined) {
                tempMap[monthKey] += valueExtractor(item);
            }
        }
    });

    // 3. Mapear respetando el orden cronológico precalculado
    return keysOrder.map(key => ({
        name: key,
        value: Number(tempMap[key].toFixed(2)) // Prevenir imprecisiones de representación binaria float
    }));
}
