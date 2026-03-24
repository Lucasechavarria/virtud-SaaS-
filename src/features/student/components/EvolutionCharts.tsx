'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    LineChart, Line, BarChart, Bar,
    XAxis, YAxis, CartesianGrid, Tooltip, Legend,
    ResponsiveContainer, Area, AreaChart
} from 'recharts';
import { TrendingUp, Activity, Calendar, Zap, BarChart3 } from 'lucide-react';

import { EvolutionChartData, AttendanceChartData, ItemVariants } from '@/types/student-components';
import { EliteCard } from '@/components/ui/EliteCard';
import { cn } from '@/lib/utils';

interface EvolutionChartsProps {
    chartData: EvolutionChartData[];
    attendance: AttendanceChartData[];
    volumeData?: Array<{ week: string; volume: number }>;
    itemVariants: ItemVariants;
}

export function EvolutionCharts({ chartData, attendance, volumeData = [], itemVariants }: EvolutionChartsProps) {
    const [activeTab, setActiveTab] = useState<'progress' | 'attendance' | 'strength'>('progress');
    const [timeRange, setTimeRange] = useState<'1m' | '3m' | 'all'>('all');

    const filterDataByRange = (data: any[]) => {
        if (timeRange === 'all') return data;
        const months = timeRange === '1m' ? 1 : 3;
        // Simulación de filtrado por semanas (asumiendo 4 semanas por mes)
        return data.slice(-(months * 4));
    };

    const filteredChartData = filterDataByRange(chartData);
    const filteredVolumeData = filterDataByRange(volumeData);

    const tabs = [
        { id: 'progress', label: 'Antropometría', icon: TrendingUp, color: 'text-emerald-500' },
        { id: 'strength', label: 'Capacidad de Carga', icon: Zap, color: 'text-orange-500' },
        { id: 'attendance', label: 'Despliegue Mensual', icon: BarChart3, color: 'text-blue-500' },
    ];

    return (
        <EliteCard
            variants={itemVariants}
            variant="cyan"
            particles={true}
            className="p-0 overflow-hidden"
        >
            <div className="p-10">
                <div className="flex flex-col xl:flex-row items-start xl:items-center justify-between gap-8 mb-12 relative z-10">
                    <div className="space-y-1">
                        <div className="flex items-center gap-2 mb-1">
                            <Activity size={14} className="text-tactical-cyan" />
                            <span className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.4em] font-rajdhani">Intelligence Engine v2.0</span>
                        </div>
                        <h3 className="text-3xl font-rajdhani font-black text-white italic tracking-tighter uppercase leading-none">
                            Bio-Métricas & <span className="text-tactical-cyan">Rendimiento</span>
                        </h3>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-4 w-full xl:w-auto">
                        <div className="flex bg-black/40 p-1.5 rounded-[1.2rem] border border-white/5 overflow-x-auto scrollbar-hide">
                            {(['1m', '3m', 'all'] as const).map((range) => (
                                <button
                                    key={range}
                                    onClick={() => setTimeRange(range)}
                                    className={cn(
                                        "px-4 py-2 rounded-lg text-[9px] font-black uppercase tracking-tighter transition-all",
                                        timeRange === range 
                                            ? 'bg-white/10 text-white' 
                                            : 'text-zinc-600 hover:text-zinc-400'
                                    )}
                                >
                                    {range === 'all' ? 'Todo' : range.toUpperCase()}
                                </button>
                            ))}
                        </div>

                        <div className="flex bg-black/40 p-1.5 rounded-[1.5rem] border border-white/5 overflow-x-auto scrollbar-hide">
                            {tabs.map((tab) => {
                                const isActive = activeTab === tab.id;
                                return (
                                    <button
                                        key={tab.id}
                                        onClick={() => setActiveTab(tab.id as any)}
                                        className={cn(
                                            "flex-1 xl:flex-none px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-3 whitespace-nowrap font-rajdhani",
                                            isActive
                                                ? 'bg-tactical-cyan text-black shadow-[0_0_20px_rgba(0,245,255,0.3)]'
                                                : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/5'
                                        )}
                                    >
                                        <tab.icon size={14} className={isActive ? 'text-black' : 'text-zinc-700'} />
                                        {tab.label}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>

                <div className="h-[350px] w-full relative z-10">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={activeTab}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.3 }}
                            className="h-full w-full"
                        >
                                {activeTab === 'progress' && (
                                chartData.length > 0 ? (
                                    <ResponsiveContainer width="100%" height="100%">
                                        <AreaChart data={filteredChartData}>
                                            <defs>
                                                <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#00F5FF" stopOpacity={0.3} />
                                                    <stop offset="95%" stopColor="#00F5FF" stopOpacity={0} />
                                                </linearGradient>
                                            </defs>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#ffffff03" vertical={false} />
                                            <XAxis 
                                                dataKey="week" 
                                                stroke="#ffffff20" 
                                                tick={{ fill: '#666', fontSize: 10, fontWeight: 900, fontFamily: 'Rajdhani' }} 
                                                axisLine={false} 
                                                tickLine={false} 
                                            />
                                            <YAxis 
                                                stroke="#ffffff20" 
                                                tick={{ fill: '#666', fontSize: 10, fontWeight: 900, fontFamily: 'Rajdhani' }} 
                                                axisLine={false} 
                                                tickLine={false} 
                                            />
                                            <Tooltip
                                                contentStyle={{ 
                                                    backgroundColor: '#050505', 
                                                    border: '1px solid #ffffff10', 
                                                    borderRadius: '1.5rem', 
                                                    fontSize: '10px', 
                                                    textTransform: 'uppercase', 
                                                    fontWeight: 900,
                                                    fontFamily: 'Rajdhani'
                                                }}
                                                itemStyle={{ color: '#00F5FF' }}
                                            />
                                            <Area 
                                                type="monotone" 
                                                dataKey="peso" 
                                                name="Peso" 
                                                stroke="#00F5FF" 
                                                fillOpacity={1} 
                                                fill="url(#colorValue)" 
                                                strokeWidth={3} 
                                                animationDuration={1500}
                                            />
                                            <Area 
                                                type="monotone" 
                                                dataKey="musculo" 
                                                name="Músculo" 
                                                stroke="#FF00FF" 
                                                fill="transparent"
                                                strokeWidth={2} 
                                                strokeDasharray="5 5"
                                            />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                ) : (
                                    <EmptyState icon={<TrendingUp size={32} />} message="Esperando registros bioperformance..." />
                                )
                            )}

                            {activeTab === 'strength' && (
                                volumeData.length > 0 ? (
                                    <ResponsiveContainer width="100%" height="100%">
                                        <AreaChart data={filteredVolumeData}>
                                            <defs>
                                                <linearGradient id="colorVolume" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#FF00FF" stopOpacity={0.3} />
                                                    <stop offset="95%" stopColor="#FF00FF" stopOpacity={0} />
                                                </linearGradient>
                                            </defs>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#ffffff03" vertical={false} />
                                            <XAxis dataKey="week" stroke="#ffffff20" tick={{ fill: '#666', fontSize: 10, fontWeight: 900, fontFamily: 'Rajdhani' }} axisLine={false} tickLine={false} />
                                            <YAxis stroke="#ffffff20" tick={{ fill: '#666', fontSize: 10, fontWeight: 900, fontFamily: 'Rajdhani' }} axisLine={false} tickLine={false} />
                                            <Tooltip
                                                contentStyle={{ backgroundColor: '#050505', border: '1px solid #ffffff10', borderRadius: '1.5rem', fontSize: '10px', textTransform: 'uppercase', fontWeight: 900, fontFamily: 'Rajdhani' }}
                                                itemStyle={{ color: '#FF00FF' }}
                                            />
                                            <Area type="monotone" dataKey="volume" name="Tonelaje (kg)" stroke="#FF00FF" fillOpacity={1} fill="url(#colorVolume)" strokeWidth={3} animationDuration={1500} />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                ) : (
                                    <EmptyState icon={<Zap size={32} />} message="Completa despliegues para habilitar el motor de fuerza." />
                                )
                            )}

                            {activeTab === 'attendance' && (
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={attendance}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#ffffff03" vertical={false} />
                                        <XAxis dataKey="month" stroke="#ffffff20" tick={{ fill: '#666', fontSize: 10, fontWeight: 900, fontFamily: 'Rajdhani' }} axisLine={false} tickLine={false} />
                                        <YAxis stroke="#ffffff20" tick={{ fill: '#666', fontSize: 10, fontWeight: 900, fontFamily: 'Rajdhani' }} axisLine={false} tickLine={false} />
                                        <Tooltip cursor={{ fill: 'rgba(255,255,255,0.02)' }} contentStyle={{ backgroundColor: '#050505', border: '1px solid #ffffff10', borderRadius: '1.5rem', fontFamily: 'Rajdhani' }} />
                                        <Bar dataKey="rate" name="Asistencia" fill="#00F5FF" radius={[4, 4, 0, 0]} barSize={30} />
                                    </BarChart>
                                </ResponsiveContainer>
                            )}
                        </motion.div>
                    </AnimatePresence>
                </div>
            </div>
        </EliteCard>
    );
}


function EmptyState({ icon, message }: { icon: React.ReactNode, message: string }) {
    return (
        <div className="h-full flex flex-col items-center justify-center border border-dashed border-white/5 rounded-[2.5rem] bg-black/20 group">
            <div className="text-zinc-800 mb-6 group-hover:scale-110 transition-transform duration-500">
                {icon}
            </div>
            <p className="text-zinc-600 font-black uppercase tracking-widest text-[10px] text-center px-8 italic">{message}</p>
        </div>
    );
}
