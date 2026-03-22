import { createBrowserClient } from '@supabase/ssr';
import { Database } from '../../types/supabase';

export const createClient = () => {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
        console.warn('⚠️ Missing Supabase environment variables - running in stub mode');
        return new Proxy({} as any, {
            get: (_target, prop) => {
                if (prop === 'auth') return { getUser: async () => ({ data: { user: null }, error: null }) };
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

