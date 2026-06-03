import { NextResponse, type NextRequest } from 'next/server';
import { SupabaseClient, User } from '@supabase/supabase-js';
import { MODULE_ROUTES, PUBLIC_ROUTES } from './constants';
import { hasModuleAccess } from '@/lib/saas/modules';

// ==========================================
// 1. DEFINICIONES DE TIPOS E INTERFACES
// ==========================================

export interface UserPermissions {
    admin?: boolean;      // Acceso completo al panel administrativo
    pos?: boolean;        // Punto de venta (/admin/recepcion/pos)
    caja?: boolean;       // Manejo de caja financiera
    rutinas?: boolean;    // Creación de rutinas, planes y desafíos (/coach)
    asistencia?: boolean; // Toma de asistencia de alumnos y profesores
    nutricion?: boolean;  // Planes nutricionales
}

export interface UserClaims {
    role?: string;
    gymId?: string;
    gymSlug?: string;
    activeModules?: unknown;
    permisos?: UserPermissions;
}

export interface NetworkContext {
    host: string;
    hostname: string;
    port: string;
    pathname: string;
    isLocalhost: boolean;
    isSubdomain: boolean;
    baseDomainWithoutPort: string;
    baseDomain: string;
    protocol: string;
}

export interface RBACContext {
    request: NextRequest;
    response: NextResponse;
    user: User | null;
    claims: UserClaims;
    network: NetworkContext;
    isPublic: boolean;
}

type RBACGuard = (ctx: RBACContext) => NextResponse | null;

// Configuración de rutas excluidas de validación de tenancy
const EXCLUDED_TENANT_PATHS = new Set([
    'saas-admin', 'api', 'auth', 'g', 'inscripcion', 'tenants', 'dashboard', 'saas', 'debug'
]);

// ==========================================
// 2. EXTRACCIÓN Y PARSING (Helpers Puros)
// ==========================================

function resolveNetworkContext(request: NextRequest): NetworkContext {
    const { pathname, hostname: nextHostname, port: nextPort, protocol } = request.nextUrl;
    
    // Prioridad absoluta a nextHostname (API nativa segura en Edge) para evitar inyecciones de Host Header
    const hostname = nextHostname || request.headers.get('host')?.split(':')[0] || 'localhost';
    const port = nextPort ? `:${nextPort}` : '';
    const isLocalhost = hostname.endsWith('localhost') || hostname === '127.0.0.1';
    
    const baseDomainWithoutPort = process.env.NEXT_PUBLIC_APP_DOMAIN || (isLocalhost ? 'localhost' : (hostname.endsWith('vercel.app') ? hostname : 'virtud.fit'));
    const baseDomain = `${baseDomainWithoutPort}${port}`;
    
    const isSubdomain = hostname !== baseDomainWithoutPort && hostname !== `www.${baseDomainWithoutPort}`;
    
    // Normalizar pathname removiendo barras inclinadas finales (Trailing Slash)
    const normalizedPathname = pathname === '/' ? '/' : pathname.replace(/\/$/, '');

    return {
        host: `${hostname}${port}`,
        hostname,
        port,
        pathname: normalizedPathname, // Usamos el pathname sanitizado
        isLocalhost,
        isSubdomain,
        baseDomainWithoutPort,
        baseDomain,
        protocol
    };
}

function extractUserClaims(user: User | null): UserClaims {
    if (!user) return {};
    
    const rawRole = (user.app_metadata?.rol || user.app_metadata?.role) as string;
    const rawPermisos = user.app_metadata?.permisos as UserPermissions | undefined;

    // Normalizar permisos para ser robustos ante nulos o no inicializados
    const permisos: UserPermissions = {
        admin: !!rawPermisos?.admin,
        pos: !!rawPermisos?.pos,
        caja: !!rawPermisos?.caja,
        rutinas: !!rawPermisos?.rutinas,
        asistencia: !!rawPermisos?.asistencia,
        nutricion: !!rawPermisos?.nutricion
    };

    // Fallback inteligente basado en roles si no existen permisos en el JWT
    // para mantener retrocompatibilidad total con usuarios ya creados.
    const role = rawRole?.toLowerCase();
    if (!rawPermisos) {
        permisos.admin = role === 'superadmin' || role === 'admin';
        permisos.pos = role === 'recepcion' || role === 'admin';
        permisos.caja = role === 'recepcion' || role === 'admin';
        permisos.rutinas = role === 'coach' || role === 'admin';
        permisos.asistencia = ['admin', 'recepcion', 'coach'].includes(role || '');
        permisos.nutricion = role === 'coach' || role === 'admin';
    }

    return {
        role,
        gymId: user.app_metadata?.gimnasio_id as string,
        gymSlug: user.app_metadata?.gimnasio_slug as string,
        activeModules: user.app_metadata?.modulos_activos,
        permisos
    };
}

/**
 * Resuelve la ruta del dashboard dinámico según los permisos booleanos activos (UX Inteligente)
 */
function resolveDynamicDestination(permisos?: UserPermissions): string {
    if (!permisos) return '/member/dashboard';
    
    // Evaluación ordenada de prioridades de negocio
    if (permisos.admin) return '/admin';
    if (permisos.pos) return '/admin/recepcion/pos';
    if (permisos.rutinas) return '/coach';
    
    return '/member/dashboard';
}

// Logger condicionado al entorno para evitar contaminación en producción
function logDebug(message: string, isDev = process.env.NODE_ENV === 'development') {
    if (isDev) {
        console.warn(`[Edge RBAC Debug] ${message}`);
    }
}

// ==========================================
// 3. PIPELINE DE GUARDIAS (RBAC Guards)
// ==========================================

/**
 * Caso A: Usuario no autenticado intentando acceder a ruta privada
 */
const authenticationGuard: RBACGuard = (ctx) => {
    if (!ctx.user && !ctx.isPublic) {
        const redirectUrl = ctx.request.nextUrl.clone();
        redirectUrl.pathname = '/login';
        return NextResponse.redirect(redirectUrl);
    }
    return null;
};

/**
 * Caso B: Redirecciones inteligentes para usuarios autenticados en páginas de inicio/landing
 */
const landingRedirectGuard: RBACGuard = (ctx) => {
    if (!ctx.user || !ctx.isPublic) return null;

    const { role, gymSlug, gymId, permisos } = ctx.claims;
    const { isSubdomain, isLocalhost, baseDomain, protocol, pathname } = ctx.network;
    
    // Resolver destino dinámico basado en permisos con fallback a dashboard
    const destPath = resolveDynamicDestination(permisos);

    let finalDestination = '/';

    if (isSubdomain) {
        finalDestination = destPath;
        logDebug(`[Subdomain Redirect] User: ${ctx.user.email} | Path: ${pathname} -> Local: ${finalDestination}`);
        
        if (finalDestination !== pathname) {
            return NextResponse.redirect(new URL(finalDestination, ctx.request.url));
        }
    } else {
        const gymPrefix = gymSlug || gymId;
        
        if (role === 'superadmin') {
            finalDestination = '/saas-admin';
        } else if (gymPrefix) {
            if (isLocalhost) {
                // Enrutamiento basado en paths para entorno de desarrollo local (Localhost)
                finalDestination = `/${gymPrefix}${destPath}`;
            } else {
                // Enrutamiento real basado en subdominios para producción
                finalDestination = `${protocol}//${gymPrefix}.${baseDomain}${destPath}`;
            }
        }

        logDebug(`[Global Redirect] User: ${ctx.user.email} | Prefix: ${gymPrefix} -> Dest: ${finalDestination}`);
        
        if (finalDestination !== pathname && finalDestination !== '/') {
            if (isLocalhost) {
                return NextResponse.redirect(new URL(finalDestination, ctx.request.url));
            } else {
                return NextResponse.redirect(new URL(finalDestination));
            }
        }
    }

    return null;
};

/**
 * Caso C: Guardia de protección para el panel de SaaS Admin
 */
const saasAdminGuard: RBACGuard = (ctx) => {
    const { pathname } = ctx.network;
    const { role, gymSlug, gymId } = ctx.claims;

    if (pathname.startsWith('/saas-admin') && role !== 'superadmin') {
        const gymPrefix = gymSlug || gymId;
        const fallbackPath = ctx.network.isSubdomain 
            ? '/' 
            : (gymPrefix ? `/${gymPrefix}` : '/');
        
        return NextResponse.redirect(new URL(fallbackPath, ctx.request.url));
    }
    return null;
};

/**
 * Caso D: Aislamiento del inquilino (Tenancy Isolation Guard) con Validación Cruzada en Edge
 */
const tenantIsolationGuard: RBACGuard = (ctx) => {
    const { pathname, isSubdomain, isLocalhost, baseDomain, protocol, hostname, baseDomainWithoutPort } = ctx.network;
    const { role, gymSlug, gymId } = ctx.claims;

    if (role === 'superadmin') return null; // Los Superadmins están excluidos de las validaciones de aislamiento

    const expectedTenant = gymSlug || gymId;

    if (isSubdomain) {
        // EXTRAER EL SUBDOMINIO ACTUAL DE LA URL EN PRODUCCIÓN
        // Ej: 'gimnasio-a.virtud.fit' -> 'gimnasio-a'
        const currentSubdomain = hostname.replace(`.${baseDomainWithoutPort}`, '').replace('www.', '').toLowerCase();

        // VALIDACIÓN CRUZADA PERIMETRAL EN EDGE (CERO LATENCIA)
        if (expectedTenant && currentSubdomain !== expectedTenant.toLowerCase()) {
            // Un usuario de gimnasio-b intentando acceder a gimnasio-a.virtud.fit
            // Redirección inmediata a su propio subdominio legítimo
            const dest = `${protocol}//${expectedTenant}.${baseDomain}/member/dashboard`;
            logDebug(`[Edge Tenancy Shield] Redireccionando usuario intruso de ${currentSubdomain} a su tenant legítimo: ${expectedTenant}`);
            return NextResponse.redirect(new URL(dest));
        }
    } else {
        // Validación para entornos path-based (localhost)
        const pathSegments = pathname.split('/').filter(Boolean);
        const currentGymIdParam = pathSegments[0];

        if (currentGymIdParam && !EXCLUDED_TENANT_PATHS.has(currentGymIdParam)) {
            if (expectedTenant && currentGymIdParam !== expectedTenant) {
                if (isLocalhost) {
                    const dest = `/${expectedTenant}/member/dashboard`;
                    return NextResponse.redirect(new URL(dest, ctx.request.url));
                } else {
                    const dest = `${protocol}//${expectedTenant}.${baseDomain}/member/dashboard`;
                    return NextResponse.redirect(new URL(dest));
                }
            }
        }
    }
    return null;
};

/**
 * Caso E: Guardia administrativo por Permisos Compactos y Redirección Inteligente
 */
const adminAreaGuard: RBACGuard = (ctx) => {
    const { pathname, isSubdomain, isLocalhost, baseDomain, protocol } = ctx.network;
    const { gymSlug, gymId, permisos } = ctx.claims;
    const gymPrefix = gymSlug || gymId;

    // Verificar si solicita exactamente la raíz de administración (pathname ya está normalizado sin trailing slashes)
    const isRootAdmin = pathname === '/admin' || (isSubdomain && pathname === '/admin');
    
    if (isRootAdmin) {
        // 1. Acceso permitido si tiene permiso de administrador general
        if (permisos?.admin) return null;

        // 2. Redirección Inteligente Contextual para empleados con permisos parciales
        const fallbackDest = resolveDynamicDestination(permisos);
        if (fallbackDest !== '/member/dashboard') {
            if (isSubdomain) {
                return NextResponse.redirect(new URL(fallbackDest, ctx.request.url));
            } else if (gymPrefix) {
                const dest = isLocalhost 
                    ? `/${gymPrefix}${fallbackDest}`
                    : `${protocol}//${gymPrefix}.${baseDomain}${fallbackDest}`;
                return NextResponse.redirect(isLocalhost ? new URL(dest, ctx.request.url) : new URL(dest));
            }
        }

        // 3. Rebote para usuarios comunes sin permisos administrativos
        const dest = isSubdomain 
            ? '/member/dashboard' 
            : (gymPrefix ? `/${gymPrefix}/member/dashboard` : '/');
        return NextResponse.redirect(new URL(dest, ctx.request.url));
    }

    // Proteger subrutas específicas como el Punto de Venta o Caja
    if (pathname.includes('/admin/recepcion/pos') || pathname.includes('/admin/caja')) {
        if (!permisos?.admin && !permisos?.pos && !permisos?.caja) {
            const dest = isSubdomain 
                ? '/member/dashboard' 
                : (gymPrefix ? `/${gymPrefix}/member/dashboard` : '/');
            return NextResponse.redirect(new URL(dest, ctx.request.url));
        }
        return null;
    }

    // Para cualquier otra subruta general de administración (/admin/*), se requiere el flag 'admin'
    if (pathname.startsWith('/admin') && !isRootAdmin) {
        if (!permisos?.admin) {
            const dest = isSubdomain 
                ? '/member/dashboard' 
                : (gymPrefix ? `/${gymPrefix}/member/dashboard` : '/');
            return NextResponse.redirect(new URL(dest, ctx.request.url));
        }
    }

    return null;
};

/**
 * Caso F: Module Gating con Claims del JWT (Bitmask/Híbrido)
 */
const moduleGateGuard: RBACGuard = (ctx) => {
    const { pathname, isSubdomain } = ctx.network;
    const { role, gymId, activeModules } = ctx.claims;

    // Buscar si la ruta actual mapea con un módulo de negocio
    const requiredModule = Object.entries(MODULE_ROUTES)
        .find(([route]) => pathname.includes(route))?.[1];

    if (requiredModule && role !== 'superadmin' && gymId) {
        const isEnabled = hasModuleAccess(activeModules, requiredModule);

        if (!isEnabled) {
            logDebug(`[Module Gate] Bloqueado acceso a ${pathname}. Módulo '${requiredModule}' inactivo.`, true);
            const gymPrefix = ctx.claims.gymSlug || gymId;
            const dest = isSubdomain 
                ? '/member/dashboard' 
                : (gymPrefix ? `/${gymPrefix}/member/dashboard` : '/');
                
            return NextResponse.redirect(new URL(dest, ctx.request.url));
        }
    }
    return null;
};

// ==========================================
// 4. ORQUESTADOR CENTRAL
// ==========================================

export async function handleRBAC(
    request: NextRequest, 
    response: NextResponse, 
    user: User | null, 
    supabase: SupabaseClient
) {
    // 1. Construir Contexto de Red y sesión de manera aislada (SRP)
    const network = resolveNetworkContext(request);
    const claims = extractUserClaims(user);
    const isPublic = PUBLIC_ROUTES.includes(network.pathname);

    const context: RBACContext = {
        request,
        response,
        user,
        claims,
        network,
        isPublic
    };

    // 2. Guardar Cookies meta para debugging si el usuario existe (compatibilidad legacy)
    if (user && claims.role) {
        response.cookies.set('vtd_user_meta', JSON.stringify({ 
            rol: claims.role, 
            gymId: claims.gymId, 
            gymSlug: claims.gymSlug,
            modules: claims.activeModules,
            permisos: claims.permisos
        }), {
            maxAge: 600, // 10 minutos
            path: '/',
            httpOnly: true,
            sameSite: 'lax'
        });

        logDebug(`[Edge JWT Claims] User: ${user.email} | Role: ${claims.role} | GymSlug: ${claims.gymSlug}`);
    }

    // 3. Ejecución ordenada de la tubería de guardianes (Chain of Responsibility)
    const pipeline: RBACGuard[] = [
        authenticationGuard,
        landingRedirectGuard,
        saasAdminGuard,
        tenantIsolationGuard,
        adminAreaGuard,
        moduleGateGuard
    ];

    for (const guard of pipeline) {
        const redirectResponse = guard(context);
        if (redirectResponse) {
            return redirectResponse; // Cortocircuito inmediato al primer guardián que retorne redirección
        }
    }

    return null; // Continuar petición sin bloquear
}
