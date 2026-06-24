import { NextResponse } from 'next/server';
import { authenticateAndRequireRole } from '@/lib/auth/api-auth';
import { createAdminClient } from '@/lib/supabase/admin';

export async function DELETE(request: Request) {
    try {
        const { error: authError } = await authenticateAndRequireRole(request, ['superadmin']);
        if (authError) return authError;

        const { gymId } = await request.json();

        if (!gymId) {
            return NextResponse.json({ error: 'Falta el ID del gimnasio' }, { status: 400 });
        }

        const adminClient = createAdminClient();

        // 1. Obtener el slug actual del gimnasio
        const { data: gym, error: gymError } = await adminClient
            .from('gimnasios')
            .select('slug')
            .eq('id', gymId)
            .is('deleted_at', null)
            .single();

        if (gymError || !gym) {
            return NextResponse.json({ error: 'Gimnasio no encontrado o inactivo en la red' }, { status: 404 });
        }

        // 2. Generar el nuevo slug para liberar el slug original
        const newSlug = `${gym.slug}-deleted-${Date.now()}`;

        // 3. Aplicar Soft-Delete actualizando deleted_at, slug y es_activo
        const { error: updateGymError } = await adminClient
            .from('gimnasios')
            .update({
                deleted_at: new Date().toISOString(),
                slug: newSlug,
                es_activo: false
            })
            .eq('id', gymId)
            .is('deleted_at', null);

        if (updateGymError) throw updateGymError;

        return NextResponse.json({ success: true, message: 'Gimnasio archivado y desactivado correctamente de la red' });

    } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        console.error('❌ Error deleting gym:', error);
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
