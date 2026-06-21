import { NextResponse } from 'next/server';
import { authenticateAndRequireRole } from '@/lib/auth/api-auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { logger } from '@/lib/logger';

/**
 * GET /api/admin/coaches/list
 * Devuelve lista de usuarios que pueden ser asignados como coaches.
 */
export async function GET(request: Request) {
    try {
        const { error: authError, profile, user } = await authenticateAndRequireRole(request, ['admin', 'coach', 'superadmin', 'recepcion']);
        if (authError) return authError;

        const adminClient = createAdminClient();

        // Obtener el contexto actual del que hace la petición
        const { data: requester } = await (adminClient
            .from('perfiles') as any)
            .select('rol, gimnasio_id, permisos')
            .eq('id', user.id)
            .single();

        if (!requester) {
            return NextResponse.json({ error: 'Perfil no encontrado' }, { status: 404 });
        }

        // Blindaje contra gimnasio_id NULL para admin, recepcion o coach (acordado en /grill-me)
        if (requester.rol !== 'superadmin' && !requester.gimnasio_id) {
            return NextResponse.json({ error: 'Forbidden: Gimnasio no asignado' }, { status: 403 });
        }

        // Si es recepcionista, verificar si tiene el permiso concedido por el admin
        if (requester?.rol === 'recepcion') {
            const permisos = requester.permisos || {};
            if (permisos.acceso_usuarios !== true) {
                return NextResponse.json({ error: 'Forbidden: Requiere permiso de acceso a usuarios' }, { status: 403 });
            }
        }

        const { searchParams } = new URL(request.url);
        const urlGym = searchParams.get('gymId');

        let targetGymId = requester?.gimnasio_id;

        // Si es Superadmin y provee un gymId en la URL, resolvemos su UUID correspondiente
        if (!targetGymId && requester?.rol === 'superadmin' && urlGym) {
            const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(urlGym);
            if (isUUID) {
                targetGymId = urlGym;
            } else {
                const { data: gym } = await adminClient
                    .from('gimnasios')
                    .select('id')
                    .eq('slug', urlGym)
                    .single();
                if (gym) targetGymId = gym.id;
            }
        }

        let query = adminClient
            .from('perfiles')
            .select('id, nombre_completo, nombre, apellido, correo, rol')
            .in('rol', ['coach', 'admin', 'superadmin']);

        // Filtrar profesores por el gimnasio respectivo si corresponde
        if (targetGymId) {
            query = query.eq('gimnasio_id', targetGymId);
        }

        const { data: coaches, error: dbError } = await query;

        if (dbError) {
            logger.error('Error fetching coaches list', { error: dbError.message });
            return NextResponse.json({ coaches: [] }, { status: 500 });
        }

        return NextResponse.json({ coaches: normalizeCoaches(coaches || []) });

    } catch (error: any) {
        logger.error('Error crítico fetching coaches', { error: error.message });
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

function normalizeCoaches(data: any[]) {
    return data
        .filter(c => ['coach', 'admin', 'superadmin'].includes(c.rol))
        .map(c => ({
            id: c.id,
            nombre_completo: c.nombre_completo || `${c.nombre || ''} ${c.apellido || ''}`.trim() || c.correo,
            email: c.correo || '',
            rol: c.rol === 'coach' ? 'coach' : 'admin'
        }));
}
