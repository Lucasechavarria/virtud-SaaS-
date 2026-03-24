'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Zap,
    MessageCircle,
    CreditCard,
    UserX,
    Cake,
    Play,
    Pause,
    Settings2,
    History,
    CheckCircle2,
    AlertCircle,
    ArrowRight
} from 'lucide-react';

interface AutomationTrigger {
    id: string;
    name: string;
    description: string;
    icon: any;
    status: 'active' | 'paused';
    lastFired: string;
    actionsCount: number;
    color: string;
}

const INITIAL_TRIGGERS: AutomationTrigger[] = [
    {
        id: '1',
        name: 'Confirmación de Pago',
        description: 'Envía ticket por WhatsApp al detectar pago aprobado en Mercado Pago.',
        icon: CreditCard,
        status: 'active',
        lastFired: 'hace 15 min',
        actionsCount: 124,
        color: 'text-green-500'
    },
    {
        id: '2',
        name: 'Alerta de Abandono',
        description: 'Detecta 10 días sin asistencia y mueve el socio al CRM de recuperación.',
        icon: UserX,
        status: 'active',
        lastFired: 'ayer, 18:30',
        actionsCount: 42,
        color: 'text-red-500'
    },
    {
        id: '3',
        name: 'Saludos de Cumpleaños',
        description: 'Envía cupón de 10% desc en tienda el día del cumple del socio.',
        icon: Cake,
        status: 'paused',
        lastFired: 'hace 3 días',
        actionsCount: 12,
        color: 'text-pink-500'
    },
];

export default function AutomationCenter() {
    const [triggers, setTriggers] = useState(INITIAL_TRIGGERS);

    const toggleStatus = (id: string) => {
        setTriggers(prev => prev.map(t =>
            t.id === id ? { ...t, status: t.status === 'active' ? 'paused' : 'active' } : t
        ));
    };

    return (
        <div className="space-y-8 pb-10">
            {/* Header / Stats Overlay */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="space-y-1">
                    <h2 className="text-4xl font-black text-white italic uppercase tracking-tighter flex items-center gap-3">
                        <Zap className="text-orange-500 fill-orange-500" size={32} />
                        Automation Engine
                    </h2>
                    <p className="text-gray-500 text-sm font-medium">El sistema inteligente que trabaja 24/7 por tu negocio.</p>
                </div>

                <div className="flex items-center gap-4 bg-white/5 border border-white/10 p-4 rounded-3xl">
                    <div className="text-right">
                        <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Acciones totales (Mes)</p>
                        <p className="text-2xl font-black text-white italic tracking-tighter">1,248</p>
                    </div>
                    <div className="w-10 h-10 rounded-2xl bg-orange-500/20 flex items-center justify-center text-orange-500">
                        <History size={20} />
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Active Automation Cards */}
                <div className="lg:col-span-2 space-y-4">
                    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.2em] ml-4">Disparadores Activos</p>
                    <div className="grid grid-cols-1 gap-4">
                        {triggers.map((trigger) => (
                            <motion.div
                                key={trigger.id}
                                layout
                                className={`p-6 rounded-[2.5rem] bg-[#1c1c1e] border transition-all ${trigger.status === 'active' ? 'border-orange-500/20 shadow-xl shadow-orange-500/5' : 'border-white/5 opacity-60'
                                    }`}
                            >
                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                                    <div className="flex items-center gap-5">
                                        <div className={`w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center ${trigger.color}`}>
                                            <trigger.icon size={28} />
                                        </div>
                                        <div className="space-y-1">
                                            <h4 className="text-xl font-black text-white uppercase italic tracking-tighter">{trigger.name}</h4>
                                            <p className="text-xs text-gray-500 max-w-sm font-medium">{trigger.description}</p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-3">
                                        <div className="text-right hidden md:block">
                                            <p className="text-[10px] font-bold text-gray-600 uppercase">Último disparo</p>
                                            <p className="text-xs text-white font-bold">{trigger.lastFired}</p>
                                        </div>
                                        <button
                                            onClick={() => toggleStatus(trigger.id)}
                                            className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${trigger.status === 'active' ? 'bg-orange-600 text-white shadow-lg' : 'bg-white/10 text-gray-400'
                                                }`}
                                        >
                                            {trigger.status === 'active' ? <Pause size={20} /> : <Play size={20} />}
                                        </button>
                                        <button className="w-12 h-12 rounded-2xl bg-white/5 text-gray-500 hover:text-white transition-all border border-white/5 flex items-center justify-center">
                                            <Settings2 size={20} />
                                        </button>
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </div>

                    <button className="w-full py-6 rounded-[2rem] border-2 border-dashed border-white/5 hover:border-orange-500/30 text-gray-600 hover:text-orange-500 transition-all font-black uppercase text-xs tracking-[0.2em] flex items-center justify-center gap-3 group">
                        <Plus size={18} className="group-hover:rotate-90 transition-transform" />
                        Añadir nuevo Trigger (Custom)
                    </button>
                </div>

                {/* Live Activity Feed */}
                <div className="space-y-4">
                    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.2em] ml-4">Actividad en Tiempo Real</p>
                    <div className="bg-[#1c1c1e] border border-white/5 rounded-[3rem] p-6 h-[500px] overflow-hidden flex flex-col shadow-2xl">
                        <div className="flex-1 overflow-y-auto space-y-6 scrollbar-hide">
                            {[1, 2, 3, 4, 5].map((_, i) => (
                                <div key={i} className="flex gap-4 relative group">
                                    {i !== 4 && <div className="absolute left-[11px] top-8 bottom-0 w-[2px] bg-white/5" />}
                                    <div className={`w-6 h-6 rounded-full flex items-center justify-center z-10 ${i === 0 ? 'bg-orange-500 shadow-lg shadow-orange-500/40' : 'bg-white/10 border border-white/5'}`}>
                                        <CheckCircle2 size={12} className={i === 0 ? 'text-white' : 'text-gray-600'} />
                                    </div>
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-2">
                                            <p className="text-[10px] font-black text-white uppercase italic tracking-tighter">Acción Ejecutada</p>
                                            <span className="text-[8px] font-bold text-gray-600">14:2{i} PM</span>
                                        </div>
                                        <p className="text-xs text-gray-400 leading-tight">
                                            {i % 2 === 0
                                                ? 'WhatsApp enviado a Julián Rossi (Pago aprobado)'
                                                : 'Membresía desactivada y aviso de mora enviado a Carla Méndez'}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="pt-6 border-t border-white/5 mt-auto">
                            <button className="w-full flex items-center justify-between text-xs text-gray-500 hover:text-white transition-colors group">
                                <span className="font-bold uppercase tracking-widest">Ver log completo</span>
                                <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function Plus({ size, className }: { size: number, className?: string }) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
        </svg>
    );
}
