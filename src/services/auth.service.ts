import { supabase } from '@/lib/supabase/client';
import { Database } from '../types/supabase';

type Profile = Database['public']['Tables']['perfiles']['Row'];

/**
 * Authentication service using Supabase Auth
 */
export const authService = {
    /**
     * Sign up with email and password
     */
    /**
     * Sign up with email and password
     */
    async signUp(email: string, password: string, firstName: string, lastName: string) {
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    nombre: firstName,
                    apellido: lastName,
                    nombre_completo: `${firstName} ${lastName}`.trim(),
                },
            },
        });

        if (error) throw error;
        return data;
    },

    /**
     * Sign in with email and password
     */
    async signIn(email: string, password: string) {
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });

        if (error) throw error;
        return data;
    },

    /**
     * Sign in with Google
     */
    async signInWithGoogle() {
        if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
            throw new Error('Supabase no está configurado: faltan variables de entorno');
        }

        const { data, error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: `${window.location.origin}/auth/callback`,
            },
        });

        if (error) throw error;
        return data;
    },

    /**
     * Sign out
     */
    async signOut() {
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
    },

    /**
     * Get current session
     */
    async getSession() {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) throw error;
        return session;
    },

    /**
     * Get current user
     */
    async getCurrentUser() {
        const { data: { user }, error } = await supabase.auth.getUser();
        if (error) throw error;
        return user;
    },

    /**
     * Get user profile
     */
    async getUserProfile(userId?: string) {
        const id = userId || (await this.getCurrentUser())?.id;
        if (!id) throw new Error('No user ID provided');

        const { data, error } = await supabase
            .from('perfiles')
            .select('*')
            .eq('id', id)
            .single();

        if (error) throw error;
        return data as Profile;
    },

    /**
     * Update user profile
     */
    async updateProfile(userId: string, updates: Partial<Profile>) {
        const { data, error } = await supabase
            .from('perfiles')
            .update(updates)
            .eq('id', userId)
            .select()
            .single();

        if (error) throw error;
        return data as Profile;
    },

    /**
     * Reset password
     */
    async resetPassword(email: string) {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: `${window.location.origin}/auth/reset-password`,
        });

        if (error) throw error;
    },

    /**
     * Update password
     */
    async updatePassword(newPassword: string) {
        const { error } = await supabase.auth.updateUser({
            password: newPassword,
        });

        if (error) throw error;
    },

    /**
     * Check if user has role
     */
    async hasRole(role: string | string[]) {
        const profile = await this.getUserProfile();
        const roles = Array.isArray(role) ? role : [role];
        return roles.includes(profile.rol);
    },

    /**
     * Check if user is admin
     */
    async isAdmin() {
        return this.hasRole('admin');
    },

    /**
     * Check if user is coach
     */
    async isCoach() {
        return this.hasRole(['coach', 'admin']);
    },

    /**
     * Listen to auth state changes
     */
    onAuthStateChange(callback: (event: string, session: unknown) => void) {
        // Mantenemos session as any ya que viene así de la librería de Supabase en versiones antiguas 
        // o queremos evitar cascada de tipos por ahora, pero tipamos lo demás.
        return supabase.auth.onAuthStateChange(callback);
    },
};
