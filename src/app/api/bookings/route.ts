
import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const scheduleId = searchParams.get('schedule_id');

    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        let query = supabase.from('reservas_de_clase').select('*').eq('usuario_id', user.id);

        if (scheduleId) {
            query = query.eq('horario_clase_id', scheduleId);
        }

        const { data, error } = await query;
        if (error) throw error;

        return NextResponse.json(data);
    } catch (error) {
        return NextResponse.json({ error: 'Error fetching bookings' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    const supabase = await createClient();
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { schedule_id, date } = await request.json();

        // 🔐 Atomic Booking Pattern: Usar RPC para evitar Race Conditions (Capacidad/Duplicados)
        const { data, error } = await supabase.rpc('book_class_atomic', {
            p_horario_clase_id: schedule_id,
            p_usuario_id: user.id,
            p_fecha: date
        });

        if (error) {
            console.error('RPC Error (book_class_atomic):', error);
            return NextResponse.json({ error: error.message || 'Error en la reserva atómica' }, { status: 500 });
        }

        // El RPC devuelve el objeto de la reserva si tuvo éxito, o lanza un error si falló (vía RAISE EXCEPTION o lógica interna)
        // Nota: El RPC book_class_atomic ya maneja la gamificación internamente en su definición SQL.
        
        return NextResponse.json(data);

        return NextResponse.json(data);
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: 'Error booking class' }, { status: 500 });
    }
}

export async function DELETE(request: Request) {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        if (!id) return NextResponse.json({ error: 'Missing ID' }, { status: 400 });

        const { error } = await supabase
            .from('reservas_de_clase')
            .delete()
            .eq('id', id)
            .eq('usuario_id', user.id); // Ensure user owns booking

        if (error) throw error;

        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: 'Error cancelling booking' }, { status: 500 });
    }
}
