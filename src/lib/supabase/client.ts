import { createBrowserClient } from '@supabase/ssr';
import { Database } from '../../types/supabase';

export const createClient = () => {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
        if (typeof window !== 'undefined') {
            console.warn('⚠️ Missing Supabase environment variables:', {
                url: !!supabaseUrl,
                anonKey: !!supabaseAnonKey
            });
        }
        return new Proxy({} as any, {
            get: (_target, prop) => {
                if (prop === 'auth') {
                    // Devuelve otro Proxy para capturar todas las llamadas a métodos de auth (signUp, signIn, etc)
                    return new Proxy({}, {
                        get: (_authTarget, authProp) => {
                            if (authProp === 'getUser') {
                                return async () => ({ data: { user: null }, error: null });
                            }
                            if (authProp === 'getSession') {
                                return async () => ({ data: { session: null }, error: null });
                            }
                            if (authProp === 'onAuthStateChange') {
                                return () => ({ data: { subscription: { unsubscribe: () => {} } }, error: null });
                            }
                            return async () => {
                                throw new Error('Supabase no está configurado en Vercel: Faltan las variables de entorno (NEXT_PUBLIC_SUPABASE_URL y ANON_KEY)');
                            };
                        }
                    });
                }
                throw new Error(
                    `Supabase client not initialized. Missing env vars. Checked property '${String(prop)}'.`
                );
            }
        });
    }

    return createBrowserClient<Database>(
        supabaseUrl,
        supabaseAnonKey
    );
};

// Singleton instance for client-side usage
export const supabase = createClient();

// Flag to check if Supabase is properly configured
export const isSupabaseConfigured = !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

// Helper to get the current user
export const getCurrentUser = async () => {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error) throw error;
    return user;
};

// Helper to get user profile
export const getUserProfile = async (userId: string): Promise<Database['public']['Tables']['perfiles']['Row'] | null> => {
    const { data, error } = await supabase
        .from('perfiles')
        .select('*')
        .eq('id', userId)
        .single();

    if (error) throw error;
    return data;
};

// Helper to check user role
export const checkUserRole = async (userId: string, allowedRoles: string[]) => {
    const profile = await getUserProfile(userId);
    if (!profile) return false;
    return allowedRoles.includes(profile.rol);
};

