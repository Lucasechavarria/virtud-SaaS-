import { NextResponse, type NextRequest } from 'next/server';
import { createMiddlewareClient } from '@/lib/supabase/middleware';

/**
 * Handles Supabase authentication and session logic in the middleware
 */
export async function handleAuth(request: NextRequest, response: NextResponse) {
    const supabase = createMiddlewareClient(request, response);
    
    // Debug: Log cookies to see what the server is actually receiving
    const cookieNames = request.cookies.getAll().map(c => c.name).join(', ');
    console.log(`[Middleware Auth] Path: ${request.nextUrl.pathname} | Cookies: [${cookieNames}]`);

    try {
        const { data: { user }, error } = await supabase.auth.getUser();
        
        if (error) {
            console.warn('[Middleware Auth] Error getting user:', error.message);
        }

        return { user, supabase };
    } catch (e) {
        console.error('[Middleware Auth] Critical exception:', e);
        return { user: null, supabase };
    }
}
