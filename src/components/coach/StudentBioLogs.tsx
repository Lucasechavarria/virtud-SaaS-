'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Zap,
    Apple,
    Clock,
    Camera,
    Video,
    ChevronDown,
    ChevronUp,
    CheckCircle2,
    AlertCircle,
    Flame,
    Beef,
    Droplets,
    Brain
} from 'lucide-react';
import Image from 'next/image';
import AdaptiveSuggestions from './AdaptiveSuggestions';

interface VisionLog {
    id: string;
    nombre_ejercicio: string;
    video_url: string;
    puntaje_general: number;
    correcciones_ia: any;
    creado_en: string;
    estado: string;
}

interface NutritionLog {
    id: string;
    nombre_plato: string;
    imagen_url: string;
    calorias: number;
    proteinas: number;
    carbohidratos: number;
    grasas: number;
    puntaje_salud: number;
    recomendaciones: string[];
    creado_en: string;
}

interface BioLogsProps {
    userId: string;
}

export default function StudentBioLogs({ userId }: BioLogsProps) {
    const [visionLogs, setVisionLogs] = useState<VisionLog[]>([]);
    const [nutritionLogs, setNutritionLogs] = useState<NutritionLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeSection, setActiveSection] = useState<'vision' | 'nutrition' | 'adaptive'>('vision');
    const [expandedItem, setExpandedItem] = useState<string | null>(null);

    useEffect(() => {
        loadLogs();
    }, [userId]);

    const loadLogs = async () => {
        try {
            const [visionRes, nutritionRes] = await Promise.all([
                fetch(`/api/coach/students/${userId}/vision-logs`),
                fetch(`/api/coach/students/${userId}/nutrition-logs`)
            ]);

            const visionData = await visionRes.json();
            const nutritionData = await nutritionRes.json();

            if (visionData.success) setVisionLogs(visionData.logs);
            if (nutritionData.success) setNutritionLogs(nutritionData.logs);
        } catch (error) {
            console.error('Error loading bio-logs:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center p-20">
                <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                    className="w-8 h-8 border-2 border-indigo-500/20 border-t-indigo-500 rounded-full"
                />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex gap-2 p-1 bg-zinc-900 border border-zinc-800 rounded-2xl w-fit">
                <button
                    onClick={() => setActiveSection('vision')}
                    className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeSection === 'vision' ? 'bg-indigo-500 text-white' : 'text-zinc-500 hover:text-white'}`}
                >
                    <Video size={14} /> Biomecánica
                </button>
                <button
                    onClick={() => setActiveSection('nutrition')}
                    className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeSection === 'nutrition' ? 'bg-emerald-500 text-white' : 'text-zinc-500 hover:text-white'}`}
                >
                    <Apple size={14} /> Nutrición IA
                </button>
                <button
                    onClick={() => setActiveSection('adaptive')}
                    className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeSection === 'adaptive' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' : 'text-zinc-500 hover:text-white'}`}
                >
                    <Brain size={14} /> Sugerencias IA
                </button>
            </div>

            <AnimatePresence mode="wait">
                <motion.div
                    key={activeSection}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="space-y-4"
                >
                    {activeSection === 'vision' ? (
                        visionLogs.length > 0 ? (
                            visionLogs.map((log) => (
                                <div key={log.id} className="bg-zinc-900/50 border border-zinc-800 rounded-3xl overflow-hidden">
                                    <button
                                        onClick={() => setExpandedItem(expandedItem === log.id ? null : log.id)}
                                        className="w-full p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 text-left hover:bg-zinc-800/30 transition-colors"
                                    >
                                        <div className="flex items-center gap-6">
                                            <div className="w-12 h-12 bg-indigo-500/10 rounded-2xl flex items-center justify-center border border-indigo-500/20">
                                                <Zap className="text-indigo-400" size={24} />
                                            </div>
                                            <div>
                                                <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">{new Date(log.creado_en).toLocaleDateString()}</p>
                                                <h4 className="text-xl font-black text-white uppercase tracking-tight">{log.nombre_ejercicio}</h4>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-6">
                                            <div className="text-right">
                                                <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Score Técnico</p>
                                                <p className="text-2xl font-black text-indigo-400">{log.puntaje_general}%</p>
                                            </div>
                                            {expandedItem === log.id ? <ChevronUp size={20} className="text-zinc-500" /> : <ChevronDown size={20} className="text-zinc-500" />}
                                        </div>
                                    </button>

                                    {expandedItem === log.id && (
                                        <motion.div
                                            initial={{ height: 0 }}
                                            animate={{ height: 'auto' }}
                                            className="px-6 pb-6 border-t border-white/5"
                                        >
                                            <div className="pt-6 grid grid-cols-1 md:grid-cols-2 gap-8">
                                                <div className="aspect-video bg-black rounded-2xl relative overflow-hidden">
                                                    <video
                                                        src={log.video_url}
                                                        controls
                                                        className="w-full h-full object-contain"
                                                    />
                                                </div>
                                                <div className="space-y-6">
                                                    <div>
                                                        <h5 className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-4">Análisis de Errores</h5>
                                                        <ul className="space-y-2">
                                                            {log.correcciones_ia?.tecnica?.map((t: string, i: number) => (
                                                                <li key={i} className="flex gap-3 text-sm text-zinc-300">
                                                                    <AlertCircle size={16} className="text-red-500 shrink-0" />
                                                                    {t}
                                                                </li>
                                                            ))}
                                                        </ul>
                                                    </div>
                                                    <div>
                                                        <h5 className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-4">Puntos Fuertes</h5>
                                                        <ul className="space-y-2">
                                                            {log.correcciones_ia?.puntos_fuertes?.map((p: string, i: number) => (
                                                                <li key={i} className="flex gap-3 text-sm text-zinc-300">
                                                                    <CheckCircle2 size={16} className="text-green-500 shrink-0" />
                                                                    {p}
                                                                </li>
                                                            ))}
                                                        </ul>
                                                    </div>
                                                </div>
                                            </div>
                                        </motion.div>
                                    )}
                                </div>
                            ))
                        ) : (
                            <div className="p-12 text-center text-zinc-600 bg-zinc-900/20 border border-dashed border-zinc-800 rounded-3xl">
                                No hay análisis biomecánicos registrados.
                            </div>
                        )
                    ) : activeSection === 'nutrition' ? (
                        nutritionLogs.length > 0 ? (
                            nutritionLogs.map((log) => (
                                <div key={log.id} className="bg-zinc-900/50 border border-zinc-800 rounded-3xl overflow-hidden">
                                    <button
                                        onClick={() => setExpandedItem(expandedItem === log.id ? null : log.id)}
                                        className="w-full p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 text-left hover:bg-zinc-800/30 transition-colors"
                                    >
                                        <div className="flex items-center gap-6">
                                            <div className="w-12 h-12 bg-emerald-500/10 rounded-2xl flex items-center justify-center border border-emerald-500/20">
                                                <Apple className="text-emerald-400" size={24} />
                                            </div>
                                            <div>
                                                <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">{new Date(log.creado_en).toLocaleDateString()}</p>
                                                <h4 className="text-xl font-black text-white uppercase tracking-tight">{log.nombre_plato || 'Comida Analizada'}</h4>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-6">
                                            <div className="text-right">
                                                <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Biological Score</p>
                                                <p className="text-2xl font-black text-emerald-400">{log.puntaje_salud}/10</p>
                                            </div>
                                            {expandedItem === log.id ? <ChevronUp size={20} className="text-zinc-500" /> : <ChevronDown size={20} className="text-zinc-500" />}
                                        </div>
                                    </button>

                                    {expandedItem === log.id && (
                                        <motion.div
                                            initial={{ height: 0 }}
                                            animate={{ height: 'auto' }}
                                            className="px-6 pb-6 border-t border-white/5"
                                        >
                                            <div className="pt-6 grid grid-cols-1 md:grid-cols-2 gap-8">
                                                <div className="aspect-square bg-black rounded-2xl relative overflow-hidden">
                                                    <Image
                                                        src={log.imagen_url}
                                                        alt={log.nombre_plato}
                                                        fill
                                                        className="object-cover"
                                                    />
                                                </div>
                                                <div className="space-y-8">
                                                    <div className="grid grid-cols-2 gap-4">
                                                        <div className="bg-black/40 p-4 rounded-2xl border border-white/5">
                                                            <div className="flex items-center gap-2 mb-2">
                                                                <Flame size={14} className="text-orange-500" />
                                                                <span className="text-[10px] font-black text-zinc-500 uppercase">Calorías</span>
                                                            </div>
                                                            <p className="text-2xl font-black text-white">{log.calorias} <span className="text-[10px] opacity-40">KCAL</span></p>
                                                        </div>
                                                        <div className="bg-black/40 p-4 rounded-2xl border border-white/5">
                                                            <div className="flex items-center gap-2 mb-2">
                                                                <Beef size={14} className="text-indigo-400" />
                                                                <span className="text-[10px] font-black text-zinc-500 uppercase">Proteína</span>
                                                            </div>
                                                            <p className="text-2xl font-black text-white">{log.proteinas}g</p>
                                                        </div>
                                                        <div className="bg-black/40 p-4 rounded-2xl border border-white/5">
                                                            <div className="flex items-center gap-2 mb-2">
                                                                <Zap size={14} className="text-emerald-400" />
                                                                <span className="text-[10px] font-black text-zinc-500 uppercase">Carbos</span>
                                                            </div>
                                                            <p className="text-2xl font-black text-white">{log.carbohidratos}g</p>
                                                        </div>
                                                        <div className="bg-black/40 p-4 rounded-2xl border border-white/5">
                                                            <div className="flex items-center gap-2 mb-2">
                                                                <Droplets size={14} className="text-amber-500" />
                                                                <span className="text-[10px] font-black text-zinc-500 uppercase">Grasas</span>
                                                            </div>
                                                            <p className="text-2xl font-black text-white">{log.grasas}g</p>
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <h5 className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-4">Tactical Advice IA</h5>
                                                        <ul className="space-y-3">
                                                            {log.recomendaciones?.map((r: string, i: number) => (
                                                                <li key={i} className="text-sm text-zinc-300 italic">
                                                                    " {r} "
                                                                </li>
                                                            ))}
                                                        </ul>
                                                    </div>
                                                </div>
                                            </div>
                                        </motion.div>
                                    )}
                                </div>
                            ))
                        ) : (
                            <div className="p-12 text-center text-zinc-600 bg-zinc-900/20 border border-dashed border-zinc-800 rounded-3xl">
                                No hay logs nutricionales registrados.
                            </div>
                        )
                    ) : (
                        <AdaptiveSuggestions userId={userId} />
                    )}
                </motion.div>
            </AnimatePresence>
        </div>
    );
}
