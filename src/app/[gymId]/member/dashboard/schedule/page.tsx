'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { classesService } from '@/services/classes.service';
import { bookingsService } from '@/services/bookings.service';
import { supabase } from '@/lib/supabase/client';
import toast from 'react-hot-toast';

export default function SchedulePage({ params }: { params: { gymId: string } }) {
    const [classes, setClasses] = useState<any[]>([]);
    const [myBookings, setMyBookings] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedDay, setSelectedDay] = useState(new Date().getDay()); // 0=Sunday, 1=Monday...

    useEffect(() => {
        fetchSchedule();

        // Subscripción WebSockets para cambios en vivo de cupos/reservas
        const channel = supabase.channel('dashboard_schedule_changes')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'reservas_de_clase' },
                () => { fetchSchedule(); }
            )
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [selectedDay]);

    const fetchSchedule = async () => {
        try {
            setLoading(true);
            const user = (await supabase.auth.getUser()).data.user;
            if (!user) return;

            // Fetch classes for the selected day
            const dayClasses = await classesService.getByDay(selectedDay);
            setClasses(dayClasses);

            // Fetch my upcoming bookings to check status
            const bookings = await bookingsService.getUpcomingBookings(user.id);
            setMyBookings(bookings || []);

        } catch (error) {
            console.error(error);
            toast.error('Error cargando horarios');
        } finally {
            setLoading(false);
        }
    };

    const handleBooking = async (classId: string, className: string, time: string) => {
        try {
            const user = (await supabase.auth.getUser()).data.user;
            if (!user) {
                toast.error('Debes iniciar sesión');
                return;
            }

            // Calculate exact date for the next occurrence of this day
            const today = new Date();
            const currentDay = today.getDay();
            let diff = selectedDay - currentDay;
            if (diff < 0) diff += 7; // Next week if day already passed
            if (diff === 0 && isTimePassed(time)) diff += 7; // Next week if time passed today

            const bookingDate = new Date(today);
            bookingDate.setDate(today.getDate() + diff);
            const dateStr = bookingDate.toISOString().split('T')[0];

            // Check duplicate
            const alreadyBooked = await bookingsService.hasUserBooked(user.id, classId, dateStr);
            if (alreadyBooked) {
                toast.error('Ya tienes una reserva para esta clase');
                return;
            }

            if (!confirm(`¿Confirmar reserva para ${className} el ${dateStr} a las ${time}?`)) return;

            await bookingsService.create({
                usuario_id: user.id,
                horario_clase_id: classId,
                fecha: dateStr
            } as any);

            toast.success('Reserva confirmada');
            fetchSchedule(); // Refresh

        } catch (error: any) {
            console.error(error);
            toast.error(error.message || 'Error al reservar');
        }
    };

    const isTimePassed = (timeStr: string) => {
        const now = new Date();
        const [hours, minutes] = timeStr.split(':').map(Number);
        const classTime = new Date();
        classTime.setHours(hours, minutes, 0, 0);
        return now > classTime;
    };

    const days = [
        { id: 1, name: 'Lunes' },
        { id: 2, name: 'Martes' },
        { id: 3, name: 'Miércoles' },
        { id: 4, name: 'Jueves' },
        { id: 5, name: 'Viernes' },
        { id: 6, name: 'Sábado' },
        { id: 0, name: 'Domingo' },
    ];

    return (
        <div className="min-h-screen bg-[#0a0a0a] text-white p-4 md:p-8">
            <header className="mb-8">
                <h1 className="text-3xl font-bold mb-2">Horarios Disponibles</h1>
                <p className="text-gray-400">Reserva tus clases para la semana.</p>
            </header>

            {/* Day Selector */}
            <div className="flex gap-2 overflow-x-auto pb-4 mb-6">
                {days.map((day) => (
                    <button
                        key={day.id}
                        onClick={() => setSelectedDay(day.id)}
                        className={`px-6 py-3 rounded-full font-bold whitespace-nowrap transition-colors
                            ${selectedDay === day.id
                                ? 'bg-orange-600 text-white'
                                : 'bg-[#1c1c1e] text-gray-400 hover:bg-[#2c2c2e]'
                            }`}
                    >
                        {day.name}
                    </button>
                ))}
            </div>

            {/* Classes List */}
            <div className="grid gap-4">
                {loading ? (
                    <div className="text-center py-12 text-gray-500">Cargando horarios...</div>
                ) : classes.length === 0 ? (
                    <div className="text-center py-12 text-gray-500 bg-[#1c1c1e] rounded-2xl border border-[#3a3a3c]">
                        No hay clases programadas para este día.
                    </div>
                ) : (
                    classes.map((cls) => (
                        <motion.div
                            key={cls.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-[#1c1c1e] border border-[#3a3a3c] p-4 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-4"
                        >
                            <div className="flex items-center gap-4">
                                <div className="bg-orange-500/10 text-orange-500 p-3 rounded-lg font-bold text-xl min-w-[80px] text-center">
                                    {cls.hora_inicio.slice(0, 5)}
                                </div>
                                <div>
                                    <h3 className="font-bold text-lg">{cls.nombre_actividad || 'Clase'}</h3>
                                    <p className="text-gray-400 text-sm">
                                        Coach: {cls.nombre_entrenador || 'Staff'} • {cls.duracion_minutos || 60} min
                                    </p>
                                    <div className="flex items-center gap-2 mt-2">
                                        <span className={`text-xs px-2 py-0.5 rounded-full ${cls.cupos_disponibles > 5 ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                                            {cls.cupos_disponibles} cupos libres
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <button
                                onClick={() => handleBooking(cls.id, cls.nombre_actividad, cls.hora_inicio)}
                                className="bg-white text-black font-bold px-6 py-2 rounded-lg hover:scale-105 transition-transform"
                            >
                                Reservar
                            </button>
                        </motion.div>
                    ))
                )}
            </div>
        </div>
    );
}
