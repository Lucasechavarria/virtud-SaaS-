import { supabase } from '@/lib/supabase/client';
import { Database } from '../types/supabase';

type Booking = Database['public']['Tables']['reservas_de_clase']['Row'];
type BookingInsert = Database['public']['Tables']['reservas_de_clase']['Insert'];

/**
 * Service for managing bookings
 */
export const bookingsService = {
    /**
     * Get user bookings with details
     */
    async getUserBookings(userId: string) {
        // Usamos 'as any' para evitar "Type instantiation is excessively deep" en vistas complejas
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
     * SAFE CONCURRENCY: Esta función ahora delega el candado de concurrencia completa (Anti-Overbooking)
     * a la Base de Datos mediante el RPC "book_class_atomic" evitando el fraude de múltiples hilos en Vercel.
     */
    async create(booking: BookingInsert) {
        if (!booking.horario_clase_id || !booking.usuario_id || !booking.fecha) {
            throw new Error('Faltan datos requeridos para la reserva');
        }

        // Usamos '(supabase as any).rpc' porque las funciones atómicas nuevas pueden no estar en los tipos generados aún
        const { data, error } = await (supabase as any)
            .rpc('book_class_atomic', {
                p_horario_clase_id: booking.horario_clase_id,
                p_usuario_id: booking.usuario_id,
                p_fecha: booking.fecha
            });

        if (error) throw new Error(error.message);
        
        return data as Booking;
    },

    /**
     * Cancel a booking
     */
    async cancel(bookingId: string) {
        const { data, error } = await supabase
            .from('reservas_de_clase')
            .update({ estado: 'cancelada' })
            .eq('id', bookingId)
            .select()
            .single();

        if (error) throw error;
        if (!data) throw new Error('Booking not found');

        // Promote waitlist if applicable (delegado a SQL Atómico)
        if (data.estado === 'reservada') {
            await (supabase as any).rpc('promote_waitlist_atomic', {
                p_horario_id: data.horario_clase_id,
                p_fecha: data.fecha
            });
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
                marcado_por: checkedInBy,
            })
            .eq('id', bookingId)
            .select()
            .single();

        if (error) throw error;
        return data as Booking;
    },

    /**
     * Promote first person from waitlist (LEGACY - Ahora se usa RPC promote_waitlist_atomic)
     */
    async promoteFromWaitlist(classId: string, date: string) {
        await (supabase as any).rpc('promote_waitlist_atomic', {
            p_horario_id: classId,
            p_fecha: date
        });
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
