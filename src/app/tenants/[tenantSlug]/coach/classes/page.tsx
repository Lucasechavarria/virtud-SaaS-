'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { Calendar, Users, Activity, ShieldCheck, Clock, Award, ChevronLeft, ChevronRight } from 'lucide-react';

interface Student {
    reserva_id: string;
    id: string;
    nombre_completo: string;
    email: string;
    url_avatar?: string;
    estado: 'reservada' | 'asistida' | 'no_show' | 'cancelada';
}

interface GymClass {
    id: string;
    dia_de_la_semana: number;
    hora_inicio: string;
    hora_fin: string;
    esta_activa: boolean;
    capacidad_maxima: number;
    capacidad_actual: number;
    notas_entrenador?: string;
    actividad: {
        id: string;
        nombre: string;
        color: string;
        duracion_minutos: number;
        url_imagen?: string;
    };
    students: Student[];
    waitlist: any[];
}

export default function CoachClassesPage({ params }: { params: { tenantSlug: string } }) {
    const [classes, setClasses] = useState<GymClass[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<'all' | 'upcoming' | 'completed'>('all');
    const [selectedClass, setSelectedClass] = useState<GymClass | null>(null);
    const [modalType, setModalType] = useState<'list' | 'attendance' | 'history' | null>(null);
    const [attendance, setAttendance] = useState<Record<string, 'asistida' | 'no_show'>>({});
    const [savingAttendance, setSavingAttendance] = useState(false);
    
    // Control de fecha de consulta (por defecto hoy)
    const [selectedDate, setSelectedDate] = useState(() => {
        const d = new Date();
        return d.toISOString().split('T')[0];
    });

    const fetchClasses = React.useCallback(async () => {
        try {
            setLoading(true);
            const res = await fetch(`/api/coach/classes?gymId=${params.tenantSlug}&date=${selectedDate}`);
            if (!res.ok) throw new Error('Error al cargar clases');
            const data = await res.json();
            if (data.success) {
                setClasses(data.classes || []);
            }
        } catch (error) {
            console.error('Error fetching classes:', error);
            toast.error('Error al cargar las clases programadas');
        } finally {
            setLoading(false);
        }
    }, [params.tenantSlug, selectedDate]);

    useEffect(() => {
        fetchClasses();
    }, [fetchClasses]);

    const playSuccessSound = () => {
        try {
            const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            
            osc.type = 'sine';
            osc.frequency.setValueAtTime(880, ctx.currentTime); // 880 Hz
            
            gain.gain.setValueAtTime(0.1, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.15); // 150ms
            
            osc.connect(gain);
            gain.connect(ctx.destination);
            
            osc.start();
            osc.stop(ctx.currentTime + 0.15);
        } catch (e) {
            console.error('Web Audio API no soportada:', e);
        }
    };

    const openModal = (classData: GymClass, type: 'list' | 'attendance' | 'history') => {
        setSelectedClass(classData);
        setModalType(type);
        if (type === 'attendance') {
            const initial: Record<string, 'asistida' | 'no_show'> = {};
            classData.students.forEach((s) => {
                initial[s.reserva_id] = s.estado === 'asistida' ? 'asistida' : 'no_show';
            });
            setAttendance(initial);
        }
    };

    const closeModal = () => {
        setSelectedClass(null);
        setModalType(null);
        setAttendance({});
    };

    const handleSaveAttendance = async () => {
        if (!selectedClass) return;
        setSavingAttendance(true);
        const toastId = toast.loading('Guardando asistencia...');

        try {
            const attendancesPayload = Object.entries(attendance).map(([reserva_id, estado]) => ({
                reserva_id,
                estado
            }));

            const res = await fetch('/api/coach/attendance', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ attendances: attendancesPayload })
            });

            if (!res.ok) {
                const errData = await res.json();
                throw new Error(errData.error || 'Error al guardar la asistencia');
            }

            toast.success('¡Asistencia guardada y gamificación activa!', { id: toastId });
            playSuccessSound();
            closeModal();
            fetchClasses(); // Recargar datos
        } catch (error: any) {
            console.error(error);
            toast.error(error.message || 'Error al guardar la asistencia', { id: toastId });
        } finally {
            setSavingAttendance(false);
        }
    };

    // Filtrar clases en el cliente por estado
    // Para simplificar, clasificamos 'upcoming' si es hora de inicio futura en el mismo día,
    // o 'completed' si ya pasó de la hora fin.
    const getFilteredClasses = () => {
        const now = new Date();
        const currentTimeStr = now.toTimeString().split(' ')[0]; // HH:MM:SS

        return classes.filter(cls => {
            const isToday = selectedDate === now.toISOString().split('T')[0];
            let status: 'upcoming' | 'completed' = 'upcoming';

            if (isToday) {
                if (currentTimeStr > cls.hora_fin) {
                    status = 'completed';
                }
            } else if (selectedDate < now.toISOString().split('T')[0]) {
                status = 'completed';
            }

            if (filter === 'all') return true;
            return filter === status;
        });
    };

    const changeDate = (days: number) => {
        const current = new Date(selectedDate);
        current.setDate(current.getDate() + days);
        setSelectedDate(current.toISOString().split('T')[0]);
    };

    // Stats dinámicos basados en la consulta
    const totalReservations = classes.reduce((acc, c) => acc + c.capacidad_actual, 0);
    const totalCapacity = classes.reduce((acc, c) => acc + c.capacidad_maxima, 0);
    const averageOccupancy = totalCapacity > 0 ? Math.round((totalReservations / totalCapacity) * 100) : 0;

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-8 relative z-10 p-4 md:p-8 pb-20"
        >
            {/* Header */}
            <div className="flex flex-col xl:flex-row justify-between items-start xl:items-end gap-6">
                <div>
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-2 h-8 bg-orange-500 rounded-full" />
                        <p className="text-[10px] font-black text-orange-500 uppercase tracking-[0.3em]">Scheduler System</p>
                    </div>
                    <h1 className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white to-orange-400 italic uppercase tracking-tighter leading-none mb-2">
                        📅 Gestión de Clases
                    </h1>
                    <p className="text-gray-400 text-sm font-bold uppercase tracking-widest opacity-60">Control operativo de agendas y aforo diario</p>
                </div>

                {/* Date Navigator */}
                <div className="flex items-center gap-3 bg-zinc-900/60 border border-white/5 p-2 rounded-2xl backdrop-blur-xl">
                    <button
                        onClick={() => changeDate(-1)}
                        className="w-10 h-10 rounded-xl bg-white/5 border border-white/5 flex items-center justify-center text-gray-400 hover:text-white hover:bg-orange-500 transition-all"
                    >
                        <ChevronLeft className="w-5 h-5" />
                    </button>
                    <div className="px-4 text-center min-w-[140px]">
                        <p className="text-[9px] font-black text-orange-500 uppercase tracking-widest mb-0.5">Fecha Operación</p>
                        <p className="text-sm font-bold text-white uppercase tracking-tight">
                            {new Date(selectedDate + 'T00:00:00').toLocaleDateString([], { weekday: 'short', day: 'numeric', month: 'short' })}
                        </p>
                    </div>
                    <button
                        onClick={() => changeDate(1)}
                        className="w-10 h-10 rounded-xl bg-white/5 border border-white/5 flex items-center justify-center text-gray-400 hover:text-white hover:bg-orange-500 transition-all"
                    >
                        <ChevronRight className="w-5 h-5" />
                    </button>
                </div>

                {/* View Mode Filters */}
                <div className="flex p-1 bg-white/5 rounded-2xl border border-white/5">
                    {(['all', 'upcoming', 'completed'] as const).map((f) => (
                        <button
                            key={f}
                            onClick={() => setFilter(f)}
                            className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all duration-500 ${filter === f
                                ? 'bg-orange-500 text-white shadow-xl shadow-orange-500/20'
                                : 'text-gray-500 hover:text-white'
                                }`}
                        >
                            {f === 'all' ? 'Ver Todas' : f === 'upcoming' ? 'Próximas' : 'Completadas'}
                        </button>
                    ))}
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {[
                    { label: 'Clases Dictadas', value: classes.length.toString(), icon: '📅', color: 'text-orange-500' },
                    { label: 'Ocupación Media', value: `${averageOccupancy}%`, icon: '📊', color: 'text-orange-500' },
                    { label: 'Total Reservas', value: totalReservations.toString(), icon: '👥', color: 'text-orange-500' },
                    { label: 'Cupos Totales', value: totalCapacity.toString(), icon: '🛡️', color: 'text-orange-500' },
                ].map((stat, i) => (
                    <motion.div
                        key={i}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: i * 0.05 }}
                        className="bg-zinc-950/40 backdrop-blur-xl border border-white/5 rounded-[2rem] p-6 flex flex-col justify-between"
                    >
                        <div className="flex items-center justify-between mb-4">
                            <span className="text-xl">{stat.icon}</span>
                            <span className={`text-2xl font-black italic ${stat.color}`}>{stat.value}</span>
                        </div>
                        <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">{stat.label}</p>
                    </motion.div>
                ))}
            </div>

            {/* Main Class List */}
            <div className="bg-zinc-950/40 backdrop-blur-xl border border-white/5 rounded-[2.5rem] p-8 shadow-2xl">
                <div className="space-y-4">
                    {loading ? (
                        // Shimmer Skeletons for Sprint 2.1
                        Array(3).fill(0).map((_, i) => (
                            <div key={i} className="h-24 bg-white/5 rounded-2xl border border-white/5 animate-pulse flex items-center justify-between p-6">
                                <div className="flex items-center gap-6 w-1/2">
                                    <div className="w-16 h-12 bg-white/5 rounded-xl" />
                                    <div className="space-y-2 w-3/4">
                                        <div className="h-4 bg-white/5 rounded w-1/2" />
                                        <div className="h-3 bg-white/5 rounded w-1/3" />
                                    </div>
                                </div>
                                <div className="w-24 h-10 bg-white/5 rounded-xl" />
                            </div>
                        ))
                    ) : getFilteredClasses().length === 0 ? (
                        <div className="text-center py-20 opacity-30 border-2 border-dashed border-white/5 rounded-[2rem] flex flex-col items-center justify-center">
                            <span className="text-4xl mb-4">📭</span>
                            <p className="text-[10px] font-black uppercase tracking-widest text-white">No hay clases programadas para esta fecha</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {getFilteredClasses().map((cls, i) => {
                                const isFull = cls.capacidad_actual >= cls.capacidad_maxima;
                                const now = new Date();
                                const isCompleted = (selectedDate < now.toISOString().split('T')[0]) || 
                                    (selectedDate === now.toISOString().split('T')[0] && now.toTimeString().split(' ')[0] > cls.hora_fin);

                                return (
                                    <motion.div
                                        key={cls.id}
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: i * 0.05 }}
                                        className="flex flex-col lg:flex-row lg:items-center justify-between p-6 bg-white/5 rounded-[2rem] border border-white/5 hover:border-orange-500/20 hover:bg-white/10 transition-all gap-6 group"
                                    >
                                        <div className="flex items-center gap-6 flex-1">
                                            <div className="text-center min-w-[90px] bg-black/40 p-3 rounded-xl border border-white/5">
                                                <div className="flex items-center justify-center gap-1 text-[10px] font-black text-orange-500 uppercase tracking-widest mb-0.5">
                                                    <Clock size={10} />
                                                    <span>Inicio</span>
                                                </div>
                                                <p className="text-xl font-black text-white italic tracking-tighter">{cls.hora_inicio.slice(0, 5)}</p>
                                            </div>
                                            
                                            <div className="border-l border-white/10 pl-6 flex-1">
                                                <h3 className="font-black text-white text-2xl uppercase italic tracking-tighter group-hover:text-orange-500 transition-colors">
                                                    {cls.actividad?.nombre || 'Clase de Entrenamiento'}
                                                </h3>
                                                <div className="flex items-center gap-4 mt-2">
                                                    <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest flex items-center gap-1.5">
                                                        <Users size={12} className="text-orange-500" />
                                                        {cls.capacidad_actual}/{cls.capacidad_maxima} Atletas
                                                    </span>
                                                    {isFull && (
                                                        <span className="text-[9px] bg-red-500/20 text-red-400 border border-red-500/30 px-3 py-1 rounded-full font-black tracking-widest uppercase">
                                                            Lleno
                                                        </span>
                                                    )}
                                                    {isCompleted ? (
                                                        <span className="text-[9px] bg-green-500/20 text-green-400 border border-green-500/30 px-3 py-1 rounded-full font-black tracking-widest uppercase">
                                                            ✓ Completada
                                                        </span>
                                                    ) : (
                                                        <span className="text-[9px] bg-blue-500/20 text-blue-400 border border-blue-500/30 px-3 py-1 rounded-full font-black tracking-widest uppercase">
                                                            Programada
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex gap-3 flex-wrap lg:justify-end">
                                            <button
                                                onClick={() => openModal(cls, 'list')}
                                                className="px-5 py-3 bg-zinc-900 border border-white/5 hover:border-orange-500/50 text-gray-400 hover:text-white rounded-xl transition-all font-black text-[10px] uppercase tracking-widest"
                                            >
                                                Lista Reservas
                                            </button>
                                            
                                            {!isCompleted ? (
                                                <button
                                                    onClick={() => openModal(cls, 'attendance')}
                                                    className="px-5 py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-xl transition-all font-black text-[10px] uppercase tracking-widest shadow-lg shadow-orange-500/20"
                                                >
                                                    ✓ Pasar Lista
                                                </button>
                                            ) : (
                                                <button
                                                    onClick={() => openModal(cls, 'history')}
                                                    className="px-5 py-3 bg-[#1c1c1e] border border-white/10 hover:border-orange-500/50 text-gray-300 rounded-xl transition-all font-black text-[10px] uppercase tracking-widest"
                                                >
                                                    Ver Asistencia
                                                </button>
                                            )}
                                        </div>
                                    </motion.div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>

            {/* Modals */}
            <AnimatePresence>
                {modalType && selectedClass && (
                    <div
                        className="fixed inset-0 bg-black/90 backdrop-blur-md z-50 flex items-center justify-center p-4"
                        onClick={closeModal}
                    >
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.95, opacity: 0, y: 20 }}
                            onClick={(e) => e.stopPropagation()}
                            className="bg-[#1c1c1e] rounded-[3rem] border border-white/10 max-w-xl w-full max-h-[85vh] overflow-y-auto relative shadow-[0_0_80px_rgba(249,115,22,0.1)]"
                        >
                            <button
                                onClick={closeModal}
                                className="absolute top-6 right-6 w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white hover:bg-orange-500 transition-colors z-50 text-xl font-bold"
                            >
                                ×
                            </button>

                            {modalType === 'list' && (
                                <StudentListModal classData={selectedClass} />
                            )}
                            {modalType === 'attendance' && (
                                <AttendanceModal
                                    classData={selectedClass}
                                    attendance={attendance}
                                    setAttendance={setAttendance}
                                    onSave={handleSaveAttendance}
                                    saving={savingAttendance}
                                />
                            )}
                            {modalType === 'history' && (
                                <AttendanceHistoryModal classData={selectedClass} />
                            )}
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </motion.div>
    );
}

// Student List Modal
function StudentListModal({ classData }: { classData: GymClass }) {
    return (
        <div className="p-8 md:p-10 space-y-6">
            <div>
                <p className="text-[10px] font-black text-orange-500 uppercase tracking-[0.3em] mb-1">Operational Audit</p>
                <h2 className="text-3xl font-black text-white italic uppercase tracking-tighter leading-none mb-1">Lista de Atletas</h2>
                <p className="text-xs text-gray-500 font-bold uppercase tracking-widest">{classData.actividad?.nombre} • {classData.hora_inicio.slice(0, 5)}hs</p>
            </div>

            <div className="space-y-3">
                {classData.students.length > 0 ? (
                    classData.students.map((student) => (
                        <div key={student.id} className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5 hover:border-orange-500/20 transition-all">
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-full bg-zinc-900 border border-orange-500/30 overflow-hidden flex items-center justify-center text-white font-black text-sm italic">
                                    {student.nombre_completo.charAt(0)}
                                </div>
                                <div>
                                    <p className="text-sm font-black text-white uppercase tracking-tight leading-none mb-1">{student.nombre_completo}</p>
                                    <p className="text-[10px] text-gray-500 font-bold lowercase">{student.email}</p>
                                </div>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="py-12 text-center opacity-30 border border-dashed border-white/10 rounded-2xl">
                        <Users className="w-10 h-10 mx-auto mb-3" />
                        <p className="text-[10px] font-black uppercase tracking-widest">Sin atletas reservados aún</p>
                    </div>
                )}
            </div>
        </div>
    );
}

// Attendance Modal
function AttendanceModal({ classData, attendance, setAttendance, onSave, saving }: any) {
    return (
        <div className="p-8 md:p-10 space-y-6">
            <div>
                <p className="text-[10px] font-black text-orange-500 uppercase tracking-[0.3em] mb-1">Command Session</p>
                <h2 className="text-3xl font-black text-white italic uppercase tracking-tighter leading-none mb-1">Pasar Lista</h2>
                <p className="text-xs text-gray-500 font-bold uppercase tracking-widest">{classData.actividad?.nombre} • {classData.hora_inicio.slice(0, 5)}hs</p>
            </div>

            <div className="space-y-4">
                {classData.students.length > 0 ? (
                    <>
                        <div className="space-y-3 max-h-[40vh] overflow-y-auto pr-1 custom-scrollbar">
                            {classData.students.map((student: Student) => {
                                const isPresent = attendance[student.reserva_id] === 'asistida';
                                return (
                                    <div key={student.id} className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5 hover:border-orange-500/20 transition-all gap-4">
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-full bg-zinc-900 border border-orange-500/30 overflow-hidden flex items-center justify-center text-white font-black text-sm italic">
                                                {student.nombre_completo.charAt(0)}
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-sm font-black text-white uppercase tracking-tight leading-none mb-1 truncate">{student.nombre_completo}</p>
                                                <p className="text-[9px] text-gray-500 font-bold lowercase truncate">{student.email}</p>
                                            </div>
                                        </div>
                                        
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => setAttendance({ ...attendance, [student.reserva_id]: 'asistida' })}
                                                className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${isPresent
                                                    ? 'bg-green-500 text-white'
                                                    : 'bg-white/5 text-gray-400 hover:bg-white/10'
                                                    }`}
                                            >
                                                Presente
                                            </button>
                                            <button
                                                onClick={() => setAttendance({ ...attendance, [student.reserva_id]: 'no_show' })}
                                                className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${!isPresent
                                                    ? 'bg-red-500 text-white'
                                                    : 'bg-white/5 text-gray-400 hover:bg-white/10'
                                                    }`}
                                            >
                                                Ausente
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                        
                        <button
                            onClick={onSave}
                            disabled={saving}
                            className="w-full mt-6 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-black uppercase italic tracking-widest py-4 rounded-2xl transition-all shadow-xl shadow-orange-500/20 flex items-center justify-center gap-3"
                        >
                            {saving ? 'Procesando comando...' : 'Confirmar y Guardar Asistencia'}
                        </button>
                    </>
                ) : (
                    <div className="py-12 text-center opacity-30 border border-dashed border-white/10 rounded-2xl">
                        <Users className="w-10 h-10 mx-auto mb-3" />
                        <p className="text-[10px] font-black uppercase tracking-widest">Sin atletas registrados para pasar lista</p>
                    </div>
                )}
            </div>
        </div>
    );
}

// Attendance History Modal
function AttendanceHistoryModal({ classData }: { classData: GymClass }) {
    return (
        <div className="p-8 md:p-10 space-y-6">
            <div>
                <p className="text-[10px] font-black text-orange-500 uppercase tracking-[0.3em] mb-1">Operational History</p>
                <h2 className="text-3xl font-black text-white italic uppercase tracking-tighter leading-none mb-1">Asistencia Guardada</h2>
                <p className="text-xs text-gray-500 font-bold uppercase tracking-widest">{classData.actividad?.nombre} • {classData.hora_inicio.slice(0, 5)}hs</p>
            </div>

            <div className="space-y-3">
                {classData.students.length > 0 ? (
                    classData.students.map((student) => {
                        const wasPresent = student.estado === 'asistida';
                        return (
                            <div key={student.id} className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-full bg-zinc-900 border border-orange-500/30 overflow-hidden flex items-center justify-center text-white font-black text-sm italic">
                                        {student.nombre_completo.charAt(0)}
                                    </div>
                                    <div>
                                        <p className="text-sm font-black text-white uppercase tracking-tight leading-none mb-1">{student.nombre_completo}</p>
                                        <p className="text-[10px] text-gray-500 font-bold lowercase">{student.email}</p>
                                    </div>
                                </div>
                                <span className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border ${wasPresent
                                    ? 'bg-green-500/20 text-green-400 border-green-500/20'
                                    : 'bg-red-500/20 text-red-400 border-red-500/20'
                                    }`}>
                                    {wasPresent ? '✓ Presente' : '✗ Ausente'}
                                </span>
                            </div>
                        );
                    })
                ) : (
                    <div className="py-12 text-center opacity-30 border border-dashed border-white/10 rounded-2xl">
                        <Users className="w-10 h-10 mx-auto mb-3" />
                        <p className="text-[10px] font-black uppercase tracking-widest">Sin registro de asistencia</p>
                    </div>
                )}
            </div>
        </div>
    );
}
