import { NextResponse, type NextRequest } from 'next/server';
import { handleAuth } from './lib/middleware/auth';
import { handleRateLimit } from './lib/middleware/ratelimit';
import { handleRBAC } from './lib/middleware/rbac';

/**
 * MAIN MIDDLEWARE (PROXY) - Next.js Standard Multi-Tenant Router
 * This file coordinates traffic routing, subdomains, and security controls.
 */
export async function middleware(request: NextRequest) {
    // 1. Control de Tráfico (Rate Limit) - Fail Open
    const initialResponse = NextResponse.next({
        request: {
            headers: request.headers,
        },
    });
    const rateLimitRes = await handleRateLimit(request, initialResponse);
    if (rateLimitRes) return rateLimitRes;

    try {
        // 2. Resolver Subdominios y Tenants de forma Dinámica
        const url = request.nextUrl.clone();
        const host = request.headers.get('host') || 'localhost:3000';
        
        // Detección automática del puerto y host base (ej. localhost:3000, localhost:3001, etc.)
        const hostWithoutPort = host.split(':')[0];
        const port = host.split(':')[1] ? `:${host.split(':')[1]}` : '';
        const isLocalhost = hostWithoutPort.endsWith('localhost') || hostWithoutPort === '127.0.0.1';
        
        const baseDomainWithoutPort = isLocalhost ? 'localhost' : 'virtud.fit';
        const baseDomain = `${baseDomainWithoutPort}${port}`;
        const isSubdomain = hostWithoutPort !== baseDomainWithoutPort && hostWithoutPort !== `www.${baseDomainWithoutPort}`;
        
        let tenantSlug: string | null = null;
        
        if (isSubdomain) {
            // Extraer el subdominio (lo que está a la izquierda del dominio base)
            tenantSlug = hostWithoutPort.replace(`.${baseDomainWithoutPort}`, '');
            if (tenantSlug === 'www') {
                tenantSlug = null;
            }
        }

        // 3. Autenticación (Supabase Session en Edge)
        const response = NextResponse.next();
        const { user, supabase } = await handleAuth(request, response);

        // 4. Autorización y RBAC
        const rbacRes = await handleRBAC(request, response, user, supabase);
        
        // --- BLINDAJE DE SESIÓN: Sincronizar cookies antes de cualquier retorno ---
        const finalResponse = rbacRes || response;
        if (rbacRes) {
            response.cookies.getAll().forEach(c => {
                rbacRes.cookies.set(c.name, c.value, c);
            });
        }

        // 5. REESCRITURA INTERNA PARA SUBDOMINIOS (MULTITENANCY)
        const { pathname } = url;
        const systemPaths = [
            '/_next', '/api', '/auth', '/static', '/favicon.ico', '/manifest.json', '/manifest.webmanifest',
            '/login', '/signup', '/forgot-password', '/reset-password'
        ];
        const isSystemPath = systemPaths.some(p => pathname.startsWith(p)) || pathname.match(/\.(?:svg|png|jpg|jpeg|gif|webp|css|js|pdf|txt|ico|json|webmanifest|woff|woff2|ttf)$/);

        if (tenantSlug && !isSystemPath) {
            // Redirección raíz del subdominio para usuarios logueados (UX limpia)
            if (pathname === '/' && user) {
                const userRole = (user.app_metadata?.rol || user.app_metadata?.role)?.toLowerCase();
                let dest = '/member/dashboard';
                if (['admin', 'recepcion'].includes(userRole)) dest = '/admin';
                else if (userRole === 'coach') dest = '/coach';
                
                url.pathname = dest;
                return NextResponse.redirect(url);
            }

            // Inyectar claims y slug en los headers para el RootLayout
            const requestHeaders = new Headers(request.headers);
            requestHeaders.set('x-gym-slug', tenantSlug);
            requestHeaders.set('x-tenant-slug', tenantSlug);

            // Reescribir silenciosamente la petición al App Router de tenants
            // ej: olimpia.virtud.fit/member/dashboard -> virtud.fit/tenants/olimpia/member/dashboard
            url.pathname = `/tenants/${tenantSlug}${pathname}`;
            const rewriteResponse = NextResponse.rewrite(url, {
                request: {
                    headers: requestHeaders
                }
            });
            
            // Conservar cookies sincronizadas en la reescritura
            finalResponse.cookies.getAll().forEach(c => {
                rewriteResponse.cookies.set(c.name, c.value, c);
            });
            return rewriteResponse;
        }

        // 6. Redirección o Reescritura para URLs heredadas basadas en path
        const pathSegments = pathname.split('/').filter(Boolean);
        const legacyTenant = pathSegments[0];
        const ignoredPaths = ['saas-admin', 'api', 'auth', 'g', 'inscripcion', 'tenants', 'dashboard', 'saas', 'debug'];

        if (legacyTenant && !ignoredPaths.includes(legacyTenant) && !tenantSlug && !isSystemPath) {
            const remainingPath = '/' + pathSegments.slice(1).join('/');
            
            if (isLocalhost) {
                // En localhost, para evitar problemas de cookies inter-subdominio en Cypress y desarrollo,
                // reescribimos internamente manteniendo la misma sesión y cookies en localhost:3000
                const requestHeaders = new Headers(request.headers);
                requestHeaders.set('x-gym-slug', legacyTenant);
                requestHeaders.set('x-tenant-slug', legacyTenant);

                url.pathname = `/tenants/${legacyTenant}${remainingPath}`;
                const rewriteResponse = NextResponse.rewrite(url, {
                    request: {
                        headers: requestHeaders
                    }
                });
                
                finalResponse.cookies.getAll().forEach(c => {
                    rewriteResponse.cookies.set(c.name, c.value, c);
                });
                return rewriteResponse;
            } else {
                // En producción, redirigimos al subdominio del gimnasio
                const redirectUrl = new URL(
                    `${request.nextUrl.protocol}//${legacyTenant}.${baseDomain}${remainingPath}${url.search}`
                );
                return NextResponse.redirect(redirectUrl);
            }
        }

        return finalResponse;

    } catch (error) {
        console.error('[Proxy Orchestrator] Critical error:', error);
        
        // En caso de error catastrófico, permitir rutas públicas o redirigir a login
        const { pathname } = request.nextUrl;
        const publicRoutes = ['/', '/login', '/signup', '/auth/callback'];
        
        if (publicRoutes.includes(pathname)) {
            return NextResponse.next({ request: { headers: request.headers } });
        }

        const redirectUrl = request.nextUrl.clone();
        redirectUrl.pathname = '/login';
        redirectUrl.searchParams.set('error', 'proxy_failure');
        return NextResponse.redirect(redirectUrl);
    }
}

export const config = {
    matcher: [
        '/((?!_next/static|_next/image|favicon.ico|manifest.json|manifest.webmanifest|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    ],
};

// Alias para compatibilidad con la convención "proxy" de Next.js
export const proxy = middleware;


