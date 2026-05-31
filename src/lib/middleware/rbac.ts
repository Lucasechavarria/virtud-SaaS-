import { NextResponse, type NextRequest } from 'next/server';
import { SupabaseClient, User } from '@supabase/supabase-js';
import { MODULE_ROUTES, PUBLIC_ROUTES } from './constants';
import { hasModuleAccess } from '@/lib/saas/modules';

/**
 * Handles Role-Based Access Control and Redirections using local JWT Claims (Zero Latency)
 */
export async function handleRBAC(
    request: NextRequest, 
    response: NextResponse, 
    user: User | null, 
    supabase: SupabaseClient
) {
    const { pathname } = request.nextUrl;

    // 1. Resolver metadatos de red para redirecciones por subdominio (Edge Layer)
    const host = request.headers.get('host') || 'localhost:3000';
    const hostWithoutPort = host.split(':')[0];
    const port = host.split(':')[1] ? `:${host.split(':')[1]}` : '';
    const isLocalhost = hostWithoutPort.endsWith('localhost') || hostWithoutPort === '127.0.0.1';
    
    const baseDomainWithoutPort = isLocalhost ? 'localhost' : 'virtud.fit';
    const baseDomain = `${baseDomainWithoutPort}${port}`;
    const isSubdomain = hostWithoutPort !== baseDomainWithoutPort && hostWithoutPort !== `www.${baseDomainWithoutPort}`;
    
    // 2. Obtener Metadatos directamente de los Claims de Identidad del JWT
    let userRole: string | undefined;
    let gymId: string | undefined;
    let gymSlug: string | undefined;
    let activeModules: unknown | undefined;

    if (user) {
        // Extraer claims de app_metadata inyectados por el trigger de base de datos
        userRole = (user.app_metadata?.rol || user.app_metadata?.role) as string;
        userRole = userRole?.toLowerCase();
        gymId = user.app_metadata?.gimnasio_id as string;
        gymSlug = user.app_metadata?.gimnasio_slug as string;
        activeModules = user.app_metadata?.modulos_activos;

        // Establecer la cookie vtd_user_meta para depuración en el navegador y compatibilidad rápida
        response.cookies.set('vtd_user_meta', JSON.stringify({ 
            rol: userRole, 
            gymId, 
            gymSlug,
            modules: activeModules
        }), {
            maxAge: 600, // 10 minutos
            path: '/',
            httpOnly: true,
            sameSite: 'lax'
        });

        // Debug local en el servidor/middleware para validar el flujo de claims
        console.warn(`[Edge JWT Claims] User: ${user.email} | Role: ${userRole} | GymId: ${gymId} | GymSlug: ${gymSlug}`);
    }

    // 3. Protecciones de Acceso (Redirecciones)
    
    // CASO A: No logueado tratando de ir a ruta privada
    const isPublic = PUBLIC_ROUTES.includes(pathname);
    if (!user && !isPublic) {
        const redirectUrl = request.nextUrl.clone();
        redirectUrl.pathname = '/login';
        return NextResponse.redirect(redirectUrl);
    }

    // CASO B: Logueado tratando de ir a Landing/Login/Signup -> Dashboard correspondiente
    if (user && isPublic) {
        let dest = '/';
        
        if (isSubdomain) {
            // A. Redirección LOCAL y limpia si ya navega bajo un subdominio
            switch (userRole) {
                case 'superadmin': dest = '/saas-admin'; break;
                case 'admin': dest = '/admin'; break;
                case 'recepcion': dest = '/admin/recepcion/pos'; break;
                case 'coach': dest = '/coach'; break;
                default: dest = '/member/dashboard'; break;
            }
            
            console.warn(`[Subdomain Redirect] User: ${user.email} | Role: ${userRole} | Pathname: ${pathname} -> Local: ${dest}`);
            if (dest !== pathname) {
                return NextResponse.redirect(new URL(dest, request.url));
            }
        } else {
            // B. Redirección al gimnasio si navega en el dominio centralizado
            const gymPrefix = gymSlug || gymId;
            
            if (userRole === 'superadmin') {
                dest = '/saas-admin';
            } else if (gymPrefix) {
                if (isLocalhost) {
                    // En localhost, para evitar problemas de cookies inter-subdominio en Cypress y desarrollo,
                    // usamos redirecciones basadas en rutas (path-based), ej: /virtud-central/member/dashboard
                    switch (userRole) {
                        case 'admin': dest = `/${gymPrefix}/admin`; break;
                        case 'recepcion': dest = `/${gymPrefix}/admin/recepcion/pos`; break;
                        case 'coach': dest = `/${gymPrefix}/coach`; break;
                        default: dest = `/${gymPrefix}/member/dashboard`; break;
                    }
                } else {
                    const protocol = request.nextUrl.protocol; // http: o https:
                    switch (userRole) {
                        case 'admin': dest = `${protocol}//${gymPrefix}.${baseDomain}/admin`; break;
                        case 'recepcion': dest = `${protocol}//${gymPrefix}.${baseDomain}/admin/recepcion/pos`; break;
                        case 'coach': dest = `${protocol}//${gymPrefix}.${baseDomain}/coach`; break;
                        default: dest = `${protocol}//${gymPrefix}.${baseDomain}/member/dashboard`; break;
                    }
                }
            } else {
                dest = '/';
            }

            console.warn(`[Global Redirect] User: ${user.email} | Role: ${userRole} | GymPrefix: ${gymPrefix} | Pathname: ${pathname} -> dest: ${dest}`);
            
            if (dest !== pathname && dest !== '/') {
                if (isLocalhost) {
                    return NextResponse.redirect(new URL(dest, request.url));
                } else {
                    return NextResponse.redirect(new URL(dest));
                }
            }
        }
    }

    // 4. Guards de Ruta (RBAC Profundo)
    
    // Protección SaaS Admin
    if (pathname.startsWith('/saas-admin') && userRole !== 'superadmin') {
        const dest = isSubdomain ? '/' : (gymSlug ? `/${gymSlug}` : (gymId ? `/${gymId}` : '/'));
        return NextResponse.redirect(new URL(dest, request.url));
    }

    // Protección de Tenancy [gymId] (Para paths legacy o path-based en desarrollo)
    const pathSegments = pathname.split('/').filter(Boolean);
    const currentGymIdParam = pathSegments[0];

    if (currentGymIdParam && !['saas-admin', 'api', 'auth', 'g', 'inscripcion', '_tenants'].includes(currentGymIdParam)) {
        if (!isSubdomain) {
            // Un usuario normal no puede entrar a otro gimnasio
            const expectedTenant = gymSlug || gymId;
            if (userRole !== 'superadmin' && expectedTenant && currentGymIdParam !== expectedTenant) {
                if (isLocalhost) {
                    const dest = `/${expectedTenant}/member/dashboard`;
                    return NextResponse.redirect(new URL(dest, request.url));
                } else {
                    const protocol = request.nextUrl.protocol;
                    const dest = `${protocol}//${expectedTenant}.${baseDomain}/member/dashboard`;
                    return NextResponse.redirect(new URL(dest));
                }
            }
        }
    }

    // RBAC para rutas de administración (/admin)
    if (pathname.startsWith('/admin') || (isSubdomain && pathname === '/admin')) {
        if (!['admin', 'superadmin', 'recepcion'].includes(userRole ?? '')) {
            const dest = isSubdomain ? '/member/dashboard' : (gymSlug ? `/${gymSlug}/member/dashboard` : '/');
            return NextResponse.redirect(new URL(dest, request.url));
        }
    }

    // 5. Module Gating local con Claims (Bitmask e Híbrido)
    const requiredModule = Object.entries(MODULE_ROUTES).find(([route]) => pathname.includes(route))?.[1];
    if (requiredModule && userRole !== 'superadmin' && gymId) {
        const isEnabled = hasModuleAccess(activeModules, requiredModule);

        if (!isEnabled) {
            console.warn(`[Module Gate] Bloqueado acceso a ${pathname}. Módulo requerido: ${requiredModule} inactivo.`);
            const dest = isSubdomain ? '/member/dashboard' : (gymSlug ? `/${gymSlug}/member/dashboard` : '/');
            return NextResponse.redirect(new URL(dest, request.url));
        }
    }

    return null; // Continuar petición sin bloquear
}
