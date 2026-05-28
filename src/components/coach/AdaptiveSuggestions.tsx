'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Brain, Sparkles, TrendingUp, AlertTriangle, CheckCircle2, ChevronRight, Zap, Calendar, FastForward, Trophy, Heart, Lightbulb, Target } from 'lucide-react';

interface Suggestion {
    tipo: 'nutricion' | 'entrenamiento' | 'biomedico' | 'general';
    prioridad: 'baja' | 'media' | 'alta' | 'critica';
    titulo: string;
    descripcion: string;
    justificacion: string;
    ajuste_propuesto: string;
    metricas_afectadas: string[];
    riesgos_si_no_se_aplica?: string;
}

interface AdaptiveReport {
    timestamp: string;
    estatus_alumno: string;
    sugerencias: Suggestion[];
    resumen_periodo: string;
    puntaje_adherencia_estimado: number;
    riesgo_lesion: {
        nivel: 'bajo' | 'moderado' | 'alto' | 'critico';
        puntaje: number;
        factores_detonantes: string[];
        recomendacion_inmediata: string;
        analisis_fatiga: string;
    };
    proyeccion_meta?: {
        fecha_estimada: string;
        dias_restantes: number;
        probabilidad_exito: number;
        mensaje_tactico: string;
    };
    analisis_eficiencia?: {
        estado: string;
        sugerencia_timing: string;
        rating_metabolico: number;
    };
    soporte_mental?: {
        estado_animo: string;
        nivel_estres: string;
        calidad_descanso: string;
        recomendacion_bienestar: string;
    };
    alertas_criticas: string[];
}

interface Props {
    userId: string;
}

export default function AdaptiveSuggestions({ userId }: Props) {
    const [report, setReport] = useState<AdaptiveReport | null>(null);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [processedIds, setProcessedIds] = useState<Set<string>>(new Set());
    const [confirmingDiscard, setConfirmingDiscard] = useState<number | null>(null);

    useEffect(() => {
        loadReport();
    }, [userId]);

    const loadReport = async () => {
        setLoading(true);
        try {
            const response = await fetch(`/api/coach/students/${userId}/adaptive-report`);
            const data = await response.json();
            if (data.success) {
                setReport(data.report);
            }
        } catch (error) {
            console.error('Error loading adaptive report:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleAction = async (idx: number, action: 'apply' | 'discard') => {
        if (!report) return;
        const suggestion = report.sugerencias[idx];
        const suggestionId = `${suggestion.tipo}-${idx}`;

        setActionLoading(suggestionId);
        try {
            const response = await fetch(`/api/coach/students/${userId}/adaptive-actions`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    suggestionId,
                    action,
                    suggestionData: suggestion
                })
            });

            if (response.ok) {
                setProcessedIds(prev => new Set(prev).add(suggestionId));
                setConfirmingDiscard(null);
            }
        } catch (error) {
            console.error(`Error performing action ${action}:`, error);
        } finally {
            setActionLoading(null);
        }
    };

    const getPriorityColor = (priority: string) => {
        switch (priority) {
            case 'critica': return 'text-red-400 bg-red-400/10 border-red-400/20';
            case 'alta': return 'text-orange-400 bg-orange-400/10 border-orange-400/20';
            case 'media': return 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20';
            default: return 'text-blue-400 bg-blue-400/10 border-blue-400/20';
        }
    };

    const getRiskColor = (level: string) => {
        switch (level) {
            case 'critico': return 'text-red-500';
            case 'alto': return 'text-orange-500';
            case 'moderado': return 'text-yellow-500';
            default: return 'text-emerald-500';
        }
    };

    const getTypeIcon = (type: string) => {
        switch (type) {
            case 'nutricion': return '🍏';
            case 'entrenamiento': return '💪';
            case 'biomedico': return '🧬';
            default: return '⚙️';
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
                <div className="w-12 h-12 border-t-2 border-indigo-500 border-solid rounded-full animate-spin"></div>
                <p className="text-zinc-500 text-sm font-black uppercase tracking-widest animate-pulse">Sincronizando con Motor Adaptativo...</p>
            </div>
        );
    }

    if (!report) {
        return (
            <div className="text-center py-12">
                <p className="text-zinc-500">No hay suficientes datos recientes para generar sugerencias.</p>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            {/* Alertas Críticas */}
            {report.alertas_criticas.length > 0 && (
                <div className="space-y-2">
                    {report.alertas_criticas.map((alerta, i) => (
                        <motion.div
                            key={i}
                            initial={{ x: -20, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4 flex items-center gap-3"
                        >
                            <div className="w-8 h-8 bg-red-500/20 rounded-full flex items-center justify-center animate-pulse">
                                <AlertTriangle className="text-red-500 w-4 h-4" />
                            </div>
                            <p className="text-sm text-red-200 font-bold">{alerta}</p>
                        </motion.div>
                    ))}
                </div>
            )}

            {/* Hub de Inteligencia y Riesgo */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                {/* Resumen Ejecutivo */}
                <div className="lg:col-span-2 bg-gradient-to-br from-indigo-500/5 to-purple-500/5 rounded-3xl p-6 border border-white/5 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
                        <Brain size={120} className="text-indigo-400" />
                    </div>
                    <div className="relative z-10">
                        <div className="flex items-center gap-2 mb-4">
                            <Sparkles className="text-indigo-400 w-5 h-5" />
                            <span className="text-xs font-black text-indigo-400 uppercase tracking-widest">Resumen IA (7d)</span>
                        </div>
                        <h3 className="text-xl font-bold text-white mb-2">{report.estatus_alumno}</h3>
                        <p className="text-zinc-400 text-sm leading-relaxed max-w-xl">
                            {report.resumen_periodo}
                        </p>
                    </div>
                </div>

                {/* Performance Forecasting (ETA) */}
                {report.proyeccion_meta && (
                    <div className="lg:col-span-2 bg-zinc-900/50 rounded-3xl p-6 border border-white/5 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                            <Calendar size={120} className="text-emerald-400" />
                        </div>
                        <div className="relative z-10">
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-2">
                                    <FastForward className="text-emerald-400 w-5 h-5" />
                                    <span className="text-xs font-black text-emerald-400 uppercase tracking-widest">Proyección de Meta (ETA)</span>
                                </div>
                                <div className="px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full">
                                    <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">
                                        Probabilidad: {report.proyeccion_meta.probabilidad_exito}%
                                    </span>
                                </div>
                            </div>

                            <div className="flex flex-col md:flex-row items-center gap-8">
                                <div className="text-center md:text-left">
                                    <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest block mb-1">Fecha Estimada</span>
                                    <h4 className="text-3xl font-black text-white tracking-tighter">
                                        {new Date(report.proyeccion_meta.fecha_estimada).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}
                                    </h4>
                                    <p className="text-emerald-400 text-xs font-bold mt-1">
                                        Faltan aprox. {report.proyeccion_meta.dias_restantes} días
                                    </p>
                                </div>

                                <div className="flex-1 bg-white/5 rounded-2xl p-4 border border-white/5">
                                    <div className="flex items-center gap-2 mb-2">
                                        <Trophy className="text-yellow-500 w-4 h-4" />
                                        <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Mensaje Táctico</span>
                                    </div>
                                    <p className="text-xs text-zinc-300 leading-relaxed italic">
                                        "{report.proyeccion_meta.mensaje_tactico}"
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Eficiencia Metabólica */}
                {report.analisis_eficiencia && (
                    <div className="bg-zinc-900/50 rounded-3xl p-6 border border-white/5 flex flex-col items-center justify-center text-center relative overflow-hidden group">
                        <Zap className="mb-2 w-6 h-6 text-yellow-400 group-hover:scale-110 transition-transform" />
                        <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1">Eficiencia Metabólica</span>
                        <div className="flex gap-1 mb-2">
                            {[1, 2, 3, 4, 5].map((star) => (
                                <div
                                    key={star}
                                    className={`w-1.5 h-1.5 rounded-full ${star <= (report.analisis_eficiencia?.rating_metabolico || 0) ? 'bg-yellow-400' : 'bg-zinc-800'}`}
                                />
                            ))}
                        </div>
                        <span className="text-xs font-bold text-white mb-1">{report.analisis_eficiencia.estado}</span>
                        <p className="text-[10px] text-zinc-500 leading-tight">
                            {report.analisis_eficiencia.sugerencia_timing}
                        </p>
                    </div>
                )}

                {/* Soporte Mental (Mental Performance) */}
                {report.soporte_mental && (
                    <div className="bg-gradient-to-br from-rose-500/5 to-purple-500/5 rounded-3xl p-6 border border-white/5 flex flex-col items-center justify-center text-center relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity rotate-12">
                            <Heart size={80} className="text-rose-400" />
                        </div>
                        <Heart className="mb-2 w-6 h-6 text-rose-400 animate-pulse" />
                        <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1">Estatus Bio-Mental</span>
                        <div className="flex flex-col gap-1 mb-2">
                            <span className="text-sm font-black text-white">{report.soporte_mental.estado_animo}</span>
                            <div className="flex items-center justify-center gap-2">
                                <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${report.soporte_mental.nivel_estres.toLowerCase().includes('alto') ? 'bg-red-500/20 text-red-400' : 'bg-green-500/20 text-green-400'}`}>
                                    Estrés: {report.soporte_mental.nivel_estres}
                                </span>
                            </div>
                        </div>
                        <p className="text-[10px] text-zinc-400 italic">
                            "{report.soporte_mental.recomendacion_bienestar}"
                        </p>
                    </div>
                )}

                {/* Monitor de Riesgo de Lesiones */}
                <div className="bg-zinc-900/50 rounded-3xl p-6 border border-white/5 flex flex-col items-center justify-center text-center relative overflow-hidden">
                    <div className={`absolute top-0 left-0 w-full h-1 ${getRiskColor(report.riesgo_lesion.nivel).replace('text-', 'bg-')}`} />
                    <TrendingUp className={`mb-2 w-6 h-6 ${getRiskColor(report.riesgo_lesion.nivel)}`} />
                    <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1">Riesgo de Lesión</span>
                    <span className={`text-2xl font-black uppercase tracking-tight mb-2 ${getRiskColor(report.riesgo_lesion.nivel)}`}>
                        {report.riesgo_lesion.nivel}
                    </span>
                    <p className="text-[10px] text-zinc-500 leading-tight">
                        {report.riesgo_lesion.recomendacion_inmediata}
                    </p>
                </div>

                {/* Adherencia */}
                <div className="bg-zinc-900/50 rounded-3xl p-6 border border-white/5 flex flex-col items-center justify-center">
                    <div className="relative w-20 h-20 mb-3">
                        <svg className="w-full h-full transform -rotate-90">
                            <circle
                                cx="40" cy="40" r="34"
                                stroke="currentColor" strokeWidth="6"
                                fill="transparent"
                                className="text-zinc-800"
                            />
                            <circle
                                cx="40" cy="40" r="34"
                                stroke="currentColor" strokeWidth="6"
                                fill="transparent"
                                strokeDasharray={213.6}
                                strokeDashoffset={213.6 - (213.6 * report.puntaje_adherencia_estimado) / 100}
                                className="text-indigo-500 transition-all duration-1000 ease-out"
                            />
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center">
                            <span className="text-xl font-black text-white">{report.puntaje_adherencia_estimado}%</span>
                        </div>
                    </div>
                    <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Adherencia</span>
                </div>
            </div>

            {/* Sugerencias Detalladas */}
            <div className="grid grid-cols-1 gap-4">
                <AnimatePresence>
                    {report.sugerencias.map((suggestion, idx) => {
                        const suggestionId = `${suggestion.tipo}-${idx}`;
                        if (processedIds.has(suggestionId)) return null;

                        return (
                            <motion.div
                                key={idx}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                transition={{ delay: idx * 0.1 }}
                                className="bg-zinc-900/30 border border-white/5 rounded-2xl p-6 hover:border-indigo-500/30 transition-all group relative overflow-hidden"
                            >
                                <div className="flex flex-col md:flex-row gap-6">
                                    <div className="flex-1">
                                        <div className="flex items-center justify-between mb-4">
                                            <div className="flex items-center gap-3">
                                                <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${getPriorityColor(suggestion.prioridad)}`}>
                                                    {suggestion.prioridad}
                                                </span>
                                                <span className="text-xl">{getTypeIcon(suggestion.tipo)}</span>
                                                <h4 className="text-lg font-bold text-white">{suggestion.titulo}</h4>
                                            </div>

                                            {/* Botones de Acción */}
                                            <div className="flex items-center gap-2">
                                                <AnimatePresence mode="wait">
                                                    {confirmingDiscard === idx ? (
                                                        <motion.div
                                                            key="confirm"
                                                            initial={{ opacity: 0, x: 20 }}
                                                            animate={{ opacity: 1, x: 0 }}
                                                            exit={{ opacity: 0, x: 20 }}
                                                            className="flex items-center gap-2 bg-red-500/10 p-1 rounded-xl border border-red-500/20"
                                                        >
                                                            <span className="text-[10px] font-black text-red-400 uppercase px-2">¿Confirmas?</span>
                                                            <button
                                                                onClick={() => handleAction(idx, 'discard')}
                                                                disabled={actionLoading === suggestionId}
                                                                className="bg-red-500 text-white px-3 py-1.5 rounded-lg text-[10px] font-black uppercase hover:bg-red-600 transition-colors"
                                                            >
                                                                Sí
                                                            </button>
                                                            <button
                                                                onClick={() => setConfirmingDiscard(null)}
                                                                className="text-zinc-500 hover:text-white px-2 py-1 text-[10px] font-black uppercase"
                                                            >
                                                                No
                                                            </button>
                                                        </motion.div>
                                                    ) : (
                                                        <motion.div
                                                            key="actions"
                                                            className="flex items-center gap-2"
                                                        >
                                                            <button
                                                                onClick={() => setConfirmingDiscard(idx)}
                                                                className="p-2 hover:bg-red-500/10 rounded-lg text-zinc-500 hover:text-red-400 transition-all group/btn"
                                                                title="Descartar"
                                                            >
                                                                <AlertTriangle size={18} />
                                                            </button>
                                                            <button
                                                                onClick={() => handleAction(idx, 'apply')}
                                                                disabled={actionLoading === suggestionId}
                                                                className="flex items-center gap-2 bg-indigo-500 hover:bg-indigo-600 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-indigo-500/10 disabled:opacity-50"
                                                            >
                                                                {actionLoading === suggestionId ? (
                                                                    <div className="w-3 h-3 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                                                                ) : (
                                                                    <CheckCircle2 size={14} />
                                                                )}
                                                                Aplicar
                                                            </button>
                                                        </motion.div>
                                                    )}
                                                </AnimatePresence>
                                            </div>
                                        </div>

                                        <p className="text-zinc-400 text-sm mb-6 leading-relaxed">
                                            {suggestion.descripcion}
                                        </p>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div className="bg-zinc-800/50 rounded-xl p-4 border border-white/5">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <TrendingUp className="text-indigo-400 w-4 h-4" />
                                                    <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Justificación</span>
                                                </div>
                                                <p className="text-xs text-zinc-300 leading-relaxed italic">
                                                    "{suggestion.justificacion}"
                                                </p>
                                            </div>

                                            <div className="bg-indigo-500/5 rounded-xl p-4 border border-indigo-500/10">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <Zap className="text-indigo-400 w-4 h-4" />
                                                    <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Ajuste Propuesto</span>
                                                </div>
                                                <p className="text-xs text-white font-bold leading-relaxed">
                                                    {suggestion.ajuste_propuesto}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        );
                    })}
                </AnimatePresence>
            </div>

            <div className="bg-orange-500/10 border border-orange-500/20 rounded-2xl p-4 flex items-start gap-3">
                <AlertTriangle className="text-orange-400 w-5 h-5 shrink-0 mt-0.5" />
                <p className="text-xs text-orange-200/70 leading-relaxed">
                    <strong className="text-orange-400 uppercase font-black text-[10px] tracking-widest block mb-1">Aviso de Supervisión IA</strong>
                    Estas sugerencias son generadas por modelos predictivos basados en logs recientes. Debes validar cada ajuste antes de aplicarlo al plan oficial del alumno.
                </p>
            </div>
        </div>
    );
}
