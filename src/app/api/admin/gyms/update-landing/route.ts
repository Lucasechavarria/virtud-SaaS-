import { NextResponse } from 'next/server';
import { authenticateAndRequireRole } from '@/lib/auth/api-auth';
import { createAdminClient } from '@/lib/supabase/admin';

/**
 * POST /api/admin/gyms/update-landing
 * Actualiza la configuración de marketing (Landing Page) del gimnasio.
 */
export async function POST(request: Request) {
    try {
        const { error: authError, user } = await authenticateAndRequireRole(request, ['admin', 'superadmin']);
        if (authError || !user) return authError || NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { config_landing } = await request.json();

        const adminClient = createAdminClient();

        // Obtener el gimnasio_id del perfil del usuario
        const { data: profileData, error: profileError } = await adminClient
            .from('perfiles')
            .select('gimnasio_id')
            .eq('id', user.id)
            .single();

        if (profileError || !profileData?.gimnasio_id) {
            return NextResponse.json({ error: 'No se encontró el gimnasio asociado' }, { status: 404 });
        }

        const { error } = await adminClient
            .from('gimnasios')
            .update({
                config_landing,
                actualizado_en: new Date().toISOString()
            })
            .eq('id', profileData.gimnasio_id)
            .is('deleted_at', null);

        if (error) throw error;

        return NextResponse.json({ success: true });

    } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        console.error('❌ Error updating landing config:', error);
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
