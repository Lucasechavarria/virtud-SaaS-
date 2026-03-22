import { supabase } from '@/lib/supabase/client';
import { Database } from '../types/supabase';

type Booking = Database['public']['Tables']['reservas_de_clase']['Row'];
type BookingInsert = Database['public']['Tables']['reservas_de_clase']['Insert'];
type BookingUpdate = Database['public']['Tables']['reservas_de_clase']['Update'];

/**
 * Service for managing bookings
 */
export const bookingsService = {
    /**
     * Get user bookings with details
     */
    async getUserBookings(userId: string) {
        const { data, error } = await supabase
            .from('user_bookings_detailed' as any)
            .select('*')
            .eq('usuario_id', userId)
            .order('fecha', { ascending: false });

        if (error) throw error;
        return data;
    },

    /**
     * Get upcoming bookings for user
     */
    async getUpcomingBookings(userId: string) {
        const today = new Date().toISOString().split('T')[0];

        const { data, error } = await supabase
            .from('user_bookings_detailed' as any)
            .select('*')
            .eq('usuario_id', userId)
            .gte('fecha', today)
            .in('estado', ['reservada', 'en_lista_espera'])
            .order('fecha')
            .order('hora_inicio');

        if (error) throw error;
        return data;
    },

    /**
     * Get user's next confirmed class
     */
    async getNextClass(userId: string) {
        const bookings = await this.getUpcomingBookings(userId);
        return bookings && bookings.length > 0 ? bookings[0] : null;
    },

    /**
     * Get bookings for a specific class and date
     */
    async getClassBookings(classId: string, date: string) {
        const { data, error } = await supabase
            .from('reservas_de_clase')
            .select(`
        *,
        user:perfiles!usuario_id(id, nombre_completo, email, url_avatar)
      `)
            .eq('horario_clase_id', classId)
            .eq('fecha', date)
            .order('creado_en');

        if (error) throw error;
        return data;
    },

    /**
     * Create a new booking
     */
    async create(booking: BookingInsert) {
        // Check if class has available spots
        const { data: classData, error: classError } = await supabase
            .from('clases_con_disponibilidad') // Use view for accurate capacity
            .select('capacidad_maxima, capacidad_actual, lista_espera_habilitada' as any) // lista_espera_habilitada might need check
            .eq('id', booking.horario_clase_id)
            .single() as { data: any; error: any };


        if (classError) throw classError;
        if (!classData) throw new Error('Class not found');

        // Determine if booking should be waitlisted
        const isWaitlist = classData.capacidad_actual >= classData.capacidad_maxima;

        if (isWaitlist && !classData.lista_espera_habilitada) { // Assuming lista_espera_habilitada exists on view or joined
            throw new Error('Class is full and waitlist is not enabled');
        }

        // Get waitlist position if needed
        let waitlistPosition = null;
        if (isWaitlist) {
            const { count } = await supabase
                .from('reservas_de_clase')
                .select('*', { count: 'exact', head: true } as any)
                .eq('horario_clase_id', booking.horario_clase_id)
                .eq('fecha', booking.fecha)
                .eq('en_lista_espera' as any, true);

            waitlistPosition = (count || 0) + 1;
        }

        const { data, error } = await supabase
            .from('reservas_de_clase')
            .insert({
                ...booking,
                estado: isWaitlist ? 'en_lista_espera' : 'reservada',
            } as any)
            .select()
            .single();

        if (error) throw error;
        return data as Booking;
    },

    /**
     * Cancel a booking
     */
    async cancel(bookingId: string) {
        const { data, error } = await supabase
            .from('reservas_de_clase')
            .update({ estado: 'cancelada' } as any)
            .eq('id', bookingId)
            .select()
            .single();

        if (error) throw error;
        if (!data) throw new Error('Booking not found');

        // Promote waitlist if applicable
        if (data.estado === 'reservada') {
            await this.promoteFromWaitlist(data.horario_clase_id, data.fecha);
        }

        return data as Booking;
    },

    /**
     * Check in a user
     */
    async checkIn(bookingId: string, checkedInBy: string) {
        const { data, error } = await supabase
            .from('reservas_de_clase')
            .update({
                estado: 'asistida',
                asistido_en: new Date().toISOString(),
                marcado_por: checkedInBy, // Assuming marcado_por is correct or temporary
            } as any)
            .eq('id', bookingId)
            .select()
            .single();

        if (error) throw error;
        return data as Booking;
    },

    /**
     * Promote first person from waitlist
     */
    async promoteFromWaitlist(classId: string, date: string) {
        const { data: waitlistBookings, error } = await supabase
            .from('reservas_de_clase')
            .select('*')
            .eq('horario_clase_id', classId)
            .eq('fecha', date)
            .eq('en_lista_espera' as any, true)
            .order('posicion_lista_espera' as any)
            .limit(1);


        if (error) throw error;
        if (!waitlistBookings || waitlistBookings.length === 0) return;

        const firstWaitlist = waitlistBookings[0];

        await supabase
            .from('reservas_de_clase')
            .update({
                estado: 'reservada',
                en_lista_espera: false,
                posicion_lista_espera: null,
            } as any)
            .eq('id', firstWaitlist.id);

        // Update positions for remaining waitlist
        const { data: remaining } = await supabase
            .from('reservas_de_clase')
            .select('*')
            .eq('horario_clase_id', classId)
            .eq('fecha', date)
            .eq('en_lista_espera' as any, true)
            .order('posicion_lista_espera' as any);

        if (remaining) {
            for (let i = 0; i < remaining.length; i++) {
                await supabase
                    .from('reservas_de_clase')
                    .update({ posicion_lista_espera: i + 1 } as any)
                    .eq('id', remaining[i].id);
            }
        }
    },

    /**
     * Check if user has already booked this class
     */
    async hasUserBooked(userId: string, classId: string, date: string) {
        const { data, error } = await supabase
            .from('reservas_de_clase')
            .select('id')
            .eq('usuario_id', userId)
            .eq('horario_clase_id', classId)
            .eq('fecha', date)
            .in('estado', ['reservada', 'en_lista_espera'])
            .maybeSingle();

        if (error) throw error;
        return !!data;
    },
};
