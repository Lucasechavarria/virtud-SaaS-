import { NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/auth/api-auth';
import { createClient } from '@/lib/supabase/server';

export async function POST(req: Request) {
    const { user, error } = await authenticateRequest(req);
    if (error) return error;

    try {
        const { exerciseId } = await req.json();

        if (!exerciseId) {
            return NextResponse.json({ error: 'Exercise ID is required' }, { status: 400 });
        }

        const supabase = await createClient();

        // 1. Obtener perfil para el gimnasio_id
        const { data: profile, error: profileError } = await (supabase as any)
            .from('perfiles')
            .select('gimnasio_id')
            .eq('id', user.id)
            .single();

        if (profileError || !profile?.gimnasio_id) {
            return NextResponse.json({ error: 'Gimnasio del usuario no encontrado' }, { status: 404 });
        }

        const todayStr = new Date().toISOString().split('T')[0];

        // 2. Verificar si ya existe el completado del ejercicio hoy
        const { data: existing } = await (supabase as any)
            .from('ejercicios_completados_dia')
            .select('id')
            .eq('usuario_id', user.id)
            .eq('ejercicio_id', exerciseId)
            .eq('fecha', todayStr)
            .maybeSingle();

        if (existing) {
            // Toggle off: Eliminar el registro
            const { error: deleteError } = await (supabase as any)
                .from('ejercicios_completados_dia')
                .delete()
                .eq('id', existing.id);

            if (deleteError) throw deleteError;

            return NextResponse.json({ success: true, completed: false });
        } else {
            // Toggle on: Crear el registro
            const { error: insertError } = await (supabase as any)
                .from('ejercicios_completados_dia')
                .insert({
                    usuario_id: user.id,
                    gimnasio_id: profile.gimnasio_id,
                    ejercicio_id: exerciseId,
                    fecha: todayStr
                });

            if (insertError) throw insertError;

            return NextResponse.json({ success: true, completed: true });
        }

    } catch (err: any) {
        console.error('Error in POST /api/student/toggle-exercise:', err);
        return NextResponse.json({ error: 'Internal Server Error', message: err.message }, { status: 500 });
    }
}
