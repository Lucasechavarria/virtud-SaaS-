import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextRequest, NextResponse } from 'next/server';

/**
 * Create a Supabase client for use in Next.js middleware
 * 
 * This is necessary because the standard createClient() from server.ts
 * uses next/headers cookies() which doesn't work in middleware context.
 * 
 * @param request - The incoming Next.js request
 * @param response - The Next.js response to modify
 * @returns Supabase client instance
 */
import { SUPABASE_COOKIE_OPTIONS } from './config';

export function createMiddlewareClient(
    request: NextRequest,
    response: NextResponse
) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
        console.error('❌ Missing Supabase environment variables in middleware');
        throw new Error('Missing Supabase environment variables.');
    }

    return createServerClient(
        supabaseUrl,
        supabaseAnonKey,
        {
            cookieOptions: SUPABASE_COOKIE_OPTIONS,
            cookies: {
                get(name: string) {
                    return request.cookies.get(name)?.value;
                },
                set(name: string, value: string, options: CookieOptions) {
                    request.cookies.set({
                        name,
                        value,
                        ...options,
                    });
                    response.cookies.set({
                        name,
                        value,
                        ...options,
                    });
                },
                remove(name: string, options: CookieOptions) {
                    request.cookies.set({
                        name,
                        value: '',
                        ...options,
                    });
                    response.cookies.set({
                        name,
                        value: '',
                        ...options,
                    });
                },
            },
        }
    );
}
