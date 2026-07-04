'use client';

import React from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { Sword, Zap, Target, Apple, ChevronRight, Activity, Loader2 } from 'lucide-react';
import WorkoutPlayer from './WorkoutPlayer';
import { EliteCard } from '@/components/ui/EliteCard';
import { EliteButton } from '@/components/ui/EliteButton';
import { cn } from '@/lib/utils';


import { StudentRoutine, ItemVariants, RoutineExercise } from '@/types/student-components';

interface RoutinePreviewProps {
    routine: StudentRoutine;
    handleGoalModal: (isOpen: boolean) => void;
    isRequesting: boolean;
    itemVariants: ItemVariants;
    getLink?: (path: string) => string;
    onComplete?: () => void;
}

export function RoutinePreview({ routine, handleGoalModal, isRequesting, itemVariants, getLink, onComplete }: RoutinePreviewProps) {
    const [isPlayerOpen, setIsPlayerOpen] = React.useState(false);

    const handleComplete = (data: any) => {
        if (onComplete) {
            onComplete();
        }
    };

    return (
        <>
            <EliteCard
                variants={itemVariants}
                variant={routine ? 'cyan' : 'default'}
                accent="top"
                className="p-0 group h-full"
            >
                {/* Tactical Backdrop Decoration */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-tactical-cyan/5 rounded-full blur-[100px] -mr-32 -mt-32 group-hover:bg-tactical-cyan/10 transition-colors pointer-events-none" />

                <div className="flex justify-between items-start mb-10 relative z-10 px-10 pt-10">
                    <div className="space-y-1">
                        <div className="flex items-center gap-2 mb-1">
                            <Sword size={14} className="text-tactical-cyan" />
                            <span className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.4em] font-rajdhani">Operación Activa</span>
                        </div>
                        <h3 className="text-3xl font-rajdhani font-black text-white italic tracking-tighter uppercase whitespace-pre-line leading-none">
                            Misión:<br /><span className="text-tactical-cyan">Entrenamiento</span>
                        </h3>
                    </div>
                </div>

                {routine ? (
                    <div className="relative z-10 space-y-8 px-10 pb-10">
                        <div className="bg-black/40 border border-white/5 rounded-[2rem] p-8 transition-all hover:border-tactical-cyan/30 shadow-inner group/card">
                            <div className="flex justify-between items-center mb-6">
                                <div className="space-y-1">
                                    <span className="text-xl font-rajdhani font-black text-white italic tracking-tighter uppercase leading-none">{routine.nombre}</span>
                                    <p className="text-zinc-600 text-[9px] font-black uppercase tracking-[0.2em]">{routine.objetivo || 'Sin objetivo definido'}</p>
                                </div>
                                <span className={cn(
                                    "text-[9px] font-black px-3 py-1 rounded-full border uppercase tracking-widest transition-all",
                                    "bg-emerald-500/10 text-emerald-400 border-emerald-500/30 animate-pulse"
                                )}>Active</span>
                            </div>

                            <div className="space-y-4">
                                {routine.ejercicios?.slice(0, 3).map((exercise: RoutineExercise, i: number) => (
                                    <div key={i} className="flex items-center gap-4 group/item">
                                        <div className="w-8 h-8 rounded-xl bg-white/5 flex items-center justify-center text-[10px] font-black text-zinc-600 border border-white/5 group-hover/item:border-tactical-cyan/50 group-hover/item:text-tactical-cyan transition-all">
                                            0{i + 1}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-bold text-zinc-300 truncate group-hover/item:text-white transition-colors">{exercise.nombre}</p>
                                            <p className="text-[10px] text-zinc-700 font-black uppercase tracking-widest">{exercise.series} Series • {exercise.repeticiones} Reps</p>
                                        </div>
                                    </div>
                                ))}
                                {routine.ejercicios?.length > 3 && (
                                    <div className="flex items-center gap-2 pl-2 mt-4 text-[10px] font-black text-zinc-700 uppercase tracking-widest">
                                        <div className="h-[1px] flex-1 bg-white/5" />
                                        <span>+ {routine.ejercicios.length - 3} Módulos adicionales</span>
                                        <div className="h-[1px] flex-1 bg-white/5" />
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="grid grid-cols-1 gap-4">
                            <EliteButton
                                variant="cyan"
                                size="lg"
                                onClick={() => setIsPlayerOpen(true)}
                                className="w-full shadow-neon-cyan/20 h-16"
                            >
                                <Zap size={18} className="fill-black" /> 
                                <span className="italic">INICIAR OPERACIÓN</span>
                            </EliteButton>

                            <div className="flex gap-4">
                                <Link href={getLink ? getLink('/member/dashboard/routine') : '/dashboard/routine'} className="flex-1">
                                    <EliteButton variant="outline" size="md" className="w-full border-white/10 text-zinc-500 hover:text-white">
                                        BRIEFING <ChevronRight size={14} />
                                    </EliteButton>
                                </Link>
                                {routine.plan_nutricional_id && (
                                    <Link href={getLink ? getLink('/member/dashboard/nutrition') : '/dashboard/nutrition'}>
                                        <EliteButton variant="outline" size="md" className="w-16 border-tactical-cyan/20">
                                            <Apple size={18} />
                                        </EliteButton>
                                    </Link>
                                )}
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="text-center py-20 relative z-10 flex flex-col items-center px-10">
                        <div className="relative mb-10">
                            <div className={cn(
                                "w-24 h-24 bg-black/40 rounded-[2.5rem] border border-white/10 flex items-center justify-center shadow-inner transition-all",
                                isRequesting ? "animate-spin-slow border-tactical-cyan/40" : "group-hover:rotate-12"
                            )}>
                                {isRequesting ? (
                                    <Loader2 size={32} className="text-tactical-cyan animate-pulse" />
                                ) : (
                                    <Activity size={32} className="text-zinc-800" />
                                )}
                            </div>
                            {isRequesting && (
                                <div className="absolute inset-0 bg-tactical-cyan/10 blur-2xl rounded-full animate-pulse" />
                            )}
                        </div>
                        
                        <div className="space-y-1 mb-10">
                            <p className="text-zinc-500 font-rajdhani font-black uppercase tracking-[0.3em] text-[10px] italic">
                                {isRequesting ? 'Sincronizando con LDE System...' : 'Esperando directivas del comando central...'}
                            </p>
                            {isRequesting && (
                                <motion.p 
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    className="text-[8px] text-tactical-cyan/60 font-black uppercase tracking-widest"
                                >
                                    Sustituyendo modelos Flash/Pro | Validando seguridad
                                </motion.p>
                            )}
                        </div>

                        <EliteButton 
                            variant="outline" 
                            size="lg" 
                            className="w-full border-white/5 hover:border-tactical-cyan/30"
                            onClick={() => handleGoalModal(true)}
                            disabled={isRequesting}
                        >
                            {isRequesting ? 'PROCESANDO...' : 'SOLICITAR PLAN TÁCTICO'}
                        </EliteButton>
                    </div>
                )}
            </EliteCard>

            {isPlayerOpen && routine && (
                <WorkoutPlayer
                    routine={routine as any}
                    onClose={() => setIsPlayerOpen(false)}
                    onComplete={handleComplete}
                />
            )}
        </>
    );
}
