import { NextResponse, type NextRequest } from 'next/server';
import { createMiddlewareClient } from '@/lib/supabase/middleware';
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

// ────────────────────────────────────────────────────
// INICIALIZACIÓN DE RATE LIMITER (UPSTASH)
// ────────────────────────────────────────────────────
let ratelimit: Ratelimit | null = null;
if (process.env.REDIS_URL || process.env.UPSTASH_REDIS_REST_URL) {
    let url = process.env.UPSTASH_REDIS_REST_URL || '';
    let token = process.env.UPSTASH_REDIS_REST_TOKEN || '';
    
    // Fallback parser si solo proveen Connection String nativo de Redis (rediss://)
    if (!url && process.env.REDIS_URL) {
        const match = process.env.REDIS_URL.match(/rediss:\/\/(?:.+:)?([^@]+)@([^:]+)/);
        if (match) {
            token = match[1];
            url = `https://${match[2]}`;
        }
    }

    if (url && token) {
        ratelimit = new Ratelimit({
            redis: new Redis({ url, token }),
            limiter: Ratelimit.slidingWindow(100, '1 m'), // Aumentamos a 100 para no bloquear tests en CI
            analytics: true,
        });
    }
}

// Mapeo de rutas que requieren módulos activos para poder accederse
const MODULE_ROUTES: Record<string, string> = {
    '/admin/nutrition': 'nutricion_ia',
    '/dashboard/nutrition': 'nutricion_ia',
    '/member/dashboard/nutrition': 'nutricion_ia',
    '/coach/vision': 'vision_ia',
    '/dashboard/vision': 'vision_ia',
    '/member/dashboard/vision': 'vision_ia',
    '/admin/challenges': 'gamificacion',
    '/dashboard/progress': 'gamificacion',
    '/member/dashboard/progress': 'gamificacion',
    '/admin/finance': 'pagos_online',
    '/coach/routines': 'rutinas_ia',
    '/dashboard/routine': 'rutinas_ia',
    '/member/dashboard/routine': 'rutinas_ia',
    '/admin/activities': 'clases_reserva',
    '/schedule': 'clases_reserva',
    '/member/schedule': 'clases_reserva',
    '/dashboard/classes': 'clases_reserva',
    '/member/dashboard/classes': 'clases_reserva',
};
export default async function proxy(request: NextRequest) {
    // Saltar si faltan variables de entorno
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
        return NextResponse.next({ request: { headers: request.headers } });
    }

    // Inicializar respuesta base para mutación de cookies
    const response = NextResponse.next({ request: { headers: request.headers } });

    try {
        const { pathname } = request.nextUrl;
        
        // ────────────────────────────────────────────────────
        // RATE LIMITING (Protección de Fuerza Bruta)
        // ────────────────────────────────────────────────────
        if (ratelimit) {
            const isAuthRoute = pathname === '/login' || pathname === '/signup';
            const isApiRoute = pathname.startsWith('/api/');
            const isMutation = ['POST', 'PUT', 'DELETE', 'PATCH'].includes(request.method);

            // Aplicamos límite estricto SOLO a rutas de autenticación o a operaciones de mutación (escrituras) HTTP en la API.
            // Las lecturas GET a la API están libres del límite asfixiante de 5 req/min.
            if (isAuthRoute || (isApiRoute && isMutation)) {
                const ip = request.headers.get('x-forwarded-for')?.split(',')[0] ?? '127.0.0.1';
                
                // Podemos crear identificadores separados si quisieramos límites distintos,
                // Pero por ahora reutilizamos el límite configurado arriba.
                const { success, limit, remaining, reset } = await ratelimit.limit(`ratelimit_${ip}_${pathname}`);
                
                if (!success) {
                    return new NextResponse('Too Many Requests - Has excedido el límite. Intenta más tarde.', {
                        status: 429,
                        headers: {
                            'X-RateLimit-Limit': limit.toString(),
                            'X-RateLimit-Remaining': remaining.toString(),
                            'X-RateLimit-Reset': reset.toString(),
                            'Retry-After': Math.ceil((reset - Date.now()) / 1000).toString(),
                        },
                    });
                }
            }
        }

        const supabase = createMiddlewareClient(request, response);
        const { data: { user }, error } = await supabase.auth.getUser();

        // Rutas públicas — no requieren auth
        const publicRoutes = ['/', '/login', '/signup', '/auth/callback'];
        const isPublicRoute = publicRoutes.includes(pathname);

        // Sin sesión → redirigir al login
        if ((!user || error) && !isPublicRoute) {
            const redirectUrl = request.nextUrl.clone();
            redirectUrl.pathname = '/login';
            if (pathname !== '/') {
                redirectUrl.searchParams.set('redirectTo', pathname);
            }
            
            // Sincronizar cookies de Supabase en la redirección
            const redirectResponse = NextResponse.redirect(redirectUrl);
            response.cookies.getAll().forEach(cookie => {
                redirectResponse.cookies.set(cookie.name, cookie.value, cookie);
            });
            return redirectResponse;
        }

        // ────────────────────────────────────────────────────
        // OBTENER ROL, GIMNASIO Y SLUG DEL USUARIO (CON CACHÉ)
        // ────────────────────────────────────────────────────
        const cacheCookie = request.cookies.get('vtd_user_meta')?.value;
        let cachedMeta: { rol: string; gymId: string; gymSlug: string } | null = null;
        
        if (cacheCookie) {
            try {
                cachedMeta = JSON.parse(cacheCookie);
            } catch {
                cachedMeta = null;
            }
        }

        let userRole = cachedMeta?.rol || null;
        let gymId = cachedMeta?.gymId || null;
        let gymSlug = cachedMeta?.gymSlug || null;

        if (!userRole && user) {
            // Intentar extraer de metadatos del JWT (Auth)
            userRole = (user.app_metadata?.rol || user.user_metadata?.rol || user.app_metadata?.role || user.user_metadata?.role) as string;
            
            if (userRole) {
                userRole = userRole.toLowerCase();
            }

            // Si no hay rol en metadatos o falta gymId, consultamos DB UNA VEZ y cacheamos
            if (!userRole || !gymId) {
                const { data: profile } = await supabase
                    .from('perfiles')
                    .select('rol, gimnasio_id, gimnasios(slug)')
                    .eq('id', user.id)
                    .single();

                if (profile) {
                    userRole = profile.rol?.toLowerCase();
                    gymId = profile.gimnasio_id;
                    gymSlug = (profile.gimnasios as unknown as { slug: string })?.slug;

                    // Cachear por 10 minutos para evitar DB hits constantes
                    response.cookies.set('vtd_user_meta', JSON.stringify({ rol: userRole, gymId, gymSlug }), {
                        maxAge: 600,
                        path: '/',
                        httpOnly: true,
                        sameSite: 'lax'
                    });
                }
            }
        }

        // ────────────────────────────────────────────────────
        // REDIRIGIR SI YA ESTÁ LOGUEADO Y VA A LOGIN/SIGNUP/RAÍZ
        // ────────────────────────────────────────────────────
        if (user && (pathname === '/login' || pathname === '/signup' || pathname === '/')) {
            let redirectUrlStr = pathname; // Default to stay here
            switch (userRole) {
                case 'superadmin':
                    redirectUrlStr = '/saas-admin';
                    break;
                case 'admin':
                    redirectUrlStr = gymId ? `/${gymId}/admin` : '/';
                    break;
                case 'recepcion':
                    redirectUrlStr = gymId ? `/${gymId}/admin/recepcion/pos` : '/';
                    break;
                case 'coach':
                    redirectUrlStr = gymId ? `/${gymId}/coach` : '/';
                    break;
                default:
                    redirectUrlStr = gymId ? `/${gymId}/member/dashboard` : '/';
                    break;
            }
            
            // Solo redirigir si el destino es distinto al origen (evita bucles infinitos en '/')
            if (redirectUrlStr !== pathname) {
                const redirectResponse = NextResponse.redirect(new URL(redirectUrlStr, request.url));
                response.cookies.getAll().forEach(cookie => {
                    redirectResponse.cookies.set(cookie.name, cookie.value, cookie);
                });
                return redirectResponse;
            }
        }

        // ────────────────────────────────────────────────────
        // RBAC: PROTECCIÓN DE RUTAS POR ROL
        // ────────────────────────────────────────────────────

        // ────────────────────────────────────────────────────
        // PROTECCIÓN DE RUTAS SAAS-ADMIN
        // ────────────────────────────────────────────────────
        if (pathname.startsWith('/saas-admin')) {
            if (userRole !== 'superadmin') {
                const redirectPath = gymId ? `/${gymId}/admin` : '/';
                const redirectRes = NextResponse.redirect(new URL(redirectPath, request.url));
                response.cookies.getAll().forEach(c => redirectRes.cookies.set(c.name, c.value, c));
                return redirectRes;
            }
        }

        // ────────────────────────────────────────────────────
        // PROTECCIÓN DE RUTAS POR GYM [gymId]
        // ────────────────────────────────────────────────────
        // Extraer el gymId de la URL (el primer segmento de la ruta, asumiendo que es un UUID o string)
        const pathSegments = pathname.split('/').filter(Boolean);
        const currentGymIdParam = pathSegments.length > 0 ? pathSegments[0] : null;

        // Validar si estamos dentro de una ruta de "tenant" (ej: /[gymId]/admin, /[gymId]/coach, /[gymId]/member)
        if (currentGymIdParam && currentGymIdParam !== 'saas-admin' && currentGymIdParam !== 'g' && currentGymIdParam !== 'api' && currentGymIdParam !== 'auth' && currentGymIdParam !== 'saas' && currentGymIdParam !== 'debug' && currentGymIdParam !== 'inscripcion') {
            // Regla 1: Un usuario NO superadmin solo puede acceder a su propio gimnasio
            if (userRole !== 'superadmin' && gymId && currentGymIdParam !== gymId) {
                const redirectRes = NextResponse.redirect(new URL(`/${gymId}/member/dashboard`, request.url));
                response.cookies.getAll().forEach(c => redirectRes.cookies.set(c.name, c.value, c));
                return redirectRes;
            }

            // Regla 2: RBAC dentro del gimnasio
            const tenantPath = pathSegments.length > 1 ? pathSegments[1] : ''; // ej: 'admin', 'coach', 'member'

            if (tenantPath === 'admin') {
                if (!['admin', 'superadmin', 'recepcion'].includes(userRole ?? '')) {
                    const redirectPath = gymId ? `/${gymId}/member/dashboard` : '/';
                    const redirectRes = NextResponse.redirect(new URL(redirectPath, request.url));
                    response.cookies.getAll().forEach(c => redirectRes.cookies.set(c.name, c.value, c));
                    return redirectRes;
                }
                // Recepción solo puede ir a /admin/recepcion
                if (userRole === 'recepcion' && pathSegments[2] !== 'recepcion') {
                    const redirectPath = gymId ? `/${gymId}/admin/recepcion/pos` : '/';
                    const redirectRes = NextResponse.redirect(new URL(redirectPath, request.url));
                    response.cookies.getAll().forEach(c => redirectRes.cookies.set(c.name, c.value, c));
                    return redirectRes;
                }
            }

            if (tenantPath === 'coach') {
                if (!['coach', 'admin', 'superadmin'].includes(userRole ?? '')) {
                    const redirectPath = gymId ? `/${gymId}/member/dashboard` : '/';
                    const redirectRes = NextResponse.redirect(new URL(redirectPath, request.url));
                    response.cookies.getAll().forEach(c => redirectRes.cookies.set(c.name, c.value, c));
                    return redirectRes;
                }
            }
        }

        // ────────────────────────────────────────────────────
        // MODULE GATING: Solo para no-superadmin con gimnasio
        // ────────────────────────────────────────────────────
        if (userRole !== 'superadmin' && gymId) {
            // Find if any module route constraint matches the CURRENT pathname
            const requiredModuleEntry = Object.entries(MODULE_ROUTES).find(([route]) => {
                // Check if the current pathname ENDS with the restricted portion or matches it directly
                // We adapt this because the URL now has /[gymId]/... in front
                return pathname.includes(route);
            });
            const requiredModule = requiredModuleEntry?.[1];

            if (requiredModule) {
                const { data: gym } = await supabase
                    .from('gimnasios')
                    .select('modulos_activos')
                    .eq('id', gymId)
                    .single();

                const modulos = (gym?.modulos_activos as Record<string, boolean>) || {};

                if (!modulos[requiredModule] && !Array.isArray(gym?.modulos_activos) || (Array.isArray(gym?.modulos_activos) && !gym.modulos_activos.includes(requiredModule))) {
                    // Módulo no contratado → redirigir al dashboard del miembro (o el principal del gym)
                    const redirectRes = NextResponse.redirect(new URL(`/${gymId}/member/dashboard`, request.url));
                    response.cookies.getAll().forEach(c => redirectRes.cookies.set(c.name, c.value, c));
                    return redirectRes;
                }
            }
        }

        return response;

    } catch (_e) {
        // En caso de error crítico (ej. caída de base de datos) NO SE DEBE permitir el acceso a rutas protegidas.
        console.error('[Proxy Error] Excepción capturada:', _e);
        
        const { pathname } = request.nextUrl;
        const publicRoutes = ['/', '/login', '/signup', '/auth/callback'];
        
        // Si el usuario intentaba llegar a una ruta pública, lo dejamos pasar
        if (publicRoutes.includes(pathname)) {
            return NextResponse.next({ request: { headers: request.headers } });
        }

        // Si intentaba llegar a una ruta protegida y los servicios fallaron, forzamos redirección a login (Fail-Closed)
        const redirectUrl = request.nextUrl.clone();
        redirectUrl.pathname = '/login';
        redirectUrl.searchParams.set('error', 'service_unavailable');
        
        const errorResponse = NextResponse.redirect(redirectUrl);
        // Intentar pasar las cookies que tengamos por si acaso
        response.cookies.getAll().forEach(cookie => {
            errorResponse.cookies.set(cookie.name, cookie.value, cookie);
        });
        return errorResponse;
    }
}

export const config = {
    matcher: [
        '/((?!_next/static|_next/image|favicon.ico|manifest.json|manifest.webmanifest|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    ],
};
