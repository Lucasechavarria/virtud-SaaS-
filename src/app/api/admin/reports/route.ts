
import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET() {
    const supabase = await createClient();

    try {
        // 1. Fetch Key Metrics
        const { count: totalMembers } = await supabase
            .from('perfiles')
            .select('*', { count: 'exact', head: true })
            .eq('rol', 'member');

        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);

        const { count: newMembers } = await supabase
            .from('perfiles')
            .select('*', { count: 'exact', head: true })
            .eq('rol', 'member')
            .gte('creado_en' as any, startOfMonth.toISOString());

        const { count: attendanceCount } = await supabase
            .from('reservas_de_clase')
            .select('*', { count: 'exact', head: true })
            .eq('estado', 'attended')
            .gte('fecha', startOfMonth.toISOString());

        // Revenue & Expenses from Payments Table
        const { data: allPayments, error: paymentsError } = await supabase
            .from('pagos')
            .select('monto, creado_en, estado')
            .eq('estado', 'completado');

        if (paymentsError) throw paymentsError;

        const totalRevenue = (allPayments || [])
            .filter((p: any) => p.monto > 0)
            .reduce((sum, p: any) => sum + p.monto, 0);

        const totalExpenses = (allPayments || [])
            .filter((p: any) => p.monto < 0)
            .reduce((sum, p: any) => sum + Math.abs(p.monto), 0);

        const netRevenue = totalRevenue - totalExpenses;

        const { data: userDates } = await supabase
            .from('perfiles')
            .select('creado_en')
            .eq('rol', 'member')
            .order('creado_en', { ascending: true });

        const growthData = processGrowthData(userDates || []);

        return NextResponse.json({
            metrics: {
                revenue: totalRevenue,
                expenses: totalExpenses,
                net: netRevenue,
                active_members: totalMembers || 0,
                new_members: newMembers || 0,
                attendance_rate: attendanceCount || 0
            },
            charts: {
                growth: growthData,
                revenue: processRevenueGrowth(allPayments || [])
            }
        });

    } catch (_error) {
        console.error('Reports Error:', _error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

function processGrowthData(data: { creado_en: string }[]) {
    const months: Record<string, number> = {};
    const today = new Date();

    for (let i = 5; i >= 0; i--) {
        const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
        const key = d.toLocaleString('es-ES', { month: 'short' });
        months[key] = 0;
    }

    data.forEach(u => {
        const d = new Date((u as unknown as { creado_en: string }).creado_en);
        const key = d.toLocaleString('es-ES', { month: 'short' });
        if (months[key] !== undefined) months[key] += 1;
    });

    return Object.keys(months).map(key => ({
        name: key,
        value: months[key]
    }));
}

function processRevenueGrowth(payments: { monto: number; creado_en: string }[]) {
    const months: Record<string, number> = {};
    const today = new Date();

    for (let i = 5; i >= 0; i--) {
        const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
        const key = d.toLocaleString('es-ES', { month: 'short' });
        months[key] = 0;
    }

    payments.forEach(p => {
        const d = new Date(p.creado_en);
        const key = d.toLocaleString('es-ES', { month: 'short' });
        if (months[key] !== undefined) {
            months[key] += p.monto;
        }
    });

    return Object.keys(months).map(key => ({
        name: key,
        value: months[key]
    }));
}
