import { createClient } from '@/lib/supabase/server';

import { Database } from '../types/supabase';

type NutritionPlan = Database['public']['Tables']['planes_nutricionales']['Row'];
type NutritionPlanInsert = Database['public']['Tables']['planes_nutricionales']['Insert'];
type NutritionPlanUpdate = Database['public']['Tables']['planes_nutricionales']['Update'];

/**
 * Service for managing nutrition plans
 */
export const nutritionPlansService = {
    /**
     * Get user's active nutrition plan
     */
    async getActiveForUser(userId: string) {
        const supabase = await createClient();
        const { data, error } = await supabase
            .from('planes_nutricionales')
            .select('*')
            .eq('usuario_id', userId)
            .eq('esta_activo', true)
            .order('creado_en', { ascending: false })
            .limit(1)
            .single();

        if (error && error.code !== 'PGRST116') throw error;
        return data as NutritionPlan | null;
    },

    /**
     * Get all nutrition plans for a user
     */
    async getUserPlans(userId: string) {
        const supabase = await createClient();
        const { data, error } = await supabase
            .from('planes_nutricionales')
            .select(`
                *,
                coach:perfiles(id, nombre_completo, url_avatar)
            `)
            .eq('usuario_id', userId)
            .order('creado_en', { ascending: false });

        if (error) throw error;
        return data;
    },

    /**
     * Get nutrition plan by ID
     */
    async getById(id: string) {
        const supabase = await createClient();
        const { data, error } = await supabase
            .from('planes_nutricionales')
            .select(`
                *,
                user:perfiles(id, nombre_completo, email),
                coach:perfiles(id, nombre_completo, email)
            `)
            .eq('id', id)
            .single();

        if (error) throw error;
        return data;
    },

    /**
     * Get nutrition plan by routine ID
     */
    async getByRoutineId(routineId: string) {
        const supabase = await createClient();
        const { data, error } = await supabase
            .from('planes_nutricionales')
            .select('*')
            .eq('rutina_id', routineId)
            .single();

        if (error && error.code !== 'PGRST116') throw error;
        return data as NutritionPlan | null;
    },

    /**
     * Create nutrition plan
     */
    async create(plan: NutritionPlanInsert) {
        const supabase = await createClient();

        // If this is set as active, deactivate other plans for the user
        if (plan.esta_activo) {
            await this.deactivateUserPlans(plan.usuario_id!);
        }

        const { data, error } = await supabase
            .from('planes_nutricionales')
            .insert(plan)
            .select()
            .single();

        if (error) throw error;
        return data as NutritionPlan;
    },

    /**
     * Update nutrition plan
     */
    async update(id: string, updates: NutritionPlanUpdate) {
        const supabase = await createClient();

        // If setting as active, deactivate other plans first
        if (updates.esta_activo) {
            const plan = await this.getById(id);
            await this.deactivateUserPlans(plan.usuario_id);
        }

        const { data, error } = await supabase
            .from('planes_nutricionales')
            .update(updates)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return data as NutritionPlan;
    },

    /**
     * Deactivate all nutrition plans for a user
     */
    async deactivateUserPlans(userId: string) {
        const supabase = await createClient();
        const { error } = await supabase
            .from('planes_nutricionales')
            .update({ esta_activo: false })
            .eq('usuario_id', userId)
            .eq('esta_activo', true);

        if (error) throw error;
    },

    /**
     * Delete nutrition plan
     */
    async delete(id: string) {
        const supabase = await createClient();
        const { error } = await supabase
            .from('planes_nutricionales')
            .delete()
            .eq('id', id);

        if (error) throw error;
    },

    /**
     * Get plans created by coach
     */
    async getByCoach(coachId: string) {
        const supabase = await createClient();
        const { data, error } = await supabase
            .from('planes_nutricionales')
            .select(`
                *,
                user:perfiles(id, nombre_completo, email)
            `)
            .eq('entrenador_id', coachId)
            .order('creado_en', { ascending: false });

        if (error) throw error;
        return data;
    },

    /**
     * Update meals
     */
    async updateMeals(id: string, meals: Database['public']['Tables']['planes_nutricionales']['Update']['comidas']) {
        return this.update(id, { comidas: meals });
    },

    /**
     * Update supplements
     */
    async updateSupplements(id: string, supplements: Database['public']['Tables']['planes_nutricionales']['Update']['suplementos']) {
        return this.update(id, { suplementos: supplements });
    },

    /**
     * Update macros
     */
    async updateMacros(id: string, macros: {
        calorias_diarias?: number;
        gramos_proteina?: number;
        gramos_carbohidratos?: number;
        gramos_grasas?: number;
    }) {
        return this.update(id, macros);
    },
};
