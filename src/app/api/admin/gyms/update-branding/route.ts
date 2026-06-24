import { NextResponse } from 'next/server';
import { authenticateAndRequireRole } from '@/lib/auth/api-auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { revalidateTag } from 'next/cache';

/**
 * POST /api/admin/gyms/update-branding
 * Actualiza la identidad visual del gimnasio actual.
 */
export async function POST(request: Request) {
    try {
        const { error: authError, user } = await authenticateAndRequireRole(request, ['admin', 'superadmin']);
        if (authError || !user) return authError || NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { color_primario, color_secundario, logo_url, config_visual } = await request.json();

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

        const { data: updatedGym, error } = await adminClient
            .from('gimnasios')
            .update({
                color_primario,
                color_secundario,
                logo_url,
                config_visual,
                actualizado_en: new Date().toISOString()
            })
            .eq('id', profileData.gimnasio_id)
            .is('deleted_at', null)
            .select('slug')
            .single();

        if (error) throw error;

        if (updatedGym?.slug) {
            (revalidateTag as any)(`gym-brand-${updatedGym.slug}`);
            console.warn(`[Branding Purge] Caché purgada para el gimnasio con slug: ${updatedGym.slug}`);
        }

        return NextResponse.json({ success: true });

    } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        console.error('❌ Error updating branding:', error);
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
