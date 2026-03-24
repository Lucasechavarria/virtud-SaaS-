'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    UserX,
    Phone,
    MessageCircle,
    TrendingDown,
    AlertTriangle,
    Clock,
    UserCheck,
    ChevronRight,
    Search
} from 'lucide-react';

interface ChurnRiskStudent {
    id: string;
    nombre: string;
    ultima_asistencia: string;
    dias_ausente: number;
    promedio_mensual: number;
    nivel_riesgo: 'alto' | 'medio';
}

const MOCK_RISKS: ChurnRiskStudent[] = [
    { id: '1', nombre: 'Gonzalo Fernández', ultima_asistencia: 'hace 12 días', dias_ausente: 12, promedio_mensual: 3.5, nivel_riesgo: 'alto' },
    { id: '2', nombre: 'Marta Solis', ultima_asistencia: 'hace 8 días', dias_ausente: 8, promedio_mensual: 2.1, nivel_riesgo: 'medio' },
    { id: '3', nombre: 'Lucas Echevarría', ultima_asistencia: 'hace 15 días', dias_ausente: 15, promedio_mensual: 4.0, nivel_riesgo: 'alto' },
];

export default function ChurnAnalysis() {
    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-black text-white italic uppercase tracking-tighter">Retención Proactiva</h2>
                    <p className="text-gray-500 text-sm flex items-center gap-2">
                        <TrendingDown size={14} className="text-red-500" />
                        Detectando alumnos con posible deserción (Churn)
                    </p>
                </div>
                <div className="hidden md:flex items-center gap-2">
                    <div className="bg-red-500/10 text-red-500 text-[10px] font-black px-3 py-1 rounded-full border border-red-500/20">
                        {MOCK_RISKS.filter(r => r.nivel_riesgo === 'alto').length} CRÍTICOS
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                {/* Search & Sidebar for Analysis */}
                <div className="lg:col-span-1 space-y-4">
                    <div className="bg-[#1c1c1e] border border-white/5 rounded-3xl p-6 space-y-6 shadow-xl">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={14} />
                            <input
                                type="text"
                                placeholder="Filtrar alumnos..."
                                className="w-full bg-black/20 border border-white/5 rounded-xl pl-9 pr-4 py-2 text-xs text-white"
                            />
                        </div>

                        <div className="space-y-3">
                            <p className="text-[10px] font-bold text-gray-600 uppercase tracking-widest">Estado del Churn</p>
                            <div className="space-y-2">
                                <div className="flex justify-between text-xs">
                                    <span className="text-gray-400">Tasa de Deserción</span>
                                    <span className="text-red-400 font-bold">12.5%</span>
                                </div>
                                <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                                    <div className="w-[12%] h-full bg-red-500" />
                                </div>
                            </div>
                        </div>

                        <div className="pt-4 border-t border-white/5">
                            <button className="w-full bg-white/5 hover:bg-white/10 text-white text-[10px] font-black py-3 rounded-xl uppercase tracking-tighter border border-white/5 transition-all">
                                Ver Reporte Histórico
                            </button>
                        </div>
                    </div>
                </div>

                {/* Churn Risk List */}
                <div className="lg:col-span-3 space-y-4">
                    <AnimatePresence>
                        {MOCK_RISKS.map((student, idx) => (
                            <motion.div
                                key={student.id}
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: idx * 0.1 }}
                                className={`p-5 rounded-[2.5rem] bg-[#1c1c1e] border border-white/5 hover:border-white/10 transition-all group flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-2xl relative overflow-hidden`}
                            >
                                {/* Risk Indicator Line */}
                                <div className={`absolute left-0 top-0 bottom-0 w-2 ${student.nivel_riesgo === 'alto' ? 'bg-red-500' : 'bg-orange-500'}`} />

                                <div className="flex items-center gap-5 pl-4">
                                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-white ${student.nivel_riesgo === 'alto' ? 'bg-red-500/10 text-red-500' : 'bg-orange-500/10 text-orange-500'}`}>
                                        <AlertTriangle size={24} />
                                    </div>
                                    <div className="space-y-1">
                                        <h4 className="text-lg font-black text-white italic uppercase tracking-tighter leading-none">{student.nombre}</h4>
                                        <div className="flex items-center gap-3 text-xs text-gray-500 font-bold">
                                            <span className="flex items-center gap-1">
                                                <Clock size={12} />
                                                Ausente {student.ultima_asistencia}
                                            </span>
                                            <span className="w-1 h-1 bg-gray-700 rounded-full" />
                                            <span className="flex items-center gap-1">
                                                <UserCheck size={12} />
                                                Frecuencia: {student.promedio_mensual} v/sem
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-3 pl-4 md:pl-0">
                                    <div className="grid grid-cols-3 gap-2">
                                        <button className="p-4 rounded-2xl bg-white/5 hover:bg-green-500/20 text-green-400 border border-white/5 hover:border-green-500/30 transition-all flex flex-col items-center gap-1 group/btn">
                                            <MessageCircle size={18} className="group-hover/btn:scale-110 transition-transform" />
                                            <span className="text-[10px] font-black">WSapp</span>
                                        </button>
                                        <button className="p-4 rounded-2xl bg-white/5 hover:bg-blue-500/20 text-blue-400 border border-white/5 hover:border-blue-500/30 transition-all flex flex-col items-center gap-1 group/btn">
                                            <Phone size={18} className="group-hover/btn:scale-110 transition-transform" />
                                            <span className="text-[10px] font-black">Llamar</span>
                                        </button>
                                        <button className="p-4 rounded-2xl bg-white text-black hover:bg-zinc-200 transition-all flex flex-col items-center gap-1 shadow-lg shadow-white/5 group/btn">
                                            <ChevronRight size={18} className="group-hover/btn:translate-x-1 transition-transform" />
                                            <span className="text-[10px] font-black italic">Ficha</span>
                                        </button>
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </div>
            </div>
        </div>
    );
}
