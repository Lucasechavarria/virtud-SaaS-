'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    UserPlus,
    MessageSquare,
    Calendar,
    CheckCircle2,
    XCircle,
    TrendingUp,
    Plus,
    MoreHorizontal,
    Phone,
    Mail,
    Search
} from 'lucide-react';

type ProspectState = 'nuevo' | 'contactado' | 'prueba_agendada' | 'convertido' | 'perdido';

interface Prospect {
    id: string;
    nombre_completo: string;
    telefono: string;
    email: string;
    estado: ProspectState;
    valor_estimado: number;
    origen: string;
}

const COLUMNS: { id: ProspectState; label: string; icon: React.ReactNode; color: string }[] = [
    { id: 'nuevo', label: 'Nuevos Leads', icon: <UserPlus size={16} />, color: 'from-blue-500/20 to-blue-600/5' },
    { id: 'contactado', label: 'Contactados', icon: <MessageSquare size={16} />, color: 'from-amber-500/20 to-amber-600/5' },
    { id: 'prueba_agendada', label: 'Clase de Prueba', icon: <Calendar size={16} />, color: 'from-purple-500/20 to-purple-600/5' },
    { id: 'convertido', label: 'Ganados', icon: <CheckCircle2 size={16} />, color: 'from-green-500/20 to-green-600/5' },
    { id: 'perdido', label: 'Perdidos', icon: <XCircle size={16} />, color: 'from-red-500/20 to-red-600/5' },
];

export default function CrmKanban() {
    const [prospects, setProspects] = useState<Prospect[]>([
        { id: '1', nombre_completo: 'Julián Rossi', telefono: '11 2345 6789', email: 'julian@example.com', estado: 'nuevo', valor_estimado: 45000, origen: 'Instagram' },
        { id: '2', nombre_completo: 'Carla Méndez', telefono: '11 5566 7788', email: 'carla@example.com', estado: 'contactado', valor_estimado: 32000, origen: 'Recomendado' },
    ]);

    const totalPipeline = prospects.reduce((acc, p) => acc + p.valor_estimado, 0);

    return (
        <div className="space-y-6">
            {/* Header / Stats Overlay */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                    <h2 className="text-3xl font-black text-white italic uppercase tracking-tighter">Pipeline de Ventas</h2>
                    <p className="text-gray-500 text-sm flex items-center gap-2">
                        <TrendingUp size={14} className="text-green-500" />
                        Valor acumulado en juego: <span className="text-white font-bold">${totalPipeline.toLocaleString('es-AR')}</span>
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={14} />
                        <input
                            type="text"
                            placeholder="Buscar prospecto..."
                            className="bg-[#1c1c1e] border border-white/5 rounded-xl pl-9 pr-4 py-2 text-sm text-white focus:outline-none focus:border-orange-500/50 transition-all w-64"
                        />
                    </div>
                    <button className="bg-orange-600 hover:bg-orange-500 text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 shadow-lg shadow-orange-600/20 transition-all">
                        <Plus size={16} />
                        Nuevo Prospecto
                    </button>
                </div>
            </div>

            {/* Kanban Board */}
            <div className="flex gap-4 overflow-x-auto pb-6 -mx-4 px-4 scrollbar-hide">
                {COLUMNS.map((col) => (
                    <div key={col.id} className="min-w-[300px] w-[300px] flex flex-col gap-4">
                        {/* Column Header */}
                        <div className={`p-4 rounded-2xl bg-gradient-to-br ${col.color} border border-white/5 flex items-center justify-between`}>
                            <div className="flex items-center gap-2">
                                <span className="text-white bg-white/10 p-1.5 rounded-lg">{col.icon}</span>
                                <h3 className="text-xs font-black text-white uppercase tracking-widest">{col.label}</h3>
                            </div>
                            <span className="text-[10px] font-bold text-gray-400 bg-white/5 px-2 py-1 rounded-full">
                                {prospects.filter(p => p.estado === col.id).length}
                            </span>
                        </div>

                        {/* Drop Zone */}
                        <div className="flex-1 flex flex-col gap-3 min-h-[500px]">
                            {prospects.filter(p => p.estado === col.id).map((prospect) => (
                                <motion.div
                                    key={prospect.id}
                                    layoutId={prospect.id}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="p-4 rounded-2xl bg-[#1c1c1e] border border-white/5 hover:border-white/10 transition-all group cursor-grab active:cursor-grabbing shadow-lg"
                                >
                                    <div className="flex justify-between items-start mb-3">
                                        <div>
                                            <p className="font-extrabold text-white text-sm group-hover:text-orange-400 transition-colors uppercase italic tracking-tighter">
                                                {prospect.nombre_completo}
                                            </p>
                                            <p className="text-[10px] font-bold text-gray-600 uppercase tracking-widest mt-0.5">
                                                Vía {prospect.origen}
                                            </p>
                                        </div>
                                        <button className="text-gray-600 hover:text-white transition-colors">
                                            <MoreHorizontal size={14} />
                                        </button>
                                    </div>

                                    <div className="space-y-2 mb-4">
                                        {prospect.telefono && (
                                            <div className="flex items-center gap-2 text-xs text-gray-400">
                                                <Phone size={10} className="text-orange-500" />
                                                <span>{prospect.telefono}</span>
                                            </div>
                                        )}
                                        {prospect.email && (
                                            <div className="flex items-center gap-2 text-xs text-gray-400">
                                                <Mail size={10} className="text-blue-500" />
                                                <span className="truncate">{prospect.email}</span>
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex items-center justify-between pt-3 border-t border-white/5">
                                        <div className="bg-green-500/10 text-green-400 text-[10px] font-black px-2 py-1 rounded-lg">
                                            ${prospect.valor_estimado.toLocaleString('es-AR')}
                                        </div>
                                        <div className="flex -space-x-2">
                                            <div className="w-6 h-6 rounded-full bg-gray-800 border-2 border-[#1c1c1e] flex items-center justify-center text-[10px] text-white font-bold">
                                                JD
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            ))}

                            {/* Empty State placeholder in column */}
                            {prospects.filter(p => p.estado === col.id).length === 0 && (
                                <div className="flex-1 rounded-2xl border-2 border-dashed border-white/5 flex items-center justify-center p-8 opacity-20">
                                    <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">Sin prospectos</p>
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
