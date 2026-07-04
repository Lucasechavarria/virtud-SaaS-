'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import RoutineGenerator from '@/features/coach/components/RoutineGenerator';
import { supabase } from '@/lib/supabase/client';
import { Plus, Minus, Trash, Dumbbell, Clock, RefreshCw, Layers } from 'lucide-react';

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

export default function RoutinesPage() {
    const [viewMode, setViewMode] = useState<'generator' | 'templates' | 'history'>('templates');
    const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
    const [previewTemplate, setPreviewTemplate] = useState<any | null>(null);
    const [routineHistory, setRoutineHistory] = useState<any[]>([]);
    const [loadingHistory, setLoadingHistory] = useState(false);
    
    // Estados de edición (Sprint 2.2)
    const [selectedEditRoutine, setSelectedEditRoutine] = useState<any | null>(null);
    const [savingEdit, setSavingEdit] = useState(false);

    const fetchHistory = React.useCallback(async () => {
        try {
            setLoadingHistory(true);
            const { data, error } = await supabase
                .from('rutinas')
                .select(`
                    *,
                    profiles:usuario_id (
                        nombre_completo,
                        url_avatar
                    )
                `)
                .order('creado_en', { ascending: false });

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

    const handleOpenEditModal = async (routine: any) => {
        const toastId = toast.loading('Cargando ejercicios de la rutina...');
        try {
            const { data: exercises, error } = await supabase
                .from('ejercicios')
                .select('*')
                .eq('rutina_id', routine.id)
                .order('orden_en_dia', { ascending: true });

            if (error) throw error;

            setSelectedEditRoutine({
                ...routine,
                exercises: exercises || []
            });
            toast.dismiss(toastId);
        } catch (err) {
            console.error('Error al cargar ejercicios:', err);
            toast.error('Error al cargar detalles de la rutina', { id: toastId });
        }
    };

    const handleSaveChanges = async () => {
        if (!selectedEditRoutine) return;
        setSavingEdit(true);
        const toastId = toast.loading('Guardando modificaciones...');
        try {
            const res = await fetch(`/api/coach/routines/${selectedEditRoutine.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: selectedEditRoutine.nombre,
                    description: selectedEditRoutine.descripcion,
                    exercises: selectedEditRoutine.exercises
                })
            });

            if (!res.ok) {
                const errData = await res.json();
                throw new Error(errData.error || 'Error al actualizar rutina');
            }

            toast.success('¡Rutina modificada con éxito!', { id: toastId });
            setSelectedEditRoutine(null);
            fetchHistory(); // Recargar historial
        } catch (err: any) {
            console.error(err);
            toast.error(err.message || 'Error al guardar modificaciones', { id: toastId });
        } finally {
            setSavingEdit(false);
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-8 pb-20 p-4 md:p-8 relative z-10"
        >
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
                <div>
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-2 h-8 bg-orange-500 rounded-full" />
                        <p className="text-[10px] font-black text-orange-500 uppercase tracking-[0.3em]">AI Training Hub</p>
                    </div>
                    <h1 className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-orange-400 to-red-400 italic uppercase tracking-tighter leading-none mb-2">
                        💪 Rutinas y Prescripción
                    </h1>
                    <p className="text-gray-400 text-sm font-bold uppercase tracking-widest opacity-60">Diseño y personalización de estímulos físicos</p>
                </div>

                {/* View Mode Selector */}
                <div className="flex gap-1 bg-white/5 border border-white/5 rounded-2xl p-1">
                    {[
                        { id: 'templates', label: '📋 Templates', },
                        { id: 'generator', label: '⚡ Generar IA', },
                        { id: 'history', label: '📜 Historial', },
                    ].map((mode) => (
                        <button
                            key={mode.id}
                            onClick={() => setViewMode(mode.id as any)}
                            className={`px-5 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${viewMode === mode.id
                                ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/20'
                                : 'text-gray-400 hover:text-white'
                                }`}
                        >
                            {mode.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Templates View */}
            {viewMode === 'templates' && (
                <div className="space-y-6">
                    <div>
                        <h2 className="text-2xl font-black text-white italic uppercase tracking-tighter">Elige tu Plantilla</h2>
                        <p className="text-gray-500 text-[10px] font-black uppercase tracking-widest">Selecciona un punto de partida y configúralo con IA</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {ROUTINE_TEMPLATES.map((template, index) => (
                            <motion.div
                                key={template.id}
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: index * 0.03 }}
                                className="group relative bg-[#1c1c1e] border border-white/5 hover:border-orange-500/20 rounded-[2rem] overflow-hidden cursor-pointer hover:bg-white/5 transition-all p-6"
                                onClick={() => setPreviewTemplate(template)}
                            >
                                <div className={`absolute inset-0 bg-gradient-to-br ${template.color} opacity-[0.03] group-hover:opacity-10 transition-opacity`} />
                                
                                <div className="relative flex justify-between items-start mb-4">
                                    <span className="text-5xl">{template.icon}</span>
                                    <span className="px-3 py-1 bg-white/5 border border-white/5 rounded-full text-[9px] font-black text-gray-400 uppercase tracking-widest">
                                        {template.level}
                                    </span>
                                </div>

                                <h3 className="text-xl font-black text-white uppercase italic tracking-tighter mb-1">{template.name}</h3>
                                <p className="text-xs text-gray-500 mb-4">{template.description}</p>

                                <div className="space-y-1.5 mb-6">
                                    {template.exercises.slice(0, 3).map((exercise, i) => (
                                        <div key={i} className="flex items-center gap-2 text-[10px] text-gray-400">
                                            <div className="w-1.5 h-1.5 rounded-full bg-orange-500" />
                                            <span>{exercise}</span>
                                        </div>
                                    ))}
                                </div>

                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleUseTemplate(template.id);
                                    }}
                                    className="w-full py-3 bg-zinc-900 border border-white/10 hover:border-orange-500/50 text-gray-300 hover:text-white rounded-xl transition-all font-black text-[10px] uppercase tracking-widest"
                                >
                                    Usar Template
                                </button>
                            </motion.div>
                        ))}
                    </div>
                </div>
            )}

            {/* Generator View */}
            {viewMode === 'generator' && (
                <div className="space-y-6">
                    {selectedTemplate && (
                        <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-orange-500/5 border border-orange-500/20 rounded-2xl p-6 flex items-center justify-between"
                        >
                            <div className="flex items-center gap-4">
                                <span className="text-4xl">
                                    {ROUTINE_TEMPLATES.find(t => t.id === selectedTemplate)?.icon}
                                </span>
                                <div>
                                    <p className="font-black text-orange-500 text-sm uppercase tracking-wider">
                                        Plantilla Activa: {ROUTINE_TEMPLATES.find(t => t.id === selectedTemplate)?.name}
                                    </p>
                                    <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-0.5">
                                        Cargada en generador reactivo
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => setSelectedTemplate(null)}
                                className="w-8 h-8 rounded-full bg-white/5 border border-white/5 flex items-center justify-center text-white hover:bg-red-500 transition-all font-black"
                            >
                                ✕
                            </button>
                        </motion.div>
                    )}
                    <RoutineGenerator initialTemplate={selectedTemplate} />
                </div>
            )}

            {/* History View */}
            {viewMode === 'history' && (
                <div className="space-y-6">
                    <div className="flex justify-between items-center">
                        <div>
                            <h2 className="text-2xl font-black text-white italic uppercase tracking-tighter">Rutinas Asignadas</h2>
                            <p className="text-gray-500 text-[10px] font-black uppercase tracking-widest">Historial completo de rutinas activas y pendientes</p>
                        </div>
                        <button onClick={fetchHistory} className="px-4 py-2 border border-white/5 hover:border-orange-500/50 bg-white/5 text-orange-500 hover:text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all">
                            🔄 Actualizar
                        </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {loadingHistory ? (
                            <div className="col-span-full py-20 text-center opacity-30 border border-dashed border-white/5 rounded-2xl flex items-center justify-center gap-3">
                                <span className="animate-spin text-orange-500">🔄</span>
                                <span className="text-[10px] font-black uppercase tracking-widest">Descifrando Historial...</span>
                            </div>
                        ) : routineHistory.length === 0 ? (
                            <div className="col-span-full py-20 text-center opacity-30 border border-dashed border-white/5 rounded-2xl">
                                <p className="text-[10px] font-black uppercase tracking-widest">No hay rutinas registradas en este gimnasio</p>
                            </div>
                        ) : routineHistory.map((routine) => {
                            const template = ROUTINE_TEMPLATES.find(t => t.id === routine.template) || ROUTINE_TEMPLATES[0];
                            return (
                                <motion.div
                                    key={routine.id}
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    className="bg-white/5 border border-white/5 rounded-[2rem] p-6 hover:border-orange-500/20 hover:bg-white/10 transition-all flex flex-col justify-between"
                                >
                                    <div>
                                        <div className="flex items-start gap-4 mb-4">
                                            <div className={`w-12 h-12 rounded-full bg-gradient-to-br ${template?.color || 'from-orange-500 to-red-500'} flex items-center justify-center text-white font-black text-lg shadow-lg uppercase`}>
                                                {routine.profiles?.nombre_completo?.charAt(0) || '?'}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <h3 className="font-black text-white text-lg uppercase tracking-tight truncate">{routine.profiles?.nombre_completo || 'Alumno'}</h3>
                                                <p className="text-xs text-orange-500 font-bold truncate">{routine.nombre}</p>
                                            </div>
                                            <span className={`px-3 py-1 rounded-xl text-[9px] font-black uppercase tracking-widest border ${routine.esta_activa
                                                ? 'bg-green-500/20 text-green-400 border-green-500/20'
                                                : 'bg-zinc-800 text-gray-500 border-white/5'
                                                }`}>
                                                {routine.esta_activa ? 'Activa' : 'Inactiva'}
                                            </span>
                                        </div>

                                        <div className="flex items-center gap-2 text-[10px] text-gray-500 mb-6 font-bold uppercase tracking-widest">
                                            <span>📅 {new Date(routine.creado_en).toLocaleDateString()}</span>
                                            <span>•</span>
                                            <span>{routine.generada_por_ia ? '✨ IA' : '📋 Manual'}</span>
                                        </div>
                                    </div>

                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => handleOpenEditModal(routine)}
                                            className="flex-1 py-3 bg-zinc-900 border border-white/5 hover:border-orange-500/50 text-gray-300 hover:text-white rounded-xl transition-all font-black text-[10px] uppercase tracking-widest"
                                        >
                                            👁️ Ver Detalle / Editar
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
                        className="fixed inset-0 bg-black/90 backdrop-blur-md z-50 flex items-center justify-center p-4"
                        onClick={() => setPreviewTemplate(null)}
                    >
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            onClick={(e) => e.stopPropagation()}
                            className="bg-[#1c1c1e] rounded-[3rem] border border-white/10 max-w-xl w-full p-8 relative overflow-hidden shadow-[0_0_80px_rgba(249,115,22,0.05)]"
                        >
                            <div className="relative">
                                <div className="flex justify-between items-start mb-6">
                                    <div className="flex items-center gap-4">
                                        <span className="text-6xl">{previewTemplate.icon}</span>
                                        <div>
                                            <h2 className="text-3xl font-black text-white italic uppercase tracking-tighter leading-none mb-1">{previewTemplate.name}</h2>
                                            <p className="text-xs text-gray-500 font-bold uppercase tracking-widest">{previewTemplate.description}</p>
                                        </div>
                                    </div>
                                    <button onClick={() => setPreviewTemplate(null)} className="text-gray-400 hover:text-white text-3xl font-black">×</button>
                                </div>

                                <div className="grid grid-cols-2 gap-4 mb-6">
                                    <div className="bg-white/5 border border-white/5 rounded-2xl p-4">
                                        <p className="text-gray-500 text-[9px] uppercase font-bold tracking-wider mb-1">Duración sugerida</p>
                                        <p className="font-black text-white uppercase italic text-sm">{previewTemplate.duration}</p>
                                    </div>
                                    <div className="bg-white/5 border border-white/5 rounded-2xl p-4">
                                        <p className="text-gray-500 text-[9px] uppercase font-bold tracking-wider mb-1">Nivel Atleta</p>
                                        <p className="font-black text-white uppercase italic text-sm">{previewTemplate.level}</p>
                                    </div>
                                </div>

                                <div className="mb-6">
                                    <h3 className="text-orange-500 text-[10px] font-black uppercase tracking-widest mb-3">Ejercicios sugeridos:</h3>
                                    <div className="grid grid-cols-2 gap-2">
                                        {previewTemplate.exercises.map((exercise: string, i: number) => (
                                            <div key={i} className="flex items-center gap-2 text-xs text-gray-300">
                                                <div className={`w-2 h-2 rounded-full bg-gradient-to-r ${previewTemplate.color}`} />
                                                <span className="font-medium text-gray-300">{exercise}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <button
                                    onClick={() => {
                                        handleUseTemplate(previewTemplate.id);
                                        setPreviewTemplate(null);
                                    }}
                                    className="w-full py-4 bg-orange-500 hover:bg-orange-600 text-white font-black uppercase italic tracking-widest rounded-2xl transition-all shadow-lg shadow-orange-500/20"
                                >
                                    🚀 Cargar en Generador IA
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Edit Routine Modal - Sprint 2.2 */}
            <AnimatePresence>
                {selectedEditRoutine && (
                    <EditRoutineModal
                        routine={selectedEditRoutine}
                        setRoutine={setSelectedEditRoutine}
                        onClose={() => setSelectedEditRoutine(null)}
                        onSave={handleSaveChanges}
                        saving={savingEdit}
                    />
                )}
            </AnimatePresence>
        </motion.div>
    );
}

// Edit Routine Modal Component
function EditRoutineModal({ routine, setRoutine, onClose, onSave, saving }: any) {
    
    const updateExercise = (exerciseId: string, field: string, value: any) => {
        const updatedExercises = routine.exercises.map((ex: any) => {
            if (ex.id === exerciseId) {
                return { ...ex, [field]: value };
            }
            return ex;
        });
        setRoutine({ ...routine, exercises: updatedExercises });
    };

    return (
        <div
            className="fixed inset-0 bg-black/90 backdrop-blur-md z-50 flex items-center justify-center p-4"
            onClick={onClose}
        >
            <motion.div
                initial={{ scale: 0.95, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.95, opacity: 0, y: 20 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-[#1c1c1e] rounded-[3rem] border border-white/10 max-w-2xl w-full max-h-[85vh] overflow-y-auto p-8 relative shadow-[0_0_80px_rgba(249,115,22,0.1)] space-y-6"
            >
                <button
                    onClick={onClose}
                    className="absolute top-6 right-6 w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white hover:bg-orange-500 transition-colors z-50 text-xl font-bold"
                >
                    ×
                </button>

                <div>
                    <p className="text-[10px] font-black text-orange-500 uppercase tracking-[0.3em] mb-1">Editor Activo</p>
                    <h2 className="text-3xl font-black text-white italic uppercase tracking-tighter leading-none mb-1">Modificar Rutina</h2>
                    <p className="text-xs text-gray-500 font-bold uppercase tracking-widest">{routine.profiles?.nombre_completo || 'Atleta'}</p>
                </div>

                {/* Info General */}
                <div className="space-y-4 bg-white/5 border border-white/5 p-6 rounded-2xl">
                    <div>
                        <label className="block text-gray-500 text-[9px] uppercase font-black tracking-widest mb-1.5">Nombre de la Rutina</label>
                        <input
                            type="text"
                            value={routine.nombre || ''}
                            onChange={(e) => setRoutine({ ...routine, nombre: e.target.value })}
                            className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-sm text-white focus:border-orange-500 outline-none font-bold uppercase"
                        />
                    </div>
                    <div>
                        <label className="block text-gray-500 text-[9px] uppercase font-black tracking-widest mb-1.5">Descripción</label>
                        <textarea
                            value={routine.descripcion || ''}
                            onChange={(e) => setRoutine({ ...routine, descripcion: e.target.value })}
                            className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-xs text-gray-300 focus:border-orange-500 outline-none h-16 resize-none"
                        />
                    </div>
                </div>

                {/* Ejercicios */}
                <div className="space-y-4">
                    <h3 className="text-orange-500 text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                        <Dumbbell size={12} /> Ejercicios Asignados
                    </h3>

                    <div className="space-y-3 max-h-[35vh] overflow-y-auto pr-1 custom-scrollbar">
                        {routine.exercises?.length > 0 ? (
                            routine.exercises.map((ex: any, idx: number) => (
                                <div key={ex.id || idx} className="p-5 bg-white/5 rounded-2xl border border-white/5 flex flex-col gap-4">
                                    <div className="flex justify-between items-start">
                                        <div className="min-w-0">
                                            <p className="text-sm font-black text-white uppercase tracking-tight truncate">{ex.nombre}</p>
                                            <p className="text-[10px] text-gray-500 font-bold lowercase truncate">{ex.descripcion || 'Sin notas'}</p>
                                        </div>
                                    </div>

                                    {/* Controles interactivos neón */}
                                    <div className="grid grid-cols-3 gap-3">
                                        {/* Series */}
                                        <div className="bg-black/30 border border-white/5 p-3 rounded-xl flex flex-col items-center justify-between text-center">
                                            <p className="text-gray-500 text-[8px] uppercase font-black tracking-widest mb-1">Series</p>
                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={() => updateExercise(ex.id, 'series', Math.max(1, (ex.series || 3) - 1))}
                                                    className="w-6 h-6 rounded-md bg-white/5 hover:bg-orange-500/20 text-white flex items-center justify-center text-xs font-bold transition-all"
                                                >
                                                    <Minus size={10} />
                                                </button>
                                                <span className="text-sm font-black text-white">{ex.series || 3}</span>
                                                <button
                                                    onClick={() => updateExercise(ex.id, 'series', (ex.series || 3) + 1)}
                                                    className="w-6 h-6 rounded-md bg-white/5 hover:bg-orange-500/20 text-white flex items-center justify-center text-xs font-bold transition-all"
                                                >
                                                    <Plus size={10} />
                                                </button>
                                            </div>
                                        </div>

                                        {/* Repeticiones */}
                                        <div className="bg-black/30 border border-white/5 p-3 rounded-xl flex flex-col items-center justify-between text-center">
                                            <p className="text-gray-500 text-[8px] uppercase font-black tracking-widest mb-1">Reps</p>
                                            <input
                                                type="text"
                                                value={ex.repeticiones || '10'}
                                                onChange={(e) => updateExercise(ex.id, 'repeticiones', e.target.value)}
                                                className="w-14 bg-transparent border-b border-white/10 text-center text-sm font-black text-white outline-none focus:border-orange-500 uppercase tracking-tighter"
                                            />
                                        </div>

                                        {/* Descanso */}
                                        <div className="bg-black/30 border border-white/5 p-3 rounded-xl flex flex-col items-center justify-between text-center">
                                            <p className="text-gray-500 text-[8px] uppercase font-black tracking-widest mb-1">Descanso</p>
                                            <div className="flex items-center gap-1.5">
                                                <input
                                                    type="number"
                                                    value={ex.descanso_segundos || 60}
                                                    onChange={(e) => updateExercise(ex.id, 'descanso_segundos', parseInt(e.target.value) || 0)}
                                                    className="w-10 bg-transparent border-b border-white/10 text-center text-sm font-black text-white outline-none focus:border-orange-500"
                                                />
                                                <span className="text-[10px] text-gray-500 font-bold lowercase">s</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <p className="text-center text-gray-500 text-xs py-6">La rutina no contiene ejercicios</p>
                        )}
                    </div>
                </div>

                <button
                    onClick={onSave}
                    disabled={saving}
                    className="w-full bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-black uppercase italic tracking-widest py-4 rounded-2xl transition-all shadow-xl shadow-orange-500/20 flex items-center justify-center gap-3 text-xs"
                >
                    {saving ? 'Guardando modificaciones...' : '💾 Confirmar y Guardar Cambios'}
                </button>
            </motion.div>
        </div>
    );
}
