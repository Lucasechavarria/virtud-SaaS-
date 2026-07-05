'use client';

import React, { useState, useEffect } from 'react';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
    LineChart, Line, Legend
} from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';

interface MetricsDashboardProps {
    studentId?: string;
    viewMode: 'individual' | 'group' | 'class';
    gymId?: string;
}

export default function MetricsDashboard({ studentId, viewMode, gymId }: MetricsDashboardProps) {
    const [activeTab, setActiveTab] = useState<'volume' | 'skills' | 'progress'>('volume');
    const [loading, setLoading] = useState(true);
    const [metrics, setMetrics] = useState<any>(null);

    useEffect(() => {
        const loadMetrics = async () => {
            if (viewMode === 'individual' && !studentId) {
                setMetrics(null);
                setLoading(false);
                return;
            }
            try {
                setLoading(true);
                const params = new URLSearchParams({
                    mode: viewMode,
                    ...(studentId && { studentId }),
                    ...(gymId && { gymId })
                });
                const res = await fetch(`/api/coach/analytics?${params}`);
                const data = await res.json();
                if (data.success) {
                    setMetrics(data.metrics);
                }
            } catch (err) {
                console.error('Error fetching metrics in dashboard:', err);
            } finally {
                setLoading(false);
            }
        };
        loadMetrics();
    }, [studentId, viewMode, gymId]);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-[500px] text-gray-500 animate-pulse">
                Cargando métricas de rendimiento...
            </div>
        );
    }

    if (!metrics) {
        return (
            <div className="flex flex-col items-center justify-center h-[500px] text-gray-500">
                ⚠️ No hay datos de rendimiento disponibles.
            </div>
        );
    }

    return (
        <div className="space-y-8">
            {/* Tabs */}
            <div className="flex gap-4 p-1 bg-white/5 rounded-2xl w-fit">
                {['volume', 'skills', 'progress'].map((tab) => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab as 'volume' | 'skills' | 'progress')}
                        className={`px-6 py-2 rounded-xl text-sm font-bold capitalize transition-all relative ${activeTab === tab ? 'text-white' : 'text-gray-400 hover:text-white'
                            }`}
                    >
                        {activeTab === tab && (
                            <motion.div
                                layoutId="activeMeta"
                                className="absolute inset-0 bg-gradient-to-r from-orange-500 to-red-600 rounded-xl shadow-lg"
                            />
                        )}
                        <span className="relative z-10">
                            {tab === 'volume' ? 'Carga Total' : tab === 'skills' ? 'Perfil Atleta' : 'Progresión 1RM'}
                        </span>
                    </button>
                ))}
            </div>

            {/* Charts Area */}
            <div className="bg-[#1c1c1e]/60 backdrop-blur-xl border border-white/10 rounded-3xl p-8 h-[500px]">
                <AnimatePresence mode="wait">
                    {activeTab === 'volume' && (
                        <motion.div
                            key="volume"
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="w-full h-full"
                        >
                            <h3 className="text-xl font-bold text-white mb-2">Volumen Semanal (Kg Totales)</h3>
                            <ResponsiveContainer width="100%" height="90%">
                                <AreaChart data={metrics.volume || []}>
                                    <defs>
                                        <linearGradient id="colorKg" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#f97316" stopOpacity={0.8} />
                                            <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                                    <XAxis dataKey="week" stroke="#666" />
                                    <YAxis stroke="#666" />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: '#1c1c1e', border: '1px solid #333', borderRadius: '12px' }}
                                        labelStyle={{ color: '#aaa' }}
                                    />
                                    <Area type="monotone" dataKey="kg" stroke="#f97316" fillOpacity={1} fill="url(#colorKg)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </motion.div>
                    )}

                    {activeTab === 'skills' && (
                        <motion.div
                            key="skills"
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="w-full h-full"
                        >
                            <h3 className="text-xl font-bold text-white mb-2">Perfil de Rendimiento</h3>
                            <ResponsiveContainer width="100%" height="90%">
                                <RadarChart outerRadius="80%" data={metrics.skills || []}>
                                    <PolarGrid stroke="#333" />
                                    <PolarAngleAxis dataKey="subject" tick={{ fill: '#aaa', fontSize: 12 }} />
                                    <PolarRadiusAxis angle={30} domain={[0, 150]} stroke="#333" />
                                    <Radar name={viewMode === 'individual' ? 'Alumno' : 'Promedio Grupal'} dataKey="A" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.5} />
                                    <Tooltip contentStyle={{ backgroundColor: '#1c1c1e', border: '1px solid #333', borderRadius: '12px' }} />
                                    <Legend />
                                </RadarChart>
                            </ResponsiveContainer>
                        </motion.div>
                    )}

                    {activeTab === 'progress' && (
                        <motion.div
                            key="progress"
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="w-full h-full"
                        >
                            <h3 className="text-xl font-bold text-white mb-2">Evolución de Fuerza (1RM Estimado)</h3>
                            <ResponsiveContainer width="100%" height="90%">
                                <LineChart data={metrics.progress || []}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                                    <XAxis dataKey="name" stroke="#666" />
                                    <YAxis stroke="#666" />
                                    <Tooltip contentStyle={{ backgroundColor: '#1c1c1e', border: '1px solid #333', borderRadius: '12px' }} />
                                    <Legend />
                                    <Line type="monotone" dataKey="squat" stroke="#f97316" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 8 }} name="Sentadilla" />
                                    <Line type="monotone" dataKey="deadlift" stroke="#8b5cf6" strokeWidth={3} dot={{ r: 4 }} name="Peso Muerto" />
                                    <Line type="monotone" dataKey="bench" stroke="#10b981" strokeWidth={3} dot={{ r: 4 }} name="Banca" />
                                </LineChart>
                            </ResponsiveContainer>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[
                    { label: 'Volumen Total', value: metrics?.prescribedVolume ? `${(metrics.prescribedVolume / 1000).toFixed(1)} Ton` : '0 Ton', trend: '+12%', color: 'text-orange-500' },
                    { label: 'Asistencia Promedio', value: metrics?.summary?.attendanceRate ? `${metrics.summary.attendanceRate}%` : '0%', trend: '+5%', color: 'text-green-500' },
                    { label: 'Clases Asistidas', value: metrics?.summary?.totalAttended || '0', trend: 'Total Histórico', color: 'text-purple-500' },
                ].map((stat, i) => (
                    <motion.div
                        key={i}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.1 }}
                        className="bg-[#1c1c1e]/40 p-6 rounded-2xl border border-white/5"
                    >
                        <p className="text-gray-400 text-sm mb-1">{stat.label}</p>
                        <p className="text-3xl font-black text-white">{stat.value}</p>
                        <p className={`text-xs font-bold ${stat.color} mt-2`}>{stat.trend}</p>
                    </motion.div>
                ))}
            </div>
        </div>
    );
}
