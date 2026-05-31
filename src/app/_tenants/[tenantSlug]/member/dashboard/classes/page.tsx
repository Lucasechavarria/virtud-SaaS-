'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { bookingsService } from '@/services/bookings.service';
import { supabase } from '@/lib/supabase/client';
import toast from 'react-hot-toast';
import Link from 'next/link';

export default function StudentClassesPage({ _params }: { _params: { gymId: string } }) {
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
            console.error(error);
            toast.error('Error cargando tus clases');
        } finally {
            setLoading(false);
        }
    };

    const handleCancel = async (bookingId: string) => {
        if (!confirm('¿Seguro que deseas cancelar esta reserva?')) return;

        try {
            await bookingsService.cancel(bookingId);
            toast.success('Reserva cancelada');
            fetchMyBookings();
        } catch (_error) {
            toast.error('Error al cancelar');
        }
    };

    return (
        <div className="min-h-screen bg-[#0a0a0a] text-white p-4 md:p-8">
            <header className="mb-8">
                <div className="flex justify-between items-center mb-4">
                    <h1 className="text-3xl font-bold">Mis Clases</h1>
                    <Link
                        href="/schedule"
                        className="bg-orange-600 text-white font-bold px-4 py-2 rounded-lg hover:bg-orange-700 transition-colors"
                    >
                        + Reservar Clase
                    </Link>
                </div>
                <p className="text-gray-400">Aquí puedes ver y gestionar tus próximas sesiones.</p>
            </header>

            <div className="grid gap-6">
                {loading ? (
                    <div className="text-center py-12 text-gray-500">Cargando tus clases...</div>
                ) : bookings.length === 0 ? (
                    <div className="text-center py-12 bg-[#1c1c1e] rounded-2xl border border-white/5">
                        <div className="text-5xl mb-4">🗓️</div>
                        <p className="text-xl font-bold mb-2">No tienes clases reservadas</p>
                        <p className="text-gray-500 mb-6">Explora el cronograma y reserva tu lugar.</p>
                        <Link
                            href="/schedule"
                            className="inline-block bg-white text-black font-bold px-6 py-2 rounded-lg hover:bg-gray-200 transition-colors"
                        >
                            Ver Cronograma
                        </Link>
                    </div>
                ) : (
                    bookings.map((booking) => (
                        <motion.div
                            key={booking.id}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="bg-[#1c1c1e] border border-white/10 p-6 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-6"
                        >
                            <div className="flex items-center gap-6">
                                <div className="text-center">
                                    <p className="text-orange-500 font-bold uppercase text-xs">
                                        {new Date(booking.date).toLocaleDateString('es-AR', { weekday: 'short' })}
                                    </p>
                                    <p className="text-2xl font-black">
                                        {new Date(booking.date).getDate()}
                                    </p>
                                    <p className="text-gray-500 text-xs uppercase">
                                        {new Date(booking.date).toLocaleDateString('es-AR', { month: 'short' })}
                                    </p>
                                </div>
                                <div className="w-px h-12 bg-white/10 hidden md:block" />
                                <div>
                                    <h3 className="text-xl font-bold text-white">{booking.activity_name || 'Clase'}</h3>
                                    <p className="text-gray-400">
                                        🕒 {booking.start_time?.slice(0, 5)}
                                    </p>
                                    <p className="text-sm text-gray-400 mt-1 italic">
                                        Con {booking.coach_name || 'Staff'}
                                    </p>
                                </div>
                            </div>

                            <div className="flex gap-3">
                                <button
                                    onClick={() => handleCancel(booking.id)}
                                    className="px-4 py-2 border border-red-500/50 text-red-500 rounded-lg hover:bg-red-500/10 transition-colors font-bold text-sm"
                                >
                                    Cancelar Reserva
                                </button>
                                <div className="px-4 py-2 bg-green-500/20 text-green-400 rounded-lg font-bold text-sm flex items-center gap-2">
                                    <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                                    Confirmado
                                </div>
                            </div>
                        </motion.div>
                    ))
                )}
            </div>

            {/* Historical or other info could go here */}
            <div className="mt-12 p-6 bg-blue-500/10 border border-blue-500/20 rounded-2xl">
                <h4 className="font-bold text-blue-400 mb-2 flex items-center gap-2">
                    💡 Recordatorio
                </h4>
                <p className="text-sm text-gray-300">
                    Puedes cancelar tu reserva hasta 2 horas antes del inicio de la clase. Pasado ese tiempo, se considerará asistencia o falta según la política del gimnasio.
                </p>
            </div>
        </div>
    );
}
