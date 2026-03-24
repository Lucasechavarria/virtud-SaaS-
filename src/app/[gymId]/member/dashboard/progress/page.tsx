'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    TrendingUp,
    Calendar,
    Target,
    Weight,
    ChevronRight,
    Plus,
    Activity,
    Trophy,
    Ruler,
    ArrowUpRight,
    ArrowDownRight,
    Dumbbell
} from 'lucide-react';
import toast from 'react-hot-toast';

interface ProgressData {
    historial_peso: WeightEntry[];
    entrenamientos_completados: number;
    entrenamientos_totales: number;
    racha_actual: number;
    mejor_racha: number;
    mediciones: Measurement[];
}

interface WeightEntry {
    fecha: string;
    peso: number;
}

interface Measurement {
    fecha: string;
    pecho: number;
    cintura: number;
    cadera: number;
    brazos: number;
    piernas: number;
}

export default function StudentProgressPage() {
    const [loading, setLoading] = useState(true);
    const [progress, setProgress] = useState<ProgressData | null>(null);
    const [showAddWeight, setShowAddWeight] = useState(false);
    const [newWeight, setNewWeight] = useState('');

    useEffect(() => {
        loadProgress();
    }, []);

    const loadProgress = async () => {
        try {
            const response = await fetch('/api/student/progress');
            const data = await response.json();

            if (data.success) {
                setProgress(data.progress);
            }
        } catch (error) {
            console.error('Error:', error);
            toast.error('Error al cargar progreso');
        } finally {
            setLoading(false);
        }
    };

    const handleAddWeight = async () => {
        if (!newWeight) return;

        try {
            const response = await fetch('/api/student/progress/weight', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ weight: parseFloat(newWeight) })
            });

            const data = await response.json();

            if (data.success) {
                toast.success('Peso registrado con éxito');
                setShowAddWeight(false);
                setNewWeight('');
                loadProgress();
            }
        } catch (error) {
            console.error('Error:', error);
            toast.error('Error al registrar peso');
        }
    };

    const getCompletionPercentage = () => {
        if (!progress || progress.entrenamientos_totales === 0) return 0;
        return Math.round((progress.entrenamientos_completados / progress.entrenamientos_totales) * 100);
    };

    const getWeightChange = () => {
        if (!progress || progress.historial_peso.length < 2) return 0;
        const first = progress.historial_peso[0].peso;
        const last = progress.historial_peso[progress.historial_peso.length - 1].peso;
        return last - first;
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
                <div className="flex flex-col items-center gap-6">
                    <motion.div
                        animate={{
                            rotate: 360,
                            scale: [1, 1.1, 1]
                        }}
                        transition={{
                            rotate: { duration: 1.5, repeat: Infinity, ease: "linear" },
                            scale: { duration: 2, repeat: Infinity }
                        }}
                        className="w-16 h-16 border-4 border-emerald-500/20 border-t-emerald-500 rounded-2xl"
                    />
                    <p className="text-zinc-500 font-black animate-pulse text-xs uppercase tracking-[0.4em]">Sincronizando Bio-Métricas...</p>
                </div>
            </div>
        );
    }

    const weightChange = getWeightChange();

    return (
        <div className="min-h-screen bg-[#0a0a0a] p-4 lg:p-10 text-white selection:bg-emerald-500/30">
            <div className="max-w-[1400px] mx-auto space-y-12">

                {/* Header Premium */}
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex flex-col md:flex-row md:items-end justify-between gap-8"
                >
                    <div className="space-y-2">
                        <div className="flex items-center gap-3">
                            <div className="bg-emerald-500/20 p-2 rounded-xl border border-emerald-500/30">
                                <Activity size={20} className="text-emerald-500" />
                            </div>
                            <span className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.4em]">Analítica de Rendimiento</span>
                        </div>
                        <h1 className="text-5xl md:text-6xl font-black text-white tracking-tighter uppercase">Bio-<span className="text-zinc-700">Evolución</span></h1>
                    </div>

                    <button
                        onClick={() => setShowAddWeight(true)}
                        className="group bg-white text-black px-8 py-4 rounded-3xl font-black uppercase text-xs tracking-widest flex items-center gap-3 hover:bg-emerald-500 hover:text-white transition-all shadow-xl shadow-white/5 active:scale-95"
                    >
                        <Plus size={18} className="group-hover:rotate-90 transition-transform" />
                        Registrar Peso
                    </button>
                </motion.div>

                {/* KPI Grid Elite */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {[
                        {
                            label: 'Consistencia',
                            value: `${progress?.entrenamientos_completados || 0}`,
                            sub: `de ${progress?.entrenamientos_totales || 0} sesiones`,
                            color: 'from-emerald-500 to-teal-600',
                            icon: Dumbbell,
                            trend: `${getCompletionPercentage()}%`
                        },
                        {
                            label: 'Racha Imbatible',
                            value: `${progress?.racha_actual || 0} Días`,
                            sub: `Récord: ${progress?.mejor_racha || 0} días`,
                            color: 'from-orange-500 to-red-600',
                            icon: Trophy,
                            trend: 'Fuego'
                        },
                        {
                            label: 'Estado Actual',
                            value: weightChange === 0 ? 'Pulsado' : `${weightChange > 0 ? '+' : ''}${weightChange.toFixed(1)}kg`,
                            sub: 'Desde inicio del plan',
                            color: weightChange <= 0 ? 'from-indigo-500 to-violet-600' : 'from-yellow-500 to-orange-600',
                            icon: Weight,
                            trend: weightChange <= 0 ? 'Optimal' : 'Bulking'
                        },
                        {
                            label: 'Tasa de Éxito',
                            value: `${getCompletionPercentage()}%`,
                            sub: 'Eficiencia de entrenamiento',
                            color: 'from-blue-500 to-indigo-600',
                            icon: Target,
                            trend: 'Live'
                        },
                    ].map((kpi, idx) => (
                        <motion.div
                            key={kpi.label}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: idx * 0.1 }}
                            whileHover={{ y: -5 }}
                            className="p-8 rounded-[2.5rem] bg-zinc-900/40 border border-zinc-800 hover:border-zinc-700 transition-all group relative overflow-hidden shadow-2xl"
                        >
                            <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${kpi.color} opacity-5 blur-3xl group-hover:opacity-10 transition-opacity`} />

                            <div className="flex items-start justify-between mb-8">
                                <div className={`p-4 rounded-2xl bg-gradient-to-br ${kpi.color} shadow-lg shadow-black/20`}>
                                    <kpi.icon size={22} className="text-white" />
                                </div>
                                <div className="text-[10px] font-black text-zinc-500 uppercase tracking-widest bg-black/40 px-3 py-1.5 rounded-full border border-white/5">
                                    {kpi.trend}
                                </div>
                            </div>

                            <div className="space-y-1">
                                <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">{kpi.label}</p>
                                <h3 className="text-4xl font-black text-white tracking-tighter uppercase">{kpi.value}</h3>
                                <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-tight">{kpi.sub}</p>
                            </div>
                        </motion.div>
                    ))}
                </div>

                {/* Weight Evolution Visualizer */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-zinc-900/60 backdrop-blur-3xl border border-zinc-800 rounded-[3rem] p-10 shadow-2xl overflow-hidden relative"
                >
                    <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />

                    <div className="flex flex-col md:flex-row items-center justify-between gap-6 mb-12 relative z-10">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-zinc-800 rounded-2xl flex items-center justify-center border border-zinc-700">
                                <TrendingUp size={24} className="text-emerald-500" />
                            </div>
                            <div>
                                <h2 className="text-2xl font-black text-white uppercase tracking-tight">Curva de Transformación</h2>
                                <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Peso Corporal (Últimos Registros)</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-2 bg-black/40 px-4 py-2 rounded-full border border-white/5">
                            <Calendar size={14} className="text-zinc-500" />
                            <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Total: {progress?.historial_peso.length || 0} Registros</span>
                        </div>
                    </div>

                    {progress && progress.historial_peso.length > 0 ? (
                        <div className="relative h-80 w-full z-10 px-4">
                            <div className="absolute inset-0 flex items-end justify-between px-10">
                                {progress.historial_peso.map((_, i) => (
                                    <div key={i} className="w-px h-full bg-zinc-800/30" />
                                ))}
                            </div>

                            <div className="h-full flex items-end gap-3 relative z-20">
                                {progress.historial_peso.map((entry, index) => {
                                    const weights = progress.historial_peso.map(e => e.peso);
                                    const maxWeight = Math.max(...weights);
                                    const minWeight = Math.min(...weights);
                                    const range = maxWeight - minWeight || 1;
                                    const height = ((entry.peso - minWeight) / range) * 80 + 15;

                                    return (
                                        <div key={index} className="flex-1 h-full flex flex-col justify-end items-center group cursor-pointer">
                                            <motion.div
                                                initial={{ height: 0 }}
                                                animate={{ height: `${height}%` }}
                                                transition={{ delay: index * 0.05, type: "spring", stiffness: 100 }}
                                                className="w-full relative max-w-[40px]"
                                            >
                                                <div className="absolute -top-12 left-1/2 -translate-x-1/2 bg-white text-black text-[10px] font-black px-2 py-1 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap shadow-xl">
                                                    {entry.peso} kg
                                                </div>
                                                <div className="w-full h-full bg-gradient-to-t from-emerald-500 to-emerald-400 rounded-2xl shadow-lg shadow-emerald-500/10 group-hover:from-white group-hover:to-white transition-all" />
                                            </motion.div>
                                            <div className="text-[9px] font-black text-zinc-600 uppercase tracking-tighter mt-4 text-center">
                                                {new Date(entry.fecha).toLocaleDateString('es-AR', { day: '2-digit', month: 'short' })}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ) : (
                        <div className="text-center py-20 relative z-10 border-2 border-dashed border-zinc-800 rounded-[3rem]">
                            <div className="w-20 h-20 bg-zinc-900 rounded-full flex items-center justify-center mx-auto mb-6">
                                <Weight size={40} className="text-zinc-800" />
                            </div>
                            <h3 className="text-xl font-black text-zinc-700 uppercase tracking-widest mb-2">Sin Datos de Peso</h3>
                            <p className="text-zinc-600 text-sm mb-8">Comienza a registrar tu evolución hoy mismo</p>
                        </div>
                    )}
                </motion.div>

                {/* Bio-Metrics Table Grid */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="space-y-8"
                >
                    <div className="flex items-center gap-4 px-4">
                        <Ruler size={24} className="text-zinc-500" />
                        <h2 className="text-2xl font-black text-white uppercase tracking-tight">Mediciones <span className="text-zinc-700">Corporales</span></h2>
                    </div>

                    {progress && progress.mediciones && progress.mediciones.length > 0 ? (
                        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                            <div className="bg-zinc-900/50 rounded-[3rem] border border-zinc-800 p-8 overflow-hidden">
                                <table className="w-full text-left">
                                    <thead>
                                        <tr className="border-b border-zinc-800">
                                            <th className="pb-4 text-[10px] font-black text-zinc-500 uppercase tracking-widest">Fecha</th>
                                            <th className="pb-4 text-[10px] font-black text-zinc-500 uppercase tracking-widest">Zona</th>
                                            <th className="pb-4 text-[10px] font-black text-zinc-500 uppercase tracking-widest text-right">Resultado</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-zinc-800/50">
                                        {progress.mediciones.slice().reverse().map((m, idx) => (
                                            <tr key={idx} className="group hover:bg-white/5 transition-colors">
                                                <td className="py-6">
                                                    <p className="text-xs font-black text-white">{new Date(m.fecha).toLocaleDateString('es-AR')}</p>
                                                    <p className="text-[9px] font-bold text-zinc-600 uppercase tracking-widest">Métrica Bio</p>
                                                </td>
                                                <td className="py-6">
                                                    <div className="flex flex-wrap gap-2">
                                                        {['Pecho', 'Cintura', 'Cadera', 'Brazos', 'Piernas'].map(part => (
                                                            <span key={part} className="text-[9px] font-black bg-zinc-800 px-2 py-1 rounded text-zinc-400 uppercase tracking-tighter">{part}</span>
                                                        ))}
                                                    </div>
                                                </td>
                                                <td className="py-6 text-right">
                                                    <div className="flex flex-col items-end gap-1">
                                                        <span className="text-white font-black text-sm">{m.cintura} cm</span>
                                                        <span className="text-[8px] font-black text-emerald-500 flex items-center gap-1 uppercase tracking-widest">
                                                            <ArrowDownRight size={10} /> Reducción
                                                        </span>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* Comparison Card (Mock for UI/UX) */}
                            <div className="bg-gradient-to-br from-indigo-500/10 to-violet-500/10 border border-indigo-500/20 rounded-[3rem] p-12 flex flex-col justify-center items-center text-center space-y-8 relative overflow-hidden">
                                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 to-violet-500" />
                                <div className="w-24 h-24 bg-indigo-500/20 rounded-full flex items-center justify-center border border-indigo-500/30">
                                    <Activity size={40} className="text-indigo-400" />
                                </div>
                                <div>
                                    <h3 className="text-3xl font-black text-white tracking-tighter uppercase mb-2">Visión Comparativa</h3>
                                    <p className="text-zinc-500 text-sm max-w-xs mx-auto leading-relaxed">
                                        Subí tus fotos de progreso para que la IA de Virtud Gym pueda analizar tus cambios musculares y de postura de forma automatizada.
                                    </p>
                                </div>
                                <button className="px-8 py-4 bg-indigo-500 text-white rounded-3xl font-black uppercase text-xs tracking-widest hover:bg-indigo-400 transition-all shadow-xl shadow-indigo-500/20 active:scale-95">
                                    Activar Bio-Escáner
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="text-center py-20 bg-zinc-900/30 border border-zinc-800 rounded-[3rem]">
                            <p className="text-zinc-600 font-black uppercase text-xs tracking-widest">Sin registro de medidas corporales</p>
                        </div>
                    )}
                </motion.div>

                {/* Add Weight Modal Stylized */}
                <AnimatePresence>
                    {showAddWeight && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 bg-black/90 backdrop-blur-xl flex items-center justify-center p-6 z-[60]"
                        >
                            <motion.div
                                initial={{ scale: 0.9, y: 20 }}
                                animate={{ scale: 1, y: 0 }}
                                exit={{ scale: 0.9, y: 20 }}
                                className="bg-[#1c1c1e] rounded-[3rem] p-10 max-w-md w-full border border-white/5 relative shadow-2xl"
                            >
                                <div className="absolute top-0 right-0 p-8">
                                    <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center border border-white/5">
                                        <Weight size={24} className="text-zinc-500" />
                                    </div>
                                </div>

                                <h2 className="text-4xl font-black text-white uppercase tracking-tighter mb-2">Nuevo Registro</h2>
                                <p className="text-zinc-500 text-xs font-black uppercase tracking-widest mb-10">Actualización de Peso Corporal</p>

                                <div className="mb-10 group">
                                    <label className="block text-[10px] font-black text-emerald-500 uppercase tracking-[0.2em] mb-4 ml-2">
                                        Peso en Kilogramos
                                    </label>
                                    <div className="relative">
                                        <input
                                            type="number"
                                            step="0.1"
                                            value={newWeight}
                                            onChange={(e) => setNewWeight(e.target.value)}
                                            placeholder="00.0"
                                            className="w-full px-8 py-6 bg-black rounded-3xl text-4xl font-black text-white focus:outline-none focus:ring-4 focus:ring-emerald-500/20 border border-zinc-800 transition-all placeholder:text-zinc-900"
                                            autoFocus
                                        />
                                        <span className="absolute right-8 top-1/2 -translate-y-1/2 text-2xl font-black text-zinc-800">KG</span>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <button
                                        onClick={() => {
                                            setShowAddWeight(false);
                                            setNewWeight('');
                                        }}
                                        className="px-6 py-5 bg-zinc-900 text-zinc-500 rounded-3xl font-black uppercase text-xs tracking-widest hover:bg-zinc-800 transition-colors"
                                    >
                                        Anular
                                    </button>
                                    <button
                                        onClick={handleAddWeight}
                                        disabled={!newWeight}
                                        className="px-6 py-5 bg-emerald-500 text-white rounded-3xl font-black uppercase text-xs tracking-widest hover:bg-emerald-400 transition-all disabled:opacity-20 shadow-xl shadow-emerald-500/20"
                                    >
                                        Registrar
                                    </button>
                                </div>
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}
