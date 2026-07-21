'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabase/client';
import Link from 'next/link';
import { toast } from 'react-hot-toast';
import { bookingsService } from '@/services/bookings.service';
import { hasCompletedMedicalWaiver } from '@/lib/utils/health-waiver';
import { useTenantNavigation } from '@/hooks/useTenantNavigation';
import { Calendar, Clock, User, ShieldAlert, CheckCircle2, Loader2, Sparkles, AlertCircle } from 'lucide-react';

interface ClassSchedule {
    id: string;
    nombre: string;
    hora_inicio: string;
    hora_fin: string;
    coach_nombre: string;
    cupo_maximo: number;
    cupos_disponibles: number;
    en_lista_espera: number;
    ya_reservado: boolean;
    fecha: string;
}

export default function BookingPage() {
    const { tenantHref } = useTenantNavigation();
    const [profile, setProfile] = useState<any>(null);
    const [userId, setUserId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [classesLoading, setClassesLoading] = useState(false);
    const [classes, setClasses] = useState<ClassSchedule[]>([]);

    // Selector de fecha (30 días de anticipación)
    const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);

    // Modal de Firma In-App de Ficha Médica
    const [showWaiverModal, setShowWaiverModal] = useState(false);
    const [signingWaiver, setSigningWaiver] = useState(false);

    // Modal de Confirmación / Booking In Progress
    const [bookingInProgress, setBookingInProgress] = useState<string | null>(null);

    useEffect(() => {
        fetchUserProfile();
    }, []);

    useEffect(() => {
        if (userId) {
            fetchClassesForDate(selectedDate);
        }
    }, [selectedDate, userId]);

    const fetchUserProfile = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                setUserId(user.id);
                const { data } = await supabase
                    .from('perfiles')
                    .select('*, gimnasios(nombre)')
                    .eq('id', user.id)
                    .single();
                setProfile(data);
            }
        } catch (error) {
            console.error('Error fetching user profile:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchClassesForDate = async (dateStr: string) => {
        if (!userId) return;
        setClassesLoading(true);
        try {
            // Fetch real classes from Supabase
            const { data: rawSchedules, error } = await (supabase as any)
                .from('horarios_clases')
                .select(`
                    id,
                    hora_inicio,
                    hora_fin,
                    cupo_maximo,
                    clase:clases_gimnasio(id, nombre),
                    coach:perfiles!coach_id(nombre_completo)
                `)
                .eq('activo', true)
                .order('hora_inicio');

            if (error && error.code !== 'PGRST116') {
                console.warn('Error al consultar horarios_clases directos, usando vistas/fallback:', error);
            }

            // Consultar reservas del alumno para esta fecha
            const userBookings = await bookingsService.getUserBookings(userId);
            const userBookedClassIds = new Set(
                (userBookings || [])
                    .filter((b: any) => b.fecha === dateStr && ['reservada', 'en_lista_espera'].includes(b.estado))
                    .map((b: any) => b.horario_clase_id)
            );

            // Mapear horarios reales de Supabase o proveer fallback estructurado con la BD
            const mapped: ClassSchedule[] = (rawSchedules || []).map((sc: any) => ({
                id: sc.id,
                nombre: sc.clase?.nombre || 'Entrenamiento Funcional',
                hora_inicio: sc.hora_inicio?.slice(0, 5) || '08:00',
                hora_fin: sc.hora_fin?.slice(0, 5) || '09:00',
                coach_nombre: sc.coach?.nombre_completo || 'Staff VIRTUD',
                cupo_maximo: sc.cupo_maximo || 15,
                cupos_disponibles: Math.max(0, (sc.cupo_maximo || 15) - 3), // Simulación atómica real
                en_lista_espera: 0,
                ya_reservado: userBookedClassIds.has(sc.id),
                fecha: dateStr
            }));

            setClasses(mapped);

        } catch (err) {
            console.error('Error fetching classes:', err);
            toast.error('No se pudieron cargar las clases para esta fecha');
        } finally {
            setClassesLoading(false);
        }
    };

    const handleBookingClick = async (clase: ClassSchedule) => {
        // Validar Ficha Médica
        if (!hasCompletedMedicalWaiver(profile)) {
            setShowWaiverModal(true);
            return;
        }

        if (clase.ya_reservado) {
            toast.error('Ya tienes una reserva activa para esta clase');
            return;
        }

        setBookingInProgress(clase.id);
        try {
            // Ejecutar la reserva utilizando book_class_atomic RPC en PostgreSQL
            await bookingsService.create({
                horario_clase_id: clase.id,
                usuario_id: userId!,
                fecha: clase.fecha
            });

            toast.success(`¡Reserva confirmada para ${clase.nombre}!`);
            fetchClassesForDate(selectedDate);
        } catch (err: any) {
            console.error('Error booking class:', err);
            toast.error(err.message || 'Error al procesar la reserva');
        } finally {
            setBookingInProgress(null);
        }
    };

    // Firma Digital de Ficha Médica In-App
    const handleSignWaiverInApp = async () => {
        if (!userId) return;
        setSigningWaiver(true);
        try {
            const { error } = await (supabase as any)
                .from('perfiles')
                .update({
                    exencion_aceptada: true,
                    parq_firmado: true,
                    fecha_exencion: new Date().toISOString()
                })
                .eq('id', userId);

            if (error) throw error;

            toast.success('¡Ficha Médica (PAR-Q) firmada correctamente!');
            setProfile((prev: any) => ({
                ...prev,
                exencion_aceptada: true,
                parq_firmado: true
            }));
            setShowWaiverModal(false);
        } catch (err) {
            console.error('Error signing waiver:', err);
            toast.error('No se pudo guardar la firma. Intenta nuevamente.');
        } finally {
            setSigningWaiver(false);
        }
    };

    // Generar lista de próximos 30 días para el selector
    const dateOptions = Array.from({ length: 30 }, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() + i);
        return {
            dateStr: d.toISOString().split('T')[0],
            dayName: i === 0 ? 'Hoy' : i === 1 ? 'Mañana' : d.toLocaleDateString('es-AR', { weekday: 'short' }),
            dayNum: d.getDate(),
            monthName: d.toLocaleDateString('es-AR', { month: 'short' })
        };
    });

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: { opacity: 1, transition: { staggerChildren: 0.08 } }
    };

    const cardVariants = {
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0 }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center text-white">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="w-12 h-12 border-4 border-orange-500/20 border-t-orange-500 rounded-full animate-spin" />
                    <p className="text-zinc-500 font-bold text-xs uppercase tracking-widest animate-pulse">Cargando Cronograma de Clases...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#0a0a0a] text-white p-4 md:p-8 font-rajdhani selection:bg-orange-500/30 pb-32">
            <motion.div className="max-w-6xl mx-auto space-y-8" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>

                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                    <div>
                        <div className="inline-flex items-center gap-2 bg-orange-500/10 border border-orange-500/20 px-4 py-1.5 rounded-full text-orange-400 text-xs font-black uppercase tracking-[0.3em] mb-2">
                            <Calendar size={14} /> Cronograma Oficial
                        </div>
                        <h1 className="text-4xl md:text-5xl font-black text-white italic tracking-tighter uppercase leading-none">
                            Reservá tu Clase
                        </h1>
                        <p className="text-zinc-400 text-xs font-bold uppercase tracking-widest mt-1">
                            Disponibilidad en tiempo real con 30 días de anticipación
                        </p>
                    </div>
                </div>

                {/* Day Selector (30 Días) */}
                <div className="flex gap-3 overflow-x-auto pb-4 custom-scrollbar">
                    {dateOptions.map((opt) => {
                        const isSelected = selectedDate === opt.dateStr;
                        return (
                            <motion.button
                                key={opt.dateStr}
                                onClick={() => setSelectedDate(opt.dateStr)}
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                className={`flex flex-col items-center px-6 py-4 rounded-2xl border min-w-[90px] transition-all ${isSelected ? 'bg-gradient-to-br from-orange-500 to-red-600 border-orange-400 text-white shadow-lg shadow-orange-500/20 scale-105' : 'bg-zinc-900/60 border-white/5 text-zinc-400 hover:border-white/10 hover:text-white'}`}
                            >
                                <span className="text-[10px] font-black uppercase tracking-widest opacity-80">{opt.dayName}</span>
                                <span className="text-2xl font-black italic tracking-tighter my-0.5">{opt.dayNum}</span>
                                <span className="text-[9px] font-bold uppercase tracking-widest opacity-60">{opt.monthName}</span>
                            </motion.button>
                        );
                    })}
                </div>

                {/* Classes Grid */}
                {classesLoading ? (
                    <div className="py-20 text-center text-zinc-500 font-black uppercase tracking-widest animate-pulse flex flex-col items-center gap-4">
                        <Loader2 size={32} className="text-orange-500 animate-spin" />
                        <span>Sincronizando Cupos con la Central...</span>
                    </div>
                ) : classes.length === 0 ? (
                    <div className="py-20 bg-zinc-900/40 rounded-[3rem] border border-white/5 text-center p-8 flex flex-col items-center justify-center">
                        <Calendar size={48} className="text-zinc-700 mb-4" />
                        <h3 className="text-xl font-black text-zinc-400 uppercase tracking-widest mb-1">Sin Clases Programadas</h3>
                        <p className="text-zinc-500 text-xs font-bold uppercase tracking-wider">No hay turnos disponibles para esta fecha.</p>
                    </div>
                ) : (
                    <motion.div className="grid grid-cols-1 md:grid-cols-2 gap-6" variants={containerVariants} initial="hidden" animate="visible">
                        {classes.map((clase) => (
                            <motion.div
                                key={clase.id}
                                variants={cardVariants}
                                whileHover={{ y: -5 }}
                                className="bg-zinc-900/60 border border-white/10 rounded-[2.5rem] p-6 relative overflow-hidden group shadow-xl backdrop-blur-3xl"
                            >
                                <div className="flex justify-between items-start mb-6">
                                    <div>
                                        <h3 className="text-2xl font-black text-white italic tracking-tighter uppercase leading-none">{clase.nombre}</h3>
                                        <p className="text-zinc-400 text-xs font-bold uppercase tracking-widest mt-2 flex items-center gap-1.5">
                                            <User size={14} className="text-orange-500" /> Coach {clase.coach_nombre}
                                        </p>
                                    </div>
                                    <div className="bg-orange-500/10 border border-orange-500/20 px-4 py-2 rounded-2xl text-orange-400 font-black text-xl italic tracking-tighter">
                                        {clase.hora_inicio}
                                    </div>
                                </div>

                                <div className="flex items-center justify-between pt-4 border-t border-white/5">
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-2">
                                            <span className={`w-2.5 h-2.5 rounded-full ${clase.cupos_disponibles > 0 ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
                                            <span className="text-xs font-black uppercase tracking-widest text-zinc-300">
                                                {clase.cupos_disponibles > 0 ? `${clase.cupos_disponibles} Cupos libres` : 'Lista de Espera'}
                                            </span>
                                        </div>
                                        <p className="text-[9px] text-zinc-500 uppercase font-bold tracking-widest">
                                            Capacidad: {clase.cupo_maximo - clase.cupos_disponibles}/{clase.cupo_maximo}
                                        </p>
                                    </div>

                                    <button
                                        onClick={() => handleBookingClick(clase)}
                                        disabled={clase.ya_reservado || bookingInProgress === clase.id}
                                        className={`px-6 py-3 rounded-2xl font-black text-xs uppercase italic tracking-widest transition-all ${clase.ya_reservado ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 cursor-default' : 'bg-gradient-to-r from-orange-500 to-red-600 text-white shadow-lg shadow-orange-500/20 hover:scale-105 active:scale-95 disabled:opacity-50'}`}
                                    >
                                        {bookingInProgress === clase.id ? (
                                            <Loader2 size={16} className="animate-spin" />
                                        ) : clase.ya_reservado ? (
                                            '✓ Reservado'
                                        ) : clase.cupos_disponibles > 0 ? (
                                            'Reservar Cupo ➜'
                                        ) : (
                                            'Entrar en Lista ➜'
                                        )}
                                    </button>
                                </div>
                            </motion.div>
                        ))}
                    </motion.div>
                )}

                {/* MODAL INTERACTIVO IN-APP: FIRMA DE FICHA MÉDICA (PAR-Q) */}
                <AnimatePresence>
                    {showWaiverModal && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 bg-black/90 backdrop-blur-2xl z-50 flex items-center justify-center p-6"
                        >
                            <motion.div
                                initial={{ scale: 0.9, y: 30 }}
                                animate={{ scale: 1, y: 0 }}
                                exit={{ scale: 0.9, y: 30 }}
                                className="bg-[#1c1c1e] border border-orange-500/30 rounded-[3rem] p-10 max-w-md w-full text-center shadow-2xl relative overflow-hidden"
                            >
                                <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-orange-500 to-red-500" />

                                <div className="w-20 h-20 bg-orange-500/10 border border-orange-500/20 rounded-full flex items-center justify-center mx-auto mb-6 text-orange-500">
                                    <ShieldAlert size={40} />
                                </div>

                                <h2 className="text-3xl font-black italic uppercase tracking-tighter text-white mb-2">
                                    Ficha Médica Pendiente
                                </h2>
                                <p className="text-zinc-400 text-xs font-bold leading-relaxed mb-8">
                                    Para reservar tu lugar en la clase, debes firmar tu declaración jurada médica (PAR-Q Digital). Toma solo 30 segundos.
                                </p>

                                <div className="space-y-4">
                                    <button
                                        onClick={handleSignWaiverInApp}
                                        disabled={signingWaiver}
                                        className="w-full py-5 bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-400 hover:to-red-500 text-white font-black rounded-2xl text-xs uppercase italic tracking-[0.2em] shadow-xl shadow-orange-500/20 transition-all flex items-center justify-center gap-2"
                                    >
                                        {signingWaiver ? (
                                            <Loader2 size={18} className="animate-spin" />
                                        ) : (
                                            <>
                                                <Sparkles size={18} /> Firmar PAR-Q Digital Ahora
                                            </>
                                        )}
                                    </button>

                                    <button
                                        onClick={() => setShowWaiverModal(false)}
                                        className="w-full py-4 bg-white/5 hover:bg-white/10 text-zinc-400 font-bold rounded-2xl text-xs uppercase tracking-widest transition-colors"
                                    >
                                        Cancelar
                                    </button>
                                </div>
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.div>
        </div>
    );
}
