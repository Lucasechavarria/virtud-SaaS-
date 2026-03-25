import { createBrowserClient } from '@supabase/ssr';
import { Database } from '../../types/supabase';
import { env } from '@/env';
import { SUPABASE_COOKIE_OPTIONS } from './config';

export const createClient = () => {
    // Al usar env.<VAR>, Zod garantiza que no son undefined al momento del boot.
    return createBrowserClient<Database>(
        env.NEXT_PUBLIC_SUPABASE_URL,
        env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        {
            cookieOptions: SUPABASE_COOKIE_OPTIONS,
        }
    );
};

// Singleton instance for client-side usage
export const supabase = createClient();

// Flag to check if Supabase is properly configured
export const isSupabaseConfigured = true; // Hardcoded true: Zod aborta antes si fallan.

// Helper to get the current user
export const getCurrentUser = async () => {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error) throw error;
    return user;
};

// Helper to get user profile (Optimizado: solo campos necesarios para Auth/RBAC)
export const getUserProfile = async (userId: string): Promise<Pick<Database['public']['Tables']['perfiles']['Row'], 'rol' | 'gimnasio_id'> | null> => {
    const { data, error } = await supabase
        .from('perfiles')
        .select('rol, gimnasio_id')
        .eq('id', userId)
        .single();

    if (error) throw error;
    return data as Pick<Database['public']['Tables']['perfiles']['Row'], 'rol' | 'gimnasio_id'>;
};

// Helper to check user role
export const checkUserRole = async (userId: string, allowedRoles: string[]) => {
    const profile = await getUserProfile(userId);
    if (!profile) return false;
    return allowedRoles.includes(profile.rol);
};

