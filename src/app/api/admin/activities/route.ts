import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

// GET: List all activities
export async function GET() {
    const supabase = await createClient();

    try {
        const { data, error } = await supabase
            .from('actividades')
            .select('*')
            .order('nombre', { ascending: true });

        if (error) throw error;

        return NextResponse.json(data);
    } catch (_error) {
        return NextResponse.json({ error: _error instanceof Error ? _error.message : 'Unknown error' }, { status: 500 });
    }
}

// POST: Create a new activity
export async function POST(req: Request) {
    const supabase = await createClient();
    const body = await req.json();

    try {
        // Validate required fields
        if (!body.nombre) {
            return NextResponse.json({ error: 'Nombre is required' }, { status: 400 });
        }

        const { data, error } = await supabase
            .from('actividades')
            .insert([
                {
                    nombre: body.nombre,
                    tipo: body.tipo || 'CLASS',
                    descripcion: body.descripcion,
                    esta_activa: true,
                    duracion_minutos: body.duracion_minutos || 60,
                    capacidad_maxima: body.capacidad_maxima,
                    url_imagen: body.url_imagen,
                    dificultad: body.dificultad,
                    color: body.color || '#3b82f6', // Keep existing field
                    categoria: body.categoria || 'General' // Keep existing field
                }
            ])
            .select()
            .single();

        if (error) throw error;
        return NextResponse.json({ success: true, data });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 400 });
    }
}

// PUT: Update an activity
export async function PUT(request: Request) {
    const supabase = await createClient();
    try {
        const body = await request.json();
        const { id, ..._updateData } = body;

        if (!id) throw new Error('ID is required');

        const { data, error } = await supabase
            .from('actividades')
            .update({
                nombre: body.nombre,
                tipo: body.tipo,
                descripcion: body.descripcion,
                esta_activa: body.esta_activa,
                duracion_minutos: body.duracion_minutos,
                capacidad_maxima: body.capacidad_maxima,
                url_imagen: body.url_imagen,
                dificultad: body.dificultad,
                color: body.color, // Keep existing field
                categoria: body.categoria // Keep existing field
            })
            .eq('id', body.id)
            .select()
            .single();

        if (error) throw error;

        return NextResponse.json(data);
    } catch (error) {
        return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
    }
}

// DELETE: Delete an activity (Caution: Cascades to schedule)
export async function DELETE(req: Request) {
    const supabase = await createClient();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    try {
        if (!id) {
            return NextResponse.json({ error: 'ID is required' }, { status: 400 });
        }

        const { error } = await supabase
            .from('actividades')
            .delete()
            .eq('id', id);

        if (error) throw error;

        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
    }
}
