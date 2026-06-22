'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    DollarSign,
    Target,
    TrendingDown,
    BarChart3,
    PieChart,
    ArrowUpRight,
    ArrowDownRight,
    Loader2
} from 'lucide-react';
import { useParams } from 'next/navigation';
import { toast } from 'react-hot-toast';

interface StatItem {
    label: string;
    value: string;
    trend: string;
    color: string;
    icon: any;
    desc: string;
}

interface BIMetricsResponse {
    success: boolean;
    metrics: {
        ltv: { value: string; trend: string; raw: number };
        cac: { value: string; trend: string; raw: number };
        churn: { value: string; trend: string; raw: number };
        mrr: { value: string; trend: string; raw: number };
    };
    incomeSources: {
        membershipPercent: number;
        storePercent: number;
        membershipTotal: number;
        storeTotal: number;
    };
    cashFlow: Array<{ fecha: string; ingresos: number }>;
}

export default function BusinessIntelligence() {
    const params = useParams();
    const tenantSlug = params?.tenantSlug as string;

    const [period, setPeriod] = useState<'7D' | '30D' | '90D' | '12M'>('30D');
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<BIMetricsResponse | null>(null);

    const fetchBIMetrics = async () => {
        setLoading(true);
        try {
            const url = tenantSlug 
                ? `/api/admin/bi-metrics?gymId=${tenantSlug}&period=${period}` 
                : `/api/admin/bi-metrics?period=${period}`;
            
            const res = await fetch(url);
            const resData = await res.json();
            if (res.ok && resData.success) {
                setData(resData);
            } else {
                toast.error(resData.error || 'Error al calcular métricas');
            }
        } catch (error) {
            console.error('Error fetching BI metrics:', error);
            toast.error('Error de red al calcular métricas de BI');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchBIMetrics();
    }, [tenantSlug, period]);

    const statsConfig = [
        { 
            key: 'ltv', 
            label: 'LTV (Lifetime Value)', 
            color: 'from-blue-600 to-cyan-500', 
            icon: DollarSign, 
            desc: 'Ingreso promedio acumulado por socio' 
        },
        { 
            key: 'cac', 
            label: 'CAC (Adquisición)', 
            color: 'from-orange-600 to-red-500', 
            icon: Target, 
            desc: 'Costo de marketing por alumno nuevo' 
        },
        { 
            key: 'churn', 
            label: 'Tasa de Churn', 
            color: 'from-purple-600 to-indigo-500', 
            icon: TrendingDown, 
            desc: 'Deserción en el periodo' 
        },
        { 
            key: 'mrr', 
            label: 'MRR (Mensual Recurrente)', 
            color: 'from-emerald-600 to-teal-500', 
            icon: BarChart3, 
            desc: 'Ingreso mensual recurrente' 
        },
    ];

    // Obtener el valor máximo para pintar las barras de forma proporcional
    const maxCashFlowValue = data?.cashFlow.reduce((max, curr) => curr.ingresos > max ? curr.ingresos : max, 0) || 1;

    // Calcular la circunferencia de la torta de fuentes de ingreso
    // Circunferencia = 2 * PI * r = 2 * 3.14159 * 40 = 251.2
    const circumference = 251.2;
    const storePercent = data?.incomeSources.storePercent || 0;
    const membershipPercent = data?.incomeSources.membershipPercent || 0;
    const strokeDashoffset = circumference - (membershipPercent / 100) * circumference;

    return (
        <div className="space-y-10 pb-20">
            {/* Header / Filter */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h2 className="text-4xl font-black text-white italic uppercase tracking-tighter flex items-center gap-3">
                        <BarChart3 className="text-orange-500 animate-pulse" size={32} />
                        Métricas de Negocio
                    </h2>
                    <p className="text-gray-500 text-sm font-medium">Análisis profundo sobre la rentabilidad y salud financiera del gimnasio.</p>
                </div>

                <div className="flex items-center gap-2 p-1 bg-[#1c1c1e] rounded-2xl border border-white/5 shadow-inner">
                    {(['7D', '30D', '90D', '12M'] as const).map(p => (
                        <button 
                            key={p} 
                            onClick={() => setPeriod(p)}
                            className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                                period === p 
                                    ? 'bg-white text-black shadow-lg' 
                                    : 'text-gray-500 hover:text-white hover:bg-white/5'
                            }`}
                        >
                            {p}
                        </button>
                    ))}
                </div>
            </div>

            {loading && !data ? (
                <div className="flex flex-col items-center justify-center py-40 gap-4">
                    <Loader2 className="animate-spin text-orange-500" size={48} />
                    <p className="text-xs font-black uppercase text-gray-500 tracking-widest">Ejecutando cálculos de BI en tiempo real...</p>
                </div>
            ) : (
                <>
                    {/* Main Stats Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
                        {statsConfig.map((config, idx) => {
                            const metricKey = config.key as 'ltv' | 'cac' | 'churn' | 'mrr';
                            const metric = data?.metrics[metricKey];
                            const trend = metric?.trend || '0.0%';
                            const isPositiveTrend = trend.startsWith('+');
                            const Icon = config.icon;

                            return (
                                <motion.div
                                    key={config.label}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: idx * 0.1 }}
                                    className="p-8 rounded-[3rem] bg-[#1c1c1e] border border-white/5 relative overflow-hidden group hover:border-white/10 transition-all shadow-2xl"
                                >
                                    {/* Glow effect */}
                                    <div className={`absolute -right-10 -top-10 w-32 h-32 bg-gradient-to-br ${config.color} opacity-10 blur-3xl group-hover:opacity-20 transition-opacity`} />

                                    <div className="space-y-4 relative z-10">
                                        <div className="flex items-center justify-between">
                                            <div className={`p-3 rounded-2xl bg-gradient-to-br ${config.color} text-white border border-white/5`}>
                                                <Icon size={20} />
                                            </div>
                                            <div className={`flex items-center gap-1 text-xs font-black ${
                                                metricKey === 'churn' || metricKey === 'cac'
                                                    ? (isPositiveTrend ? 'text-red-400' : 'text-green-400') // Para Churn y CAC, que suba es negativo
                                                    : (isPositiveTrend ? 'text-green-400' : 'text-red-400')
                                            }`}>
                                                {trend}
                                                {isPositiveTrend ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                                            </div>
                                        </div>

                                        <div>
                                            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest">{config.label}</h3>
                                            <p className="text-3xl font-black text-white italic tracking-tighter mt-1">
                                                {loading ? 'Cargando...' : metric?.value || 'N/A'}
                                            </p>
                                        </div>
                                        <p className="text-[10px] text-gray-600 font-bold uppercase tracking-tighter">{config.desc}</p>
                                    </div>
                                </motion.div>
                            );
                        })}
                    </div>

                    {/* Second row - Charts */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        {/* Daily Cash Flow Bar Chart */}
                        <div className="p-10 rounded-[4rem] bg-[#1c1c1e] border border-white/5 h-[400px] relative overflow-hidden flex flex-col justify-between group shadow-2xl">
                            <div className="flex items-center justify-between">
                                <div className="space-y-1">
                                    <h4 className="text-xl font-black text-white italic uppercase tracking-tighter">Flujo de Caja ({period})</h4>
                                    <p className="text-xs text-gray-500 font-medium">Recaudación real acumulada por intervalos de tiempo</p>
                                </div>
                                <div className="p-2 border border-white/5 rounded-xl text-gray-400">
                                    <BarChart3 size={18} />
                                </div>
                            </div>
                            
                            {/* Real Chart implementation using responsive CSS flexbox */}
                            <div className="flex items-end justify-between h-48 gap-3 pr-4">
                                {data?.cashFlow.map((cf, i) => {
                                    // Altura proporcional
                                    const percentHeight = maxCashFlowValue > 0 ? (cf.ingresos / maxCashFlowValue) * 100 : 0;
                                    
                                    return (
                                        <div key={i} className="flex-1 flex flex-col items-center h-full justify-end group/bar relative">
                                            {/* Valor sobre la barra en hover */}
                                            <div className="absolute -top-10 bg-white text-black text-[10px] font-black px-2 py-1 rounded opacity-0 group-hover/bar:opacity-100 transition-opacity whitespace-nowrap z-10 shadow-lg pointer-events-none">
                                                ${cf.ingresos.toLocaleString('es-AR')}
                                            </div>

                                            <motion.div
                                                initial={{ height: 0 }}
                                                animate={{ height: `${Math.max(percentHeight, 4)}%` }} // Mínimo 4% de altura para que se vea la base
                                                transition={{ delay: i * 0.05, duration: 0.8, ease: 'easeOut' }}
                                                className={`w-full rounded-t-xl bg-gradient-to-t ${
                                                    cf.ingresos === maxCashFlowValue 
                                                        ? 'from-orange-600 to-orange-400' 
                                                        : 'from-white/5 to-white/15'
                                                } hover:from-orange-500 hover:to-orange-400 hover:shadow-[0_0_15px_rgba(249,115,22,0.2)] transition-all cursor-pointer`}
                                            />

                                            <span className="text-[8px] font-bold text-gray-600 uppercase tracking-widest mt-2 whitespace-nowrap block text-center max-w-full overflow-hidden text-ellipsis">
                                                {cf.fecha}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Income Sources Pie Chart */}
                        <div className="p-10 rounded-[4rem] bg-[#1c1c1e] border border-white/5 h-[400px] flex flex-col justify-between shadow-2xl overflow-hidden relative group">
                            <div className="flex items-center justify-between">
                                <div className="space-y-1">
                                    <h4 className="text-xl font-black text-white italic uppercase tracking-tighter">Fuentes de Ingreso</h4>
                                    <p className="text-xs text-gray-500 font-medium">Distribución porcentual de ingresos (Membresías vs Tienda)</p>
                                </div>
                                <div className="p-2 border border-white/5 rounded-xl text-gray-400">
                                    <PieChart size={18} />
                                </div>
                            </div>

                            <div className="flex flex-col sm:flex-row items-center gap-10">
                                <div className="relative w-40 h-40">
                                    <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-90">
                                        {/* Círculo base de Tienda (Fondo gris) */}
                                        <circle 
                                            cx="50" 
                                            cy="50" 
                                            r="40" 
                                            stroke="currentColor" 
                                            strokeWidth="12" 
                                            fill="transparent" 
                                            className="text-blue-600" 
                                        />
                                        
                                        {/* Círculo superpuesto de Membresías */}
                                        <motion.circle
                                            cx="50" 
                                            cy="50" 
                                            r="40"
                                            stroke="currentColor" 
                                            strokeWidth="12"
                                            fill="transparent"
                                            strokeDasharray={circumference}
                                            initial={{ strokeDashoffset: circumference }}
                                            animate={{ strokeDashoffset }}
                                            transition={{ duration: 1.2, ease: 'easeOut' }}
                                            className="text-orange-500"
                                        />
                                    </svg>
                                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                                        <span className="text-2xl font-black text-white italic tracking-tighter">{membershipPercent}%</span>
                                        <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest leading-none">Membresías</span>
                                    </div>
                                </div>

                                <div className="space-y-4 flex-1 w-full">
                                    <div className="flex items-center gap-3">
                                        <div className="w-3 h-3 rounded-full bg-orange-500" />
                                        <div className="flex-1">
                                            <div className="flex justify-between text-xs font-bold text-white mb-1">
                                                <span>Membresías y Cuotas</span>
                                                <span>{membershipPercent}%</span>
                                            </div>
                                            <div className="text-[10px] text-gray-500 font-mono mb-1">
                                                ${(data?.incomeSources.membershipTotal || 0).toLocaleString('es-AR')} ARS
                                            </div>
                                            <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                                                <motion.div 
                                                    initial={{ width: 0 }}
                                                    animate={{ width: `${membershipPercent}%` }}
                                                    transition={{ duration: 1, ease: 'easeOut' }}
                                                    className="h-full bg-orange-500" 
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-3">
                                        <div className="w-3 h-3 rounded-full bg-blue-600" />
                                        <div className="flex-1">
                                            <div className="flex justify-between text-xs font-bold text-white mb-1">
                                                <span>Ventas POS (Tienda)</span>
                                                <span>{storePercent}%</span>
                                            </div>
                                            <div className="text-[10px] text-gray-500 font-mono mb-1">
                                                ${(data?.incomeSources.storeTotal || 0).toLocaleString('es-AR')} ARS
                                            </div>
                                            <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                                                <motion.div 
                                                    initial={{ width: 0 }}
                                                    animate={{ width: `${storePercent}%` }}
                                                    transition={{ duration: 1, ease: 'easeOut' }}
                                                    className="h-full bg-blue-600" 
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
