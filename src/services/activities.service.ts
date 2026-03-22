import { supabase } from '@/lib/supabase/client';
import { Database } from '../types/supabase';

type Activity = Database['public']['Tables']['actividades']['Row'];
type ActivityInsert = Database['public']['Tables']['actividades']['Insert'];
type ActivityUpdate = Database['public']['Tables']['actividades']['Update'];

/**
 * Service for managing activities
 */
export const activitiesService = {
    /**
     * Get all active activities
     */
    async getAll() {
        const { data, error } = await supabase
            .from('actividades')
            .select('*')
            .eq('esta_activa', true)
            .order('nombre');

        if (error) throw error;
        return data as Activity[];
    },

    /**
     * Get activities by type
     */
    async getByType(type: 'gym' | 'martial_arts' | 'tcm' | 'wellness') {
        const { data, error } = await supabase
            .from('actividades')
            .select('*')
            .eq('tipo', type)
            .eq('esta_activa', true)
            .order('nombre');

        if (error) throw error;
        return data as Activity[];
    },

    /**
     * Get activity by ID
     */
    async getById(id: string) {
        const { data, error } = await supabase
            .from('actividades')
            .select('*')
            .eq('id', id)
            .single();

        if (error) throw error;
        return data as Activity;
    },

    /**
     * Create new activity (admin only)
     */
    async create(activity: ActivityInsert) {
        const { data, error } = await supabase
            .from('actividades')
            .insert(activity)
            .select()
            .single();

        if (error) throw error;
        return data as Activity;
    },

    /**
     * Update activity (admin only)
     */
    async update(id: string, updates: ActivityUpdate) {
        const { data, error } = await supabase
            .from('actividades')
            .update(updates)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return data as Activity;
    },

    /**
     * Delete activity (admin only)
     */
    async delete(id: string) {
        const { error } = await supabase
            .from('actividades')
            .delete()
            .eq('id', id);

        if (error) throw error;
    },
};
