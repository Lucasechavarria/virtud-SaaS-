import { NextResponse, type NextRequest } from 'next/server';
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

// Configuración de Rate Limiting (Upstash Redis)
// Se usa un enfoque perezoso y seguro para evitar errores si no hay credenciales
const redis = (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN)
  ? new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    })
  : null;

const ratelimit = redis 
  ? new Ratelimit({
      redis: redis,
      limiter: Ratelimit.slidingWindow(100, '1 m'),
      analytics: true,
      prefix: 'virtud_middleware',
    })
  : null;

/**
 * Handles rate limiting with Fail-Open logic
 */
export async function handleRateLimit(request: NextRequest, _response: NextResponse) {
    const { pathname } = request.nextUrl;
    
    // Solo aplicar a rutas de auth y mutaciones de API
    const isAuthRoute = pathname.startsWith('/login') || pathname.startsWith('/signup') || pathname.startsWith('/auth');
    const isApiRoute = pathname.startsWith('/api');
    const isMutation = request.method !== 'GET' && request.method !== 'HEAD' && request.method !== 'OPTIONS';

    if (isAuthRoute || (isApiRoute && isMutation)) {
        if (!ratelimit) {
            return null; // Bypass si no hay configuración de Redis
        }

        const ip = request.headers.get('x-forwarded-for')?.split(',')[0] ?? '127.0.0.1';
        
        try {
            const { success, limit, remaining, reset } = await ratelimit.limit(`ratelimit_${ip}_${pathname}`);
            
            if (!success) {
                return new NextResponse('Too Many Requests - Límite excedido. Reintenta en breve.', {
                    status: 429,
                    headers: {
                        'X-RateLimit-Limit': limit.toString(),
                        'X-RateLimit-Remaining': remaining.toString(),
                        'X-RateLimit-Reset': reset.toString(),
                        'Retry-After': Math.ceil((reset - Date.now()) / 1000).toString(),
                    },
                });
            }
        } catch (e) {
            // Fail-Open: Si falla Redis (común en CI), permitimos el paso
            console.warn('[Middleware RateLimit] Service unavailable, bypassing check.');
        }
    }
    
    return null; // Return null to indicate "continue"
}
