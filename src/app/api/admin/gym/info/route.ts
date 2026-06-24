import { NextResponse } from 'next/server';
import { authenticateAndRequireRole, resolveGymIdForAdmin } from '@/lib/auth/api-auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { checkGymLimits } from '@/lib/saas/limits';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function GET(request: Request) {
    try {
        // Obtenemos el usuario y su gimnasio
        const { supabase, error: authError, user } = await authenticateAndRequireRole(request, ['admin', 'superadmin', 'recepcion']);
        if (authError) return authError;

        const adminClient = createAdminClient();

        // Obtener ID del gimnasio y rol del perfil
        const { data: profile } = await adminClient
            .from('perfiles')
            .select('rol, gimnasio_id, permisos')
            .eq('id', user.id)
            .single();

        if (!profile) {
            return NextResponse.json({ error: 'Perfil no encontrado' }, { status: 404 });
        }

        // Si es recepcionista, verificar permiso explícito
        if (profile.rol === 'recepcion' && !(profile.permisos as any)?.acceso_settings) {
            return NextResponse.json({ error: 'Forbidden: No tienes permisos para ver la configuración de este gimnasio' }, { status: 403 });
        }

        const { searchParams } = new URL(request.url);
        const urlGym = searchParams.get('gymId');
        const { targetGymId, errorResponse } = await resolveGymIdForAdmin(profile, urlGym);
        if (errorResponse) return errorResponse;
 
        if (!targetGymId) {
            return NextResponse.json({ error: 'Usuario sin gimnasio asignado' }, { status: 400 });
        }

        // 1. Obtener info del gimnasio
        const { data: gym, error: gymError } = await adminClient
            .from('gimnasios')
            .select(`
                *,
                planes_suscripcion (
                    nombre,
                    precio_mensual,
                    limite_usuarios,
                    limite_sucursales
                )
            `)
            .eq('id', targetGymId)
            .is('deleted_at', null)
            .single();

        if (gymError) throw gymError;

        // 2. Obtener límites actuales
        const limits = await checkGymLimits(targetGymId);

        return NextResponse.json({
            success: true,
            gym,
            limits
        });

    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
