import { SupabaseClient } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { logger } from '@/lib/logger';

// Diccionario de traducción estático para evitar la reinicialización en la pila local en cada petición
const ROLE_MAPPING: Record<string, string> = {
    'profesor': 'coach',
    'miembro': 'member',
    'administrador': 'admin',
    'dueño': 'superadmin'
};

/**
 * Authenticate a request using Supabase Auth
 * 
 * @param request - The incoming request
 * @returns Object with user, supabase client, and error (if any)
 * 
 * @example
 * const { user, supabase, error } = await authenticateRequest(request);
 * if (error) return error;
 */
export async function authenticateRequest(request: Request) {
    try {
        const supabase = await createClient();
        
        // 1. Intentar obtener el usuario por la sesión de cookies estándar
        let { data: { user }, error } = await supabase.auth.getUser();

        // 2. Si no hay usuario, intentar extraer el token de la cabecera Authorization (Híbrido Bearer)
        if ((error || !user) && request) {
            const authHeader = request.headers.get('Authorization');
            if (authHeader && authHeader.startsWith('Bearer ')) {
                const token = authHeader.substring(7);
                // Validar el token directamente sin guardar una sesión fantasma
                const userResult = await supabase.auth.getUser(token);
                
                if (!userResult.error && userResult.data.user) {
                    user = userResult.data.user;
                    error = null;
                }
            }
        }

        if (error || !user) {
            return {
                error: NextResponse.json(
                    { error: 'Unauthorized', message: 'Invalid or missing authentication token' },
                    { status: 401 }
                ),
                user: null,
                supabase: null
            };
        }

        return { user, supabase, error: null };
    } catch (_err) {
        return {
            error: NextResponse.json(
                { error: 'Authentication failed', message: 'Failed to verify authentication' },
                { status: 401 }
            ),
            user: null,
            supabase: null
        };
    }
}

/**
 * Require that the authenticated user has one of the allowed roles
 * 
 * @param supabase - Supabase client instance
 * @param userId - User ID to check
 * @param allowedRoles - Array of allowed roles
 * @returns Object with profile and error (if any)
 * 
 * @example
 * const { profile, error } = await requireRole(supabase, user.id, ['admin']);
 * if (error) return error;
 */
export async function requireRole(
    supabase: SupabaseClient,
    userId: string,
    allowedRoles: string[],
    preloadedUser?: any
) {
    try {
        // 1. Priorizar metadata del JWT (evitando llamarlo de nuevo si ya fue precargado)
        const user = preloadedUser || (await supabase.auth.getUser()).data.user;

        // El rol puede estar en 'rol' o 'role' (por compatibilidad)
        // app_metadata es más confiable que user_metadata (que puede ser editado por el usuario)
        // Se descarta fallback a user_metadata por seguridad (escalada de privilegios)
        let role = user?.app_metadata?.rol ||
            user?.app_metadata?.role;

        // 2. Fallback a base de datos solo si no hay metadata (ej. usuarios viejos no sincronizados)
        if (!role) {
            logger.info(`requireRole: Rol no encontrado en metadata para ${userId}. Consultando DB...`);

            const { data: profile, error } = await supabase
                .from('perfiles')
                .select('rol')
                .eq('id', userId)
                .single();

            if (error) {
                logger.error('requireRole: Error consultando perfil en DB:', { error });
                // Si hay un error 406 o similar, es probable que el RLS esté bloqueando.
                // No podemos determinar el rol, así que denegamos acceso por seguridad.
                return {
                    error: NextResponse.json(
                        {
                            error: 'Authorization Error',
                            message: 'No se pudo verificar el nivel de acceso.',
                            code: error.code
                        },
                        { status: 403 }
                    ),
                    profile: null
                };
            }

            if (!profile) {
                return {
                    error: NextResponse.json(
                        { error: 'Profile not found', message: 'El perfil de usuario no existe.' },
                        { status: 404 }
                    ),
                    profile: null
                };
            }

            role = profile.rol;
        }

        // 3. Verificación de permisos (Insensible a mayúsculas y soporte español)
        const rawRole = (role || '').toLowerCase();
        const normalizedUserRole = ROLE_MAPPING[rawRole] || rawRole;
        const normalizedAllowedRoles = allowedRoles.map(r => r.toLowerCase());

        if (!normalizedAllowedRoles.includes(normalizedUserRole) && normalizedUserRole !== 'superadmin') {
            logger.warn(`requireRole: Acceso denegado para ${userId}. Rol: ${role}, Requeridos: ${allowedRoles}`);
            return {
                error: NextResponse.json(
                    {
                        error: 'Forbidden',
                        message: 'No tienes permisos para acceder a este recurso.'
                    },
                    { status: 403 }
                ),
                profile: null
            };
        }

        // 4. Obtener/Retornar perfil completo enriquecido sin viajes de red redundantes (JWT Hydration)
        // Se descarta fallback a user_metadata por seguridad (escalada de privilegios)
        let gimnasio_id = user?.app_metadata?.gimnasio_id ||
            user?.app_metadata?.gimnasioId;

        // Fallback a base de datos únicamente ante la ausencia de metadatos de sesión
        if (!gimnasio_id) {
            logger.info(`requireRole: gimnasio_id no encontrado en metadata de sesión para ${userId}. Consultando DB...`);
            const { data: fullProfile } = await supabase
                .from('perfiles')
                .select('gimnasio_id')
                .eq('id', userId)
                .single();
            gimnasio_id = fullProfile?.gimnasio_id;
        }

        return {
            profile: {
                role: normalizedUserRole,
                gimnasio_id
            },
            error: null
        };
    } catch (err) {
        logger.error('requireRole: Error inesperado:', { error: err instanceof Error ? err.message : err });
        return {
            error: NextResponse.json(
                { error: 'Internal Authority Error', message: 'Error interno al verificar permisos' },
                { status: 500 }
            ),
            profile: null
        };
    }
}

/**
 * Combined authentication and role verification
 * 
 * @param request - The incoming request
 * @param allowedRoles - Array of allowed roles
 * @returns Object with user, profile, supabase client, and error (if any)
 * 
 * @example
 * const { user, profile, supabase, error } = await authenticateAndRequireRole(request, ['admin']);
 * if (error) return error;
 */
export async function authenticateAndRequireRole(
    request: Request,
    allowedRoles: string[]
) {
    const { user, supabase, error: authError } = await authenticateRequest(request);

    if (authError) {
        return { user: null, profile: null, supabase: null, error: authError };
    }

    const { profile, error: roleError } = await requireRole(supabase!, user!.id, allowedRoles, user);

    if (roleError) {
        return { user, profile: null, supabase, error: roleError };
    }

    return { user, profile, supabase, error: null };
}
