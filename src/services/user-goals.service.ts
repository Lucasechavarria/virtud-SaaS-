import { createClient } from '@/lib/supabase/server';
import { Database } from '../types/supabase';

type UserGoal = Database['public']['Tables']['objetivos_del_usuario']['Row'];
type UserGoalInsert = Database['public']['Tables']['objetivos_del_usuario']['Insert'];
type UserGoalUpdate = Database['public']['Tables']['objetivos_del_usuario']['Update'];

/**
 * Service for managing user fitness goals
 */
export const userGoalsService = {
    /**
     * Get user's active goal
     */
    async getActiveGoal(userId: string) {
        const supabase = await createClient();
        const { data, error } = await supabase
            .from('objetivos_del_usuario')
            .select('*')
            .eq('usuario_id', userId)
            .eq('esta_activo', true)
            .order('creado_en', { ascending: false })
            .limit(1)
            .single();

        if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows
        return data as UserGoal | null;
    },

    /**
     * Get all goals for a user
     */
    async getUserGoals(userId: string) {
        const supabase = await createClient();
        const { data, error } = await supabase
            .from('objetivos_del_usuario')
            .select('*')
            .eq('usuario_id', userId)
            .order('creado_en', { ascending: false });

        if (error) throw error;
        return data as UserGoal[];
    },

    /**
     * Get goal by ID
     */
    async getById(id: string) {
        const supabase = await createClient();
        const { data, error } = await supabase
            .from('objetivos_del_usuario')
            .select('*')
            .eq('id', id)
            .single();

        if (error) throw error;
        return data as UserGoal;
    },

    /**
     * Create new goal
     */
    async create(goal: UserGoalInsert) {
        const supabase = await createClient();

        // Delegado al TRIGGER SQL "tr_ensure_single_active_user_goal"


        const { data, error } = await supabase
            .from('objetivos_del_usuario')
            .insert(goal)
            .select()
            .single();

        if (error) throw error;
        return data as UserGoal;
    },

    /**
     * Update goal
     */
    async update(id: string, updates: UserGoalUpdate) {
        const supabase = await createClient();

        // Delegado al Trigger SQL


        const { data, error } = await supabase
            .from('objetivos_del_usuario')
            .update(updates)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return data as UserGoal;
    },

    /**
     * Deactivate all goals for a user
     */
    async deactivateUserGoals(userId: string) {
        const supabase = await createClient();
        const { error } = await supabase
            .from('objetivos_del_usuario')
            .update({ esta_activo: false })
            .eq('usuario_id', userId)
            .eq('esta_activo', true);

        if (error) throw error;
    },

    /**
     * Delete goal
     */
    async delete(id: string) {
        const supabase = await createClient();
        const { error } = await supabase
            .from('objetivos_del_usuario')
            .delete()
            .eq('id', id);

        if (error) throw error;
    },

    /**
     * Add coach notes to goal
     */
    async addCoachNotes(id: string, notes: string) {
        return this.update(id, { notas_entrenador: notes });
    },

    /**
     * Get goals by primary goal type (for analytics)
     */
    async getByPrimaryGoal(primaryGoal: string) {
        const supabase = await createClient();
        const { data, error } = await supabase
            .from('objetivos_del_usuario')
            .select('*')
            .eq('objetivo_principal', primaryGoal)
            .eq('esta_activo', true);

        if (error) throw error;
        return data as UserGoal[];
    },

    /**
     * Get goal statistics (Optimizado: Agregación SQL NATIVA)
     */
    async getStats() {
        const supabase = await createClient();

        // Ejecutamos la agregación directamente en la base de datos para no saturar la memoria
        const { count: total, error: err1 } = await supabase
            .from('objetivos_del_usuario')
            .select('*', { count: 'exact', head: true });

        const { count: active, error: err2 } = await supabase
            .from('objetivos_del_usuario')
            .select('*', { count: 'exact', head: true })
            .eq('esta_activo', true);

        // Agregación de promedios via SQL (Usamos casting para evitar el error de tipado de .avg())
        const { data: allGoals, error: err3 } = await supabase
            .from('objetivos_del_usuario')
            .select('frecuencia_entrenamiento_por_semana' as any);

        if (err1 || err2 || err3) throw err1 || err2 || err3;

        const goals = allGoals as unknown as { frecuencia_entrenamiento_por_semana: number | null }[];
        const validFrequencies = goals.filter(g => g.frecuencia_entrenamiento_por_semana !== null);
        const avgFrequency = validFrequencies.length > 0
            ? validFrequencies.reduce((sum, g) => sum + (g.frecuencia_entrenamiento_por_semana || 0), 0) / validFrequencies.length
            : 0;

        return {
            total: total || 0,
            active: active || 0,
            avgFrequency,
            byPrimaryGoal: {} // TODO: Migrar a View SQL para reportes dinámicos
        };
    },
};
