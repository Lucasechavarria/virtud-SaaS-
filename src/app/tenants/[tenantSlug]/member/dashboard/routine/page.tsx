'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { SecureRoutineViewer } from '@/components/SecureRoutineViewer';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Sword,
    Target,
    Zap,
    ChevronRight,
    Activity,
    Calendar,
    Dumbbell,
    Trophy,
    Info,
    CheckCircle2,
    Circle,
    Play,
    Sparkles
} from 'lucide-react';
import { useTenantNavigation } from '@/hooks/useTenantNavigation';
import { createClient } from '@/lib/supabase/client';
import toast from 'react-hot-toast';

interface Exercise {
    id: string;
    nombre: string;
    descripcion: string;
    series: number;
    repeticiones: string;
    descanso_segundos: number;
    grupo_muscular?: string;
    equipamiento?: string[];
    instrucciones?: string;
    numero_dia?: number;
    dia_numero: number;
    orden_en_dia: number;
    esta_completado?: boolean;
    url_video?: string;
}

interface Routine {
    id: string;
    nombre: string;
    descripcion: string;
    objetivo: string;
    duracion_semanas: number;
    consideraciones_medicas?: string;
    coach: {
        nombre_completo: string;
    };
}

export default function MyRoutinePage({ params }: { params?: any }) {
    const supabase = createClient();
    const { tenantPush } = useTenantNavigation();
    const router = useRouter();
    const [routine, setRoutine] = useState<Routine | null>(null);
    const [exercises, setExercises] = useState<Exercise[]>([]);
    const [selectedDay, setSelectedDay] = useState(1);
    const [loading, setLoading] = useState(true);
    const [userId, setUserId] = useState('');

    useEffect(() => {
        loadRoutine();
    }, []);

    const loadRoutine = async () => {
        try {
            const response = await fetch('/api/student/my-routine');
            const data = await response.json();

            if (data.success) {
                setRoutine(data.routine);
                setExercises(data.exercises);
                setUserId(data.userId);
            } else {
                if (data.error === 'No active routine') {
                    // Handled in UI
                } else {
                    toast.error('Error al cargar rutina');
                }
            }
        } catch (error) {
            console.error('Error:', error);
            toast.error('Error al cargar rutina');
        } finally {
            setLoading(false);
        }
    };

    const toggleExerciseComplete = async (exerciseId: string) => {
        try {
            const response = await fetch('/api/student/toggle-exercise', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ exerciseId })
            });

            if (response.ok) {
                setExercises(prev =>
                    prev.map(ex =>
                        ex.id === exerciseId
                            ? { ...ex, esta_completado: !ex.esta_completado }
                            : ex
                    )
                );
            }
        } catch (error) {
            console.error('Error:', error);
        }
    };

    const dayExercises = (exercises || []).filter(ex => (ex.dia_numero || ex.numero_dia) === selectedDay);
    const totalDays = Math.max(...(exercises || []).map(ex => ex.dia_numero || ex.numero_dia || 0), 0);

    const container = {
        hidden: { opacity: 0 },
        show: {
            opacity: 1,
            transition: {
                staggerChildren: 0.1
            }
        }
    };

    const item = {
        hidden: { opacity: 0, y: 20 },
        show: { opacity: 1, y: 0 }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-[#09090b] flex flex-col items-center justify-center gap-6">
                <motion.div
                    animate={{ rotate: 360, scale: [1, 1.2, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="w-16 h-16 border-4 border-orange-500/20 border-t-orange-500 rounded-full"
                />
                <p className="text-zinc-500 font-black text-xs uppercase tracking-[0.4em] animate-pulse">Sincronizando Archivos Tácticos...</p>
            </div>
        );
    }

    const handleSelectGenericRoutine = async (goal: { nombre: string; objetivo: string; duracion: string; dias: number; ejercicios: any[] }) => {
        if (!userId) return;
        setLoading(true);
        try {
            const { data: newRoutine, error: rError } = await (supabase as any)
                .from('rutinas')
                .insert({
                    usuario_id: userId,
                    nombre: goal.nombre,
                    objetivo: goal.objetivo,
                    duracion_estimada: goal.duracion,
                    nivel: 'Intermedio',
                    creado_por_ia: false,
                    es_plantilla: false,
                    creado_en: new Date().toISOString()
                })
                .select()
                .single();

            if (rError) throw rError;

            // Insertar ejercicios para la rutina genérica
            const exercisesToInsert = goal.ejercicios.map((ex, idx) => ({
                rutina_id: newRoutine.id,
                nombre: ex.nombre,
                grupo_muscular: ex.grupo_muscular,
                series: ex.series,
                repeticiones: ex.repeticiones,
                descanso_segundos: ex.descanso_segundos,
                dia_numero: ex.dia_numero || 1,
                orden: idx + 1,
                esta_completado: false
            }));

            await (supabase as any).from('rutina_ejercicios').insert(exercisesToInsert);

            toast.success(`¡Rutina "${goal.nombre}" activada exitosamente!`);
            setRoutine(newRoutine);
            setExercises(exercisesToInsert as any);
        } catch (err: any) {
            console.error('Error al activar rutina genérica:', err);
            toast.error('Error al asignar la rutina. Intenta nuevamente.');
        } finally {
            setLoading(false);
        }
    };

    if (!routine) {
        const genericGoals = [
            {
                id: 'hypertrophy',
                nombre: 'Hipertrofia 4 Días',
                objetivo: 'Masa Muscular',
                duracion: '60 min',
                dias: 4,
                icon: '🏋️',
                desc: 'Enfocado en volumen muscular, tensión mecánica y bombeo.',
                ejercicios: [
                    { nombre: 'Press de Banca Plano', grupo_muscular: 'Pecho', series: 4, repeticiones: '8-10', descanso_segundos: 90, dia_numero: 1 },
                    { nombre: 'Remo con Barra', grupo_muscular: 'Espalda', series: 4, repeticiones: '8-10', descanso_segundos: 90, dia_numero: 1 },
                    { nombre: 'Press Militar con Mancuernas', grupo_muscular: 'Hombros', series: 3, repeticiones: '10-12', descanso_segundos: 60, dia_numero: 1 },
                    { nombre: 'Curl de Biceps con Barra', grupo_muscular: 'Biceps', series: 3, repeticiones: '12-15', descanso_segundos: 60, dia_numero: 1 },
                    { nombre: 'Extensión de Triceps en Polea', grupo_muscular: 'Triceps', series: 3, repeticiones: '12-15', descanso_segundos: 60, dia_numero: 1 }
                ]
            },
            {
                id: 'fatloss',
                nombre: 'Pérdida de Grasa & Cardio',
                objetivo: 'Definición & HIIT',
                duracion: '45 min',
                dias: 4,
                icon: '🔥',
                desc: 'Circuitos metabólicos para maximizar la quema de calorías.',
                ejercicios: [
                    { nombre: 'Burpees Metabólicos', grupo_muscular: 'Full Body', series: 4, repeticiones: '15', descanso_segundos: 45, dia_numero: 1 },
                    { nombre: 'Kettlebell Swings', grupo_muscular: 'Cadena Posterior', series: 4, repeticiones: '20', descanso_segundos: 45, dia_numero: 1 },
                    { nombre: 'Mountain Climbers', grupo_muscular: 'Core', series: 4, repeticiones: '30 seg', descanso_segundos: 30, dia_numero: 1 },
                    { nombre: 'Sentadillas con Salto', grupo_muscular: 'Piernas', series: 4, repeticiones: '15', descanso_segundos: 45, dia_numero: 1 }
                ]
            },
            {
                id: 'strength',
                nombre: 'Fuerza Máxima 5x5',
                objetivo: 'Fuerza Bruta',
                duracion: '60 min',
                dias: 3,
                icon: '⚡',
                desc: 'Levantamientos pesados multiarticulares para ganancia de fuerza.',
                ejercicios: [
                    { nombre: 'Sentadilla Trasera Pesada', grupo_muscular: 'Piernas', series: 5, repeticiones: '5', descanso_segundos: 180, dia_numero: 1 },
                    { nombre: 'Press de Banca Pesado', grupo_muscular: 'Pecho', series: 5, repeticiones: '5', descanso_segundos: 180, dia_numero: 1 },
                    { nombre: 'Peso Muerto Convencional', grupo_muscular: 'Espalda/Piernas', series: 3, repeticiones: '5', descanso_segundos: 180, dia_numero: 1 }
                ]
            },
            {
                id: 'calisthenics',
                nombre: 'Calistenia & Peso Corporal',
                objetivo: 'Dominio Corporal',
                duracion: '50 min',
                dias: 4,
                icon: '🤸',
                desc: 'Ejercicios gimnásticos y control de peso corporal.',
                ejercicios: [
                    { nombre: 'Dominadas Pronas', grupo_muscular: 'Espalda', series: 4, repeticiones: '8-10', descanso_segundos: 90, dia_numero: 1 },
                    { nombre: 'Fondos en Paralelas', grupo_muscular: 'Pecho/Triceps', series: 4, repeticiones: '10-12', descanso_segundos: 90, dia_numero: 1 },
                    { nombre: 'Flexiones de Brazo Diamante', grupo_muscular: 'Triceps', series: 3, repeticiones: '12-15', descanso_segundos: 60, dia_numero: 1 },
                    { nombre: 'Elevación de Piernas Colgado', grupo_muscular: 'Core', series: 4, repeticiones: '12', descanso_segundos: 60, dia_numero: 1 }
                ]
            }
        ];

        return (
            <div className="min-h-screen bg-[#09090b] text-white p-6 md:p-12 font-rajdhani selection:bg-orange-500/30 pb-32">
                <div className="max-w-5xl mx-auto space-y-8">
                    <div className="text-center space-y-3">
                        <div className="inline-flex items-center gap-2 bg-orange-500/10 border border-orange-500/20 px-4 py-1.5 rounded-full text-orange-400 text-xs font-black uppercase tracking-[0.3em]">
                            <Sparkles size={14} /> Sin Plan Asignado por Coach
                        </div>
                        <h1 className="text-4xl md:text-5xl font-black italic uppercase tracking-tighter text-white">
                            Elige tu Rutina Genérica Táctica
                        </h1>
                        <p className="text-zinc-400 text-xs font-bold uppercase tracking-widest max-w-lg mx-auto">
                            Selecciona tu objetivo de entrenamiento actual para activar tu plan e iniciar inmediatamente en el WorkoutPlayer.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {genericGoals.map((goal) => (
                            <motion.div
                                key={goal.id}
                                whileHover={{ scale: 1.02, y: -4 }}
                                className="bg-zinc-900/60 border border-white/10 p-8 rounded-[2.5rem] space-y-6 relative overflow-hidden backdrop-blur-3xl shadow-2xl flex flex-col justify-between group"
                            >
                                <div className="space-y-4">
                                    <div className="flex justify-between items-start">
                                        <span className="text-4xl">{goal.icon}</span>
                                        <span className="bg-orange-500/10 border border-orange-500/20 px-3 py-1 rounded-full text-orange-400 text-[10px] font-black uppercase tracking-widest">
                                            {goal.dias} Días / Sem
                                        </span>
                                    </div>
                                    <div>
                                        <h3 className="text-2xl font-black text-white italic uppercase tracking-tighter">{goal.nombre}</h3>
                                        <p className="text-xs font-bold text-zinc-400 mt-1 leading-relaxed">{goal.desc}</p>
                                    </div>
                                    <div className="pt-4 border-t border-white/5 flex items-center justify-between text-xs text-zinc-500 font-bold uppercase tracking-widest">
                                        <span>Duración: {goal.duracion}</span>
                                        <span>{goal.ejercicios.length} Ejercicios Clave</span>
                                    </div>
                                </div>

                                <button
                                    onClick={() => handleSelectGenericRoutine(goal)}
                                    className="w-full py-4 bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-400 hover:to-red-500 text-white font-black rounded-2xl text-xs uppercase italic tracking-[0.2em] shadow-xl shadow-orange-500/20 transition-all flex items-center justify-center gap-2 group-hover:scale-[1.02]"
                                >
                                    <Play size={16} className="fill-white" /> ACTIVAR RUTINA Y EMPEZAR ➜
                                </button>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    const progress = dayExercises.length > 0 ? (dayExercises.filter(ex => ex.esta_completado).length / dayExercises.length) * 100 : 0;

    return (
        <SecureRoutineViewer routineId={routine.id} userId={userId}>
            <div className="min-h-screen bg-[#09090b] text-white relative overflow-x-hidden p-6 md:p-12 pb-32">
                {/* Tactical Backdrop */}
                <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-orange-600/5 rounded-full blur-[150px] pointer-events-none" />
                <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-cyan-600/5 rounded-full blur-[150px] pointer-events-none" />

                <div className="max-w-6xl mx-auto relative z-10 space-y-12">
                    {/* Header Card Elite */}
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="relative overflow-hidden rounded-[4rem] p-12 bg-zinc-900 border border-white/10 shadow-2xl group"
                    >
                        <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-gradient-to-br from-orange-500/10 to-transparent rounded-full blur-[80px] -mr-32 -mt-32 pointer-events-none" />

                        <div className="relative z-10 flex flex-col xl:flex-row gap-12 items-center xl:items-start justify-between">
                            <div className="space-y-6 text-center xl:text-left">
                                <div className="flex items-center justify-center xl:justify-start gap-3">
                                    <div className="w-10 h-10 bg-orange-500/10 rounded-2xl flex items-center justify-center border border-orange-500/20 shadow-inner">
                                        <Sword size={20} className="text-orange-500" />
                                    </div>
                                    <span className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.4em]">Tactical Plan v1.0</span>
                                </div>

                                <div>
                                    <h1 className="text-5xl md:text-7xl font-black text-white italic tracking-tighter uppercase leading-none">
                                        {routine.nombre}
                                    </h1>
                                    <div className="flex flex-wrap justify-center xl:justify-start gap-4 mt-8">
                                        <div className="bg-black/40 px-5 py-2.5 rounded-full border border-white/5 flex items-center gap-3">
                                            <Calendar size={14} className="text-zinc-500" />
                                            <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">{routine.duracion_semanas} Semanas</span>
                                        </div>
                                        <div className="bg-black/40 px-5 py-2.5 rounded-full border border-white/5 flex items-center gap-3">
                                            <Target size={14} className="text-zinc-500" />
                                            <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">{routine.objetivo}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="flex flex-col items-center xl:items-end gap-4 min-w-[280px]">
                                <div className="bg-black/40 p-8 rounded-[3rem] border border-white/5 backdrop-blur-3xl shadow-2xl w-full">
                                    <p className="text-[10px] font-black text-zinc-600 uppercase tracking-[0.2em] mb-4 text-center">Bio-Status Alumno</p>
                                    <div className="flex items-center justify-between mb-4">
                                        <span className="text-xs font-bold text-zinc-400">Progreso Diario</span>
                                        <span className={`text-xl font-black italic tracking-tighter ${progress === 100 ? 'text-emerald-400' : 'text-white'}`}>
                                            {Math.round(progress)}%
                                        </span>
                                    </div>
                                    <div className="h-2 bg-black/60 rounded-full overflow-hidden border border-white/5 relative">
                                        <motion.div
                                            initial={{ width: 0 }}
                                            animate={{ width: `${progress}%` }}
                                            transition={{ type: "spring", bounce: 0, duration: 1.5 }}
                                            className={`h-full bg-gradient-to-r ${progress === 100 ? 'from-emerald-500 to-teal-400' : 'from-orange-500 to-red-500'} shadow-[0_0_15px_rgba(255,255,255,0.1)]`}
                                        />
                                    </div>
                                    <p className="mt-4 text-[10px] font-black text-zinc-500 uppercase tracking-widest text-center">
                                        {dayExercises.filter(ex => ex.esta_completado).length} / {dayExercises.length} Módulos OK
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Scanline Effect */}
                        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-white/5 to-transparent h-[2px] w-full animate-scanline pointer-events-none opacity-10" />
                    </motion.div>

                    {/* Medical Alert Elite */}
                    <AnimatePresence>
                        {routine.consideraciones_medicas && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                className="bg-amber-500/5 backdrop-blur-3xl border border-amber-500/20 rounded-[2.5rem] p-8 flex items-start gap-6 relative overflow-hidden group"
                            >
                                <div className="absolute top-0 right-0 p-8 opacity-5">
                                    <Info className="w-24 h-24 text-amber-500" />
                                </div>
                                <div className="w-14 h-14 bg-amber-500/10 rounded-2xl flex items-center justify-center border border-amber-500/20 shadow-inner shrink-0">
                                    <Activity size={24} className="text-amber-500" />
                                </div>
                                <div className="relative z-10 py-1">
                                    <h3 className="text-amber-500 font-black uppercase text-xs tracking-[0.3em] mb-2">Restricciones Técnicas</h3>
                                    <p className="text-amber-200/80 font-medium italic leading-relaxed text-sm md:text-base">
                                        "{routine.consideraciones_medicas}"
                                    </p>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Day Selector Elite */}
                    <div className="bg-zinc-900 border border-white/5 rounded-[3rem] p-10 shadow-2xl relative overflow-hidden">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
                            <div className="space-y-1">
                                <h3 className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.4em]">Fase de Operación</h3>
                                <p className="text-2xl font-black text-white italic tracking-tighter uppercase leading-none">Seleccionar Día</p>
                            </div>
                            <div className="flex gap-4 overflow-x-auto pb-4 md:pb-0 scrollbar-hide">
                                {Array.from({ length: totalDays }, (_, i) => i + 1).map(day => (
                                    <button
                                        key={day}
                                        onClick={() => setSelectedDay(day)}
                                        className={`px-8 py-5 rounded-[1.5rem] font-black uppercase italic text-xs tracking-[0.2em] transition-all transform flex items-center gap-3 ${selectedDay === day
                                            ? 'bg-orange-500 text-white shadow-xl shadow-orange-500/20 scale-105 border-transparent'
                                            : 'bg-black/40 text-zinc-500 border border-white/5 hover:border-orange-500/30 hover:text-orange-400'
                                            }`}
                                    >
                                        <Calendar size={14} className={selectedDay === day ? 'text-white' : 'text-zinc-700'} />
                                        Día {day}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Exercises List Elite */}
                    <motion.div
                        variants={container}
                        initial="hidden"
                        animate="show"
                        className="grid grid-cols-1 gap-6"
                    >
                        {dayExercises.length === 0 ? (
                            <div className="text-center py-32 bg-zinc-900/40 rounded-[4rem] border border-white/5 border-dashed flex flex-col items-center">
                                <div className="w-20 h-20 bg-black/40 rounded-3xl flex items-center justify-center border border-white/5 mb-8 text-zinc-800">
                                    <Activity size={32} />
                                </div>
                                <p className="text-zinc-500 font-black uppercase tracking-[0.3em] text-sm mb-2 italic">Descanso de Campo</p>
                                <p className="text-zinc-600 text-xs font-bold uppercase">Sin objetivos tácticos para hoy.</p>
                            </div>
                        ) : (
                            dayExercises.map((exercise, index) => (
                                <motion.div
                                    variants={item}
                                    key={exercise.id}
                                    className={`relative group rounded-[3rem] p-10 border transition-all duration-500 ${exercise.esta_completado
                                        ? 'bg-emerald-500/5 border-emerald-500/20 shadow-emerald-500/5'
                                        : 'bg-zinc-900 border-white/5 hover:border-orange-500/30 hover:shadow-orange-500/5 shadow-2xl'
                                        }`}
                                >
                                    <div className="flex flex-col lg:flex-row items-start lg:items-center gap-10">
                                        {/* Status Button Elite */}
                                        <button
                                            onClick={() => toggleExerciseComplete(exercise.id)}
                                            className={`w-20 h-20 rounded-[1.5rem] flex items-center justify-center flex-shrink-0 transition-all duration-500 transform group-hover:scale-110 shadow-2xl border-2 ${exercise.esta_completado
                                                ? 'bg-emerald-500 border-emerald-400/50 text-white shadow-emerald-500/30'
                                                : 'bg-black/60 border-white/5 text-zinc-700 hover:border-orange-500/50 hover:text-white group-hover:shadow-orange-500/20'
                                                }`}
                                        >
                                            {exercise.esta_completado ? (
                                                <CheckCircle2 size={32} strokeWidth={3} />
                                            ) : (
                                                <Circle size={32} strokeWidth={2} />
                                            )}
                                        </button>

                                        {/* Content Elite */}
                                        <div className="flex-1 space-y-6">
                                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                                <div className="space-y-1">
                                                    <h4 className={`text-3xl font-black italic tracking-tighter uppercase transition-colors ${exercise.esta_completado ? 'text-emerald-500 line-through decoration-emerald-500/30' : 'text-white group-hover:text-orange-500'}`}>
                                                        {exercise.nombre}
                                                    </h4>
                                                    <div className="flex items-center gap-3">
                                                        <span className="text-[10px] font-black text-zinc-600 uppercase tracking-widest">ID: MOD-{index + 1}</span>
                                                        {exercise.grupo_muscular && (
                                                            <>
                                                                <div className="w-1 h-1 rounded-full bg-zinc-800" />
                                                                <span className="text-[10px] font-black text-orange-500/80 uppercase tracking-widest">{exercise.grupo_muscular}</span>
                                                            </>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    {exercise.url_video && (
                                                        <button className="bg-white/5 hover:bg-orange-500 text-zinc-400 hover:text-white px-5 py-2.5 rounded-xl flex items-center gap-3 border border-white/5 transition-all text-[10px] font-black uppercase tracking-widest">
                                                            <Play size={12} fill="currentColor" /> ANALIZAR TÉCNICA
                                                        </button>
                                                    )}
                                                </div>
                                            </div>

                                            {exercise.descripcion && (
                                                <p className="text-zinc-500 font-medium leading-relaxed text-sm md:text-base italic max-w-3xl">
                                                    {exercise.descripcion}
                                                </p>
                                            )}

                                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                                {[
                                                    { label: 'Series', value: exercise.series, icon: Activity, color: 'text-blue-500' },
                                                    { label: 'Rpm', value: exercise.repeticiones, icon: Zap, color: 'text-yellow-500' },
                                                    { label: 'Descanso', value: exercise.descanso_segundos ? `${exercise.descanso_segundos}s` : null, icon: Calendar, color: 'text-cyan-500' },
                                                    { label: 'Equip', value: exercise.equipamiento?.length ? 'REQ' : null, icon: Dumbbell, color: 'text-purple-500' }
                                                ].filter(stat => stat.value).map((stat, i) => (
                                                    <div key={i} className="bg-black/40 rounded-2xl p-5 border border-white/5 flex items-center gap-4 group/stat hover:border-white/10 transition-colors">
                                                        <stat.icon size={18} className={`${stat.color} group-hover:scale-110 transition-transform`} />
                                                        <div>
                                                            <p className="text-[10px] text-zinc-600 uppercase font-black tracking-widest leading-none mb-1">{stat.label}</p>
                                                            <p className="text-white font-black italic tracking-tighter text-lg">{stat.value}</p>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>

                                            {exercise.instrucciones && (
                                                <div className="bg-black/20 rounded-2xl p-6 border-l-4 border-orange-500/30">
                                                    <div className="flex items-center gap-3 mb-2">
                                                        <Info size={14} className="text-orange-500" />
                                                        <span className="text-[10px] font-black text-orange-500/50 uppercase tracking-[0.2em]">Briefing de Ejecución</span>
                                                    </div>
                                                    <p className="text-sm text-zinc-400 font-medium italic">"{exercise.instrucciones}"</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Hover Ornament */}
                                    <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-white/5 to-transparent rounded-full -mr-16 -mt-16 blur-2xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                                </motion.div>
                            ))
                        )}
                    </motion.div>
                </div>

                {/* Bottom Stats Floating Widget */}
                <motion.div
                    initial={{ y: 100 }}
                    animate={{ y: 0 }}
                    className="fixed bottom-10 left-1/2 -translate-x-1/2 z-50 px-8 py-5 bg-zinc-900/80 backdrop-blur-3xl border border-white/10 rounded-full shadow-2xl flex items-center gap-10 min-w-[320px] justify-center"
                >
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-emerald-500/20 rounded-xl flex items-center justify-center border border-emerald-500/30 shadow-inner">
                            <Trophy size={18} className="text-emerald-500" />
                        </div>
                        <div className="text-left">
                            <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest leading-none mb-1">XP Ganada</p>
                            <p className="text-lg font-black text-white italic tracking-tighter leading-none">+{Math.round(progress * 1.5)} pts</p>
                        </div>
                    </div>
                    <div className="w-[1px] h-8 bg-zinc-800" />
                    <div className="flex items-center gap-4 text-left">
                        <div className="w-10 h-10 bg-orange-500/10 rounded-xl flex items-center justify-center border border-orange-500/20 shadow-inner">
                            <Zap size={18} className="text-orange-500" />
                        </div>
                        <div className="text-left">
                            <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest leading-none mb-1">Intensidad</p>
                            <p className="text-lg font-black text-white italic tracking-tighter leading-none">HIGH</p>
                        </div>
                    </div>
                </motion.div>
            </div>
        </SecureRoutineViewer>
    );
}
