import { NextResponse, type NextRequest } from 'next/server';
import { SupabaseClient, User } from '@supabase/supabase-js';
import { MODULE_ROUTES, PUBLIC_ROUTES } from './constants';

/**
 * Handles Role-Based Access Control and Redirections
 */
export async function handleRBAC(
    request: NextRequest, 
    response: NextResponse, 
    user: User | null, 
    supabase: SupabaseClient
) {
    const { pathname } = request.nextUrl;
    
    // 1. Obtener Metadatos del Usuario (Rol y Gym)
    let userRole: string | undefined;
    let gymId: string | undefined;
    let gymSlug: string | undefined;

    if (user) {
        // Intentar leer de la cookie de caché para evitar DB hits
        const userMetaCookie = request.cookies.get('vtd_user_meta')?.value;
        if (userMetaCookie) {
            try {
                const meta = JSON.parse(userMetaCookie);
                userRole = meta.rol;
                gymId = meta.gymId;
                gymSlug = meta.gymSlug;
            } catch (e) {
                console.warn('[RBAC] Error parsing vtd_user_meta cookie:', e);
            }
        }

        // Si no hay caché, consultar DB
        if (!userRole) {
            const { data: profile } = await supabase
                .from('perfiles')
                .select('rol, gimnasio_id, gimnasios(slug)')
                .eq('id', user.id)
                .single();

            if (profile) {
                userRole = profile.rol?.toLowerCase();
                gymId = profile.gimnasio_id;
                gymSlug = (profile.gimnasios as any)?.slug;

                // Cachear en la respuesta para el próximo request
                response.cookies.set('vtd_user_meta', JSON.stringify({ rol: userRole, gymId, gymSlug }), {
                    maxAge: 600,
                    path: '/',
                    httpOnly: true,
                    sameSite: 'lax'
                });
            }
        }
    }

    // 2. Protecciones de Acceso (Redirects forzados)
    
    // CASO A: No logueado tratando de ir a ruta privada
    const isPublic = PUBLIC_ROUTES.includes(pathname);
    if (!user && !isPublic) {
        const redirectUrl = request.nextUrl.clone();
        redirectUrl.pathname = '/login';
        return NextResponse.redirect(redirectUrl);
    }

    // CASO B: Logueado tratando de ir a Landing/Login/Signup -> Dashboard
    if (user && isPublic) {
        let dest = '/';
        switch (userRole) {
            case 'superadmin': dest = '/saas-admin'; break;
            case 'admin': dest = gymId ? `/${gymId}/admin` : '/'; break;
            case 'recepcion': dest = gymId ? `/${gymId}/admin/recepcion/pos` : '/'; break;
            case 'coach': dest = gymId ? `/${gymId}/coach` : '/'; break;
            default: dest = gymId ? `/${gymId}/member/dashboard` : '/'; break;
        }

        if (dest !== pathname) {
            return NextResponse.redirect(new URL(dest, request.url));
        }
    }

    // 3. Guards de Ruta (RBAC Profundo)
    
    // Proteccion SaaS Admin
    if (pathname.startsWith('/saas-admin') && userRole !== 'superadmin') {
        const dest = gymId ? `/${gymId}/admin` : '/';
        return NextResponse.redirect(new URL(dest, request.url));
    }

    // Proteccion de Tenancy [gymId]
    const pathSegments = pathname.split('/').filter(Boolean);
    const currentGymIdParam = pathSegments[0];

    if (currentGymIdParam && !['saas-admin', 'api', 'auth', 'g', 'inscripcion'].includes(currentGymIdParam)) {
        // Un usuario normal no puede entrar a otro gimnasio
        if (userRole !== 'superadmin' && gymId && currentGymIdParam !== gymId) {
            return NextResponse.redirect(new URL(`/${gymId}/member/dashboard`, request.url));
        }

        // RBAC dentro del gimnasio (admin, coach, member)
        const tenantPath = pathSegments[1];
        if (tenantPath === 'admin') {
            if (!['admin', 'superadmin', 'recepcion'].includes(userRole ?? '')) {
                const dest = gymId ? `/${gymId}/member/dashboard` : '/';
                return NextResponse.redirect(new URL(dest, request.url));
            }
        }
    }

    // 4. Module Gating
    const requiredModule = Object.entries(MODULE_ROUTES).find(([route]) => pathname.includes(route))?.[1];
    if (requiredModule && userRole !== 'superadmin' && gymId) {
        const { data: gym } = await supabase.from('gimnasios').select('modulos_activos').eq('id', gymId).single();
        const modules = gym?.modulos_activos || {};
        const isEnabled = Array.isArray(modules) ? modules.includes(requiredModule) : (modules as any)[requiredModule];

        if (!isEnabled) {
            const dest = `/${gymId}/member/dashboard`;
            return NextResponse.redirect(new URL(dest, request.url));
        }
    }

    return null; // Continuar
}
