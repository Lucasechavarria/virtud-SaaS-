import { createAdminClient } from '@/lib/supabase/admin';
import { authenticateAndRequireRole } from '@/lib/auth/api-auth';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// GET: List activities for the gym (isolated by tenant)
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
            return NextResponse.json({ error: 'Gimnasio no especificado' }, { status: 400 });
        }

        const { data, error } = await adminClient
            .from('actividades')
            .select('*')
            .eq('gimnasio_id', targetGymId)
            .order('nombre', { ascending: true });

        if (error) throw error;

        return NextResponse.json(data);
    } catch (_error) {
        return NextResponse.json({ error: _error instanceof Error ? _error.message : 'Unknown error' }, { status: 500 });
    }
}

// POST: Create a new activity for the gym
export async function POST(req: Request) {
    try {
        const { error: authError, profile, user } = await authenticateAndRequireRole(req, ['admin', 'superadmin']);
        if (authError) return authError;

        const adminClient = createAdminClient();

        // Obtener perfil detallado
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

        const body = await req.json();

        // Validate required fields
        if (!body.nombre) {
            return NextResponse.json({ error: 'Nombre is required' }, { status: 400 });
        }

        let targetGymId = requester.gimnasio_id;
        if (requester.rol === 'superadmin' && body.gimnasio_id) {
            targetGymId = body.gimnasio_id;
        }

        if (!targetGymId) {
            return NextResponse.json({ error: 'Gimnasio no especificado' }, { status: 400 });
        }

        const { data, error } = await adminClient
            .from('actividades')
            .insert([
                {
                    gimnasio_id: targetGymId,
                    nombre: body.nombre,
                    tipo: body.tipo || 'CLASS',
                    descripcion: body.descripcion,
                    esta_activa: true,
                    duracion_minutos: body.duracion_minutos || 60,
                    capacidad_maxima: body.capacidad_maxima,
                    url_imagen: body.url_imagen,
                    dificultad: body.dificultad,
                    color: body.color || '#3b82f6',
                    categoria: body.categoria || 'General'
                }
            ])
            .select()
            .single();

        if (error) throw error;
        return NextResponse.json({ success: true, data });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 400 });
    }
}

// PUT: Update an activity (checking ownership)
export async function PUT(request: Request) {
    try {
        const { error: authError, profile, user } = await authenticateAndRequireRole(request, ['admin', 'superadmin']);
        if (authError) return authError;

        const adminClient = createAdminClient();

        // Obtener perfil detallado
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
        const { id, ..._updateData } = body;

        if (!id) throw new Error('ID is required');

        // Verificar pertenencia
        const { data: activity, error: fetchError } = await adminClient
            .from('actividades')
            .select('gimnasio_id')
            .eq('id', id)
            .single();

        if (fetchError || !activity) {
            return NextResponse.json({ error: 'Actividad no encontrada' }, { status: 404 });
        }

        const isAuthorized = requester.rol === 'superadmin' || requester.gimnasio_id === activity.gimnasio_id;
        if (!isAuthorized) {
            return NextResponse.json({ error: 'Forbidden: No tienes acceso a esta actividad' }, { status: 403 });
        }

        const { data, error } = await adminClient
            .from('actividades')
            .update({
                nombre: body.nombre,
                tipo: body.tipo,
                descripcion: body.descripcion,
                esta_activa: body.esta_activa,
                duracion_minutos: body.duracion_minutos,
                capacidad_maxima: body.capacidad_maxima,
                url_imagen: body.url_imagen,
                dificultad: body.dificultad,
                color: body.color,
                categoria: body.categoria
            })
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;

        return NextResponse.json(data);
    } catch (error) {
        return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
    }
}

// DELETE: Delete an activity (checking ownership)
export async function DELETE(req: Request) {
    try {
        const { error: authError, profile, user } = await authenticateAndRequireRole(req, ['admin', 'superadmin']);
        if (authError) return authError;

        const adminClient = createAdminClient();

        // Obtener perfil detallado
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

        const { searchParams } = new URL(req.url);
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json({ error: 'ID is required' }, { status: 400 });
        }

        // Verificar pertenencia
        const { data: activity, error: fetchError } = await adminClient
            .from('actividades')
            .select('gimnasio_id')
            .eq('id', id)
            .single();

        if (fetchError || !activity) {
            return NextResponse.json({ error: 'Actividad no encontrada' }, { status: 404 });
        }

        const isAuthorized = requester.rol === 'superadmin' || requester.gimnasio_id === activity.gimnasio_id;
        if (!isAuthorized) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const { error } = await adminClient
            .from('actividades')
            .delete()
            .eq('id', id);

        if (error) throw error;

        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
    }
}
