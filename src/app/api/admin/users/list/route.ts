import { NextResponse } from 'next/server';
import { authenticateAndRequireRole, resolveGymIdForAdmin } from '@/lib/auth/api-auth';
import { createAdminClient } from '@/lib/supabase/admin';
import type { SupabaseUserProfile } from '@/types/user';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * GET /api/admin/users/list
 * 
 * Devuelve lista de usuarios con su estado de membresía.
 * Acceso: Admin, Superadmin
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
        const search = searchParams.get('search') || searchParams.get('q');

        const { targetGymId, errorResponse } = await resolveGymIdForAdmin(requester, urlGym);
        if (errorResponse) return errorResponse;

        // Si targetGymId es null (Superadmin sin filtrar por gimnasio), obtenemos los IDs de los gimnasios activos
        let activeGymIds: string[] = [];
        if (!targetGymId && requester?.rol === 'superadmin') {
            const { data: activeGyms } = await adminClient
                .from('gimnasios')
                .select('id')
                .is('deleted_at', null);
            activeGymIds = (activeGyms || []).map(g => g.id);
        }

        let query = (adminClient
            .from('perfiles') as any)
            .select(`
                *,
                gimnasios (nombre),
                relacion_alumno_coach!usuario_id (
                    es_principal,
                    entrenador_id,
                    coach:perfiles!entrenador_id (
                        id,
                        nombre_completo,
                        correo
                    )
                )
            `);

        // Filtrar según el gimnasio objetivo resuelto
        if (targetGymId) {
            query = query.eq('gimnasio_id', targetGymId);
        } else if (requester?.rol === 'superadmin') {
            if (activeGymIds.length > 0) {
                query = query.in('gimnasio_id', activeGymIds);
            } else {
                return NextResponse.json({ users: [] });
            }
        }

        if (search) {
            query = query.or(`nombre_completo.ilike.%${search}%,correo.ilike.%${search}%`).limit(50);
        }

        const { data: users, error: dbError } = await query
            .order('creado_en', { ascending: false });

        if (dbError) {
            logger.error('❌ Error en DB query:', { error: dbError });
            // Fallback si falla el JOIN (posiblemente por desajuste de schema extremo)
            let fallbackQuery = adminClient.from('perfiles').select('*');
            if (targetGymId) {
                fallbackQuery = fallbackQuery.eq('gimnasio_id', targetGymId);
            } else if (requester?.rol === 'superadmin') {
                if (activeGymIds.length > 0) {
                    fallbackQuery = fallbackQuery.in('gimnasio_id', activeGymIds);
                } else {
                    return NextResponse.json({ users: [] });
                }
            }
            if (search) {
                fallbackQuery = fallbackQuery.or(`nombre_completo.ilike.%${search}%,correo.ilike.%${search}%`).limit(50);
            }
            const fallback = await fallbackQuery;
            if (fallback.error) throw fallback.error;
            return NextResponse.json({ users: fallback.data.map(u => normalizeUser(u)) });
        }

        const formattedUsers = (users as any[]).map(u => normalizeUser(u));
        return NextResponse.json({ users: formattedUsers });

    } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        logger.error('❌ Error fetching users:', { error: message });
        return NextResponse.json({ error: message }, { status: 500 });
    }
}

function normalizeUser(u: any) {
    const relations = (u.relacion_alumno_coach as any[]) || [];

    const primaryRelation = relations.find((r: any) =>
        r.is_primary === true ||
        r.es_principal === true ||
        (r.is_primary === undefined && r.es_principal === undefined && relations.length === 1)
    );

    // Extraer ID del coach (aceptamos múltiples nombres de columna por seguridad)
    const assignedCoachId = primaryRelation?.coach_id ||
        primaryRelation?.entrenador_id ||
        primaryRelation?.coach?.id ||
        null;

    if (primaryRelation) {
        logger.info(`🔍 [DEBUG] Alumno ${u.id}: Coach ${assignedCoachId} (Primario encontrado)`);
    } else if (relations.length > 0) {
        logger.warn(`⚠️ [DEBUG] Alumno ${u.id}: Tiene ${relations.length} relaciones pero NINGUNA es primaria.`);
    }

    // Normalizar datos de perfil
    const userEmail = u.correo || u.email || '';
    const userName = u.nombre_completo || `${u.nombre || ''} ${u.apellido || ''}`.trim() || userEmail;

    // Normalizar el rol
    const rawRole = (u.rol || '').toLowerCase();
    const normalizedRole = ['coach', 'profesor', 'entrenador'].includes(rawRole) ? 'coach' :
        (['admin', 'administrador'].includes(rawRole) ? 'admin' :
            (['superadmin'].includes(rawRole) ? 'superadmin' : 'member'));

    return {
        ...u,
        id: u.id,
        name: userName,
        email: userEmail,
        role: normalizedRole as SupabaseUserProfile['role'],
        membershipStatus: u.estado_membresia || 'inactive',
        membershipEnds: u.fecha_fin_membresia,
        assigned_coach_id: assignedCoachId,
        gym: u.gimnasios?.nombre
    };
}
