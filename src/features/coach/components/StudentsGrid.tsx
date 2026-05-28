'use client';

import React, { useState, useEffect, ReactNode } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Search, Filter, UserPlus, MoreVertical,
    ChevronRight, Activity, Calendar, Target,
    Mail, Phone, MapPin, Loader2, X, Zap, Users
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'react-hot-toast';
import { StudentAction } from './StudentAction';
import { SupabaseUserProfile } from '@/types/user';

interface Student {
    id: string;
    [key: string]: any;
}

export default function StudentsGrid() {
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
                                            <p className="text-[10px] font-black text-orange-500 uppercase tracking-widest opacity-60">Atleta Nivel Elite</p>
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
                                        href={`/coach/messages?athlete=${student.id}`}
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

// Progress Modal
function ProgressModal({ student, onClose }: StudentModalProps) {
    return (
        <div className="p-12">
            <div className="mb-10">
                <p className="text-[10px] font-black text-orange-500 uppercase tracking-[0.3em] mb-2">Metrics Analysis</p>
                <h2 className="text-5xl font-black text-white italic uppercase tracking-tighter leading-none mb-2">Reporte de <span className="text-orange-500">Rendimiento</span></h2>
                <p className="text-gray-500 font-bold uppercase text-[10px] tracking-widest">{student.nombre}</p>
            </div>

            <div className="space-y-8">
                <div className="grid grid-cols-3 gap-4">
                    {[
                        { label: 'Días Entrenados', value: '12', sub: '/16', color: 'text-white' },
                        { label: 'Efficiency', value: '94', sub: '%', color: 'text-orange-500' },
                        { label: 'Strength Up', value: '12', sub: 'kg', color: 'text-white' },
                    ].map((stat, i) => (
                        <div key={i} className="bg-white/5 border border-white/5 p-6 rounded-[2.5rem] flex flex-col items-center">
                            <p className="text-[8px] font-black text-gray-500 uppercase tracking-widest mb-2">{stat.label}</p>
                            <p className={`text-3xl font-black italic ${stat.color}`}>{stat.value}<span className="text-xs">{stat.sub}</span></p>
                        </div>
                    ))}
                </div>

                <div className="bg-white/5 border border-white/5 p-10 rounded-[3rem] relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-orange-500/0 via-orange-500 to-orange-500/0" />
                    <h4 className="text-xs font-black text-white uppercase tracking-[0.2em] mb-8 flex items-center gap-3">
                        <Activity className="w-4 h-4 text-orange-500" />
                        Evolución Biométrica
                    </h4>
                    <div className="h-48 flex items-end gap-3 px-4">
                        {[65, 68, 66, 72, 70, 75, 76].map((weight, i) => (
                            <motion.div
                                key={i}
                                initial={{ height: 0 }}
                                animate={{ height: `${(weight / 80) * 100}%` }}
                                className="flex-1 bg-gradient-to-t from-orange-500 via-orange-400 to-white/20 rounded-full min-w-[8px]"
                            />
                        ))}
                    </div>
                    <div className="flex justify-between mt-6 px-4">
                        <span className="text-[8px] font-black text-gray-500 uppercase tracking-widest">Base Line</span>
                        <span className="text-[8px] font-black text-orange-500 uppercase tracking-widest">Target Reached</span>
                    </div>
                </div>

                <button className="w-full mt-4 py-6 bg-zinc-900 border border-white/10 text-white font-black uppercase italic tracking-widest rounded-[2rem] hover:border-orange-500/50 transition-all">
                    Descargar Dossier Full
                </button>
            </div>
        </div>
    );
}
