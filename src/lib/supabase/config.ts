import { type CookieOptions } from '@supabase/ssr';

/**
 * Shared cookie configuration for Supabase Auth
 * 
 * Ensuring parity between Browser client and Middleware client 
 * is crucial for reliable authentication in Next.js.
 */
export const SUPABASE_COOKIE_OPTIONS = {
    name: 'sb-virtud-auth',
    path: '/',
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 60 * 24 * 7, // 7 days
};
