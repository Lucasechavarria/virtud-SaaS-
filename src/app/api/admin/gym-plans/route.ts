import { NextResponse } from 'next/server';
import { authenticateAndRequireRole } from '@/lib/auth/api-auth';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/gym-plans
 * Retorna todos los planes de membresía locales para los alumnos de este gimnasio.
 */
export async function GET(request: Request) {
    try {
        const { error: authError, profile } = await authenticateAndRequireRole(request, ['admin', 'superadmin', 'recepcion']);
        if (authError) return authError;

        const adminClient = createAdminClient();

        // Obtener perfil detallado
        const { data: requester } = await adminClient
            .from('perfiles')
            .select('rol, gimnasio_id, permisos')
            .eq('id', profile.id)
            .single();

        if (requester?.rol === 'recepcion' && requester.permisos?.acceso_planes !== true) {
            return NextResponse.json({ error: 'Forbidden: Sin permisos de acceso a planes' }, { status: 403 });
        }

        const { searchParams } = new URL(request.url);
        const urlGym = searchParams.get('gymId');
        let targetGymId = requester?.gimnasio_id;

        // Si es Superadmin, permitir resolver gymId
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

        if (!targetGymId) {
            // Fallback: resolver con el primer gimnasio de la tabla en desarrollo/local
            const { data: fallbackGym } = await adminClient
                .from('gimnasios')
                .select('id')
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
        const { error: authError, profile } = await authenticateAndRequireRole(request, ['admin', 'superadmin']);
        if (authError) return authError;

        const adminClient = createAdminClient();

        // Obtener gimnasio_id
        const { data: requester } = await adminClient
            .from('perfiles')
            .select('rol, gimnasio_id')
            .eq('id', profile.id)
            .single();

        let targetGymId = requester?.gimnasio_id;
        const body = await request.json();

        // Permitir a Superadmin definir gimnasio_id
        if (requester?.rol === 'superadmin' && body.gimnasio_id) {
            targetGymId = body.gimnasio_id;
        }

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
