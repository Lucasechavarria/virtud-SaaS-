import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const supabase = createAdminClient();
        const { data: plans, error } = await supabase
            .from('planes_suscripcion')
            .select('*')
            .order('precio_mensual', { ascending: true });

        if (error) throw error;

        return NextResponse.json({ success: true, plans: plans || [] });
    } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
