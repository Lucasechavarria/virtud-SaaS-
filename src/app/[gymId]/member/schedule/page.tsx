'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Clock, User, Calendar as CalendarIcon, X, Info, CheckCircle } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { supabase } from '@/lib/supabase/client';

interface ScheduleItem {
    id: string;
    day_of_week: number;
    start_time: string;
    end_time: string;
    teacher_text?: string;
    activities: {
        id: string;
        name: string;
        color: string;
    };
    profiles: {
        first_name: string;
        last_name: string;
    } | null;
}

const DAYS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
const HOURS = Array.from({ length: 15 }, (_, i) => i + 7); // 07:00 to 21:00

export default function SchedulePage({ params }: { params: { gymId: string } }) {
    const [schedule, setSchedule] = useState<ScheduleItem[]>([]);
    const [userBookings, setUserBookings] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [bookingLoading, setBookingLoading] = useState(false);
    const [selectedEvent, setSelectedEvent] = useState<ScheduleItem | null>(null);
    const [filterActivity, setFilterActivity] = useState<string>('all');

    useEffect(() => {
        let channel: any = null;

        const loadAndSubscribe = async () => {
            const schedData = await fetchData();
            
            if (schedData && schedData.length > 0) {
                const classIds = schedData.map((s: any) => s.id).join(',');
                channel = supabase.channel('global_schedule_changes')
                    .on(
                        'postgres_changes',
                        { 
                            event: '*', 
                            schema: 'public', 
                            table: 'reservas_de_clase',
                            filter: `horario_clase_id=in.(${classIds})`
                        },
                        () => { fetchData(); } // Silent background update
                    )
                    .subscribe();
            }
        };

        loadAndSubscribe();

        return () => { if (channel) supabase.removeChannel(channel); };
    }, []);

    const fetchData = async () => {
        try {
            const [schedRes, bookRes] = await Promise.all([
                fetch('/api/schedule'),
                fetch('/api/bookings')
            ]);

            const schedData = await schedRes.json();
            const bookData = await bookRes.json();

            if (Array.isArray(schedData)) setSchedule(schedData);
            if (Array.isArray(bookData)) setUserBookings(bookData);

            return schedData;
        } catch (error) {
            console.error('Error loading data:', error);
            toast.error('Error al cargar datos');
        } finally {
            setLoading(false);
        }
    };

    const handleBookClass = async () => {
        if (!selectedEvent) return;
        setBookingLoading(true);

        try {
            // Calculate next occurrence date
            // Note: For MVP we assume booking for "this week's" next occurrence
            // Real app would need specific date selection
            const eventDayIndex = selectedEvent.day_of_week; // 1=Monday
            const today = new Date();
            const currentDayIndex = today.getDay() || 7; // Convert 0(Sun) to 7

            let daysUntil = eventDayIndex - currentDayIndex;
            if (daysUntil < 0) daysUntil += 7; // Next week if passed

            const targetDate = new Date();
            targetDate.setDate(today.getDate() + daysUntil);
            const dateStr = targetDate.toISOString().split('T')[0];

            const res = await fetch('/api/bookings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    schedule_id: selectedEvent.id,
                    date: dateStr
                })
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || 'Error al reservar');
            }

            toast.success('¡Clase reservada con éxito!');
            fetchData(); // Refresh bookings
            setSelectedEvent(null);
        } catch (error: any) {
            toast.error(error.message);
        } finally {
            setBookingLoading(false);
        }
    };

    const handleCancelBooking = async (bookingId: string) => {
        setBookingLoading(true);
        try {
            const res = await fetch(`/api/bookings?id=${bookingId}`, {
                method: 'DELETE'
            });

            if (!res.ok) throw new Error('Error al cancelar');

            toast.success('Reserva cancelada');
            fetchData();
            setSelectedEvent(null);
        } catch (error) {
            toast.error('No se pudo cancelar');
        } finally {
            setBookingLoading(false);
        }
    };

    // Get unique activities for filter
    const uniqueActivities = Array.from(new Set(schedule.map(s => s.activities.name))).sort();

    // Filter items
    const filteredSchedule = filterActivity === 'all'
        ? schedule
        : schedule.filter(s => s.activities.name === filterActivity);

    // Helper to calculate grid position
    const getGridPosition = (dayIndex: number, startTime: string, endTime: string) => {
        const [startHour, startMin] = startTime.split(':').map(Number);
        const [endHour, endMin] = endTime.split(':').map(Number);

        const startRow = (startHour - 7) * 4 + (startMin / 15) + 2; // +2 for header offset
        const durationMinutes = (endHour * 60 + endMin) - (startHour * 60 + startMin);
        const spanRows = durationMinutes / 15;

        return {
            gridColumnStart: dayIndex + 2, // +2 for time label column
            gridRowStart: startRow,
            gridRowEnd: `span ${spanRows}`,
        };
    };

    // Check if selected event is booked
    const currentBooking = selectedEvent
        ? userBookings.find(b => b.class_schedule_id === selectedEvent.id && b.status === 'booked')
        : null;

    if (loading) {
        return (
            <div className="flex h-96 items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6 h-full flex flex-col">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                <div>
                    <h1 className="text-3xl font-black text-white tracking-tight">📅 Cronograma Semanal</h1>
                    <p className="text-gray-400">Consulta las clases y actividades disponibles</p>
                </div>

                {/* Activity Filter */}
                <div className="w-full md:w-auto">
                    <select
                        value={filterActivity}
                        onChange={(e) => setFilterActivity(e.target.value)}
                        className="w-full md:w-64 bg-[#1c1c1e] text-white border border-white/10 rounded-xl px-4 py-2 focus:ring-2 focus:ring-purple-500 outline-none"
                    >
                        <option value="all">Todas las Actividades</option>
                        {uniqueActivities.map(name => (
                            <option key={name} value={name}>{name}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Grid Container */}
            <div className="flex-1 bg-[#1c1c1e] border border-white/10 rounded-2xl overflow-auto shadow-2xl relative">
                <div className="min-w-[800px] grid grid-cols-[60px_repeat(7,1fr)] bg-[#1c1c1e]">

                    {/* Header Row (Days) */}
                    <div className="sticky top-0 z-20 bg-[#1c1c1e]/90 backdrop-blur border-b border-white/10 h-14 col-start-2 col-span-7 grid grid-cols-7">
                        {DAYS.map((day, i) => (
                            <div key={day} className="flex items-center justify-center font-bold text-gray-300 border-l border-white/5 uppercase text-sm tracking-wider">
                                {day}
                            </div>
                        ))}
                    </div>

                    {/* Time Labels Column */}
                    <div className="row-start-2 sticky left-0 z-10 bg-[#1c1c1e] border-r border-white/10">
                        {HOURS.map((hour) => (
                            <div key={hour} className="h-24 border-b border-white/5 text-xs text-gray-500 font-mono flex items-start justify-center pt-2">
                                {hour}:00
                            </div>
                        ))}
                    </div>

                    {/* Grid Content Background (Lines) */}
                    <div className="col-start-2 col-span-7 row-start-2 grid grid-rows-[repeat(60,1fr)] h-[1440px]">
                        {/* 15 hours * 4 slots/hr = 60 rows */}
                        {HOURS.map((_, i) => (
                            <div key={i} className="h-24 border-b border-white/5 w-full relative group">
                                {/* 15 min guidelines (subtle) */}
                                <div className="absolute top-1/4 w-full border-t border-white/[0.02]"></div>
                                <div className="absolute top-2/4 w-full border-t border-dashed border-white/[0.05]"></div>
                                <div className="absolute top-3/4 w-full border-t border-white/[0.02]"></div>
                            </div>
                        ))}
                    </div>

                    {/* Events Overlay */}
                    <div className="col-start-1 col-span-8 row-start-1 grid grid-cols-[60px_repeat(7,1fr)] grid-rows-[56px_repeat(60,1.5rem)] pointer-events-none absolute inset-0">
                        {/* 1.5rem = 24px per 15min slot (h-24 per hour = 96px / 4 = 24px) */}

                        <AnimatePresence>
                            {filteredSchedule.map((item) => {
                                const style = getGridPosition(item.day_of_week - 1, item.start_time, item.end_time);
                                // Determine teacher display name
                                const teacherName = item.profiles
                                    ? `${item.profiles.first_name} ${item.profiles.last_name}`
                                    : item.teacher_text || 'A confirmar';

                                const isBooked = userBookings.some(b => b.class_schedule_id === item.id && b.status === 'booked');

                                return (
                                    <motion.div
                                        layoutId={`event-${item.id}`}
                                        key={item.id}
                                        style={{
                                            ...style,
                                            backgroundColor: isBooked ? '#10b981' : `${item.activities.color}30`,
                                            borderColor: isBooked ? '#059669' : item.activities.color,
                                        }}
                                        onClick={() => setSelectedEvent(item)}
                                        initial={{ opacity: 0, scale: 0.9 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0, scale: 0.9 }}
                                        whileHover={{ scale: 1.02, zIndex: 10, backgroundColor: isBooked ? '#10b981' : `${item.activities.color}50` }}
                                        className={`m-[2px] p-2 rounded-lg cursor-pointer pointer-events-auto shadow-sm hover:shadow-lg transition-all border-l-4 overflow-hidden flex flex-col justify-start ${isBooked ? 'ring-2 ring-white/20' : ''}`}
                                    >
                                        <div className="flex justify-between items-start">
                                            <p className="font-bold text-xs md:text-sm text-white truncate leading-tight">
                                                {item.activities.name}
                                            </p>
                                            {isBooked && <CheckCircle size={14} className="text-white shrink-0" />}
                                        </div>
                                        <p className="text-[10px] text-gray-300 truncate flex items-center gap-1 mt-1">
                                            <User size={10} /> {teacherName}
                                        </p>
                                        <p className="text-[10px] opacity-70 mt-auto font-mono">
                                            {item.start_time.slice(0, 5)} - {item.end_time.slice(0, 5)}
                                        </p>
                                    </motion.div>
                                );
                            })}
                        </AnimatePresence>
                    </div>

                </div>
            </div>

            {/* Event Detail Modal */}
            <AnimatePresence>
                {selectedEvent && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setSelectedEvent(null)}>
                        <motion.div
                            layoutId={`event-${selectedEvent.id}`}
                            className="bg-[#1c1c1e] w-full max-w-md rounded-2xl border border-white/10 shadow-2xl overflow-hidden"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="h-24 relative p-6 flex flex-col justify-end" style={{ backgroundColor: selectedEvent.activities.color }}>
                                <button
                                    onClick={() => setSelectedEvent(null)}
                                    className="absolute top-4 right-4 p-2 bg-black/20 hover:bg-black/40 rounded-full text-white transition-colors"
                                >
                                    <X size={20} />
                                </button>
                                <h2 className="text-2xl font-black text-white drop-shadow-md">{selectedEvent.activities.name}</h2>
                            </div>

                            <div className="p-6 space-y-4">
                                <div className="flex items-start gap-4 p-4 bg-white/5 rounded-xl">
                                    <Clock className="text-purple-400 shrink-0" />
                                    <div>
                                        <p className="text-sm text-gray-400 mb-1">Horario</p>
                                        <p className="font-bold text-white text-lg">
                                            {DAYS[selectedEvent.day_of_week - 1]}
                                        </p>
                                        <p className="text-white text-md">
                                            {selectedEvent.start_time.slice(0, 5)} - {selectedEvent.end_time.slice(0, 5)}
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-4 p-4 bg-white/5 rounded-xl">
                                    <User className="text-blue-400 shrink-0" />
                                    <div>
                                        <p className="text-sm text-gray-400 mb-1">Profesor a cargo</p>
                                        <p className="font-bold text-white">
                                            {selectedEvent.profiles
                                                ? `${selectedEvent.profiles.first_name} ${selectedEvent.profiles.last_name}`
                                                : selectedEvent.teacher_text || 'A confirmar'}
                                        </p>
                                    </div>
                                </div>

                                <div className="flex gap-2 pt-2">
                                    {currentBooking ? (
                                        <button
                                            onClick={() => handleCancelBooking(currentBooking.id)}
                                            disabled={bookingLoading}
                                            className="flex-1 py-3 bg-red-500/20 hover:bg-red-500/30 text-red-500 font-bold rounded-xl transition-all disabled:opacity-50"
                                        >
                                            {bookingLoading ? 'Cancelando...' : 'Cancelar Reserva'}
                                        </button>
                                    ) : (
                                        <button
                                            onClick={handleBookClass}
                                            disabled={bookingLoading}
                                            className="flex-1 py-3 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl shadow-lg transition-all disabled:opacity-50"
                                        >
                                            {bookingLoading ? 'Reservando...' : 'Reservar Clase'}
                                        </button>
                                    )}
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
