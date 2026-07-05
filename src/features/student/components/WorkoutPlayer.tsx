'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-hot-toast';

interface Exercise {
    id: string;
    nombre: string;
    descripcion: string;
    instrucciones: string;
    series: number;
    repeticiones: string;
    descanso_segundos: number;
    equipamiento: string[];
    grupo_muscular?: string;
    tempo?: string;
}

interface Routine {
    id: string;
    nombre: string;
    permitir_edicion_alumno?: boolean;
    ejercicios: Exercise[];
}

interface WorkoutPlayerProps {
    routine: Routine;
    onClose: () => void;
    onComplete: (session: { id: string; total_points: number }) => void;
}

interface SetRecord {
    set_numero: number;
    reps_realizadas: number;
    peso_kg: number;
    completed: boolean;
}

export default function WorkoutPlayer({ routine, onClose, onComplete }: WorkoutPlayerProps) {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [sessionId, setSessionId] = useState<string | null>(null);
    const [isResting, setIsResting] = useState(false);
    const [restTimeLeft, setRestTimeLeft] = useState(0);
    const [sessionStatus, setSessionStatus] = useState<'loading' | 'active' | 'completed'>('loading');
    const [earnedPoints, setEarnedPoints] = useState(0);
    
    // Telemetría fina de sets para el ejercicio actual
    const [setsData, setSetsData] = useState<SetRecord[]>([]);
    
    // Acumulador de volumen de la sesión
    const [totalSessionVolume, setTotalSessionVolume] = useState(0);

    const restTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const currentExercise = routine.ejercicios[currentIndex];

    // 1. Iniciar sesión
    useEffect(() => {
        const startSession = async () => {
            try {
                const res = await fetch('/api/student/sessions/start', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ routineId: routine.id })
                });
                const data = await res.json();
                if (res.ok && data.session) {
                    setSessionId(data.session.id);
                    setSessionStatus('active');
                } else {
                    toast.error('Error al iniciar sesión: ' + (data.error || 'Desconocido'));
                    onClose();
                }
            } catch (err) {
                console.error('Failed to start session:', err);
                onClose();
            }
        };

        startSession();
        return () => {
            if (restTimerRef.current) clearInterval(restTimerRef.current);
        };
    }, [routine.id]);

    // 2. Lógica del timer de descanso
    useEffect(() => {
        if (isResting && restTimeLeft > 0) {
            restTimerRef.current = setInterval(() => {
                setRestTimeLeft(prev => {
                    if (prev <= 1) {
                        setIsResting(false);
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
        } else {
            if (restTimerRef.current) clearInterval(restTimerRef.current);
        }
        return () => {
            if (restTimerRef.current) clearInterval(restTimerRef.current);
        };
    }, [isResting, restTimeLeft]);

    // 3. Inicializar sets para el ejercicio actual
    useEffect(() => {
        if (!currentExercise) return;
        
        const count = currentExercise.series || 3;
        const defaultReps = parseInt(currentExercise.repeticiones) || 10;
        
        const initialSets = Array.from({ length: count }, (_, i) => ({
            set_numero: i + 1,
            reps_realizadas: defaultReps,
            peso_kg: 0,
            completed: false
        }));
        
        setSetsData(initialSets);
    }, [currentIndex, currentExercise]);

    const handleNextExercise = async () => {
        // Calcular volumen del ejercicio actual
        const currentExerciseVolume = setsData.reduce((acc, s) => acc + (s.reps_realizadas * s.peso_kg), 0);
        const newTotalVolume = totalSessionVolume + currentExerciseVolume;
        setTotalSessionVolume(newTotalVolume);

        // Guardar sets en la base de datos
        if (sessionId && currentExercise) {
            try {
                const setsToLog = setsData.map(s => ({
                    set_numero: s.set_numero,
                    reps_realizadas: s.reps_realizadas,
                    peso_kg: s.peso_kg
                }));

                await fetch('/api/student/sessions/log-set', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        sessionId,
                        exerciseId: currentExercise.id,
                        sets: setsToLog
                    })
                });
            } catch (err) {
                console.error('Error logging sets performance:', err);
            }
        }

        if (currentIndex < routine.ejercicios.length - 1) {
            setCurrentIndex(prev => prev + 1);

            // Iniciar descanso si está programado
            if (currentExercise.descanso_segundos > 0) {
                setRestTimeLeft(currentExercise.descanso_segundos);
                setIsResting(true);
            }
        } else {
            // Completar sesión
            // 100 base + 1 por cada 10kg volumen, max 800
            const calculatedPoints = Math.min(800, 100 + Math.floor(newTotalVolume / 10));
            setEarnedPoints(calculatedPoints);
            await handleCompleteSession(calculatedPoints);
        }
    };

    const handleCompleteSession = async (points: number) => {
        setSessionStatus('loading');
        try {
            const res = await fetch('/api/student/sessions/complete', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    sessionId,
                    totalPoints: points,
                    moodRating: 5
                })
            });
            const data = await res.json();
            if (res.ok) {
                setSessionStatus('completed');
            } else {
                throw new Error(data.error || 'Error al guardar la sesión');
            }
        } catch (err: any) {
            console.error('Error completing session:', err);
            toast.error(err.message || 'Fallo de comunicación con la central táctica.');
            setSessionStatus('completed');
        }
    };

    if (sessionStatus === 'loading') {
        return (
            <div className="fixed inset-0 bg-black z-50 flex flex-col items-center justify-center">
                <div className="w-16 h-16 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mb-4" />
                <p className="text-white font-black tracking-widest uppercase text-sm">Preparando Sesión...</p>
            </div>
        );
    }

    if (sessionStatus === 'completed') {
        return (
            <div className="fixed inset-0 bg-black z-50 flex flex-col items-center justify-center p-6 text-center">
                <motion.div initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="max-w-md w-full bg-[#1c1c1e] p-8 rounded-[2.5rem] border border-white/10">
                    <h2 className="text-5xl mb-4">🏆</h2>
                    <h3 className="text-2xl font-black text-white mb-2 uppercase italic tracking-tight">¡Entrenamiento Completado!</h3>
                    <p className="text-orange-500 font-bold text-lg mb-6">+{earnedPoints} PTS GANADOS</p>
                    
                    <div className="bg-black/40 border border-white/5 rounded-2xl p-6 mb-8 text-left space-y-3">
                        <div className="flex justify-between text-xs">
                            <span className="text-gray-400 font-bold uppercase">Ejercicios:</span>
                            <span className="text-white font-black">{routine.ejercicios.length}</span>
                        </div>
                        <div className="flex justify-between text-xs">
                            <span className="text-gray-400 font-bold uppercase">Volumen Total:</span>
                            <span className="text-white font-black">{(totalSessionVolume / 1000).toFixed(2)} Ton ({totalSessionVolume} kg)</span>
                        </div>
                    </div>

                    <button
                        onClick={() => onComplete({ id: sessionId || '', total_points: earnedPoints })}
                        className="w-full py-4 bg-orange-500 text-white font-black rounded-2xl hover:bg-orange-600 transition-all uppercase tracking-widest text-xs"
                    >
                        VOLVER AL DASHBOARD
                    </button>
                </motion.div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 bg-[#0a0a0a] z-50 flex flex-col overflow-hidden font-rajdhani">
            {/* Header */}
            <div className="p-4 flex items-center justify-between border-b border-white/5">
                <button onClick={onClose} className="text-gray-500 hover:text-white text-xl px-2">✕</button>
                <div className="flex flex-col items-center">
                    <span className="text-[9px] text-gray-500 font-black uppercase tracking-widest">Ejecución en vivo</span>
                    <h4 className="text-white font-black text-sm uppercase italic">{routine.nombre}</h4>
                </div>
                <div className="w-8" />
            </div>

            {/* Progress Bar */}
            <div className="h-1.5 w-full bg-white/5">
                <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${((currentIndex + 1) / routine.ejercicios.length) * 100}%` }}
                    className="h-full bg-gradient-to-r from-orange-500 to-red-500 shadow-[0_0_10px_rgba(249,115,22,0.5)]"
                />
            </div>

            <div className="flex-1 overflow-y-auto p-6 flex flex-col">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={currentIndex}
                        initial={{ x: 50, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        exit={{ x: -50, opacity: 0 }}
                        className="flex-1 flex flex-col"
                    >
                        {/* Exercise Name & Info */}
                        <div className="mb-6">
                            <span className="text-[10px] text-orange-500 font-black uppercase tracking-widest">
                                {currentExercise.grupo_muscular || 'CORE'} • {currentIndex + 1}/{routine.ejercicios.length}
                            </span>
                            <h2 className="text-3xl font-black text-white italic uppercase tracking-tighter leading-none mt-1">
                                {currentExercise.nombre}
                            </h2>
                            <p className="text-zinc-500 text-xs mt-3 leading-relaxed">
                                {currentExercise.instrucciones || currentExercise.descripcion}
                            </p>
                        </div>

                        {/* Prescribed Goals */}
                        <div className="grid grid-cols-2 gap-4 mb-6">
                            <div className="bg-white/5 p-4 rounded-2xl border border-white/5 flex flex-col items-center justify-center">
                                <span className="text-[9px] text-gray-500 font-black uppercase mb-0.5">Series Prescritas</span>
                                <span className="text-3xl font-black text-white">{currentExercise.series}</span>
                            </div>
                            <div className="bg-white/5 p-4 rounded-2xl border border-white/5 flex flex-col items-center justify-center">
                                <span className="text-[9px] text-gray-500 font-black uppercase mb-0.5">Reps Prescritas</span>
                                <span className="text-3xl font-black text-white">{currentExercise.repeticiones}</span>
                            </div>
                        </div>

                        {/* Performance Input — Individual Sets */}
                        <div className="bg-gradient-to-br from-orange-500/10 to-transparent p-6 rounded-3xl border border-orange-500/20 mb-6 space-y-4">
                            <div className="flex items-center justify-between">
                                <h5 className="text-white font-black text-xs uppercase tracking-widest">Sets & Telemetría</h5>
                                {routine.permitir_edicion_alumno ? (
                                    <span className="text-[9px] bg-green-500/10 text-green-400 border border-green-500/20 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">Edición Libre</span>
                                ) : (
                                    <span className="text-[9px] bg-zinc-500/10 text-zinc-400 border border-zinc-500/20 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">Plan Prescrito</span>
                                )}
                            </div>
                            
                            <div className="space-y-3">
                                {setsData.map((set, sIdx) => (
                                    <div key={set.set_numero} className="flex items-center gap-4 bg-black/40 p-3 rounded-2xl border border-white/5">
                                        <span className="text-xs font-black text-orange-500 w-8">SET {set.set_numero}</span>
                                        
                                        <div className="flex-1 flex gap-2">
                                            <div className="flex-1 flex items-center gap-1.5 bg-black/60 px-3 py-1.5 rounded-xl border border-white/5">
                                                <span className="text-[9px] text-gray-500 uppercase font-black">Reps</span>
                                                <input
                                                    type="number"
                                                    disabled={!routine.permitir_edicion_alumno}
                                                    value={set.reps_realizadas}
                                                    onChange={(e) => {
                                                        const val = parseInt(e.target.value) || 0;
                                                        setSetsData(prev => prev.map((s, idx) => idx === sIdx ? { ...s, reps_realizadas: val } : s));
                                                    }}
                                                    className="w-full bg-transparent text-white font-black text-center outline-none text-xs disabled:opacity-60"
                                                />
                                            </div>

                                            <div className="flex-1 flex items-center gap-1.5 bg-black/60 px-3 py-1.5 rounded-xl border border-white/5">
                                                <span className="text-[9px] text-gray-500 uppercase font-black">Kg</span>
                                                <input
                                                    type="number"
                                                    disabled={!routine.permitir_edicion_alumno}
                                                    value={set.peso_kg}
                                                    onChange={(e) => {
                                                        const val = parseFloat(e.target.value) || 0;
                                                        setSetsData(prev => prev.map((s, idx) => idx === sIdx ? { ...s, peso_kg: val } : s));
                                                    }}
                                                    className="w-full bg-transparent text-white font-black text-center outline-none text-xs disabled:opacity-60"
                                                />
                                            </div>
                                        </div>

                                        <button
                                            onClick={() => {
                                                setSetsData(prev => prev.map((s, idx) => idx === sIdx ? { ...s, completed: !s.completed } : s));
                                            }}
                                            className={`w-8 h-8 rounded-xl flex items-center justify-center border transition-all ${
                                                set.completed 
                                                    ? 'bg-orange-500 border-orange-500 text-white shadow-lg shadow-orange-500/20 font-black' 
                                                    : 'border-white/10 text-zinc-500 hover:border-white/20 font-black'
                                            }`}
                                        >
                                            ✓
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </motion.div>
                </AnimatePresence>
            </div>

            {/* Rest Overlay */}
            <AnimatePresence>
                {isResting && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 bg-blue-900/95 z-40 flex flex-col items-center justify-center p-6 text-center backdrop-blur-md"
                    >
                        <h4 className="text-white font-black text-sm uppercase tracking-widest mb-2">Descanso Activo</h4>
                        <span className="text-8xl font-black text-white tabular-nums">{restTimeLeft}s</span>
                        <p className="text-blue-200 text-xs mt-4">Prepárate para: {routine.ejercicios[currentIndex]?.nombre}</p>
                        <button
                            onClick={() => setIsResting(false)}
                            className="mt-8 text-white/50 text-xs font-bold uppercase tracking-widest hover:text-white"
                        >
                            Saltar Descanso
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Action Bar */}
            <div className="p-6 bg-[#1c1c1e] border-t border-white/5">
                <button
                    onClick={handleNextExercise}
                    className="w-full py-4 bg-orange-500 hover:bg-orange-600 text-white font-black rounded-2xl shadow-xl shadow-orange-500/20 transition-all flex items-center justify-center gap-3 uppercase tracking-widest text-xs"
                >
                    {currentIndex < routine.ejercicios.length - 1 ? 'Siguiente Ejercicio ➜' : 'Finalizar Entrenamiento 🎉'}
                </button>
            </div>
        </div>
    );
}
