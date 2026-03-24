'use client';

import React from 'react';
import { motion } from 'framer-motion';
import {
    Users,
    BarChart3,
    DollarSign,
    TrendingUp,
    TrendingDown,
    PieChart,
    Calendar,
    Target,
    ArrowUpRight,
    ArrowDownRight
} from 'lucide-react';

export default function BusinessIntelligence() {
    const stats = [
        { label: 'LTV (Lifetime Value)', value: '$145.200', trend: '+12%', color: 'from-blue-600 to-cyan-500', icon: DollarSign, desc: 'Ingreso promedio por socio' },
        { label: 'CAC (Adquisición)', value: '$8.450', trend: '-5%', color: 'from-orange-600 to-red-500', icon: Target, desc: 'Costo por cliente nuevo' },
        { label: 'Tasa de Churn', value: '4.2%', trend: '-1.5%', color: 'from-purple-600 to-indigo-500', icon: TrendingDown, desc: 'Deserción mensual' },
        { label: 'MRR (Mensual)', value: '$2.840k', trend: '+8%', color: 'from-emerald-600 to-teal-500', icon: BarChart3, desc: 'Ingreso mensual recurrente' },
    ];

    return (
        <div className="space-y-10 pb-20">
            {/* Header / Filter */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h2 className="text-4xl font-black text-white italic uppercase tracking-tighter">Métricas de Negocio</h2>
                    <p className="text-gray-500 text-sm font-medium">Análisis profundo sobre la rentabilidad de tu gimnasio.</p>
                </div>

                <div className="flex items-center gap-2 p-1 bg-[#1c1c1e] rounded-2xl border border-white/5">
                    {['7D', '30D', '90D', '12M'].map(p => (
                        <button key={p} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${p === '30D' ? 'bg-white text-black' : 'text-gray-500 hover:text-white hover:bg-white/5'}`}>
                            {p}
                        </button>
                    ))}
                </div>
            </div>

            {/* Main Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
                {stats.map((stat, idx) => (
                    <motion.div
                        key={stat.label}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.1 }}
                        className="p-8 rounded-[3rem] bg-[#1c1c1e] border border-white/5 relative overflow-hidden group hover:border-white/10 transition-all shadow-2xl"
                    >
                        {/* Glow effect */}
                        <div className={`absolute -right-10 -top-10 w-32 h-32 bg-gradient-to-br ${stat.color} opacity-10 blur-3xl group-hover:opacity-20 transition-opacity`} />

                        <div className="space-y-4 relative z-10">
                            <div className="flex items-center justify-between">
                                <div className={`p-3 rounded-2xl bg-gradient-to-br ${stat.color} text-white`}>
                                    <stat.icon size={20} />
                                </div>
                                <div className={`flex items-center gap-1 text-xs font-black ${stat.trend.startsWith('+') ? 'text-green-400' : 'text-red-400'}`}>
                                    {stat.trend}
                                    {stat.trend.startsWith('+') ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                                </div>
                            </div>

                            <div>
                                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest">{stat.label}</h3>
                                <p className="text-3xl font-black text-white italic tracking-tighter mt-1">{stat.value}</p>
                            </div>
                            <p className="text-[10px] text-gray-600 font-bold uppercase tracking-tighter">{stat.desc}</p>
                        </div>
                    </motion.div>
                ))}
            </div>

            {/* Second row - Charts placeholders */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="p-10 rounded-[4rem] bg-[#1c1c1e] border border-white/5 h-[400px] relative overflow-hidden flex flex-col justify-between group shadow-2xl">
                    <div className="flex items-center justify-between">
                        <div className="space-y-1">
                            <h4 className="text-xl font-black text-white italic uppercase tracking-tighter">Flujo de Caja Diario</h4>
                            <p className="text-xs text-gray-500 font-medium">Histórico de ingresos: Membresías + Tienda</p>
                        </div>
                        <div className="p-2 border border-white/5 rounded-xl text-gray-400">
                            <BarChart3 size={18} />
                        </div>
                    </div>
                    {/* Placeholder for real chart */}
                    <div className="flex items-end justify-between h-48 gap-3 pr-4">
                        {[40, 60, 45, 90, 65, 80, 55, 100, 75, 85].map((h, i) => (
                            <motion.div
                                key={i}
                                initial={{ height: 0 }}
                                animate={{ height: `${h}%` }}
                                transition={{ delay: i * 0.05, duration: 1 }}
                                className={`flex-1 rounded-t-xl bg-gradient-to-t ${i === 7 ? 'from-orange-600 to-orange-400' : 'from-white/5 to-white/10'} hover:from-white/20 transition-all cursor-pointer relative group/bar`}
                            >
                                <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-white text-black text-[10px] font-black px-2 py-1 rounded opacity-0 group-hover/bar:opacity-100 transition-opacity whitespace-nowrap">
                                    ${(h * 1500).toLocaleString('es-AR')}
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </div>

                <div className="p-10 rounded-[4rem] bg-[#1c1c1e] border border-white/5 h-[400px] flex flex-col justify-between shadow-2xl overflow-hidden relative group">
                    <div className="flex items-center justify-between">
                        <div className="space-y-1">
                            <h4 className="text-xl font-black text-white italic uppercase tracking-tighter">Fuentes de Ingreso</h4>
                            <p className="text-xs text-gray-500 font-medium">Distribución por categoría (Membresías vs Tienda)</p>
                        </div>
                        <div className="p-2 border border-white/5 rounded-xl text-gray-400">
                            <PieChart size={18} />
                        </div>
                    </div>

                    <div className="flex items-center gap-12">
                        <div className="relative w-40 h-40">
                            <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-90">
                                <circle cx="50" cy="50" r="40" stroke="currentColor" strokeWidth="12" fill="transparent" className="text-white/5" />
                                <motion.circle
                                    cx="50" cy="50" r="40"
                                    stroke="currentColor" strokeWidth="12"
                                    fill="transparent"
                                    strokeDasharray="251.2"
                                    initial={{ strokeDashoffset: 251.2 }}
                                    animate={{ strokeDashoffset: 251.2 * 0.25 }}
                                    transition={{ duration: 1.5 }}
                                    className="text-orange-500"
                                />
                            </svg>
                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                                <span className="text-2xl font-black text-white italic tracking-tighter">75%</span>
                                <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest leading-none">Membresías</span>
                            </div>
                        </div>

                        <div className="space-y-4 flex-1">
                            <div className="flex items-center gap-3">
                                <div className="w-3 h-3 rounded-full bg-orange-500" />
                                <div className="flex-1">
                                    <div className="flex justify-between text-xs font-bold text-white mb-1">
                                        <span>Suscripciones Mensuales</span>
                                        <span>75%</span>
                                    </div>
                                    <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                                        <div className="h-full bg-orange-500 w-[75%]" />
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="w-3 h-3 rounded-full bg-blue-500" />
                                <div className="flex-1">
                                    <div className="flex justify-between text-xs font-bold text-white mb-1">
                                        <span>Ventas Tienda (Snacks/Agua)</span>
                                        <span>25%</span>
                                    </div>
                                    <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                                        <div className="h-full bg-blue-500 w-[25%]" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
