import { createClient } from '@/lib/supabase/server';
import { NextResponse, type NextRequest } from 'next/server';

interface TemporalChartData {
    name: string;
    value: number;
}

export async function GET(request: NextRequest) {
    const supabase = await createClient();

    try {
        // 1. Extraer Query Parameters para rango dinámico
        const { searchParams } = new URL(request.url);
        const range = searchParams.get('range') || '6months';

        const today = new Date();
        let startDate = new Date();
        let isLifetime = false;

        // 2. Resolver límites temporales de forma dinámica
        if (range === 'year') {
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

        // 3. PARALELIZACIÓN DE CONSULTAS (Promise.all - Resuelve el Waterfall de Red)
        const [
            totalMembersResult,
            newMembersResult,
            attendanceResult,
            paymentsResult,
            userDatesResult
        ] = await Promise.all([
            // Consulta A: Miembros Activos Totales (Count-only ultra eficiente)
            supabase
                .from('perfiles')
                .select('*', { count: 'exact', head: true })
                .eq('rol', 'member'),
            
            // Consulta B: Nuevos Miembros Registrados del Mes Actual
            supabase
                .from('perfiles')
                .select('*', { count: 'exact', head: true })
                .eq('rol', 'member')
                .gte('creado_en' as any, startOfMonthISO),
            
            // Consulta C: Asistencias de Clientes del Mes Actual
            supabase
                .from('reservas_de_clase')
                .select('*', { count: 'exact', head: true })
                .eq('estado', 'attended')
                .gte('fecha', startOfMonthISO),
            
            // Consulta D: Pagos Completados (Filtrado dinámico en DB para evitar sobrecarga en RAM)
            isLifetime 
                ? supabase.from('pagos').select('monto, creado_en').eq('estado', 'completado')
                : supabase.from('pagos').select('monto, creado_en').eq('estado', 'completado').gte('creado_en', startDateISO),
            
            // Consulta E: Fechas de Creación de Perfiles para Gráfico de Crecimiento
            isLifetime 
                ? supabase.from('perfiles').select('creado_en').eq('rol', 'member').order('creado_en', { ascending: true })
                : supabase.from('perfiles').select('creado_en').eq('rol', 'member').gte('creado_en' as any, startDateISO).order('creado_en', { ascending: true })
        ]);

        // Validar Errores del SDK
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
    const isLifetime = range === 'lifetime';
    const today = new Date();
    const tempMap: Record<string, number> = {};
    const keysOrder: string[] = [];

    // 1. Inicializar la estructura y orden cronológico de las claves
    if (isLifetime) {
        // Agrupar por Años (Últimos 5 años calendarios)
        const currentYear = today.getFullYear();
        for (let i = 4; i >= 0; i--) {
            const yearKey = String(currentYear - i);
            tempMap[yearKey] = 0;
            keysOrder.push(yearKey);
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

    // 2. Acumular en un solo paso lineal O(N) sin instanciaciones redundantes de Date
    const conversionCache: Record<string, string> = {};

    records.forEach(item => {
        const dateStr = item[dateField] as unknown as string;
        if (!dateStr) return;

        if (isLifetime) {
            // Extracción rápida por año mediante substring AAAA (coste CPU despreciable)
            const yearKey = dateStr.substring(0, 4);
            if (tempMap[yearKey] !== undefined) {
                tempMap[yearKey] += valueExtractor(item);
            }
        } else {
            // Extracción por mes de año (AAAA-MM) con caché local de internacionalización para evitar fatiga en V8
            const yearMonth = dateStr.substring(0, 7);
            if (!conversionCache[yearMonth]) {
                const d = new Date(dateStr);
                conversionCache[yearMonth] = d.toLocaleString('es-ES', { month: 'short' });
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
