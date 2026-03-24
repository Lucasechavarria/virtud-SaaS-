import { NextResponse, type NextRequest } from 'next/server';
import { handleAuth } from './lib/middleware/auth';
import { handleRateLimit } from './lib/middleware/ratelimit';
import { handleRBAC } from './lib/middleware/rbac';

/**
 * MAIN MIDDLEWARE (PROXY) - Next.js 16 Standard
 * This file coordinates the modular security system.
 */
export async function middleware(request: NextRequest) {
    // 1. Crear respuesta inicial
    const response = NextResponse.next({
        request: {
            headers: request.headers,
        },
    });

    try {
        // 2. Control de Tráfico (Rate Limit) - Fail Open
        const rateLimitRes = await handleRateLimit(request, response);
        if (rateLimitRes) return rateLimitRes;

        // 3. Autenticación (Supabase Session)
        const { user, supabase } = await handleAuth(request, response);

        // 4. Autorización y Ruteo Dinámico (RBAC)
        const rbacRes = await handleRBAC(request, response, user, supabase);
        if (rbacRes) return rbacRes;

        // 5. Devolver respuesta final si no hubo redirecciones
        return response;

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

// Alias para compatibilidad con la convención "proxy" de Next.js 16
export const proxy = middleware;
