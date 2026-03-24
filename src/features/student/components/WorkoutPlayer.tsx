'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { WorkoutSessionState, ExerciseLog } from '@/types/workout';

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
    ejercicios: Exercise[];
}

interface WorkoutPlayerProps {
    routine: Routine;
    onClose: () => void;
    onComplete: (session: { id: string; total_points: number }) => void;
}

export default function WorkoutPlayer({ routine, onClose, onComplete }: WorkoutPlayerProps) {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [sessionId, setSessionId] = useState<string | null>(null);
    const [isResting, setIsResting] = useState(false);
    const [restTimeLeft, setRestTimeLeft] = useState(0);
    const [sessionStatus, setSessionStatus] = useState<'loading' | 'active' | 'completed'>('loading');

    const [currentWeight, setCurrentWeight] = useState<string>('');
    // Tracking actual performance
    const [currentReps, setCurrentReps] = useState<string>('');

    const restTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const currentExercise = routine.ejercicios[currentIndex];

    // 1. Initialize Session
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
                    alert('Error al iniciar sesión: ' + (data.error || 'Desconocido'));
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

    // 2. Timer Logic
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

    const handleNextExercise = async () => {
        // Log performance for current exercise
        if (sessionId && currentExercise) {
            await fetch('/api/student/sessions/log-exercise', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    sessionId,
                    ejercicio_id: currentExercise.id,
                    series_reales: currentExercise.series,
                    repeticiones_reales: currentReps || currentExercise.repeticiones,
                    peso_real: parseFloat(currentWeight) || 0,
                    fue_completado: true
                })
            });
        }

        if (currentIndex < routine.ejercicios.length - 1) {
            setCurrentIndex(prev => prev + 1);
            setCurrentWeight('');
            setCurrentReps('');

            // Start rest period if configured
            if (currentExercise.descanso_segundos > 0) {
                setRestTimeLeft(currentExercise.descanso_segundos);
                setIsResting(true);
            }
        } else {
            handleCompleteSession();
        }
    };

    const handleCompleteSession = async () => {
        setSessionStatus('loading');
        try {
            const res = await fetch('/api/student/sessions/complete', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    sessionId,
                    totalPoints: 500, // This should be calculated based on logs
                    moodRating: 5
                })
            });
            const data = await res.json();
            if (res.ok) {
                setSessionStatus('completed');
                onComplete(data.session);
            }
        } catch (err) {
            console.error('Error completing session:', err);
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
                <motion.div initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
                    <h2 className="text-5xl mb-4">🏆</h2>
                    <h3 className="text-2xl font-black text-white mb-2 uppercase italic">¡Entrenamiento Completado!</h3>
                    <p className="text-orange-500 font-bold text-lg mb-8">+500 PTS GANADOS</p>
                    <button
                        onClick={onClose}
                        className="px-8 py-3 bg-white text-black font-black rounded-xl hover:bg-orange-500 hover:text-white transition-all"
                    >
                        VOLVER AL DASHBOARD
                    </button>
                </motion.div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 bg-[#0a0a0a] z-50 flex flex-col overflow-hidden">
            {/* Header */}
            <div className="p-4 flex items-center justify-between border-b border-white/5">
                <button onClick={onClose} className="text-gray-500 hover:text-white">✕</button>
                <div className="flex flex-col items-center">
                    <span className="text-[10px] text-gray-500 font-black uppercase tracking-widest">Ejecución en vivo</span>
                    <h4 className="text-white font-bold text-sm">{routine.nombre}</h4>
                </div>
                <div className="w-8" />
            </div>

            {/* Progress Bar */}
            <div className="h-1 w-full bg-white/5">
                <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${((currentIndex + 1) / routine.ejercicios.length) * 100}%` }}
                    className="h-full bg-orange-500 shadow-[0_0_10px_rgba(249,115,22,0.5)]"
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
                        <div className="mb-8">
                            <span className="text-[10px] text-orange-500 font-black uppercase tracking-widest">
                                {currentExercise.grupo_muscular || 'CORE'} • {currentIndex + 1}/{routine.ejercicios.length}
                            </span>
                            <h2 className="text-4xl font-black text-white italic uppercase tracking-tighter leading-none mt-2">
                                {currentExercise.nombre}
                            </h2>
                            <p className="text-gray-500 text-sm mt-4 leading-relaxed line-clamp-3">
                                {currentExercise.instrucciones}
                            </p>
                        </div>

                        {/* Visual Target */}
                        <div className="grid grid-cols-2 gap-4 mb-8">
                            <div className="bg-white/5 p-6 rounded-2xl border border-white/5 flex flex-col items-center justify-center">
                                <span className="text-[10px] text-gray-500 font-bold uppercase mb-1">Series</span>
                                <span className="text-4xl font-black text-white">{currentExercise.series}</span>
                            </div>
                            <div className="bg-white/5 p-6 rounded-2xl border border-white/5 flex flex-col items-center justify-center">
                                <span className="text-[10px] text-gray-500 font-bold uppercase mb-1">Repeticiones</span>
                                <span className="text-4xl font-black text-white">{currentExercise.repeticiones}</span>
                            </div>
                        </div>

                        {/* Performance Input */}
                        <div className="bg-gradient-to-br from-orange-500/10 to-transparent p-6 rounded-3xl border border-orange-500/20 mb-8">
                            <h5 className="text-white font-black text-xs uppercase mb-4 tracking-widest">Log de Esfuerzo</h5>
                            <div className="flex gap-4">
                                <div className="flex-1">
                                    <label className="text-[9px] text-gray-500 font-bold uppercase block mb-2">Peso (kg)</label>
                                    <input
                                        type="number"
                                        value={currentWeight}
                                        onChange={(e) => setCurrentWeight(e.target.value)}
                                        placeholder="0"
                                        className="w-full bg-black/50 border border-white/10 p-4 rounded-xl text-white font-black text-center focus:border-orange-500 outline-none"
                                    />
                                </div>
                                <div className="flex-1">
                                    <label className="text-[9px] text-gray-500 font-bold uppercase block mb-2">Reps Reales</label>
                                    <input
                                        type="text"
                                        value={currentReps}
                                        onChange={(e) => setCurrentReps(e.target.value)}
                                        placeholder={currentExercise.repeticiones}
                                        className="w-full bg-black/50 border border-white/10 p-4 rounded-xl text-white font-black text-center focus:border-orange-500 outline-none"
                                    />
                                </div>
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
                        className="absolute inset-0 bg-blue-600/90 z-40 flex flex-col items-center justify-center p-6 text-center backdrop-blur-md"
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

            {/* Main Action Bar */}
            <div className="p-6 bg-[#1c1c1e] border-t border-white/5">
                <button
                    onClick={handleNextExercise}
                    className="w-full py-5 bg-orange-500 hover:bg-orange-600 text-white font-black rounded-2xl shadow-xl shadow-orange-500/20 transition-all flex items-center justify-center gap-3"
                >
                    {currentIndex < routine.ejercicios.length - 1 ? 'SIGUIENTE EJERCICIO ➜' : 'FINALIZAR ENTRENAMIENTO 🎉'}
                </button>
            </div>
        </div>
    );
}
