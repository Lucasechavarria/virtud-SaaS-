import { createClient } from '@/lib/supabase/server';

import { Database } from '../types/supabase';

type GymEquipment = Database['public']['Tables']['equipamiento']['Row'];
type GymEquipmentInsert = Database['public']['Tables']['equipamiento']['Insert'];
type GymEquipmentUpdate = Database['public']['Tables']['equipamiento']['Update'];

/**
 * Service for managing gym equipment inventory
 */
export const gymEquipmentService = {
    /**
     * Get all gym equipment
     */
    async getAll(filters?: {
        categoria?: string;
        disponible?: boolean;
        search?: string;
    }) {
        const supabase = await createClient();
        let query = supabase
            .from('equipamiento')
            .select('*')
            .order('nombre');

        if (filters?.categoria) {
            query = query.eq('categoria', filters.categoria);
        }

        if (filters?.disponible !== undefined) {
            query = query.eq('disponible', filters.disponible);
        }

        if (filters?.search) {
            query = query.ilike('nombre', `%${filters.search}%`);
        }

        const { data, error } = await query;

        if (error) throw error;
        return data as GymEquipment[];
    },

    /**
     * Get equipment by ID
     */
    async getById(id: string) {
        const supabase = await createClient();
        const { data, error } = await supabase
            .from('equipamiento')
            .select('*')
            .eq('id', id)
            .single();

        if (error) throw error;
        return data as GymEquipment;
    },

    /**
     * Get equipment by categoria
     */
    async getByCategory(categoria: string) {
        const supabase = await createClient();
        const { data, error } = await supabase
            .from('equipamiento')
            .select('*')
            .eq('categoria', categoria)
            .eq('disponible', true)
            .order('nombre');

        if (error) throw error;
        return data as GymEquipment[];
    },

    /**
     * Get available equipment (for routine generation)
     */
    async getAvailable() {
        const supabase = await createClient();
        const { data, error } = await supabase
            .from('equipamiento')
            .select('*')
            .eq('disponible', true)
            .order('categoria', { ascending: true })
            .order('nombre', { ascending: true });

        if (error) throw error;
        return data as GymEquipment[];
    },

    /**
     * Create new equipment
     */
    async create(equipment: GymEquipmentInsert) {
        const supabase = await createClient();
        const { data, error } = await supabase
            .from('equipamiento')
            .insert(equipment)
            .select()
            .single();

        if (error) throw error;
        return data as GymEquipment;
    },

    /**
     * Update equipment
     */
    async update(id: string, updates: GymEquipmentUpdate) {
        const supabase = await createClient();
        const { data, error } = await supabase
            .from('equipamiento')
            .update(updates)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return data as GymEquipment;
    },

    /**
     * Delete equipment
     */
    async delete(id: string) {
        const supabase = await createClient();
        const { error } = await supabase
            .from('equipamiento')
            .delete()
            .eq('id', id);

        if (error) throw error;
    },

    /**
     * Update equipment availability
     */
    async updateAvailability(id: string, disponible: boolean) {
        return this.update(id, { disponible });
    },

    /**
     * Update equipment condition
     */
    async updateCondition(id: string, estado: 'excellent' | 'good' | 'fair' | 'needs_repair') {
        const estadoCasteado = estado as Database['public']['Tables']['equipamiento']['Row']['estado'];
        return this.update(id, { estado: estadoCasteado });
    },

    /**
     * Get equipment statistics
     */
    async getStats() {
        const supabase = await createClient();

        // Optimización: Pedir solo los campos necesarios para reducir ancho de banda
        const { data, error } = await supabase
            .from('equipamiento')
            .select('categoria, disponible, estado');

        if (error) throw error;
        if (!data) return null;

        const stats = {
            total: data.length,
            available: data.filter(e => e.disponible).length,
            byCategory: {} as Record<string, number>,
            byCondition: {} as Record<string, number>,
        };

        data.forEach(equipment => {
            if (equipment.categoria) {
                stats.byCategory[equipment.categoria] = (stats.byCategory[equipment.categoria] || 0) + 1;
            }
            if (equipment.estado) {
                stats.byCondition[equipment.estado] = (stats.byCondition[equipment.estado] || 0) + 1;
            }
        });

        return stats;
    },
};
