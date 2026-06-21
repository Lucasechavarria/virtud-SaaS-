import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { authenticateAndRequireRole } from '@/lib/auth/api-auth';
import { ROLES } from '@/lib/constants/app';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

// GET /api/equipment - List all equipment (Isolated by tenant)
export async function GET(req: Request) {
    try {
        const { error: authError, profile, supabase } = await authenticateAndRequireRole(req, [ROLES.ADMIN, ROLES.COACH, ROLES.RECEPCION, ROLES.MEMBER]);
        if (authError || !supabase) return authError || NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { searchParams } = new URL(req.url);
        const category = searchParams.get('category');
        const available = searchParams.get('available');
        const urlGym = searchParams.get('gymId');

        let targetGymId = profile?.gimnasio_id;

        // Si es Superadmin, puede filtrar por cualquier gymId recibido
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
            return NextResponse.json({ error: 'Forbidden: Gimnasio no especificado' }, { status: 403 });
        }

        let query = (supabase.from('equipamiento') as any)
            .select('*')
            .eq('gimnasio_id', targetGymId)
            .order('nombre');

        if (category) query = query.eq('categoria', category);
        if (available) query = query.eq('disponible', available === 'true');

        const { data, error } = await query;
        if (error) throw error;

        return NextResponse.json(data);
    } catch (_error) {
        console.error('Equipment Fetch Error:', _error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

// POST /api/equipment - Create equipment (Admin only, support superadmin impersonation)
export async function POST(req: Request) {
    try {
        const { error: authError, profile, supabase } = await authenticateAndRequireRole(req, [ROLES.ADMIN]);
        if (authError || !supabase) return authError || NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const body = await req.json();
        const { name, category, condition, is_available, last_maintenance, gymId } = body;

        let targetGymId = profile?.gimnasio_id;

        // Permitir a superadmin definir el gimnasio
        if (profile?.role === 'superadmin' && gymId) {
            targetGymId = gymId;
        }

        if (!targetGymId) {
            return NextResponse.json({ error: 'Gimnasio no especificado' }, { status: 400 });
        }

        const adminClient = createAdminClient();
        const { data, error } = await adminClient
            .from('equipamiento' as any)
            .insert({
                gimnasio_id: targetGymId,
                nombre: name,
                categoria: category,
                estado: condition || 'excelente',
                disponible: is_available !== undefined ? is_available : true,
                ultimo_mantenimiento: last_maintenance
            })
            .select()
            .single();

        if (error) throw error;
        return NextResponse.json(data);
    } catch (_error) {
        console.error('Equipment Create Error:', _error);
        return NextResponse.json({ error: 'Error creating equipment' }, { status: 500 });
    }
}

// PATCH /api/equipment - Update equipment (Admin full, Coach partial, Multi-tenant BOLA check)
export async function PATCH(req: Request) {
    try {
        const { error: authError, profile, user, supabase } = await authenticateAndRequireRole(req, [ROLES.ADMIN, ROLES.COACH]);
        if (authError || !supabase || !user) return authError || NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const body = await req.json();
        const { id, ...updates } = body;

        if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });

        const adminClient = createAdminClient();

        // 1. Obtener equipamiento existente para verificar pertenencia al gimnasio (BOLA Shield)
        const { data: existingItem, error: findError } = await adminClient
            .from('equipamiento')
            .select('gimnasio_id')
            .eq('id', id)
            .single();

        if (findError || !existingItem) {
            return NextResponse.json({ error: 'Equipo no encontrado' }, { status: 404 });
        }

        if (profile?.role !== 'superadmin' && existingItem.gimnasio_id !== profile?.gimnasio_id) {
            return NextResponse.json({ error: 'Forbidden: No tienes acceso a este recurso' }, { status: 403 });
        }

        // If role is COACH, they can only update condition, last_maintenance and availability
        if (profile?.role === ROLES.COACH) {
            const allowedUpdates = ['condition', 'is_available', 'last_maintenance'];
            const keys = Object.keys(updates);
            const isAllowed = keys.every(k => allowedUpdates.includes(k));

            if (!isAllowed) {
                return NextResponse.json({ error: 'Coach can only update condition/availability' }, { status: 403 });
            }
        }

        // Map updates to Spanish columns
        const mappedUpdates: any = {};
        if (updates.name) mappedUpdates.nombre = updates.name;
        if (updates.category) mappedUpdates.categoria = updates.category;
        if (updates.condition) mappedUpdates.estado = updates.condition;
        if (updates.is_available !== undefined) mappedUpdates.disponible = updates.is_available;
        if (updates.last_maintenance) mappedUpdates.ultimo_mantenimiento = updates.last_maintenance;

        mappedUpdates.actualizado_en = new Date().toISOString();

        const { data, error } = await adminClient
            .from('equipamiento')
            .update(mappedUpdates)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return NextResponse.json(data);
    } catch (_error) {
        console.error('Equipment Update Error:', _error);
        return NextResponse.json({ error: 'Error updating equipment' }, { status: 500 });
    }
}

// DELETE /api/equipment - Delete equipment (Admin only, BOLA check)
export async function DELETE(req: Request) {
    try {
        const { error: authError, profile } = await authenticateAndRequireRole(req, [ROLES.ADMIN]);
        if (authError) return authError;

        const { searchParams } = new URL(req.url);
        const id = searchParams.get('id');
        if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });

        const adminClient = createAdminClient();

        // 1. Obtener equipamiento existente para verificar pertenencia al gimnasio (BOLA Shield)
        const { data: existingItem, error: findError } = await adminClient
            .from('equipamiento')
            .select('gimnasio_id')
            .eq('id', id)
            .single();

        if (findError || !existingItem) {
            return NextResponse.json({ error: 'Equipo no encontrado' }, { status: 404 });
        }

        if (profile?.role !== 'superadmin' && existingItem.gimnasio_id !== profile?.gimnasio_id) {
            return NextResponse.json({ error: 'Forbidden: No tienes acceso a este recurso' }, { status: 403 });
        }

        const { error } = await adminClient
            .from('equipamiento')
            .delete()
            .eq('id', id);

        if (error) throw error;
        return NextResponse.json({ success: true });
    } catch (_error) {
        console.error('Equipment Delete Error:', _error);
        return NextResponse.json({ error: 'Error deleting equipment' }, { status: 500 });
    }
}
