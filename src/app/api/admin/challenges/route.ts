import { NextResponse } from 'next/server';
import { authenticateAndRequireRole } from '@/lib/auth/api-auth';
import { createAdminClient } from '@/lib/supabase/admin';

/**
 * POST /api/admin/challenges
 * Crea un nuevo desafío
 */
export async function POST(request: Request) {
    try {
        const { user, profile, supabase, error } = await authenticateAndRequireRole(request, ['admin', 'superadmin']);
        if (error) return error;

        const body = await request.json();
        const { title, description, rules, type, points_prize, end_date } = body;

        let targetGymId = profile?.gimnasio_id;
        if (profile?.role === 'superadmin' && body.gimnasio_id) {
            const rawGymId: string = body.gimnasio_id;
            const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(rawGymId);
            if (isUUID) {
                targetGymId = rawGymId;
            } else {
                // Resolver slug a UUID
                const adminClient = createAdminClient();
                const { data: gym } = await adminClient
                    .from('gimnasios')
                    .select('id')
                    .eq('slug', rawGymId)
                    .single();
                if (gym) targetGymId = gym.id;
            }
        }

        if (!targetGymId) {
            return NextResponse.json({ error: 'Gimnasio no asignado o no especificado' }, { status: 400 });
        }

        const { data, error: dbError } = await supabase!
            .from('desafios')
            .insert({
                gimnasio_id: targetGymId,
                creado_por: user.id,   // antes: creator_id
                juez_id: user.id,       // antes: judge_id
                titulo: title,          // antes: title
                descripcion: description, // antes: description
                reglas: rules || 'Reglas estándar del gimnasio', // antes: rules
                tipo: type,             // antes: type
                puntos_recompensa: points_prize, // antes: points_prize / points_reward
                fecha_fin: end_date,    // antes: end_date
                estado: 'active'        // antes: status
            })
            .select()
            .single();

        if (dbError) throw dbError;

        return NextResponse.json(data);
    } catch (_error) {
        const err = _error as Error;
        console.error('Error creating challenge:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

/**
 * GET /api/admin/challenges
 * Lista todos los desafíos para administración
 */
export async function GET(request: Request) {
    try {
        const { profile, supabase, error } = await authenticateAndRequireRole(request, ['admin', 'superadmin', 'coach']);
        if (error) return error;

        let targetGymId = profile?.gimnasio_id;

        const { searchParams } = new URL(request.url);
        const urlGym = searchParams.get('gymId');

        if (profile?.role === 'superadmin' && urlGym) {
            const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(urlGym);
            if (isUUID) {
                targetGymId = urlGym;
            } else {
                const adminClient = createAdminClient();
                const { data: gym } = await adminClient
                    .from('gimnasios')
                    .select('id')
                    .eq('slug', urlGym)
                    .single();
                if (gym) targetGymId = gym.id;
            }
        }

        if (!targetGymId) {
            return NextResponse.json({ error: 'Gimnasio no asignado o no especificado' }, { status: 400 });
        }

        const { data, error: dbError } = await supabase!
            .from('desafios')
            .select(`
                *,
                creador:perfiles!desafios_creado_por_fkey(nombre_completo),
                juez:perfiles!desafios_juez_id_fkey(nombre_completo),
                participantes:participantes_desafio(
                    estado,
                    puntuacion_actual,
                    usuario:perfiles(nombre_completo)
                )
            `)
            .eq('gimnasio_id', targetGymId)
            .order('creado_en', { ascending: false });

        if (dbError) throw dbError;

        // Mapear al formato que espera el frontend
        const challenges = (data || []).map((d: any) => ({
            id: d.id,
            title: d.titulo,
            description: d.descripcion,
            type: d.tipo,
            status: d.estado,
            points_reward: d.puntos_recompensa,
            fecha_fin: d.fecha_fin,
            participants_count: d.participantes?.length ?? 0,
            participants: (d.participantes || []).map((p: any) => ({
                user_id: p.usuario_id,
                full_name: p.usuario?.nombre_completo || 'Atleta Anónimo',
                current_score: p.puntuacion_actual,
                status: p.estado,
            })),
        }));

        return NextResponse.json({ challenges });
    } catch (_error) {
        const err = _error as Error;
        console.error('Error fetching challenges:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

