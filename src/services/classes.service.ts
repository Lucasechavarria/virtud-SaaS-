// @ts-nocheck
import { supabase } from '@/lib/supabase/client';
import { Database } from '../types/supabase';

type Class = Database['public']['Tables']['horarios_de_clase']['Row'];
type ClassInsert = Database['public']['Tables']['horarios_de_clase']['Insert'];
type ClassUpdate = Database['public']['Tables']['horarios_de_clase']['Update'];
// Manual definition to avoid build errors with 'Views' property resolution
interface ClassWithAvailability {
    id: string;
    actividad_id: string | null;
    entrenador_id: string | null;
    dia_de_la_semana: number;
    hora_inicio: string;
    hora_fin: string;
    capacidad_maxima: number;
    capacidad_actual: number;
    esta_activa: boolean;
    nombre_actividad: string;
}

/**
 * Service for managing classes
 */
export const classesService = {
    /**
     * Get all active classes with availability info
     */
    async getAllWithAvailability() {
        const { data, error } = await supabase
            .from('clases_con_disponibilidad')
            .select('*')
            .order('dia_de_la_semana')
            .order('hora_inicio');

        if (error) throw error;
        return data as ClassWithAvailability[];
    },

    /**
     * Get classes by day of week
     */
    async getByDay(dayOfWeek: number) {
        const { data, error } = await supabase
            .from('clases_con_disponibilidad')
            .select('*')
            .eq('dia_de_la_semana', dayOfWeek)
            .order('hora_inicio');

        if (error) throw error;
        return data as ClassWithAvailability[];
    },

    /**
     * Get classes by activity
     */
    async getByActivity(activityId: string) {
        const { data, error } = await supabase
            .from('clases_con_disponibilidad')
            .select('*')
            .eq('actividad_id', activityId)
            .order('dia_de_la_semana')
            .order('hora_inicio');

        if (error) throw error;
        return data as ClassWithAvailability[];
    },

    /**
     * Get classes by coach
     */
    async getByCoach(coachId: string) {
        const { data, error } = await supabase
            .from('horarios_de_clase')
            .select(`
        id, actividad_id, entrenador_id, dia_de_la_semana, hora_inicio, hora_fin, capacidad_maxima, esta_activa,
        activity:actividades(id, nombre, color, duracion_minutos)
      `)
            .eq('entrenador_id', coachId)
            .eq('esta_activa', true)
            .order('dia_de_la_semana')
            .order('hora_inicio');

        if (error) throw error;
        return data;
    },

    /**
     * Get class by ID
     */
    async getById(id: string) {
        const { data, error } = await supabase
            .from('horarios_de_clase')
            .select(`
        id, actividad_id, entrenador_id, dia_de_la_semana, hora_inicio, hora_fin, capacidad_maxima, esta_activa,
        activity:actividades(id, nombre, color, duracion_minutos),
        coach:perfiles(id, nombre_completo, url_avatar)
      `)
            .eq('id', id)
            .single();

        if (error) throw error;
        return data;
    },

    /**
     * Create new class (coach/admin only)
     */
    async create(classData: ClassInsert) {
        const { data, error } = await supabase
            .from('horarios_de_clase')
            .insert(classData)
            .select()
            .single();

        if (error) throw error;
        return data as Class;
    },

    /**
     * Update class (coach/admin only)
     */
    async update(id: string, updates: ClassUpdate) {
        const { data, error } = await supabase
            .from('horarios_de_clase')
            .update(updates)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return data as Class;
    },

    /**
     * Delete class (admin only)
     */
    async delete(id: string) {
        const { error } = await supabase
            .from('horarios_de_clase')
            .delete()
            .eq('id', id);

        if (error) throw error;
    },

    /**
     * Check if class has available spots
     */
    async hasAvailableSpots(classId: string) {
        const { data, error } = await supabase
            .from('clases_con_disponibilidad')
            .select('capacidad_maxima, capacidad_actual')
            .eq('id', classId)
            .single();

        if (error) throw error;
        if (!data) throw new Error('Class not found');
        return (data.capacidad_actual || 0) < (data.capacidad_maxima || 0);
    },
};
