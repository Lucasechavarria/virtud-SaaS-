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

        // 1. Obtener todos los perfiles asociados al gimnasio
        const { data: profiles, error: profilesError } = await adminClient
            .from('perfiles')
            .select('id')
            .eq('gimnasio_id', gymId);

        if (profilesError) throw profilesError;

        // 2. Eliminar cada usuario en auth.users (lo cual elimina perfiles en cascada)
        if (profiles && profiles.length > 0) {
            for (const profile of profiles) {
                const { error: delUserError } = await adminClient.auth.admin.deleteUser(profile.id);
                if (delUserError) {
                    console.error(`Error deleting auth user ${profile.id}:`, delUserError);
                }
            }
        }

        // 3. Eliminar manualmente los registros de tablas que tengan FK a gimnasios sin ON DELETE CASCADE
        await adminClient.from('desafios').delete().eq('gimnasio_id', gymId);
        await adminClient.from('equipamiento').delete().eq('gimnasio_id', gymId);
        await adminClient.from('planes_nutricionales').delete().eq('gimnasio_id', gymId);
        await adminClient.from('mediciones').delete().eq('gimnasio_id', gymId);
        await adminClient.from('sesiones_de_entrenamiento').delete().eq('gimnasio_id', gymId);
        await adminClient.from('sucursales').delete().eq('gimnasio_id', gymId);

        // 4. Eliminar el gimnasio
        const { error: deleteGymError } = await adminClient
            .from('gimnasios')
            .delete()
            .eq('id', gymId);

        if (deleteGymError) throw deleteGymError;

        return NextResponse.json({ success: true, message: 'Gimnasio y todos sus datos relacionados eliminados con éxito' });

    } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        console.error('❌ Error deleting gym:', error);
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
