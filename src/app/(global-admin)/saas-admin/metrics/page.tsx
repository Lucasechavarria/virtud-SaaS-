'use client';

import React, { useState, useEffect } from 'react';
import {
    ArrowUpRight,
    ArrowDownRight,
    Users,
    Building2,
    DollarSign,
    RefreshCcw,
    TrendingUp,
    Cpu,
    Server,
    ShieldCheck,
    BarChart3,
    Activity,
    AlertTriangle,
    Eye,
    Download
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import {
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    AreaChart,
    Area
} from 'recharts';

interface SaaSMetric {
    mrr: number;
    gyms_activos: number;
    gyms_suspendidos: number;
    total_alumnos: number;
    videos_procesados?: number;
    rutinas_ia?: number;
    ingresos_totales_mes?: number;
    gastos_alojamiento?: number;
    gastos_ia?: number;
    gastos_totales?: number;
    ganancia_neta?: number;
}

interface MetricHistory extends SaaSMetric {
    fecha: string;
}

interface GymUsage {
    id: string;
    nombre: string;
    slug: string;
    es_activo: boolean;
    estado_pago_saas: string;
    plan_nombre: string;
    precio_mensual: number;
    alumnos_activos: number;
    alumnos_limite: number;
    alumnos_excedentes: number;
    alumnos_excedentes_costo: number;
    videos_procesados: number;
    rutinas_ia: number;
    costo_ia_estimado: number;
    cargo_total_mes: number;
    modelo_facturacion?: 'membresia' | 'consumo' | 'hibrido';
    volumen_pos?: number;
    comision_pos_total?: number;
    saldo_creditos?: number;
    limite_alerta_saldo?: number;
    metodo_cobro_excedentes?: 'prepago' | 'postpago';
    configuracion?: any;
}

export default function SaaSMetricsPage() {
    const [metrics, setMetrics] = useState<SaaSMetric | null>(null);
    const [history, setHistory] = useState<MetricHistory[]>([]);
    const [gymsUsage, setGymsUsage] = useState<GymUsage[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'global' | 'gyms' | 'advisor'>('global');
    const [searchGym, setSearchGym] = useState('');
    const [migratingId, setMigratingId] = useState<string | null>(null);

    useEffect(() => {
        if (activeTab === 'global') {
            fetchMetrics();
        } else {
            fetchGymsUsage();
        }
    }, [activeTab]);

    const handleMigrateModel = async (gym: GymUsage, newModel: 'membresia' | 'consumo' | 'hibrido') => {
        setMigratingId(gym.id);
        try {
            const res = await fetch('/api/admin/gyms/update', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: gym.id,
                    nombre: gym.nombre,
                    slug: gym.slug,
                    es_activo: gym.es_activo,
                    plan_id: gym.configuracion?.plan_id || null,
                    estado_pago_saas: gym.estado_pago_saas,
                    configuracion: {
                        ...(gym.configuracion || {}),
                        modelo_facturacion: newModel
                    }
                })
            });
            if (res.ok) {
                toast.success(`Sede "${gym.nombre}" migrada con éxito a ${newModel.toUpperCase()}`);
                fetchGymsUsage();
            } else {
                const data = await res.json();
                toast.error(data.error || 'Error al realizar migración');
            }
        } catch (_err) {
            toast.error('Error de red al migrar modelo');
        } finally {
            setMigratingId(null);
        }
    };

    const handleExportPDF = () => {
        window.print();
    };

    const fetchMetrics = async () => {
        setLoading(true);
        try {
            const updateRes = await fetch('/api/saas-admin/metrics/update');
            if (!updateRes.ok) throw new Error('Error updating metrics');

            const res = await fetch('/api/saas-admin/metrics/history');
            if (!res.ok) throw new Error('Error fetching history');
            
            const data = await res.json();
            setMetrics(data.latest);
            setHistory(data.history || []);
        } catch (_error) {
            toast.error('Error al cargar las métricas globales');
        } finally {
            setLoading(false);
        }
    };

    const fetchGymsUsage = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/saas-admin/gyms-usage');
            const data = await res.json();
            if (res.ok) {
                setGymsUsage(data.usage || []);
            } else {
                toast.error(data.error || 'Error al obtener consumos');
            }
        } catch (_error) {
            toast.error('Error de conexión al cargar consumos');
        } finally {
            setLoading(false);
        }
    };

    const handleFetchAll = () => {
        if (activeTab === 'global') fetchMetrics();
        else fetchGymsUsage();
    };

    const filteredGymsUsage = gymsUsage.filter(g =>
        g.nombre.toLowerCase().includes(searchGym.toLowerCase()) ||
        g.slug.toLowerCase().includes(searchGym.toLowerCase())
    );

    // Fallbacks dinámicos
    const ingresosSaaS = metrics?.ingresos_totales_mes || metrics?.mrr || 0;
    const gastosTotales = metrics?.gastos_totales || 49.00;
    const gananciaNeta = metrics?.ganancia_neta || (ingresosSaaS - gastosTotales);
    const margenPorcentaje = ingresosSaaS > 0 ? ((gananciaNeta / ingresosSaaS) * 100).toFixed(1) : '0';

    return (
        <div className="space-y-8 p-4 md:p-8 font-rajdhani">
            {/* Header Title Section */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                    <h1 className="text-4xl font-black text-transparent bg-clip-text bg-linear-to-r from-white via-white to-tactical-cyan uppercase tracking-tighter italic leading-none">
                        ⚡ VIRTUD <span className="text-tactical-cyan">SaaS Intelligence</span>
                    </h1>
                    <p className="text-zinc-400 mt-2 font-medium tracking-wide">
                        {activeTab === 'global'
                            ? 'Monitoreo financiero en tiempo real, ingresos por membresías, costes de infraestructura y consumo de IA.'
                            : 'Análisis minucioso del consumo de cuotas, volumen de procesamiento de IA y cargos de excedentes por gimnasio.'}
                    </p>
                </div>
                
                <div className="flex items-center gap-4">
                    {/* Tab Selector */}
                    <div className="flex bg-zinc-900/80 p-1.5 rounded-2xl border border-white/5 shadow-inner no-print">
                        {[
                            { id: 'global', label: 'Econ. Global', icon: <BarChart3 size={14} /> },
                            { id: 'gyms', label: 'Consumos e IA', icon: <Cpu size={14} /> },
                            { id: 'advisor', label: 'Asesor BI Activo', icon: <TrendingUp size={14} /> }
                        ].map(t => (
                            <button
                                key={t.id}
                                onClick={() => setActiveTab(t.id as any)}
                                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                                    activeTab === t.id
                                        ? 'bg-tactical-cyan text-black shadow-[0_0_15px_rgba(0,245,255,0.25)]'
                                        : 'text-zinc-500 hover:text-white'
                                }`}
                            >
                                {t.icon}
                                {t.label}
                            </button>
                        ))}
                    </div>

                    <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={handleFetchAll}
                        disabled={loading}
                        className="p-4 bg-white/5 border border-white/10 rounded-2xl hover:bg-white/10 text-zinc-400 hover:text-white transition-all shadow-lg disabled:opacity-50"
                    >
                        <RefreshCcw size={18} className={loading ? 'animate-spin' : ''} />
                    </motion.button>
                </div>
            </div>

            <AnimatePresence mode="wait">
                {loading && (activeTab === 'global' ? !metrics : gymsUsage.length === 0) ? (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="min-h-[60vh] flex flex-col items-center justify-center gap-4"
                    >
                        <div className="w-12 h-12 border-4 border-tactical-cyan/20 border-t-tactical-cyan rounded-full animate-spin" />
                        <p className="text-zinc-500 font-bold text-xs uppercase tracking-widest animate-pulse">
                            Sincronizando registros con la nube...
                        </p>
                    </motion.div>
                ) : activeTab === 'global' ? (
                    <motion.div
                        key="global"
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className="space-y-8"
                    >
                        {/* Principal KPIs Grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                            <MetricCard
                                title="Ingresos SaaS (Membresías)"
                                value={`$${ingresosSaaS.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                                change="+15.8%"
                                icon={<DollarSign className="text-tactical-cyan" />}
                                subtitle="Cobros a gimnasios en curso"
                            />
                            <MetricCard
                                title="Gastos del Superadmin"
                                value={`$${gastosTotales.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                                change="+2.4%"
                                icon={<Server className="text-tactical-magenta" />}
                                subtitle="Hosting + API Consumo IA"
                                isNegativeChange={true}
                            />
                            <MetricCard
                                title="Beneficio Neto SaaS"
                                value={`$${gananciaNeta.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                                change={`+${margenPorcentaje}%`}
                                icon={<ShieldCheck className="text-emerald-400" />}
                                subtitle="Margen de ganancias libre"
                            />
                            <MetricCard
                                title="Gimnasios Clientes"
                                value={`${metrics?.gyms_activos || 0} Activos`}
                                change={`+${metrics?.gyms_suspendidos || 0} Susp.`}
                                icon={<Building2 className="text-yellow-400" />}
                                subtitle="Entornos multitenant aislados"
                            />
                        </div>

                        {/* Main Interactive Chart */}
                        <div className="bg-zinc-950 p-8 rounded-[2.5rem] border border-white/5 shadow-2xl relative overflow-hidden">
                            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-tactical-cyan via-purple-500 to-tactical-magenta opacity-30" />
                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
                                <div>
                                    <h3 className="text-xl font-black text-white italic uppercase tracking-wider">
                                        Rendimiento Financiero SaaS
                                    </h3>
                                    <p className="text-xs text-zinc-500 font-bold uppercase tracking-widest mt-1">
                                        Análisis comparativo de Ingresos Facturados vs Costes Operativos
                                    </p>
                                </div>
                                <div className="flex gap-4">
                                    <div className="flex items-center gap-2">
                                        <div className="w-3 h-3 bg-tactical-cyan rounded-full shadow-[0_0_8px_#00F5FF]" />
                                        <span className="text-[10px] text-zinc-400 font-black uppercase tracking-widest">Ingresos</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="w-3 h-3 bg-tactical-magenta rounded-full shadow-[0_0_8px_#FF00FF]" />
                                        <span className="text-[10px] text-zinc-400 font-black uppercase tracking-widest">Gastos</span>
                                    </div>
                                </div>
                            </div>
                            <div className="h-[400px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={history}>
                                        <defs>
                                            <linearGradient id="colorIngresos" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#00F5FF" stopOpacity={0.25} />
                                                <stop offset="95%" stopColor="#00F5FF" stopOpacity={0} />
                                            </linearGradient>
                                            <linearGradient id="colorGastos" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#FF00FF" stopOpacity={0.15} />
                                                <stop offset="95%" stopColor="#FF00FF" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#222" vertical={false} />
                                        <XAxis
                                            dataKey="fecha"
                                            stroke="#444"
                                            fontSize={10}
                                            tickFormatter={(val) => new Date(val).toLocaleDateString('es-AR', { day: '2-digit', month: 'short' })}
                                            tickLine={false}
                                        />
                                        <YAxis stroke="#444" fontSize={10} tickLine={false} />
                                        <Tooltip
                                            contentStyle={{ backgroundColor: '#09090b', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '1rem' }}
                                            itemStyle={{ fontWeight: 'bold' }}
                                            labelStyle={{ color: '#888', textTransform: 'uppercase', fontSize: '9px', fontWeight: 'bold' }}
                                        />
                                        <Area
                                            type="monotone"
                                            name="Ingresos ($)"
                                            dataKey="ingresos_totales_mes"
                                            stroke="#00F5FF"
                                            fillOpacity={1}
                                            fill="url(#colorIngresos)"
                                            strokeWidth={3}
                                        />
                                        <Area
                                            type="monotone"
                                            name="Gastos ($)"
                                            dataKey="gastos_totales"
                                            stroke="#FF00FF"
                                            fillOpacity={1}
                                            fill="url(#colorGastos)"
                                            strokeWidth={2}
                                        />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* Desglose de Gastos & IA Grid */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            <div className="bg-zinc-950 p-8 rounded-[2.5rem] border border-white/5 space-y-6">
                                <div>
                                    <h3 className="text-xl font-black text-white italic uppercase tracking-wider">
                                        Desglose de Costes Operativos
                                    </h3>
                                    <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mt-1">
                                        Tarifas en tiempo real y costos fijos e incrementales de hosting e IA
                                    </p>
                                </div>
                                <div className="space-y-4">
                                    <ExpenseRow
                                        title="Alojamiento de Servidores"
                                        desc="Vercel Cloud Pro + Supabase Database Pro (Costo Fijo)"
                                        amount={`$${(metrics?.gastos_alojamiento || 49.00).toFixed(2)}`}
                                        percentage="Fijo mensual"
                                        icon={<Server className="w-5 h-5 text-tactical-cyan" />}
                                    />
                                    <ExpenseRow
                                        title="Consumo API de IA (Biomecánica)"
                                        desc={`$0.05 por cada uno de los ${metrics?.videos_procesados || 0} videos analizados`}
                                        amount={`$${(metrics?.gastos_ia ? metrics.gastos_ia * 0.8 : 0).toFixed(2)}`}
                                        percentage="80% IA Total"
                                        icon={<Cpu className="w-5 h-5 text-tactical-magenta" />}
                                    />
                                    <ExpenseRow
                                        title="Generación de Rutinas (LLM)"
                                        desc={`$0.01 por cada una de las ${metrics?.rutinas_ia || 0} rutinas generadas`}
                                        amount={`$${(metrics?.gastos_ia ? metrics.gastos_ia * 0.2 : 0).toFixed(2)}`}
                                        percentage="20% IA Total"
                                        icon={<Users className="w-5 h-5 text-yellow-400" />}
                                    />
                                </div>
                                <div className="p-4 bg-zinc-900/50 rounded-2xl border border-white/5 flex justify-between items-center">
                                    <span className="text-xs font-black uppercase text-white tracking-widest">Suma Total Gastado este Mes:</span>
                                    <span className="text-xl font-black text-tactical-magenta">${gastosTotales.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</span>
                                </div>
                            </div>

                            <div className="bg-zinc-950 p-8 rounded-[2.5rem] border border-white/5 flex flex-col justify-between">
                                <div>
                                    <h3 className="text-xl font-black text-white italic uppercase tracking-wider mb-2">Consumo e Infraestructura IA</h3>
                                    <p className="text-xs text-zinc-500 mb-6 font-bold uppercase tracking-widest leading-relaxed">Métricas operativas del procesamiento biomecánico de video y analíticas en la nube.</p>
                                    <div className="space-y-6">
                                        <UsageBar
                                            label="Procesamiento Biomecánico (Videos)"
                                            current={metrics?.videos_procesados || 0}
                                            limit={5000}
                                            unit="videos"
                                            color="bg-tactical-cyan"
                                        />
                                        <UsageBar
                                            label="Rutinas Generadas por IA (LLM)"
                                            current={metrics?.rutinas_ia || 0}
                                            limit={2000}
                                            unit="rutinas"
                                            color="bg-tactical-magenta"
                                        />
                                    </div>
                                </div>
                                <div className="mt-8 p-6 bg-gradient-to-br from-tactical-cyan/10 to-transparent border border-tactical-cyan/20 rounded-3xl flex items-center gap-4">
                                    <span className="text-3xl filter drop-shadow-[0_0_8px_rgba(0,245,255,0.4)]">🚀</span>
                                    <div className="space-y-1">
                                        <p className="text-xs font-black uppercase text-white tracking-wider">Insight de Rentabilidad</p>
                                        <p className="text-[10px] text-zinc-400 leading-normal font-medium tracking-wide">Tu margen operativo es del <span className="text-tactical-cyan font-black">{margenPorcentaje}%</span>. Cada gimnasio sumado incrementa el MRR exponencialmente mientras el coste de la IA se mantiene controlado.</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                ) : activeTab === 'gyms' ? (
                    <motion.div
                        key="gyms"
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className="space-y-6"
                    >
                        {/* Search Gym Usage bar */}
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-zinc-950 p-6 rounded-[2rem] border border-white/5 shadow-lg no-print">
                            <h3 className="text-lg font-black text-white italic uppercase tracking-wider">Monitoreo de Cuotas e IA B2B</h3>
                            <div className="relative max-w-md w-full">
                                <input
                                    type="text"
                                    placeholder="Buscar gimnasio por nombre o slug..."
                                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-3 text-xs text-white uppercase font-bold tracking-wider focus:border-tactical-cyan outline-none transition-all placeholder:text-zinc-600"
                                    value={searchGym}
                                    onChange={(e) => setSearchGym(e.target.value)}
                                />
                            </div>
                        </div>

                        {/* Gyms Usage Table / List */}
                        <div className="bg-zinc-950 border border-white/5 rounded-[2.5rem] overflow-hidden shadow-2xl">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead>
                                        <tr className="bg-black/40 text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] border-b border-white/5">
                                            <th className="px-8 py-5">Gimnasio</th>
                                            <th className="px-8 py-5">Plan</th>
                                            <th className="px-8 py-5">Uso de Alumnos (Límite)</th>
                                            <th className="px-8 py-5 text-center">IA: Videos</th>
                                            <th className="px-8 py-5 text-center">IA: Rutinas</th>
                                            <th className="px-8 py-5 text-right">Excedente (Overage)</th>
                                            <th className="px-8 py-5 text-right">Cobro Estimado</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5">
                                        {filteredGymsUsage.map((gym) => {
                                            const usagePercent = Math.min(100, (gym.alumnos_activos / gym.alumnos_limite) * 100);
                                            const isExceeded = gym.alumnos_excedentes > 0;
                                            return (
                                                <tr key={gym.id} className="hover:bg-white/2 transition-colors">
                                                    {/* Gym Info */}
                                                    <td className="px-8 py-5">
                                                        <div className="flex flex-col">
                                                            <span className="text-sm font-black text-white">{gym.nombre}</span>
                                                            <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">{gym.slug}</span>
                                                        </div>
                                                    </td>

                                                    {/* Plan Name */}
                                                    <td className="px-8 py-5">
                                                        <div className="flex flex-col gap-1.5 items-start">
                                                            <span className="px-3 py-1 bg-purple-500/10 text-purple-400 rounded-full text-[9px] font-black uppercase tracking-widest border border-purple-500/20">
                                                                {gym.plan_nombre}
                                                            </span>
                                                            {gym.modelo_facturacion === 'consumo' ? (
                                                                <span className="px-2 py-0.5 bg-tactical-magenta/10 text-tactical-magenta rounded-md text-[8px] font-bold uppercase tracking-widest border border-tactical-magenta/20">
                                                                    Pago x Uso
                                                                </span>
                                                            ) : gym.modelo_facturacion === 'hibrido' ? (
                                                                <span className="px-2 py-0.5 bg-amber-500/10 text-amber-400 rounded-md text-[8px] font-bold uppercase tracking-widest border border-amber-500/20">
                                                                    Híbrido
                                                                </span>
                                                            ) : (
                                                                <span className="px-2 py-0.5 bg-tactical-cyan/10 text-tactical-cyan rounded-md text-[8px] font-bold uppercase tracking-widest border border-tactical-cyan/20">
                                                                    Fijo Mensual
                                                                </span>
                                                            )}
                                                        </div>
                                                    </td>

                                                    {/* Alumnos usage progress */}
                                                    <td className="px-8 py-5">
                                                        <div className="space-y-1 max-w-[160px]">
                                                            <div className="flex justify-between text-[9px] font-black uppercase tracking-wider">
                                                                <span className={isExceeded ? 'text-tactical-magenta' : 'text-zinc-400'}>
                                                                    {gym.alumnos_activos} / {gym.alumnos_limite}
                                                                </span>
                                                                {isExceeded && (
                                                                    <span className="text-tactical-magenta text-[8px] flex items-center gap-0.5">
                                                                        <AlertTriangle size={8} /> Exceso
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden border border-white/5">
                                                                <div
                                                                    className={`h-full rounded-full transition-all duration-1000 ${
                                                                        isExceeded ? 'bg-tactical-magenta' : 'bg-tactical-cyan'
                                                                    }`}
                                                                    style={{ width: `${usagePercent}%` }}
                                                                />
                                                            </div>
                                                        </div>
                                                    </td>

                                                    {/* Videos count */}
                                                    <td className="px-8 py-5 text-center">
                                                        <div className="flex flex-col items-center">
                                                            <span className="text-xs font-black text-white italic">{gym.videos_procesados}</span>
                                                            <span className="text-[8px] text-zinc-500 font-bold uppercase tracking-wider">Videos IA</span>
                                                        </div>
                                                    </td>

                                                    {/* Routines count */}
                                                    <td className="px-8 py-5 text-center">
                                                        <div className="flex flex-col items-center">
                                                            <span className="text-xs font-black text-white italic">{gym.rutinas_ia}</span>
                                                            <span className="text-[8px] text-zinc-500 font-bold uppercase tracking-wider">Rutinas IA</span>
                                                        </div>
                                                    </td>

                                                    {/* Overages */}
                                                    <td className="px-8 py-5 text-right">
                                                        {gym.modelo_facturacion === 'consumo' ? (
                                                            <div className="flex flex-col items-end">
                                                                <span className="text-xs font-black text-tactical-cyan">
                                                                    +${gym.comision_pos_total?.toFixed(2) ?? '0.00'}
                                                                </span>
                                                                <span className="text-[8px] text-zinc-500 font-bold uppercase tracking-wider">
                                                                    comisión POS
                                                                </span>
                                                                <span className="text-[7px] text-zinc-600 font-bold uppercase tracking-wider">
                                                                    (de ${gym.volumen_pos?.toFixed(0) ?? '0'} ventas)
                                                                </span>
                                                            </div>
                                                        ) : gym.modelo_facturacion === 'hibrido' ? (
                                                            <div className="flex flex-col items-end">
                                                                <span className="text-xs font-black text-amber-400">
                                                                    +${(gym.costo_ia_estimado > 5.0 ? gym.costo_ia_estimado - 4.5 : 0).toFixed(2)}
                                                                </span>
                                                                <span className="text-[8px] text-zinc-500 font-bold uppercase tracking-wider">
                                                                    Excedentes IA
                                                                </span>
                                                            </div>
                                                        ) : isExceeded ? (
                                                            <div className="flex flex-col items-end">
                                                                <span className="text-xs font-black text-tactical-magenta">
                                                                    +${gym.alumnos_excedentes_costo.toFixed(2)}
                                                                </span>
                                                                <span className="text-[8px] text-zinc-500 font-bold uppercase tracking-wider">
                                                                    {gym.alumnos_excedentes} alumnos extra
                                                                </span>
                                                            </div>
                                                        ) : (
                                                            <span className="text-xs font-black text-zinc-600 uppercase tracking-widest">Al día</span>
                                                        )}
                                                    </td>

                                                    {/* Monthly bill */}
                                                    <td className="px-8 py-5 text-right">
                                                        <div className="flex flex-col items-end">
                                                            <span className="text-sm font-black text-tactical-cyan italic">
                                                                ${gym.cargo_total_mes.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                            </span>
                                                            <span className="text-[8px] text-zinc-500 font-bold uppercase tracking-wider">
                                                                Mes en curso
                                                             </span>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                        {filteredGymsUsage.length === 0 && (
                                            <tr>
                                                <td colSpan={7} className="py-20 text-center text-zinc-500 font-bold uppercase tracking-widest italic text-xs">
                                                    No se encontraron gimnasios en la red
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </motion.div>
                ) : (
                    <motion.div
                        key="advisor"
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className="space-y-6 print-full"
                    >
                        {/* CSS inyectado para soporte de PDF */}
                        <style dangerouslySetInnerHTML={{ __html: `
                            @media print {
                                body {
                                    background: #ffffff !important;
                                    color: #000000 !important;
                                }
                                .no-print {
                                    display: none !important;
                                }
                                .print-full {
                                    width: 100% !important;
                                    max-width: 100% !important;
                                    margin: 0 !important;
                                    padding: 1.5rem !important;
                                    background: #ffffff !important;
                                    color: #000000 !important;
                                }
                                .print-card {
                                    background: #ffffff !important;
                                    border: 1px solid #e4e4e7 !important;
                                    color: #000000 !important;
                                    box-shadow: none !important;
                                    border-radius: 1rem !important;
                                    padding: 1.5rem !important;
                                }
                                .print-text-dark {
                                    color: #09090b !important;
                                }
                                .print-text-muted {
                                    color: #71717a !important;
                                }
                                .print-badge {
                                    border: 1px solid #000000 !important;
                                    color: #000000 !important;
                                    background: transparent !important;
                                }
                            }
                        `}} />

                        {/* Executive Header */}
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-zinc-950 p-8 rounded-[2rem] border border-white/5 shadow-lg print-card">
                            <div className="space-y-1">
                                <span className="px-3 py-1 bg-amber-500/10 text-amber-400 rounded-full text-[9px] font-black uppercase tracking-widest border border-amber-500/20 print-badge">
                                    Inteligencia Activa SaaS
                                </span>
                                <h3 className="text-2xl font-black text-white italic uppercase tracking-wider print-text-dark">
                                    Asesor de Optimización Financiera B2B
                                </h3>
                                <p className="text-xs text-zinc-500 font-bold uppercase tracking-widest print-text-muted">
                                    Informes y recomendaciones de rentabilidad dirigidos exclusivamente al Super Admin
                                </p>
                            </div>
                            <button
                                onClick={handleExportPDF}
                                className="flex items-center gap-2 px-6 py-3.5 bg-tactical-cyan text-black hover:bg-tactical-cyan/80 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-tactical-cyan/25 transition-all no-print"
                            >
                                <Download size={14} /> Exportar Reporte BI (PDF)
                            </button>
                        </div>

                        {/* Network Optimization Status Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="bg-zinc-950 p-6 rounded-3xl border border-white/5 print-card">
                                <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest print-text-muted">Sedes con Margen de Mejora</span>
                                <p className="text-3xl font-black text-amber-400 italic uppercase leading-none mt-2">
                                    {gymsUsage.filter(g => g.modelo_facturacion === 'membresia').length} Sedes
                                </p>
                                <p className="text-[9px] font-bold text-zinc-600 uppercase tracking-wide mt-2 print-text-muted">Potencial de facturación incrementado detectado</p>
                            </div>
                            <div className="bg-zinc-950 p-6 rounded-3xl border border-white/5 print-card">
                                <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest print-text-muted">Proyección Margen SaaS Mensual</span>
                                <p className="text-3xl font-black text-tactical-cyan italic uppercase leading-none mt-2">
                                    +${(gymsUsage.filter(g => g.modelo_facturacion === 'membresia').length * 24.50).toFixed(2)} USD
                                </p>
                                <p className="text-[9px] font-bold text-zinc-600 uppercase tracking-wide mt-2 print-text-muted">Ingreso adicional neto si se aplica migración activa</p>
                            </div>
                            <div className="bg-zinc-950 p-6 rounded-3xl border border-white/5 print-card">
                                <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest print-text-muted">Fondos Totales AI Wallet</span>
                                <p className="text-3xl font-black text-tactical-magenta italic uppercase leading-none mt-2">
                                    ${gymsUsage.reduce((acc, g) => acc + (g.saldo_creditos || 0), 0).toFixed(2)} USD
                                </p>
                                <p className="text-[9px] font-bold text-zinc-600 uppercase tracking-wide mt-2 print-text-muted">Créditos prepagados activos de IA en la red</p>
                            </div>
                        </div>

                        {/* Gym-by-Gym BI Recommendation Sheets */}
                        <div className="space-y-6">
                            {gymsUsage.map((gym) => {
                                // Cálculos comparativos rápidos
                                const costMembresia = gym.precio_mensual + (gym.alumnos_excedentes * gym.alumnos_excedentes_costo);
                                const costConsumo = (gym.volumen_pos || 0) * 0.015 + (gym.videos_procesados * 0.07) + (gym.rutinas_ia * 0.015);
                                const costHibrido = gym.precio_mensual + Math.max(0, gym.videos_procesados - 50) * 0.07 + Math.max(0, gym.rutinas_ia - 100) * 0.015 + (gym.volumen_pos || 0) * 0.015;

                                // Lógica de Recomendación Exclusiva del Super Admin para maximizar rentabilidad
                                let recommendedModel: 'membresia' | 'consumo' | 'hibrido' = 'membresia';
                                let explanation = '';
                                let revenueDiff = 0;

                                if (gym.videos_procesados > 40 || gym.rutinas_ia > 80) {
                                    recommendedModel = 'hibrido';
                                    revenueDiff = costHibrido - costMembresia;
                                    explanation = `El alto volumen de procesamiento IA (${gym.videos_procesados} videos, ${gym.rutinas_ia} rutinas) genera altos costos de cómputo GPU. Migrar al modelo HÍBRIDO te permite resguardar tu costo base con la tarifa mensual fija y cobrar excedentes por cada análisis de IA extra.`;
                                } else if (gym.alumnos_activos > 200) {
                                    recommendedModel = 'consumo';
                                    revenueDiff = costConsumo - costMembresia;
                                    explanation = `Con ${gym.alumnos_activos} alumnos y un volumen de venta POS de $${(gym.volumen_pos || 0).toFixed(0)} USD, la comisión SaaS del 1.5% + consumos de IA es la alternativa más rentable para el SaaS en comparación a una cuota mensual plana.`;
                                } else {
                                    recommendedModel = 'membresia';
                                    explanation = `El consumo es moderado y estable. Mantener al cliente bajo Membresía Fija asegura ingresos predecibles recurrentes (MRR) y fidelización a largo plazo.`;
                                }

                                const isCurrentRecommended = gym.modelo_facturacion === recommendedModel;

                                return (
                                    <div key={gym.id} className="bg-zinc-950 p-8 rounded-[2rem] border border-white/5 hover:border-white/10 transition-all print-card space-y-6">
                                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                                            <div>
                                                <h4 className="text-lg font-black text-white italic uppercase tracking-wider print-text-dark">{gym.nombre}</h4>
                                                <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest print-text-muted">{gym.slug} • Plan contratado: {gym.plan_nombre}</p>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className="text-[8px] font-black text-zinc-500 uppercase tracking-widest">Esquema Actual:</span>
                                                <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${
                                                    gym.modelo_facturacion === 'consumo' ? 'bg-tactical-magenta/10 text-tactical-magenta border-tactical-magenta/20' :
                                                    gym.modelo_facturacion === 'hibrido' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                                                    'bg-tactical-cyan/10 text-tactical-cyan border-tactical-cyan/20'
                                                }`}>
                                                    {gym.modelo_facturacion === 'consumo' ? 'Pago x Uso' : gym.modelo_facturacion === 'hibrido' ? 'Híbrido' : 'Membresía'}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Comparador de Modelos Proyectado */}
                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                            <div className={`p-4 rounded-2xl border text-center ${gym.modelo_facturacion === 'membresia' ? 'bg-white/2 border-white/10' : 'bg-black/30 border-white/5 opacity-60'} print-card`}>
                                                <span className="text-[8px] font-black text-zinc-500 uppercase tracking-wider print-text-muted">Membresía Fija</span>
                                                <p className="text-xl font-black text-white italic mt-1 print-text-dark">${costMembresia.toFixed(2)}</p>
                                                <span className="text-[7px] text-zinc-600 font-bold uppercase print-text-muted">USD / mes</span>
                                            </div>
                                            <div className={`p-4 rounded-2xl border text-center ${gym.modelo_facturacion === 'consumo' ? 'bg-white/2 border-white/10' : 'bg-black/30 border-white/5 opacity-60'} print-card`}>
                                                <span className="text-[8px] font-black text-zinc-500 uppercase tracking-wider print-text-muted">Pago por Uso</span>
                                                <p className="text-xl font-black text-white italic mt-1 print-text-dark">${costConsumo.toFixed(2)}</p>
                                                <span className="text-[7px] text-zinc-600 font-bold uppercase print-text-muted">USD / mes</span>
                                            </div>
                                            <div className={`p-4 rounded-2xl border text-center ${gym.modelo_facturacion === 'hibrido' ? 'bg-white/2 border-white/10' : 'bg-black/30 border-white/5 opacity-60'} print-card`}>
                                                <span className="text-[8px] font-black text-zinc-500 uppercase tracking-wider print-text-muted">Híbrido Avanzado</span>
                                                <p className="text-xl font-black text-white italic mt-1 print-text-dark">${costHibrido.toFixed(2)}</p>
                                                <span className="text-[7px] text-zinc-600 font-bold uppercase print-text-muted">USD / mes</span>
                                            </div>
                                        </div>

                                        {/* BI Intelligent Recommendation Alert Box */}
                                        <div className={`p-6 rounded-2xl border ${isCurrentRecommended ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-amber-500/5 border-amber-500/20'} print-card`}>
                                            <div className="flex items-start gap-4">
                                                <span className="text-2xl shrink-0">💡</span>
                                                <div className="space-y-1.5">
                                                    <p className="text-[10px] font-black uppercase tracking-wider text-white print-text-dark">
                                                        Recomendación BI Superadmin: {isCurrentRecommended ? (
                                                            <span className="text-emerald-400 font-black">Modelo Óptimo Activo</span>
                                                        ) : (
                                                            <span className="text-amber-400 font-black">Acción de Optimización Requerida</span>
                                                        )}
                                                    </p>
                                                    <p className="text-xs text-zinc-400 leading-relaxed font-medium print-text-dark">
                                                        {explanation}
                                                    </p>
                                                    {!isCurrentRecommended && revenueDiff > 0 && (
                                                        <p className="text-[10px] font-black uppercase text-emerald-400 tracking-wider">
                                                            Beneficio Proyectado para SaaS: +${revenueDiff.toFixed(2)} USD / mes de margen adicional
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Quick Actions (1-Click Migration Console) */}
                                        {!isCurrentRecommended && (
                                            <div className="flex flex-wrap items-center gap-3 pt-2 no-print">
                                                <span className="text-[9px] font-black text-zinc-500 uppercase tracking-wider">Migración en 1-Clic:</span>
                                                {['membresia', 'consumo', 'hibrido'].map((m) => {
                                                    if (gym.modelo_facturacion === m) return null;
                                                    return (
                                                        <button
                                                            key={m}
                                                            disabled={migratingId === gym.id}
                                                            onClick={() => handleMigrateModel(gym, m as any)}
                                                            className={`px-4 py-2 text-[9px] font-black uppercase tracking-widest rounded-xl transition-all disabled:opacity-50 ${
                                                                m === recommendedModel
                                                                    ? 'bg-amber-500 text-black shadow-lg shadow-amber-500/20 font-black'
                                                                    : 'bg-white/5 text-zinc-400 hover:text-white border border-white/5'
                                                            }`}
                                                        >
                                                            {migratingId === gym.id ? 'Migrando...' : `Cambiar a ${m === 'consumo' ? 'PAGO X USO' : m.toUpperCase()}`}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

interface MetricCardProps {
    title: string;
    value: string | number;
    change: string;
    icon: React.ReactNode;
    subtitle?: string;
    isNegativeChange?: boolean;
}

function MetricCard({ title, value, change, icon, subtitle, isNegativeChange = false }: MetricCardProps) {
    const isPositive = change.startsWith('+');
    return (
        <motion.div
            whileHover={{ y: -5 }}
            className="bg-zinc-950 p-8 rounded-[2.5rem] border border-white/5 space-y-4 relative overflow-hidden shadow-xl"
        >
            <div className="absolute top-0 left-0 w-1/3 h-[2px] bg-linear-to-r from-tactical-cyan to-transparent opacity-40" />
            <div className="flex justify-between items-start">
                <div className="w-10 h-10 bg-white/5 rounded-2xl flex items-center justify-center border border-white/5">
                    {icon}
                </div>
                <div
                    className={`flex items-center gap-1 text-[10px] font-black italic px-2 py-1 rounded-full ${
                        isNegativeChange
                            ? 'bg-red-500/10 text-red-500'
                            : 'bg-emerald-500/10 text-emerald-400'
                    }`}
                >
                    {isPositive && !isNegativeChange ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                    {change}
                </div>
            </div>
            <div>
                <p className="text-3xl font-black text-white italic tracking-tighter uppercase leading-none">{value}</p>
                <p className="text-[10px] text-zinc-400 font-black uppercase tracking-widest mt-2">{title}</p>
                {subtitle && <p className="text-[9px] text-zinc-600 font-bold uppercase tracking-wider mt-1">{subtitle}</p>}
            </div>
        </motion.div>
    );
}

interface ExpenseRowProps {
    title: string;
    desc: string;
    amount: string;
    percentage: string;
    icon: React.ReactNode;
}

function ExpenseRow({ title, desc, amount, percentage, icon }: ExpenseRowProps) {
    return (
        <div className="flex items-center justify-between p-4 bg-white/2 rounded-2xl border border-white/5 hover:bg-white/5 transition-colors">
            <div className="flex items-center gap-4">
                <div className="p-3 bg-white/5 rounded-xl border border-white/5 shrink-0">
                    {icon}
                </div>
                <div>
                    <h4 className="text-xs font-black text-white uppercase tracking-wider">{title}</h4>
                    <p className="text-[9px] text-zinc-500 font-bold uppercase tracking-wide mt-0.5">{desc}</p>
                </div>
            </div>
            <div className="text-right">
                <p className="text-sm font-black text-white italic">{amount}</p>
                <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider">{percentage}</span>
            </div>
        </div>
    );
}

interface UsageBarProps {
    label: string;
    current: number;
    limit: number;
    unit?: string;
    color?: string;
}

function UsageBar({ label, current, limit, unit = "", color = "bg-tactical-cyan" }: UsageBarProps) {
    const percent = Math.min(100, (current / limit) * 100);
    return (
        <div className="space-y-2">
            <div className="flex justify-between text-[10px] font-black uppercase tracking-widest">
                <span className="text-zinc-400">{label}</span>
                <span className="text-white">{current.toLocaleString()} / {limit.toLocaleString()} {unit}</span>
            </div>
            <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden border border-white/5">
                <div className={`h-full ${color} rounded-full transition-all duration-1000 shadow-[0_0_10px_currentColor]`} style={{ width: `${percent}%` }} />
            </div>
        </div>
    );
}
