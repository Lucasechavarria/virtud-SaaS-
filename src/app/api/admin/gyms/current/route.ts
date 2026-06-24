import { NextResponse } from 'next/server';
import { authenticateAndRequireRole } from '@/lib/auth/api-auth';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/gyms/current
 * Retorna los datos del gimnasio actual basado en el perfil del usuario.
 */
export async function GET(request: Request) {
    try {
        const { error: authError, user } = await authenticateAndRequireRole(request, ['admin', 'superadmin', 'coach']);
        if (authError || !user) return authError || NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

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

        const gymId = profileData.gimnasio_id;

        const { data: gym, error: dbError } = await adminClient
            .from('gimnasios')
            .select(`
                *,
                planes_suscripcion (*)
            `)
            .eq('id', gymId)
            .is('deleted_at', null)
            .maybeSingle();

        if (dbError) throw dbError;

        if (!gym) {
            return NextResponse.json({ error: 'Gimnasio no encontrado o inactivo en la red' }, { status: 404 });
        }

        // 2. Obtener conteos actuales
        const [
            { count: studentsCount },
            { count: branchesCount }
        ] = await Promise.all([
            adminClient.from('perfiles').select('*', { count: 'exact', head: true }).eq('gimnasio_id', gymId).eq('rol', 'member'),
            adminClient.from('sucursales').select('*', { count: 'exact', head: true }).eq('gimnasio_id', gymId)
        ]);

        return NextResponse.json({
            gym: {
                ...gym,
                stats: {
                    students: studentsCount || 0,
                    branches: branchesCount || 0
                }
            }
        });

    } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        console.error('❌ Error fetching current gym:', error);
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
