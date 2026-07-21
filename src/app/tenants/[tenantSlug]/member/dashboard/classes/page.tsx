'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { bookingsService } from '@/services/bookings.service';
import { supabase } from '@/lib/supabase/client';
import { useTenantNavigation } from '@/hooks/useTenantNavigation';
import toast from 'react-hot-toast';
import Link from 'next/link';
import { Calendar, Clock, User, Plus, Trash2, Info, Loader2, Sparkles } from 'lucide-react';

export default function StudentClassesPage() {
    const { tenantHref } = useTenantNavigation();
    const [bookings, setBookings] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchMyBookings();
    }, []);

    const fetchMyBookings = async () => {
        try {
            setLoading(true);
            const user = (await supabase.auth.getUser()).data.user;
            if (!user) return;

            const upcoming = await bookingsService.getUpcomingBookings(user.id);
            setBookings(upcoming || []);
        } catch (error) {
            console.error('Error al cargar clases:', error);
            toast.error('Error al cargar tus clases');
        } finally {
            setLoading(false);
        }
    };

    const handleCancel = async (bookingId: string, bookingDate: string, startTime: string) => {
        // Verificar regla de cancelación (hasta 15 minutos antes)
        if (bookingDate && startTime) {
            const classDateTime = new Date(`${bookingDate}T${startTime}`);
            const minutesLeft = (classDateTime.getTime() - Date.now()) / (1000 * 60);
            if (minutesLeft < 15) {
                toast.error('No puedes cancelar a menos de 15 minutos del inicio de la clase.');
                return;
            }
        }

        if (!confirm('¿Seguro que deseas cancelar esta reserva? Tu cupo se ofrecerá a la lista de espera.')) return;

        try {
            await bookingsService.cancel(bookingId);
            toast.success('Reserva cancelada. Cupo liberado.');
            fetchMyBookings();
        } catch (_error) {
            toast.error('Error al cancelar la reserva');
        }
    };

    return (
        <div className="min-h-screen bg-[#0a0a0a] text-white p-4 md:p-8 font-rajdhani selection:bg-orange-500/30 pb-32">
            <div className="max-w-5xl mx-auto space-y-8">

                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                    <div>
                        <div className="inline-flex items-center gap-2 bg-orange-500/10 border border-orange-500/20 px-4 py-1.5 rounded-full text-orange-400 text-xs font-black uppercase tracking-[0.3em] mb-2">
                            <Calendar size={14} /> Mis Reservas Activas
                        </div>
                        <h1 className="text-4xl md:text-5xl font-black text-white italic tracking-tighter uppercase leading-none">
                            Mis Clases
                        </h1>
                        <p className="text-zinc-400 text-xs font-bold uppercase tracking-widest mt-1">
                            Gestiona tus próximos turnos y cancelaciones
                        </p>
                    </div>

                    <Link
                        href={tenantHref('/member/booking')}
                        className="bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-400 hover:to-red-500 text-white font-black px-6 py-3.5 rounded-2xl text-xs uppercase italic tracking-widest transition-all flex items-center justify-center gap-2 shadow-lg shadow-orange-500/20 hover:scale-105"
                    >
                        <Plus size={16} /> Reservar Nueva Clase
                    </Link>
                </div>

                {/* Bookings List */}
                <div className="grid gap-6">
                    {loading ? (
                        <div className="py-20 text-center text-zinc-500 font-black uppercase tracking-widest animate-pulse flex flex-col items-center gap-3">
                            <Loader2 size={32} className="text-orange-500 animate-spin" />
                            <span>Cargando tus reservas...</span>
                        </div>
                    ) : bookings.length === 0 ? (
                        <div className="text-center py-20 bg-zinc-900/40 rounded-[3rem] border border-white/5 p-8 flex flex-col items-center justify-center">
                            <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mb-4 text-zinc-600">
                                <Calendar size={40} />
                            </div>
                            <h3 className="text-2xl font-black text-white italic uppercase tracking-tighter mb-2">No tienes clases reservadas</h3>
                            <p className="text-zinc-500 text-xs font-bold uppercase tracking-wider mb-8 max-w-sm">
                                Explora el cronograma oficial y asegura tu lugar en los mejores horarios.
                            </p>
                            <Link
                                href={tenantHref('/member/booking')}
                                className="bg-white text-black hover:bg-zinc-200 font-black px-8 py-4 rounded-2xl text-xs uppercase italic tracking-widest transition-all shadow-xl hover:scale-105"
                            >
                                Ver Cronograma de Clases
                            </Link>
                        </div>
                    ) : (
                        bookings.map((booking) => {
                            const bDate = new Date(booking.date || booking.fecha || Date.now());
                            return (
                                <motion.div
                                    key={booking.id}
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    className="bg-zinc-900/60 border border-white/10 p-6 md:p-8 rounded-[2.5rem] flex flex-col md:flex-row md:items-center justify-between gap-6 backdrop-blur-3xl shadow-xl hover:border-orange-500/30 transition-all"
                                >
                                    <div className="flex items-center gap-6">
                                        <div className="bg-orange-500/10 border border-orange-500/20 p-4 rounded-2xl text-center min-w-[80px]">
                                            <p className="text-orange-500 font-black uppercase text-[10px] tracking-widest">
                                                {bDate.toLocaleDateString('es-AR', { weekday: 'short' })}
                                            </p>
                                            <p className="text-3xl font-black italic tracking-tighter leading-none my-1">
                                                {bDate.getDate()}
                                            </p>
                                            <p className="text-zinc-500 text-[9px] font-bold uppercase tracking-widest">
                                                {bDate.toLocaleDateString('es-AR', { month: 'short' })}
                                            </p>
                                        </div>

                                        <div className="space-y-1">
                                            <h3 className="text-2xl font-black text-white italic uppercase tracking-tighter leading-none">
                                                {booking.activity_name || booking.nombre_clase || 'Entrenamiento Táctico'}
                                            </h3>
                                            <p className="text-zinc-400 text-xs font-bold uppercase tracking-wider flex items-center gap-2">
                                                <Clock size={14} className="text-orange-500" />
                                                {booking.start_time?.slice(0, 5) || booking.hora_inicio?.slice(0, 5) || '08:00'} HS
                                            </p>
                                            <p className="text-[10px] text-zinc-500 font-black uppercase tracking-widest flex items-center gap-1">
                                                <User size={12} /> Coach {booking.coach_name || 'Staff VIRTUD'}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-3">
                                        <div className="px-4 py-2.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center gap-2">
                                            <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
                                            {booking.estado === 'en_lista_espera' ? 'En Lista de Espera' : 'Confirmado'}
                                        </div>

                                        <button
                                            onClick={() => handleCancel(booking.id, booking.date || booking.fecha, booking.start_time || booking.hora_inicio)}
                                            className="px-5 py-2.5 border border-red-500/30 text-red-400 hover:bg-red-500/10 rounded-2xl font-black text-xs uppercase tracking-widest transition-all flex items-center gap-1.5"
                                        >
                                            <Trash2 size={14} /> Cancelar
                                        </button>
                                    </div>
                                </motion.div>
                            );
                        })
                    )}
                </div>

                {/* Cancellation Policy Banner */}
                <div className="p-6 bg-blue-500/10 border border-blue-500/20 rounded-[2rem] flex items-start gap-4">
                    <div className="p-3 bg-blue-500/20 rounded-xl text-blue-400 shrink-0">
                        <Info size={20} />
                    </div>
                    <div>
                        <h4 className="font-black text-blue-400 uppercase text-xs tracking-widest mb-1">
                            Política de Reserva y Cancelación
                        </h4>
                        <p className="text-xs text-zinc-300 font-medium leading-relaxed">
                            Puedes cancelar tu reserva de forma gratuita hasta <strong>15 minutos antes del inicio</strong> de la clase. Al cancelar, el sistema reasignará tu cupo automáticamente al primer alumno en lista de espera.
                        </p>
                    </div>
                </div>

            </div>
        </div>
    );
}
