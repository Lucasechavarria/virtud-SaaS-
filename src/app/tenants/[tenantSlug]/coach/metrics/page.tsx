'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import MetricsDashboard from '@/features/coach/components/MetricsDashboard';

// Mock data for metrics
// Mock data for metrics removed as it was unused

export default function CoachMetricsPage() {
    const [viewMode, setViewMode] = useState<'individual' | 'group' | 'class'>('individual');
    const [selectedStudent, setSelectedStudent] = useState<string>('');
    const [students, setStudents] = useState<{ id: string, full_name: string }[]>([]);
    const [metrics, setMetrics] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);

    // Fetch Students
    useEffect(() => {
        const fetchStudents = async () => {
            try {
                const res = await fetch('/api/coach/students');
                const data = await res.json();
                if (data.success) {
                    setStudents(data.students);
                    if (data.students.length > 0) {
                        setSelectedStudent(data.students[0].id);
                    }
                }
            } catch (err) {
                console.error('Error fetching students:', err);
            }
        };
        fetchStudents();
    }, []);

    // Fetch Metrics
    useEffect(() => {
        const fetchMetrics = async () => {
            if (viewMode === 'individual' && !selectedStudent) return;

            setIsLoading(true);
            try {
                const params = new URLSearchParams({
                    mode: viewMode,
                    ...(selectedStudent && { studentId: selectedStudent })
                });
                const res = await fetch(`/api/coach/analytics?${params}`);
                const data = await res.json();
                if (data.success) {
                    setMetrics(data.metrics);
                }
            } catch (err) {
                console.error('Error fetching metrics:', err);
            } finally {
                setIsLoading(false);
            }
        };
        fetchMetrics();
    }, [viewMode, selectedStudent]);

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-8"
        >
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
                <div>
                    <h1 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white to-purple-400 mb-2">
                        📊 Métricas de Rendimiento
                    </h1>
                    <p className="text-gray-400">Análisis de progreso y estadísticas.</p>
                </div>

                {/* View Mode Selector */}
                <div className="flex gap-2">
                    {[
                        { id: 'individual', label: '👤 Individual', desc: 'Por alumno' },
                        { id: 'group', label: '👥 Grupal', desc: 'Todos mis alumnos' },
                        { id: 'class', label: '🏋️ Por Clase', desc: 'Por clase' },
                    ].map((mode) => (
                        <button
                            key={mode.id}
                            onClick={() => setViewMode(mode.id as any)}
                            className={`px-4 py-2 rounded-lg font-medium transition-all ${viewMode === mode.id
                                ? 'bg-purple-500 text-white shadow-lg shadow-purple-500/20'
                                : 'bg-white/5 text-gray-400 hover:bg-white/10'
                                }`}
                            title={mode.desc}
                        >
                            {mode.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Student Selector (Individual Mode) */}
            {viewMode === 'individual' && (
                <div className="bg-[#1c1c1e]/60 backdrop-blur-xl border border-white/10 rounded-xl p-4">
                    <label className="block text-gray-300 mb-2 font-bold">Seleccionar Alumno:</label>
                    <select
                        value={selectedStudent}
                        onChange={(e) => setSelectedStudent(e.target.value)}
                        className="w-full md:w-64 bg-[#0a0a0a] text-white border border-white/10 rounded-lg p-3"
                    >
                        {students.map(s => (
                            <option key={s.id} value={s.id}>{s.full_name}</option>
                        ))}
                    </select>
                </div>
            )}

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {isLoading ? (
                    Array(4).fill(0).map((_, _i) => (
                        <div key={_i} className="bg-[#1c1c1e]/60 border border-white/10 rounded-xl p-4 animate-pulse h-24" />
                    ))
                ) : (
                    [
                        {
                            label: 'Asistencia',
                            value: `${metrics?.summary?.attendanceRate || 0}%`,
                            icon: '✅',
                            color: 'text-green-400'
                        },
                        {
                            label: 'Clases Asistidas',
                            value: metrics?.summary?.totalAttended || 0,
                            icon: '💪',
                            color: 'text-blue-400'
                        },
                        {
                            label: 'Volumen Prescrito',
                            value: metrics?.prescribedVolume || 0,
                            icon: '📈',
                            color: 'text-purple-400'
                        },
                        {
                            label: 'Peso Actual',
                            value: metrics?.measurements?.[metrics.measurements.length - 1]?.weight ? `${metrics.measurements[metrics.measurements.length - 1].weight}kg` : '-',
                            icon: '🎯',
                            color: 'text-orange-400'
                        },
                    ].map((stat, i) => (
                        <motion.div
                            key={`${viewMode}-${i}`}
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: i * 0.05 }}
                            className="bg-[#1c1c1e]/60 backdrop-blur-xl border border-white/10 rounded-xl p-4"
                        >
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-2xl">{stat.icon}</span>
                                <span className={`text-2xl font-black ${stat.color}`}>{stat.value}</span>
                            </div>
                            <p className="text-sm text-gray-400">{stat.label}</p>
                        </motion.div>
                    ))
                )}
            </div>

            {/* Charts */}
            <MetricsDashboard studentId={selectedStudent} viewMode={viewMode} />

            {viewMode === 'group' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Top Volume */}
                    <div className="bg-[#1c1c1e]/60 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
                        <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                            <span>🏋️</span> Top 3 Volumen Semanal (Ton)
                        </h3>
                        <div className="space-y-3">
                            {(metrics?.topVolume || []).map((athlete: any, index: number) => (
                                <div key={athlete.name} className="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-white/5">
                                    <div className="flex items-center gap-3">
                                        <span className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs ${
                                            index === 0 ? 'bg-yellow-500 text-black' :
                                            index === 1 ? 'bg-zinc-400 text-black' :
                                            'bg-amber-700 text-white'
                                        }`}>
                                            {index + 1}
                                        </span>
                                        <span className="text-white font-medium">{athlete.name}</span>
                                    </div>
                                    <span className="text-orange-400 font-bold">{athlete.volume} Ton</span>
                                </div>
                            ))}
                            {(!metrics?.topVolume || metrics.topVolume.length === 0) && (
                                <p className="text-zinc-500 text-sm text-center py-4">Sin datos de volumen.</p>
                            )}
                        </div>
                    </div>

                    {/* Top Streak */}
                    <div className="bg-[#1c1c1e]/60 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
                        <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                            <span>🔥</span> Top 3 Racha de Asistencia
                        </h3>
                        <div className="space-y-3">
                            {(metrics?.topStreak || []).map((athlete: any, index: number) => (
                                <div key={athlete.name} className="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-white/5">
                                    <div className="flex items-center gap-3">
                                        <span className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs ${
                                            index === 0 ? 'bg-yellow-500 text-black' :
                                            index === 1 ? 'bg-zinc-400 text-black' :
                                            'bg-amber-700 text-white'
                                        }`}>
                                            {index + 1}
                                        </span>
                                        <span className="text-white font-medium">{athlete.name}</span>
                                    </div>
                                    <span className="text-green-400 font-bold">{athlete.streak} Clases</span>
                                </div>
                            ))}
                            {(!metrics?.topStreak || metrics.topStreak.length === 0) && (
                                <p className="text-zinc-500 text-sm text-center py-4">Sin datos de asistencia.</p>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Recent Activities */}
            <div className="bg-[#1c1c1e]/60 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
                <h3 className="text-xl font-bold text-white mb-4">🔥 Actividad Reciente</h3>
                <div className="space-y-3">
                    {metrics?.summary?.totalAttended > 0 || metrics?.measurements?.length > 0 ? (
                        <>
                            {metrics.measurements.slice(-2).reverse().map((m: any, i: number) => (
                                <div key={`m-${i}`} className="flex items-center justify-between p-3 bg-white/5 rounded-lg hover:bg-white/10 transition-colors">
                                    <div>
                                        <p className="text-white font-medium">Nueva medición registrada</p>
                                        <p className="text-xs text-gray-400">{new Date(m.recorded_at).toLocaleDateString('es-AR')}</p>
                                    </div>
                                    <span className="px-3 py-1 bg-blue-500/20 text-blue-400 rounded-full text-xs font-bold">
                                        {m.weight}kg
                                    </span>
                                </div>
                            ))}
                            {/* Simple placeholder for recent booking attendance */}
                            <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg hover:bg-white/10 transition-colors">
                                <div>
                                    <p className="text-white font-medium">Asistencia registrada</p>
                                    <p className="text-xs text-gray-400">Últimas sesiones</p>
                                </div>
                                <span className="px-3 py-1 bg-green-500/20 text-green-400 rounded-full text-xs font-bold">
                                    {metrics?.summary?.totalAttended} clases
                                </span>
                            </div>
                        </>
                    ) : (
                        <p className="text-gray-500 text-sm text-center py-4">Sin actividad reciente para mostrar.</p>
                    )}
                </div>
            </div>
        </motion.div>
    );
}
