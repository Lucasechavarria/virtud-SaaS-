import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * GET /api/marketing/campaigns
 * Lista todas las campañas de marketing
 */
export async function GET(req: NextRequest) {
    try {
        const supabase = await createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const estado = searchParams.get('estado');

        let query = supabase
            .from('campanas_marketing')
            .select('*')
            .order('creado_en', { ascending: false });

        if (estado) {
            query = query.eq('estado', estado);
        }

        const { data: campaigns, error } = await query;

        if (error) throw error;

        return NextResponse.json({ campaigns: campaigns || [] });
    } catch (error) {
        console.error('[API] Error obteniendo campañas:', error);
        return NextResponse.json(
            { error: 'Error interno del servidor' },
            { status: 500 }
        );
    }
}

/**
 * POST /api/marketing/campaigns
 * Crea una nueva campaña de marketing
 */
export async function POST(req: NextRequest) {
    try {
        const supabase = await createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
        }

        const body = await req.json();
        const {
            nombre,
            tipo,
            segmento,
            mensaje_titulo,
            mensaje_cuerpo,
            fecha_inicio,
            fecha_fin
        } = body;

        // Validaciones
        if (!nombre || !tipo || !mensaje_titulo || !mensaje_cuerpo) {
            return NextResponse.json(
                { error: 'Faltan campos requeridos' },
                { status: 400 }
            );
        }

        const { data: campaign, error } = await supabase
            .from('campanas_marketing')
            .insert({
                nombre,
                tipo,
                segmento: segmento || {},
                mensaje_titulo,
                mensaje_cuerpo,
                fecha_inicio: fecha_inicio || new Date().toISOString(),
                fecha_fin,
            } as any)
            .select()
            .single();

        if (error) throw error;

        return NextResponse.json({ campaign });
    } catch (error) {
        console.error('[API] Error creando campaña:', error);
        return NextResponse.json(
            { error: 'Error interno del servidor' },
            { status: 500 }
        );
    }
}

/**
 * PATCH /api/marketing/campaigns
 * Actualiza una campaña existente
 */
export async function PATCH(req: NextRequest) {
    try {
        const supabase = await createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
        }

        const body = await req.json();
        const { id, ...updates } = body;

        if (!id) {
            return NextResponse.json(
                { error: 'ID de campaña requerido' },
                { status: 400 }
            );
        }

        const { data: campaign, error } = await supabase
            .from('campanas_marketing')
            .update(updates)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;

        return NextResponse.json({ campaign });
    } catch (error) {
        console.error('[API] Error actualizando campaña:', error);
        return NextResponse.json(
            { error: 'Error interno del servidor' },
            { status: 500 }
        );
    }
}
