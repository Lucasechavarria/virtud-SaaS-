import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { Database } from '../../types/supabase';

export async function createClient() {
    const cookieStore = await cookies();

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
        // En tiempo de build o si faltan las vars, retornamos un proxy dummy para no romper
        return new Proxy({} as unknown as Record<string, unknown>, {
            get: (_target, prop) => {
                // Métodos comunes que podrían llamarse durante el build estático
                if (prop === 'auth') return { getUser: async () => ({ data: { user: null }, error: null }) };

                // Para todo lo demas, lanzamos error solo al invocarse
                throw new Error(
                    `Supabase client not initialized. Checked property '${String(prop)}'. ` +
                    `Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY.`
                );
            }
        });
    }

    return createServerClient<Database>(
        supabaseUrl,
        supabaseAnonKey,
        {
            cookies: {
                get(name: string) {
                    return cookieStore.get(name)?.value;
                },
                set(name: string, value: string, options: CookieOptions) {
                    try {
                        cookieStore.set({ name, value, ...options });
                    } catch (_error) {
                        // The `set` method was called from a Server Component.
                    }
                },
                remove(name: string, options: CookieOptions) {
                    try {
                        cookieStore.set({ name, value: '', ...options });
                    } catch (_error) {
                        // The `delete` method was called from a Server Component.
                    }
                },
            },
        }
    );
}
