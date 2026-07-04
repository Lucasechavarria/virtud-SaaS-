'use client';

import React, { useState, useEffect, ReactNode } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Search, Filter, UserPlus, MoreVertical,
    ChevronRight, Activity, Calendar, Target,
    Mail, Phone, MapPin, Loader2, X, Zap, Users,
    AlertTriangle, CheckCircle2, Moon, Sparkles, Video, Film
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'react-hot-toast';
import { StudentAction } from './StudentAction';
import { SupabaseUserProfile } from '@/types/user';
const supabase = createClient();
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

interface Student {
    id: string;
    [key: string]: any;
}

export default function StudentsGrid() {
    const { tenantSlug } = useParams() as { tenantSlug: string };
    const [searchTerm, setSearchTerm] = useState('');
    const [filter, setFilter] = useState<'all' | 'alert' | 'active'>('all');
    const [students, setStudents] = useState<Student[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedStudent, setSelectedStudent] = useState<string | null>(null);
    const [modalOpen, setModalOpen] = useState<'routine' | 'chat' | 'progress' | null>(null);

    useEffect(() => {
        const fetchStudents = async () => {
            try {
                setLoading(true);
                // Usar la API optimizada que preparamos en el backend
                const response = await fetch('/api/coach/students');
                const data = await response.json();

                if (!data.success) throw new Error(data.error || 'Error al cargar alumnos');

                if (data.students) {
                    // Map to component structure using real data from the API
                    const formattedStudents = data.students.map((p: any) => ({
                        id: p.id,
                        nombre: p.nombre_completo || 'Sin Nombre',
                        email: p.email,
                        experiencia: p.active_goal?.objetivo_principal
                            ? `Meta: ${p.active_goal.objetivo_principal}`
                            : 'Sin objetivo activo',
                        status: p.active_routine ? 'active' : 'alert',
                        lastAttendance: 'Consultar', // Pendiente de implementar en DB
                        nextClass: 'Pendiente',      // Pendiente de implementar en DB
                        edad: p.informacion_medica?.edad || 0,
                        active_goal: p.active_goal,
                        active_routine: p.active_routine
                    }));
                    setStudents(formattedStudents as Student[]);
                }
            } catch (error) {
                console.error('Error fetching students:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchStudents();
    }, []);

    const filteredStudents = students.filter(student => {
        const nameMatch = student.nombre?.toLowerCase().includes(searchTerm.toLowerCase());
        const emailMatch = student.email?.toLowerCase().includes(searchTerm.toLowerCase());
        return (nameMatch || emailMatch) && (filter === 'all' || student.status === filter);
    });

    if (loading) return <div className="text-white p-4">Cargando alumnos...</div>;

    return (
        <div className="space-y-6">
            {/* Header & Filters */}
            <div className="flex flex-col md:flex-row gap-6 justify-between items-center bg-zinc-950/40 backdrop-blur-2xl p-6 rounded-[2.5rem] border border-white/5 sticky top-4 z-40 shadow-2xl">
                <div className="relative w-full md:w-96 group">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <span className="text-orange-500 opacity-50 group-focus-within:opacity-100 transition-opacity">🔍</span>
                    </div>
                    <input
                        type="text"
                        placeholder="ID o Nombre de Atleta..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 text-white rounded-2xl pl-12 pr-4 py-4 focus:outline-none focus:ring-1 focus:ring-orange-500/50 focus:border-orange-500/50 transition-all text-xs font-bold uppercase tracking-widest placeholder:text-gray-600"
                    />
                </div>

                <div className="flex p-1 bg-white/5 rounded-2xl border border-white/5">
                    {(['all', 'active', 'alert'] as const).map((f) => (
                        <button
                            key={f}
                            onClick={() => setFilter(f)}
                            className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all duration-500 ${filter === f
                                ? 'bg-orange-500 text-white shadow-xl shadow-orange-500/20'
                                : 'text-gray-500 hover:text-white'
                                }`}
                        >
                            {f === 'all' ? 'Ver Todos' : f === 'alert' ? 'Alertas' : 'En Campo'}
                        </button>
                    ))}
                </div>
            </div>

            {/* Grid */}
            <motion.div
                layout
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
            >
                <AnimatePresence>
                    {filteredStudents.map((student) => (
                        <motion.div
                            layout
                            key={student.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            whileHover={{ y: -5 }}
                            className="group relative bg-zinc-950/40 backdrop-blur-2xl rounded-[3rem] border border-white/5 overflow-hidden hover:border-orange-500/30 transition-all duration-500 shadow-2xl"
                        >
                            <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/5 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-orange-500/10 transition-colors" />

                            <div className="p-8 relative z-10">
                                <div className="flex justify-between items-start mb-6">
                                    <div className="flex items-center gap-5">
                                        <div className="w-16 h-16 rounded-full bg-zinc-900 border-2 border-orange-500/20 overflow-hidden relative group-hover:border-orange-500 transition-colors duration-500">
                                            <div className="w-full h-full flex items-center justify-center text-2xl font-black text-white italic">
                                                {student.nombre.charAt(0)}
                                            </div>
                                        </div>
                                        <div>
                                            <h3 className="font-black text-xl text-white italic uppercase tracking-tighter group-hover:text-orange-500 transition-colors">
                                                {student.nombre}
                                            </h3>
                                            <div className="flex items-center gap-2 mt-1">
                                                <p className="text-[10px] font-black text-orange-500 uppercase tracking-widest opacity-60">Atleta Nivel Elite</p>
                                                <StudentFatigueBadge studentId={student.id} />
                                            </div>
                                        </div>
                                    </div>
                                    {student.status === 'alert' && (
                                        <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse border-4 border-red-500/20" title="Atención requerida" />
                                    )}
                                </div>

                                <div className="space-y-3 mb-8">
                                    <div className="flex justify-between items-center p-3 rounded-2xl bg-white/5 border border-white/5">
                                        <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Objetivo</span>
                                        <span className="text-xs font-bold text-white uppercase italic">{student.experiencia}</span>
                                    </div>
                                    <div className="flex justify-between items-center p-3 rounded-2xl bg-white/5 border border-white/5">
                                        <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Ult. Op</span>
                                        <span className="text-xs font-bold text-white uppercase italic">Ayer 18:45</span>
                                    </div>
                                </div>

                                <div className="grid grid-cols-3 gap-2">
                                    <StudentAction
                                        icon={<Activity className="w-4 h-4" />}
                                        label="Stats"
                                        onClick={() => { setSelectedStudent(student.id); setModalOpen('progress'); }}
                                        variant="primary"
                                    />
                                    <button
                                        onClick={() => { setSelectedStudent(student.id); setModalOpen('routine'); }}
                                        className="flex flex-col items-center justify-center gap-2 p-4 rounded-[1.5rem] bg-white/5 border border-white/5 hover:border-orange-500/30 transition-all hover:bg-orange-500/5 group/btn"
                                    >
                                        <Zap className="w-4 h-4 text-gray-400 group-hover/btn:text-orange-500" />
                                        <span className="text-[8px] font-black text-gray-500 uppercase tracking-widest group-hover/btn:text-white">Op</span>
                                    </button>
                                    <Link
                                        href={`/tenants/${tenantSlug}/coach/messages?athlete=${student.id}`}
                                        className="flex flex-col items-center justify-center gap-2 p-4 rounded-[1.5rem] bg-white/5 border border-white/5 hover:border-orange-500/30 transition-all hover:bg-orange-500/5 group/btn"
                                    >
                                        <Mail className="w-4 h-4 text-gray-400 group-hover/btn:text-orange-500" />
                                        <span className="text-[8px] font-black text-gray-500 uppercase tracking-widest group-hover/btn:text-white">Link</span>
                                    </Link>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </AnimatePresence>
            </motion.div>

            {/* Empty State */}
            {filteredStudents.length === 0 && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-center py-24 bg-zinc-950/20 rounded-[4rem] border border-dashed border-white/5"
                >
                    <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-6">
                        <Users className="w-8 h-8 text-gray-600" />
                    </div>
                    <p className="text-[10px] font-black text-gray-500 uppercase tracking-[0.4em]">Sin Atletas Detectados</p>
                </motion.div>
            )}

            {/* Modals */}
            <AnimatePresence>
                {modalOpen && selectedStudent && (
                    <ModalOverlay onClose={() => setModalOpen(null)}>
                        {modalOpen === 'routine' && (
                            <RoutineModal
                                student={students.find(s => s.id === selectedStudent)!}
                                onClose={() => setModalOpen(null)}
                            />
                        )}
                        {modalOpen === 'progress' && (
                            <ProgressModal
                                student={students.find(s => s.id === selectedStudent)!}
                                onClose={() => setModalOpen(null)}
                            />
                        )}
                    </ModalOverlay>
                )}
            </AnimatePresence>
        </div>
    );
}

// Modal Overlay Component
function ModalOverlay({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/90 backdrop-blur-md z-[100] flex items-center justify-center p-4 md:p-8"
        >
            <motion.div
                initial={{ scale: 0.9, y: 40, opacity: 0 }}
                animate={{ scale: 1, y: 0, opacity: 1 }}
                exit={{ scale: 0.9, y: 40, opacity: 0 }}
                className="bg-zinc-950 rounded-[4rem] border border-white/10 max-w-2xl w-full max-h-[90vh] overflow-hidden relative shadow-[0_0_100px_rgba(249,115,22,0.1)]"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="absolute top-8 right-8 z-50">
                    <button onClick={onClose} className="w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white hover:bg-orange-500 transition-colors">
                        <X className="w-6 h-6" />
                    </button>
                </div>
                <div className="h-full overflow-y-auto custom-scrollbar">
                    {children}
                </div>
            </motion.div>
        </motion.div>
    );
}

interface StudentModalProps {
    student: Student;
    onClose: () => void;
}

// Routine Modal
function RoutineModal({ student, onClose }: StudentModalProps) {
    return (
        <div className="p-12">
            <div className="mb-10">
                <p className="text-[10px] font-black text-orange-500 uppercase tracking-[0.3em] mb-2">Tactical Asset</p>
                <h2 className="text-5xl font-black text-white italic uppercase tracking-tighter leading-none mb-2">Operación <span className="text-orange-500">Rutinaria</span></h2>
                <p className="text-gray-500 font-bold uppercase text-[10px] tracking-widest">{student.nombre}</p>
            </div>

            <div className="space-y-6">
                <div className="bg-orange-500/10 border border-orange-500/20 rounded-[2.5rem] p-8 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/10 rounded-full blur-3xl -mr-16 -mt-16" />
                    <h3 className="text-xl font-black text-white italic uppercase mb-1">Hipertrofia Full Body</h3>
                    <p className="text-[9px] font-black text-orange-500 uppercase tracking-widest mb-6">Bloque Técnico • Semana 03/08</p>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-black/40 p-4 rounded-2xl border border-white/5">
                            <p className="text-[8px] font-black text-gray-500 uppercase tracking-widest mb-1">Volumen Semanal</p>
                            <p className="text-xl font-black text-white italic">240 <span className="text-[10px]">min</span></p>
                        </div>
                        <div className="bg-black/40 p-4 rounded-2xl border border-white/5">
                            <p className="text-[8px] font-black text-gray-500 uppercase tracking-widest mb-1">Intensidad Avg</p>
                            <p className="text-xl font-black text-white italic">85 <span className="text-[10px]">%</span></p>
                        </div>
                    </div>
                </div>

                <div className="space-y-3">
                    <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest px-4">Line-up del Día</p>
                    {['Press Banca (Control)', 'Remo Supino (Elite)', 'Press Militar', 'Curl Martillo'].map((ex, i) => (
                        <div key={i} className="group flex items-center justify-between p-5 bg-white/5 rounded-3xl border border-white/5 hover:border-orange-500/30 transition-all">
                            <div className="flex items-center gap-4">
                                <div className="w-8 h-8 rounded-full bg-zinc-900 border border-white/10 flex items-center justify-center text-[10px] font-black text-orange-500">
                                    0{i + 1}
                                </div>
                                <span className="text-xs font-black text-white uppercase tracking-tight">{ex}</span>
                            </div>
                            <span className="text-[10px] font-black text-gray-500 group-hover:text-orange-500 transition-colors uppercase">4 x 12 Reps</span>
                        </div>
                    ))}
                </div>

                <button className="w-full mt-8 py-6 bg-orange-500 text-white font-black uppercase italic tracking-widest rounded-[2rem] hover:bg-orange-600 transition-all shadow-2xl shadow-orange-500/20">
                    Modificar Operación
                </button>
            </div>
        </div>
    );
}

// Student Fatigue Badge (Sprint 4.1)
function StudentFatigueBadge({ studentId }: { studentId: string }) {
    const [fatigueIndex, setFatigueIndex] = useState<number | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchFatigue = async () => {
            try {
                const res = await fetch(`/api/coach/students/${studentId}/fatigue-index`);
                if (res.ok) {
                    const data = await res.json();
                    if (data.success) {
                        setFatigueIndex(data.indiceFatiga);
                    }
                }
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        };
        fetchFatigue();
    }, [studentId]);

    if (loading) {
        return (
            <span className="text-[8px] bg-white/5 text-gray-500 px-2 py-0.5 rounded-full font-black animate-pulse">
                ⏳...
            </span>
        );
    }

    if (fatigueIndex === null) return null;

    let color = 'bg-green-500/20 text-green-400 border-green-500/20';
    if (fatigueIndex >= 5.0 && fatigueIndex < 7.5) {
        color = 'bg-amber-500/20 text-amber-400 border-amber-500/20';
    } else if (fatigueIndex >= 7.5) {
        color = 'bg-red-500/20 text-red-400 border-red-500/20 animate-pulse';
    }

    return (
        <span className={`px-2 py-0.5 rounded-full text-[8px] font-black tracking-widest uppercase border ${color}`} title="Índice de fatiga muscular">
            ⚡ FTG: {fatigueIndex}
        </span>
    );
}

// Progress Modal
function ProgressModal({ student, onClose }: StudentModalProps) {
    const { tenantSlug } = useParams() as { tenantSlug: string };
    const [analytics, setAnalytics] = useState<any>(null);
    const [fatigue, setFatigue] = useState<any>(null);
    const [videos, setVideos] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [tab, setTab] = useState<'biometry' | 'vision'>('biometry');

    useEffect(() => {
        const loadStudentData = async () => {
            try {
                setLoading(true);
                const [analyticsRes, fatigueRes] = await Promise.all([
                    fetch(`/api/coach/analytics?mode=individual&studentId=${student.id}`),
                    fetch(`/api/coach/students/${student.id}/fatigue-index`)
                ]);

                if (analyticsRes.ok) {
                    const analyticsData = await analyticsRes.json();
                    if (analyticsData.success) {
                        setAnalytics(analyticsData.metrics);
                    }
                }

                if (fatigueRes.ok) {
                    const fatigueData = await fatigueRes.json();
                    if (fatigueData.success) {
                        setFatigue(fatigueData);
                    }
                }

                // Cargar registros biomecánicos del alumno
                const { data: dbVideos, error: videosError } = await supabase
                    .from('videos_ejercicio')
                    .select('*')
                    .eq('usuario_id', student.id)
                    .order('creado_en', { ascending: false });

                if (videosError) throw videosError;
                setVideos(dbVideos || []);

            } catch (err) {
                console.error('Error al cargar métricas de fatiga y rendimiento:', err);
                toast.error('Error al cargar métricas de progreso');
            } finally {
                setLoading(false);
            }
        };

        loadStudentData();
    }, [student.id]);

    if (loading) {
        return (
            <div className="p-12 flex flex-col items-center justify-center min-h-[300px] gap-4">
                <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
                <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Descifrando Señales Biométricas...</p>
            </div>
        );
    }

    // Formatear mediciones para el gráfico de Recharts
    const chartData = analytics?.measurements?.map((m: any) => ({
        fecha: new Date(m.registrado_en).toLocaleDateString([], { day: '2-digit', month: '2-digit' }),
        peso: Number(m.peso || 0),
        grasa: Number(m.grasa_corporal || 0),
        musculo: Number(m.masa_muscular || 0)
    })) || [];

    const fatigueVal = fatigue?.indiceFatiga || 1.0;
    const strokeDasharray = 251.2; // 2 * PI * r (r=40)
    const strokeDashoffset = strokeDasharray - (strokeDasharray * fatigueVal) / 10;

    let fatigueColor = '#10b981'; // Green
    let fatigueBg = 'rgba(16,185,129,0.1)';
    if (fatigueVal >= 5.0 && fatigueVal < 7.5) {
        fatigueColor = '#f59e0b'; // Amber
        fatigueBg = 'rgba(245,158,11,0.1)';
    } else if (fatigueVal >= 7.5) {
        fatigueColor = '#ef4444'; // Red
        fatigueBg = 'rgba(239,68,68,0.1)';
    }

    return (
        <div className="p-8 md:p-12 space-y-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-4">
                <div>
                    <p className="text-[10px] font-black text-orange-500 uppercase tracking-[0.3em] mb-2">Metrics & Fatigue Analysis</p>
                    <h2 className="text-5xl font-black text-white italic uppercase tracking-tighter leading-none mb-2">Reporte de <span className="text-orange-500">Rendimiento</span></h2>
                    <p className="text-gray-500 font-bold uppercase text-[10px] tracking-widest">{student.nombre}</p>
                </div>

                {/* Tab Selector */}
                <div className="flex p-1 bg-white/5 border border-white/5 rounded-2xl w-full md:w-auto">
                    <button
                        onClick={() => setTab('biometry')}
                        className={`flex-1 md:flex-none px-6 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${tab === 'biometry'
                            ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/20'
                            : 'text-gray-400 hover:text-white'
                            }`}
                    >
                        📈 Biometría & Fatiga
                    </button>
                    <button
                        onClick={() => setTab('vision')}
                        className={`flex-1 md:flex-none px-6 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${tab === 'vision'
                            ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/20'
                            : 'text-gray-400 hover:text-white'
                            }`}
                    >
                        🎥 Vision Lab
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white/5 border border-white/5 p-6 rounded-[2rem] flex flex-col items-center justify-between text-center">
                    <p className="text-[8px] font-black text-gray-500 uppercase tracking-widest mb-2">Asistencias Semanales</p>
                    <p className="text-3xl font-black text-white italic">
                        {analytics?.attendance?.totalAttended || 0}
                        <span className="text-xs text-gray-500">/clases</span>
                    </p>
                </div>
                <div className="bg-white/5 border border-white/5 p-6 rounded-[2rem] flex flex-col items-center justify-between text-center">
                    <p className="text-[8px] font-black text-gray-500 uppercase tracking-widest mb-2">Ratio Asistencia</p>
                    <p className="text-3xl font-black text-orange-500 italic">
                        {analytics?.attendance?.attendanceRate || 0}%
                    </p>
                </div>
                <div className="bg-white/5 border border-white/5 p-6 rounded-[2rem] flex flex-col items-center justify-between text-center">
                    <p className="text-[8px] font-black text-gray-500 uppercase tracking-widest mb-2">Volumen de Carga</p>
                    <p className="text-3xl font-black text-white italic">
                        {analytics?.prescribedVolume || 0}
                        <span className="text-xs text-gray-500"> reps</span>
                    </p>
                </div>
            </div>

            {tab === 'biometry' ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Velocímetro de Fatiga Reactivo */}
                    <div className="bg-white/5 border border-white/5 p-8 rounded-[2.5rem] relative overflow-hidden flex flex-col justify-between">
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-orange-500/0 via-orange-500 to-orange-500/0" />
                        <div>
                            <h4 className="text-xs font-black text-white uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                                <Activity className="w-4 h-4 text-orange-500 animate-pulse" />
                                Índice de Fatiga
                            </h4>
                            
                            <div className="flex justify-center items-center relative py-6">
                                <svg className="w-32 h-32 transform -rotate-90">
                                    <circle
                                        cx="64"
                                        cy="64"
                                        r="40"
                                        className="stroke-zinc-800"
                                        strokeWidth="8"
                                        fill="transparent"
                                    />
                                    <motion.circle
                                        cx="64"
                                        cy="64"
                                        r="40"
                                        stroke={fatigueColor}
                                        strokeWidth="8"
                                        fill="transparent"
                                        strokeDasharray={strokeDasharray}
                                        initial={{ strokeDashoffset: strokeDasharray }}
                                        animate={{ strokeDashoffset }}
                                        transition={{ duration: 1.0, ease: 'easeOut' }}
                                        strokeLinecap="round"
                                    />
                                </svg>
                                <div className="absolute flex flex-col items-center justify-center">
                                    <span className="text-3xl font-black text-white italic tracking-tighter">{fatigueVal}</span>
                                    <span className="text-[8px] font-black text-gray-500 uppercase tracking-widest">Escala 10</span>
                                </div>
                            </div>
                        </div>

                        <div className="mt-4 p-4 rounded-2xl border border-white/5" style={{ backgroundColor: fatigueBg }}>
                            <p className="text-[10px] font-black uppercase tracking-wider mb-1" style={{ color: fatigueColor }}>
                                Estado: {fatigue?.estado?.replace('_', ' ') || 'Normal'}
                            </p>
                            <p className="text-xs font-medium text-gray-300">{fatigue?.recomendacion}</p>
                        </div>
                    </div>

                    {/* Historial Biométrico Real */}
                    <div className="bg-white/5 border border-white/5 p-8 rounded-[2.5rem] relative overflow-hidden flex flex-col">
                        <h4 className="text-xs font-black text-white uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                            <Sparkles className="w-4 h-4 text-orange-500" />
                            Histórico de Peso (Kg)
                        </h4>
                        {chartData.length > 0 ? (
                            <div className="h-48 w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={chartData}>
                                        <XAxis dataKey="fecha" stroke="#4b5563" fontSize={9} tickLine={false} />
                                        <YAxis domain={['auto', 'auto']} stroke="#4b5563" fontSize={9} tickLine={false} axisLine={false} />
                                        <Tooltip 
                                            contentStyle={{ backgroundColor: '#1c1c1e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}
                                            labelStyle={{ color: '#fff', fontWeight: 'bold' }}
                                        />
                                        <Line type="monotone" dataKey="peso" name="Peso" stroke="#f97316" strokeWidth={3} dot={{ fill: '#f97316', r: 4 }} activeDot={{ r: 6 }} />
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                        ) : (
                            <div className="flex-1 flex flex-col items-center justify-center text-center opacity-30 py-8 border-2 border-dashed border-white/5 rounded-2xl">
                                <Sparkles className="w-8 h-8 mb-2" />
                                <p className="text-[9px] font-black uppercase tracking-widest">Sin mediciones físicas registradas</p>
                            </div>
                        )}
                    </div>
                </div>
            ) : (
                /* Vision Lab / Historial Biomecánico (Sprint 4.2) */
                <div className="space-y-6">
                    <div className="flex justify-between items-center bg-white/5 border border-white/5 p-4 rounded-2xl">
                        <div>
                            <h4 className="text-xs font-black text-white uppercase tracking-[0.2em]">Historial Biomecánico AI</h4>
                            <p className="text-[9px] text-gray-500 uppercase font-black tracking-widest mt-0.5">Correcciones de postura y trayectoria motora</p>
                        </div>
                        <Link
                            href={`/tenants/${tenantSlug}/coach/vision?athlete=${student.id}`}
                            className="px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white font-black text-[9px] uppercase tracking-widest rounded-xl transition-all shadow-lg shadow-indigo-500/20"
                        >
                            🎥 Analizar Video
                        </Link>
                    </div>

                    <div className="space-y-4 max-h-[40vh] overflow-y-auto pr-1 custom-scrollbar">
                        {videos.length > 0 ? (
                            videos.map((vid: any) => {
                                const resultado = vid.correcciones_ia || vid.resultado_ia;
                                const isReady = vid.estado === 'analizado';
                                const hasError = vid.estado === 'error';
                                const score = resultado?.puntaje_general || 0;

                                let statusBadge = 'bg-yellow-500/20 text-yellow-400 border-yellow-500/20';
                                if (isReady) statusBadge = 'bg-green-500/20 text-green-400 border-green-500/20';
                                if (hasError) statusBadge = 'bg-red-500/20 text-red-400 border-red-500/20';

                                return (
                                    <div key={vid.id} className="p-6 bg-white/5 border border-white/5 rounded-[2rem] space-y-4">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <h5 className="text-sm font-black text-white uppercase tracking-tight">
                                                    🏋️ {vid.nombre_ejercicio_custom || 'Ejercicio Sin Nombre'}
                                                </h5>
                                                <p className="text-[9px] text-gray-500 font-bold uppercase tracking-wider mt-1">
                                                    📅 {new Date(vid.creado_en).toLocaleDateString()}
                                                </p>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border ${statusBadge}`}>
                                                    {vid.estado}
                                                </span>
                                                {isReady && (
                                                    <span className="px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border bg-indigo-500/20 text-indigo-400 border-indigo-500/20">
                                                        🏆 Score: {score}%
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        {isReady && resultado && (
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                                                <div className="bg-green-500/5 border border-green-500/10 p-4 rounded-xl">
                                                    <span className="text-[8px] text-green-400 font-black uppercase tracking-widest mb-1.5 block">✓ Puntos Fuertes</span>
                                                    <ul className="space-y-1">
                                                        {resultado.puntos_fuertes?.slice(0, 2).map((pf: string, i: number) => (
                                                            <li key={i} className="text-[10px] text-zinc-300">• {pf}</li>
                                                        ))}
                                                    </ul>
                                                </div>
                                                <div className="bg-red-500/5 border border-red-500/10 p-4 rounded-xl">
                                                    <span className="text-[8px] text-red-400 font-black uppercase tracking-widest mb-1.5 block">⚠ Correcciones</span>
                                                    <ul className="space-y-1">
                                                        {resultado.correcciones?.slice(0, 2).map((c: string, i: number) => (
                                                            <li key={i} className="text-[10px] text-zinc-300">• {c}</li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            </div>
                                        )}

                                        <div className="flex justify-end gap-2 pt-2">
                                            <a
                                                href={vid.url_video}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="px-4 py-2 border border-white/10 hover:border-orange-500/50 text-gray-300 hover:text-white rounded-xl text-[9px] font-black uppercase tracking-widest transition-all"
                                            >
                                                👁️ Ver Clip Video
                                            </a>
                                        </div>
                                    </div>
                                );
                            })
                        ) : (
                            <div className="text-center py-12 opacity-30 border border-dashed border-white/5 rounded-2xl">
                                <Film className="w-8 h-8 mx-auto mb-2" />
                                <p className="text-[9px] font-black uppercase tracking-widest">Sin registros biomecánicos aún</p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            <button onClick={onClose} className="w-full mt-4 py-5 bg-zinc-900 border border-white/10 text-white font-black uppercase italic tracking-widest rounded-2xl hover:border-orange-500/50 transition-all text-xs">
                Cerrar Reporte de Rendimiento
            </button>
        </div>
    );
}
