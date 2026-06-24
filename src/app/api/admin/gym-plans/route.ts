import { NextResponse } from 'next/server';
import { authenticateAndRequireRole, resolveGymIdForAdmin } from '@/lib/auth/api-auth';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/gym-plans
 * Retorna todos los planes de membresía locales para los alumnos de este gimnasio.
 */
export async function GET(request: Request) {
    try {
        const { error: authError, profile, user } = await authenticateAndRequireRole(request, ['admin', 'superadmin', 'recepcion']);
        if (authError) return authError;

        const adminClient = createAdminClient();

        // Obtener perfil detallado
        const { data: requester } = await adminClient
            .from('perfiles')
            .select('rol, gimnasio_id, permisos')
            .eq('id', user.id)
            .single();

        if (!requester) {
            return NextResponse.json({ error: 'Perfil no encontrado' }, { status: 404 });
        }

        // Blindaje contra gimnasio_id NULL para admin o recepcion (acordado en /grill-me)
        if (requester.rol !== 'superadmin' && !requester.gimnasio_id) {
            return NextResponse.json({ error: 'Forbidden: Gimnasio no asignado' }, { status: 403 });
        }

        // Un recepcionista siempre puede consultar planes (GET) para poder vender en mostrador (POS),
        // pero la creación (POST) queda restringida a roles superiores.

        const { searchParams } = new URL(request.url);
        const urlGym = searchParams.get('gymId');
        let { targetGymId, errorResponse } = await resolveGymIdForAdmin(requester, urlGym);
        if (errorResponse) return errorResponse;
 
        if (!targetGymId) {
            // Fallback: resolver con el primer gimnasio de la tabla en desarrollo/local
            const { data: fallbackGym } = await adminClient
                .from('gimnasios')
                .select('id')
                .is('deleted_at', null)
                .limit(1)
                .maybeSingle();
            if (fallbackGym) {
                targetGymId = fallbackGym.id;
            }
        }
 
        if (!targetGymId) {
            return NextResponse.json({ error: 'Gimnasio no especificado' }, { status: 400 });
        }

        const { data: plans, error: dbError } = await adminClient
            .from('planes_gimnasio')
            .select('*')
            .eq('gimnasio_id', targetGymId)
            .order('precio', { ascending: true });

        if (dbError) throw dbError;

        return NextResponse.json({ success: true, plans: plans || [] });

    } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}

/**
 * POST /api/admin/gym-plans
 * Crea un nuevo plan de membresía local para alumnos.
 */
export async function POST(request: Request) {
    try {
        const { error: authError, profile, user } = await authenticateAndRequireRole(request, ['admin', 'superadmin']);
        if (authError) return authError;

        const adminClient = createAdminClient();

        // Obtener gimnasio_id
        const { data: requester } = await adminClient
            .from('perfiles')
            .select('rol, gimnasio_id')
            .eq('id', user.id)
            .single();

        if (!requester) {
            return NextResponse.json({ error: 'Perfil no encontrado' }, { status: 404 });
        }

        // Blindaje contra gimnasio_id NULL para admin (acordado en /grill-me)
        if (requester.rol !== 'superadmin' && !requester.gimnasio_id) {
            return NextResponse.json({ error: 'Forbidden: Gimnasio no asignado' }, { status: 403 });
        }

        const body = await request.json();
        const { targetGymId, errorResponse } = await resolveGymIdForAdmin(requester, body.gimnasio_id);
        if (errorResponse) return errorResponse;
 
        if (!targetGymId) {
            return NextResponse.json({ error: 'Gimnasio no especificado' }, { status: 400 });
        }

        const { data: newPlan, error: insertError } = await adminClient
            .from('planes_gimnasio')
            .insert({
                gimnasio_id: targetGymId,
                nombre: body.nombre,
                descripcion: body.descripcion || '',
                precio: Number(body.precio),
                duracion_meses: Number(body.duracion_meses || 1),
                esta_activo: body.esta_activo !== false,
                beneficios: body.beneficios || []
            })
            .select()
            .single();

        if (insertError) throw insertError;

        return NextResponse.json({ success: true, plan: newPlan });

    } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
