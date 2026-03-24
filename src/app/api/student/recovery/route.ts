import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * POST /api/student/recovery
 * Registra biométricos diarios de descanso y estrés
 */
export async function POST(req: NextRequest) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

        const body = await req.json();
        const { horas_sueno, calidad_sueno, nivel_estres, nivel_fatiga, notas } = body;

        const { data, error } = await supabase
            .from('registros_recuperacion')
            .upsert({
                usuario_id: user.id,
                fecha: new Date().toISOString().split('T')[0],
                horas_sueno,
                calidad_sueno,
                nivel_estres,
                nivel_fatiga,
                notas
            }, { onConflict: 'usuario_id, fecha' });

        if (error) throw error;

        return NextResponse.json({ success: true, message: 'Registro de recuperación guardado' });
    } catch (error: any) {
        console.error('Error saving recovery log:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

/**
 * GET /api/student/recovery
 * Obtiene el historial de recuperación
 */
export async function GET(_req: NextRequest) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

        const { data, error } = await supabase
            .from('registros_recuperacion')
            .select('*')
            .eq('usuario_id', user.id)
            .order('fecha', { ascending: false })
            .limit(14);

        if (error) throw error;

        return NextResponse.json({ success: true, logs: data });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
