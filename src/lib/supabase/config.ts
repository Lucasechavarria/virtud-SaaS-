import { type CookieOptions } from '@supabase/ssr';

/**
 * Shared cookie configuration for Supabase Auth
 * 
 * Ensuring parity between Browser client and Middleware client 
 * is crucial for reliable authentication in Next.js.
 */
export const SUPABASE_COOKIE_OPTIONS = {
    path: '/',
    sameSite: 'lax' as const,
    secure: false, // Forzado false para compatibilidad con localhost:3000 en CI/CD
    maxAge: 60 * 60 * 24 * 7, // 7 days
};
