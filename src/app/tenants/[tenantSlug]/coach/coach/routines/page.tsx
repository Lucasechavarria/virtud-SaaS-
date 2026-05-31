'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import RoutineGenerator from '@/features/coach/components/RoutineGenerator';

const ROUTINE_TEMPLATES = [
    {
        id: 'strength',
        name: 'Fuerza General',
        icon: '💪',
        color: 'from-orange-500 to-red-500',
        description: '4 días - Enfoque compuestos',
        exercises: ['Sentadilla', 'Press Banca', 'Peso Muerto', 'Dominadas'],
        duration: '8-12 semanas',
        level: 'Intermedio-Avanzado',
    },
    {
        id: 'hypertrophy',
        name: 'Hipertrofia',
        icon: '🏋️',
        color: 'from-purple-500 to-pink-500',
        description: '5 días - Volumen alto',
        exercises: ['Push/Pull/Legs', 'Upper/Lower', 'Aislamiento'],
        duration: '6-10 semanas',
        level: 'Avanzado',
    },
    {
        id: 'functional',
        name: 'Funcional',
        icon: '🤸',
        color: 'from-blue-500 to-cyan-500',
        description: '3 días - Movimientos naturales',
        exercises: ['CrossFit', 'Calistenia', 'HIIT', 'Complexes'],
        duration: '4-8 semanas',
        level: 'Todos los niveles',
    },
    {
        id: 'beginner',
        name: 'Principiante',
        icon: '🌱',
        color: 'from-green-500 to-emerald-500',
        description: 'Full Body 3x/semana',
        exercises: ['Básicos', 'Máquinas', 'Cable', 'Mancuernas'],
        duration: '8-12 semanas',
        level: 'Principiante',
    },
    {
        id: 'athletic',
        name: 'Atlético',
        icon: '⚡',
        color: 'from-yellow-400 to-orange-500',
        description: '4 días - Potencia explosiva',
        exercises: ['Pliométricos', 'Olímpicos', 'Sprint', 'Agilidad'],
        duration: '6-8 semanas',
        level: 'Avanzado',
    },
    {
        id: 'bodyweight',
        name: 'Calistenia',
        icon: '🦾',
        color: 'from-indigo-400 to-blue-500',
        description: 'Sin equipo - Casa/Parque',
        exercises: ['Flexiones', 'Dominadas', 'Pistol Squat', 'Planchas'],
        duration: '6-10 semanas',
        level: 'Todos los niveles',
    },
    {
        id: 'powerlifting',
        name: 'Powerlifting',
        icon: '🏆',
        color: 'from-red-600 to-rose-700',
        description: 'Fuerza máxima - 3 grandes',
        exercises: ['Sentadilla', 'Press Banca', 'Peso Muerto'],
        duration: '12-16 semanas',
        level: 'Avanzado',
    },
    {
        id: 'endurance',
        name: 'Resistencia',
        icon: '🏃',
        color: 'from-teal-400 to-green-600',
        description: 'Cardio + Muscular',
        exercises: ['Circuits', 'AMRAP', 'EMOM', 'Tabata'],
        duration: '4-6 semanas',
        level: 'Intermedio',
    },
    {
        id: 'senior',
        name: 'Adultos Mayores',
        icon: '👵',
        color: 'from-blue-300 to-indigo-400',
        description: 'Salud y Movilidad',
        exercises: ['Equilibrio', 'Fuerza suave', 'Flexibilidad'],
        duration: '12+ semanas',
        level: 'Salud',
    },
    {
        id: 'combat',
        name: 'Combate',
        icon: '🥊',
        color: 'from-red-700 to-black',
        description: 'MMA / Boxeo / BJJ',
        exercises: ['Explosividad', 'Cuello', 'Core', 'Grip'],
        duration: '6-10 semanas',
        level: 'Atlético',
    },
    {
        id: 'rehab',
        name: 'Rehabilitación',
        icon: '🩹',
        color: 'from-emerald-400 to-teal-500',
        description: 'Recuperación de lesiones',
        exercises: ['Isométricos', 'Excéntricos', 'Biomecánica'],
        duration: 'Varía',
        level: 'Terapéutico',
    },
];

// Replaced with real data fetching in component

import { supabase } from '@/lib/supabase/client';

export default function RoutinesPage() {
    const [viewMode, setViewMode] = useState<'generator' | 'templates' | 'history'>('templates');
    const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
    const [previewTemplate, setPreviewTemplate] = useState<any | null>(null);
    const [routineHistory, setRoutineHistory] = useState<any[]>([]);
    const [loadingHistory, setLoadingHistory] = useState(false);

    const fetchHistory = React.useCallback(async () => {
        try {
            setLoadingHistory(true);
            const { data, error } = await supabase
                .from('rutinas')
                .select(`
                    *,
                    profiles:user_id (
                        nombre_completo,
                        avatar_url
                    )
                `)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setRoutineHistory(data || []);
        } catch (error) {
            console.error('Error fetching routine history:', error);
            toast.error('Error al cargar historial');
        } finally {
            setLoadingHistory(false);
        }
    }, []);

    React.useEffect(() => {
        if (viewMode === 'history') {
            fetchHistory();
        }
    }, [viewMode, fetchHistory]);

    const handleUseTemplate = (templateId: string) => {
        setSelectedTemplate(templateId);
        toast.success('Template seleccionado! Personalízalo abajo.');
        setViewMode('generator');
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-8"
        >
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
                <div>
                    <h1 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-orange-400 to-red-400 mb-2">
                        💪 Generador de Rutinas IA
                    </h1>
                    <p className="text-gray-400">Crea rutinas personalizadas en segundos</p>
                </div>

                {/* View Mode Selector */}
                <div className="flex gap-2 bg-[#1c1c1e]/60 backdrop-blur-xl border border-white/10 rounded-xl p-2">
                    {[
                        { id: 'templates', label: '📋 Templates', },
                        { id: 'generator', label: '⚡ Generar', },
                        { id: 'history', label: '📜 Historial', },
                    ].map((mode) => (
                        <button
                            key={mode.id}
                            onClick={() => setViewMode(mode.id as any)}
                            className={`px-6 py-3 rounded-lg font-bold transition-all ${viewMode === mode.id
                                ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-lg shadow-orange-500/30'
                                : 'text-gray-400 hover:bg-white/5 hover:text-white'
                                }`}
                        >
                            {mode.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Templates View */}
            {viewMode === 'templates' && (
                <div>
                    <div className="mb-6">
                        <h2 className="text-2xl font-bold text-white mb-2">🎯 Elige tu Template</h2>
                        <p className="text-gray-400">Selecciona un punto de partida y personalízalo con IA</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {ROUTINE_TEMPLATES.map((template, index) => (
                            <motion.div
                                key={template.id}
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: index * 0.05 }}
                                whileHover={{ scale: 1.05, y: -5 }}
                                className="group relative bg-[#1c1c1e]/60 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden cursor-pointer hover:border-orange-500/50 transition-all"
                                onClick={() => setPreviewTemplate(template)}
                            >
                                {/* Gradient Background */}
                                <div className={`absolute inset-0 bg-gradient-to-br ${template.color} opacity-10 group-hover:opacity-20 transition-opacity`} />

                                {/* Content */}
                                <div className="relative p-6">
                                    <div className="flex justify-between items-start mb-4">
                                        <span className="text-5xl">{template.icon}</span>
                                        <span className="px-2 py-1 bg-white/10 rounded-full text-xs text-gray-400">
                                            {template.level}
                                        </span>
                                    </div>

                                    <h3 className="text-xl font-black text-white mb-2">{template.name}</h3>
                                    <p className="text-sm text-gray-400 mb-4">{template.description}</p>

                                    <div className="space-y-2 mb-4">
                                        {template.exercises.slice(0, 3).map((exercise, i) => (
                                            <div key={i} className="flex items-center gap-2 text-xs text-gray-400">
                                                <div className={`w-1.5 h-1.5 rounded-full bg-gradient-to-r ${template.color}`} />
                                                <span>{exercise}</span>
                                            </div>
                                        ))}
                                    </div>

                                    <div className="flex items-center gap-2 text-xs text-gray-500 mb-4">
                                        <span>⏱️ {template.duration}</span>
                                    </div>

                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleUseTemplate(template.id);
                                        }}
                                        className={`w-full py-3 bg-gradient-to-r ${template.color} hover:opacity-90 text-white font-bold rounded-xl transition-all shadow-lg`}
                                    >
                                        Usar Template
                                    </button>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </div>
            )}

            {/* Generator View */}
            {viewMode === 'generator' && (
                <div>
                    {selectedTemplate && (
                        <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-gradient-to-r from-orange-500/10 to-red-500/10 border border-orange-500/30 rounded-2xl p-6 mb-6"
                        >
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <span className="text-4xl">
                                        {ROUTINE_TEMPLATES.find(t => t.id === selectedTemplate)?.icon}
                                    </span>
                                    <div>
                                        <p className="font-black text-orange-400 text-lg">
                                            Template: {ROUTINE_TEMPLATES.find(t => t.id === selectedTemplate)?.name}
                                        </p>
                                        <p className="text-sm text-gray-400">
                                            {ROUTINE_TEMPLATES.find(t => t.id === selectedTemplate)?.description}
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setSelectedTemplate(null)}
                                    className="text-gray-400 hover:text-white text-2xl font-bold"
                                >
                                    ✕
                                </button>
                            </div>
                        </motion.div>
                    )}
                    <RoutineGenerator initialTemplate={selectedTemplate} />
                </div>
            )}

            {/* History View */}
            {viewMode === 'history' && (
                <div>
                    <div className="mb-6 flex justify-between items-center">
                        <div>
                            <h2 className="text-2xl font-bold text-white mb-2">📜 Rutinas Generadas</h2>
                            <p className="text-gray-400">Historial completo de rutinas asignadas</p>
                        </div>
                        <button onClick={fetchHistory} className="text-orange-400 hover:text-orange-300 text-sm font-bold">
                            🔄 Actualizar
                        </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {loadingHistory ? (
                            <div className="col-span-full py-20 text-center text-gray-500">Cargando historial...</div>
                        ) : routineHistory.length === 0 ? (
                            <div className="col-span-full py-20 text-center text-gray-500">No hay rutinas registradas.</div>
                        ) : routineHistory.map((routine) => {
                            const template = ROUTINE_TEMPLATES.find(t => t.id === routine.template) || ROUTINE_TEMPLATES[0];
                            return (
                                <motion.div
                                    key={routine.id}
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    className="bg-[#1c1c1e]/60 backdrop-blur-xl border border-white/10 rounded-2xl p-6 hover:border-orange-500/30 transition-all"
                                >
                                    <div className="flex items-start gap-4 mb-4">
                                        <div className={`w-14 h-14 rounded-full bg-gradient-to-br ${template?.color || 'from-gray-500 to-gray-600'} flex items-center justify-center text-white font-black text-xl shadow-lg uppercase`}>
                                            {routine.profiles?.nombre_completo?.charAt(0) || '?'}
                                        </div>
                                        <div className="flex-1">
                                            <h3 className="font-bold text-white text-lg">{routine.profiles?.nombre_completo || 'Alumno'}</h3>
                                            <p className="text-sm text-gray-400">{routine.name}</p>
                                        </div>
                                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${routine.is_active
                                            ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                                            : 'bg-orange-500/20 text-orange-400 border border-orange-500/30'
                                            }`}>
                                            {routine.is_active ? 'Activa' : 'Pendiente'}
                                        </span>
                                    </div>

                                    <div className="flex items-center gap-2 text-xs text-gray-500 mb-4">
                                        <span>📅 {new Date(routine.created_at).toLocaleDateString('es-AR')}</span>
                                        <span>•</span>
                                        <span className="flex items-center gap-1">
                                            {routine.generated_by_ai ? '✨ IA' : '📋 Manual'}
                                        </span>
                                    </div>

                                    <div className="flex gap-2">
                                        <button className="flex-1 px-4 py-2 bg-blue-500/20 hover:bg-blue-500 text-blue-300 hover:text-white rounded-lg transition-all font-medium">
                                            👁️ Ver Detalle
                                        </button>
                                        <button className="px-4 py-2 bg-purple-500/20 hover:bg-purple-500 text-purple-300 hover:text-white rounded-lg transition-all font-medium">
                                            💾
                                        </button>
                                    </div>
                                </motion.div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Template Preview Modal */}
            <AnimatePresence>
                {previewTemplate && (
                    <div
                        className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                        onClick={() => setPreviewTemplate(null)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            onClick={(e) => e.stopPropagation()}
                            className="bg-[#1c1c1e] rounded-2xl border border-white/10 max-w-2xl w-full p-8 relative overflow-hidden"
                        >
                            <div className={`absolute inset-0 bg-gradient-to-br ${previewTemplate.color} opacity-10`} />

                            <div className="relative">
                                <div className="flex justify-between items-start mb-6">
                                    <div className="flex items-center gap-4">
                                        <span className="text-6xl">{previewTemplate.icon}</span>
                                        <div>
                                            <h2 className="text-3xl font-black text-white">{previewTemplate.name}</h2>
                                            <p className="text-gray-400">{previewTemplate.description}</p>
                                        </div>
                                    </div>
                                    <button onClick={() => setPreviewTemplate(null)} className="text-gray-400 hover:text-white text-3xl">×</button>
                                </div>

                                <div className="grid grid-cols-2 gap-4 mb-6">
                                    <div className="bg-white/5 rounded-xl p-4">
                                        <p className="text-gray-400 text-sm mb-1">Duración</p>
                                        <p className="font-bold text-white">{previewTemplate.duration}</p>
                                    </div>
                                    <div className="bg-white/5 rounded-xl p-4">
                                        <p className="text-gray-400 text-sm mb-1">Nivel</p>
                                        <p className="font-bold text-white">{previewTemplate.level}</p>
                                    </div>
                                </div>

                                <div className="mb-6">
                                    <h3 className="text-white font-bold mb-3">Ejercicios Incluidos:</h3>
                                    <div className="grid grid-cols-2 gap-2">
                                        {previewTemplate.exercises.map((exercise: string, i: number) => (
                                            <div key={i} className="flex items-center gap-2 text-sm text-gray-300">
                                                <div className={`w-2 h-2 rounded-full bg-gradient-to-r ${previewTemplate.color}`} />
                                                <span>{exercise}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <button
                                    onClick={() => {
                                        handleUseTemplate(previewTemplate.id);
                                        setPreviewTemplate(null);
                                    }}
                                    className={`w-full py-4 bg-gradient-to-r ${previewTemplate.color} text-white font-black rounded-xl text-lg hover:opacity-90 transition-all shadow-lg`}
                                >
                                    🚀 Usar Este Template
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </motion.div>
    );
}
