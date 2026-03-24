
import { NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/auth/api-auth';
import { createClient } from '@/lib/supabase/server';
import { Database } from '@/types/supabase';

type EjercicioBase = Database['public']['Tables']['ejercicios']['Row'];
interface RealEjercicio extends EjercicioBase {
    esta_completado: boolean;
}

export async function POST(req: Request) {
    const { user, error } = await authenticateRequest(req);
    if (error) return error;

    try {
        const { exerciseId } = await req.json();

        if (!exerciseId) {
            return NextResponse.json({ error: 'Exercise ID is required' }, { status: 400 });
        }

        const supabase = await createClient();

        // Fetch current status
        const { data: exercise, error: fetchError } = await (supabase.from('ejercicios') as any)
            .select('esta_completado')
            .eq('id', exerciseId)
            .single() as { data: Pick<RealEjercicio, 'esta_completado'> | null; error: any };

        if (fetchError || !exercise) {
            return NextResponse.json({ error: 'Exercise not found' }, { status: 404 });
        }

        // Toggle status
        const { data, error: updateError } = await (supabase.from('ejercicios') as any)
            .update({ esta_completado: !exercise.esta_completado })
            .eq('id', exerciseId)
            .select()
            .single() as { data: RealEjercicio | null; error: any };

        if (updateError) {
            return NextResponse.json({ error: updateError.message }, { status: 500 });
        }

        return NextResponse.json({ success: true, exercise: data });
    } catch (_err) {
        return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }
}
