'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Building2,
    Users,
    TrendingUp,
    History,
    ShieldAlert,
    CreditCard,
    Zap,
    ChevronRight,
    PlusCircle,
    LayoutDashboard,
    Gem,
    ArrowUpRight,
    Megaphone,
    ToggleLeft,
    Activity,
    Eye,
    Brain,
    Mail,
    Check,
    MapPin,
    ChevronDown,
    DollarSign,
    BarChart3
} from 'lucide-react';
import {
    ResponsiveContainer,
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    BarChart,
    Bar,
} from 'recharts';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';

interface Stats {
    gyms: number;
    gyms_activos: number;
    users: number;
    branches: number;
    revenue: number;
    mrr: number;
    monthly_real_revenue: number;
    plan_breakdown: Record<string, number>;
}

interface SystemActivity {
    id: string;
    accion: string;
    entidad_tipo: string;
    creado_en: string;
    perfiles?: { nombre_completo: string };
    gimnasios?: { nombre: string };
}

interface Alert {
    id: string;
    type: 'ticket' | 'payment';
    priority: string;
    message: string;
    link: string;
}

interface GymHealth {
    id: string;
    nombre: string;
    scoring_salud: number;
    fase_onboarding: string;
}

interface Announcement {
    id: string;
    titulo: string;
    contenido: string;
    tipo: string;
    destino: string;
    creado_en: string;
    enviado_newsletter?: boolean;
    fecha_envio_newsletter?: string;
}

interface ChurnData {
    fecha: string;
    churn_gyms_mes: number;
}

export default function SuperAdminOverview() {
    const [stats, setStats] = useState<Stats | null>(null);
    const [activities, setActivities] = useState<SystemActivity[]>([]);
    const [alerts, setAlerts] = useState<Alert[]>([]);
    const [churnData, setChurnData] = useState<ChurnData[]>([]);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    const [activeTab, setActiveTab] = useState<'gyms' | 'saas' | 'global'>('gyms');
    const [gymsHealth, setGymsHealth] = useState<GymHealth[]>([]);
    const [announcements, setAnnouncements] = useState<Announcement[]>([]);
    const [historyMetrics, setHistoryMetrics] = useState<{ mes: string; mrr: number; churn: number }[]>([]);

    const [showBroadcastModal, setShowBroadcastModal] = useState(false);
    const [newAnnouncement, setNewAnnouncement] = useState({ titulo: '', contenido: '', tipo: 'info', destino: 'todos', sendEmail: false });

    // Estados para el Modal de Impersonación Premium
    const [impersonationTarget, setImpersonationTarget] = useState<{ id: string; nombre: string } | null>(null);
    const [impersonationReason, setImpersonationReason] = useState('Soporte Técnico / Verificación');
    const [isImpersonatingApi, setIsImpersonatingApi] = useState(false);

    const tabs = [
        { id: 'gyms', label: 'Gestión de Red', icon: <Building2 size={16} /> },
        { id: 'saas', label: 'Econ. SaaS', icon: <TrendingUp size={16} /> },
        { id: 'global', label: 'Comandos Hub', icon: <Zap size={16} /> },
    ];

    const gymCards = [
        { title: 'Gimnasios en Red', value: stats?.gyms || 0, icon: <Building2 />, color: 'text-blue-500', bg: 'bg-blue-500/10', border: 'hover:border-blue-500/50', href: '/saas-admin/gyms' },
        { title: 'Usuarios en Red', value: stats?.users || 0, icon: <Users />, color: 'text-purple-500', bg: 'bg-purple-500/10', border: '' },
        { title: 'Soporte Técnico', value: alerts.filter(a => a.type === 'ticket').length, icon: <ShieldAlert />, color: 'text-red-500', bg: 'bg-red-500/10', border: 'hover:border-red-500/50', href: '/saas-admin/support' },
    ];

    const saasCards = [
        { title: 'MRR Estimado', value: `$${(stats?.mrr || 0).toLocaleString('es-AR')}`, icon: <TrendingUp />, color: 'text-green-500', bg: 'bg-green-500/10', border: 'hover:border-green-500/50', href: '/saas-admin/metrics' },
        { title: 'Revenue Mensual Real', value: `$${(stats?.monthly_real_revenue || 0).toLocaleString('es-AR')}`, icon: <CreditCard />, color: 'text-emerald-500', bg: 'bg-emerald-500/10', border: 'hover:border-emerald-500/50', href: '/saas-admin/billing' },
        { title: 'Planes Activos', value: Object.keys(stats?.plan_breakdown || {}).length, icon: <Gem />, color: 'text-purple-500', bg: 'bg-purple-500/10', border: 'hover:border-purple-500/50', href: '/saas-admin/billing' },
    ];

    const globalCards = [
        { title: 'Usuarios Globales', value: stats?.users || 0, icon: <Users />, color: 'text-purple-500', bg: 'bg-purple-500/10', border: '' },
        { title: 'Soporte Técnico', value: alerts.filter(a => a.type === 'ticket').length, icon: <ShieldAlert />, color: 'text-red-500', bg: 'bg-red-500/10', border: 'hover:border-red-500/50', href: '/saas-admin/support' },
        { title: 'Logs de Auditoría', value: activities.length, icon: <History />, color: 'text-amber-500', bg: 'bg-amber-500/10', border: 'hover:border-amber-500/50', href: '/saas-admin/audit' },
    ];

    const quickActions = {
        gyms: [
            { label: 'Nuevo Gimnasio', icon: <PlusCircle size={20} />, href: '/saas-admin/gyms/new', color: 'from-blue-600 to-cyan-500' },
            { label: 'Configurar Red', icon: <Building2 size={20} />, href: '/saas-admin/settings', color: 'from-indigo-600 to-blue-500' },
            { label: 'Auditoría Red', icon: <History size={20} />, href: '/saas-admin/audit', color: 'from-purple-600 to-indigo-500' },
            { label: 'Centro Soporte', icon: <ShieldAlert size={20} />, href: '/saas-admin/support', color: 'from-red-600 to-pink-500' },
        ],
        saas: [
            { label: 'Planes SaaS', icon: <Gem size={20} />, href: '/saas-admin/billing', color: 'from-purple-600 to-pink-500' },
            { label: 'Ingresos (Hub)', icon: <TrendingUp size={20} />, href: '/saas-admin/metrics', color: 'from-green-600 to-emerald-500' },
            { label: 'Reportes Biz', icon: <BarChart3 size={20} />, href: '/saas-admin/metrics', color: 'from-orange-600 to-amber-500' },
            { label: 'MercadoPago', icon: <DollarSign size={20} />, href: '/saas-admin/billing', color: 'from-blue-600 to-sky-500' },
        ],
        global: [
            { label: 'Auditoría', icon: <History size={20} />, href: '/saas-admin/audit', color: 'from-amber-600 to-orange-500' },
            { label: 'Seguridad Hub', icon: <ShieldAlert size={20} />, href: '/saas-admin/audit', color: 'from-red-600 to-orange-500' },
            { label: 'Broadcast', icon: <Megaphone size={20} />, href: '#', color: 'from-purple-600 to-indigo-500' },
            { label: 'Sandbox / Settings', icon: <Eye size={20} />, href: '/saas-admin/settings', color: 'from-blue-600 to-cyan-500' },
        ],
    };

    useEffect(() => {
        fetchGlobalData();
    }, []);

    const fetchGlobalData = async () => {
        try {
            const res = await fetch('/api/admin/global-stats');
            const data = await res.json();
            if (res.ok) {
                setStats(data.stats);
                setActivities(data.recentActivity);
                setAlerts(data.alerts || []);
                setChurnData(data.churnHistory || []);
                setGymsHealth(data.gymsHealth || []);
                setAnnouncements(data.announcements || []);
            }

            // Fetch metrics history
            const histRes = await fetch('/api/admin/metrics/history');
            const histData = await histRes.json();
            if (histRes.ok) {
                setHistoryMetrics(histData.metrics || []);
            }
        } catch (error) {
            console.error('Error fetching global stats:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleImpersonate = (gymId: string, gymName: string) => {
        setImpersonationTarget({ id: gymId, nombre: gymName });
        setImpersonationReason('Soporte Técnico / Verificación');
    };

    const executeImpersonation = async () => {
        if (!impersonationTarget) return;
        setIsImpersonatingApi(true);
        const loadingToast = toast.loading(`Accediendo remotamente al entorno de ${impersonationTarget.nombre}...`);
        try {
            const res = await fetch('/api/admin/impersonate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    gymId: impersonationTarget.id, 
                    reason: impersonationReason || 'Soporte Técnico / Verificación' 
                })
            });

            const data = await res.json();
            if (res.ok) {
                toast.success(data.message);
                window.open(data.redirectUrl, '_blank');
                setImpersonationTarget(null);
                setImpersonationReason('Soporte Técnico / Verificación');
            } else {
                toast.error(data.error || 'Error al intentar el acceso remoto');
            }
        } catch (_err) {
            toast.error('Error de red al intentar el acceso remoto');
        } finally {
            toast.dismiss(loadingToast);
            setIsImpersonatingApi(false);
        }
    };

    const handleBroadcast = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newAnnouncement.titulo || !newAnnouncement.contenido) {
            toast.error('Título y contenido son obligatorios');
            return;
        }

        try {
            const res = await fetch('/api/admin/broadcast', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newAnnouncement)
            });

            if (res.ok) {
                toast.success('Anuncio enviado exitosamente');
                setShowBroadcastModal(false);
                setNewAnnouncement({ titulo: '', contenido: '', tipo: 'info', destino: 'todos', sendEmail: false });
                fetchGlobalData();
            } else {
                const d = await res.json();
                toast.error(d.error);
            }
        } catch (_err) {
            toast.error('Error al enviar comunicado');
        }
    };

    if (loading) {
        return (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 animate-pulse">
                {[1, 2, 3, 4].map(i => (
                    <div key={i} className="h-32 bg-white/5 rounded-2xl border border-white/5" />
                ))}
            </div>
        );
    }

    return (
        <div className="space-y-8">
            {/* Super Admin Brand Header — con MRR destacado */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#1c1c1e] p-8 rounded-[2.5rem] border border-white/5 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-red-600/5 rounded-full blur-3xl -mr-32 -mt-32" />
                <div className="relative z-10">
                    <div className="flex items-center gap-2 mb-1">
                        <Building2 size={16} className="text-red-500" />
                        <h2 className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em]">Control SaaS Global</h2>
                    </div>
                    <div className="flex items-end gap-3">
                        <h1 className="text-4xl font-black text-white italic uppercase tracking-tighter">Virtud SaaS Hub</h1>
                        <span className="text-xs font-bold text-gray-500 mb-1 flex items-center gap-1">
                            <span className="text-red-500">📍</span> HQ
                        </span>
                    </div>
                    {/* MRR highlight */}
                    {stats && (
                        <div className="mt-3 flex items-center gap-6">
                            <div>
                                <p className="text-[9px] font-black text-gray-600 uppercase tracking-widest">MRR Estimado</p>
                                <p className="text-2xl font-black text-green-400 italic">${(stats.mrr || 0).toLocaleString('es-AR')}</p>
                            </div>
                            <div className="w-px h-10 bg-white/5" />
                            <div>
                                <p className="text-[9px] font-black text-gray-600 uppercase tracking-widest">Revenue Real (Mes)</p>
                                <p className="text-2xl font-black text-emerald-400 italic">${(stats.monthly_real_revenue || 0).toLocaleString('es-AR')}</p>
                            </div>
                            <div className="w-px h-10 bg-white/5" />
                            <div>
                                <p className="text-[9px] font-black text-gray-600 uppercase tracking-widest">Gyms Activos</p>
                                <p className="text-2xl font-black text-blue-400 italic">{stats.gyms_activos}/{stats.gyms}</p>
                            </div>
                        </div>
                    )}
                </div>

                <div className="relative z-10 flex items-center gap-4">
                    <div className="flex flex-col items-end">
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-red-600 text-white rounded-xl shadow-lg shadow-red-600/20">
                            <Zap size={14} className="fill-white" />
                            <span className="text-[10px] font-black uppercase tracking-widest">Vista como Super Admin</span>
                        </div>
                        <p className="text-[8px] font-bold text-gray-600 uppercase mt-2 tracking-widest">Acceso Global Nivel 4</p>
                    </div>
                </div>
            </div>

            {/* Tab Selector */}
            <div className="flex p-1.5 bg-[#1c1c1e] rounded-2xl border border-white/5 w-fit">
                {tabs.map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as any)}
                        className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === tab.id
                            ? 'bg-red-600 text-white shadow-lg shadow-red-600/20'
                            : 'text-gray-500 hover:text-gray-300 hover:bg-white/5'
                            }`}
                    >
                        {tab.icon}
                        {tab.label}
                    </button>
                ))}
            </div>

            <motion.div
                key={activeTab}
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.2 }}
                className="space-y-8"
            >
                {/* Tab Content */}
                {activeTab === 'saas' && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="grid grid-cols-1 md:grid-cols-2 gap-8"
                    >
                        {/* MRR Chart */}
                        <div className="bg-[#1c1c1e] p-8 rounded-[3rem] border border-white/5 relative overflow-hidden group">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-green-500/5 rounded-full blur-3xl -mr-16 -mt-16" />
                            <div className="relative z-10">
                                <div className="flex justify-between items-center mb-10">
                                    <div>
                                        <h3 className="text-xl font-black text-white italic uppercase tracking-tight">Evolución MRR</h3>
                                        <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mt-1">Ingresos recurrentes mensuales</p>
                                    </div>
                                    <div className="w-10 h-10 bg-green-500/10 rounded-xl flex items-center justify-center text-green-500 border border-green-500/20">
                                        <TrendingUp size={20} />
                                    </div>
                                </div>
                                <div className="h-[250px] w-full">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <AreaChart data={historyMetrics}>
                                            <defs>
                                                <linearGradient id="colorMrr" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                                                    <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                                                </linearGradient>
                                            </defs>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#ffffff05" />
                                            <XAxis
                                                dataKey="fecha"
                                                axisLine={false}
                                                tickLine={false}
                                                tick={{ fill: '#4b5563', fontSize: 10, fontWeight: 900 }}
                                                tickFormatter={(v) => new Date(v).toLocaleDateString('es-AR', { day: '2-digit', month: 'short' })}
                                            />
                                            <YAxis hide />
                                            <Tooltip
                                                contentStyle={{ backgroundColor: '#1c1c1e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '1rem' }}
                                                itemStyle={{ color: '#fff', fontSize: '10px', fontWeight: 'bold' }}
                                                labelStyle={{ color: '#4b5563', fontSize: '8px', marginBottom: '4px' }}
                                            />
                                            <Area type="monotone" dataKey="mrr" stroke="#22c55e" strokeWidth={3} fillOpacity={1} fill="url(#colorMrr)" />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        </div>

                        {/* AI Usage Chart */}
                        <div className="bg-[#1c1c1e] p-8 rounded-[3rem] border border-white/5 relative overflow-hidden group">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/5 rounded-full blur-3xl -mr-16 -mt-16" />
                            <div className="relative z-10">
                                <div className="flex justify-between items-center mb-10">
                                    <div>
                                        <h3 className="text-xl font-black text-white italic uppercase tracking-tight">Carga Cognitiva IA</h3>
                                        <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mt-1">Rutinas y Videos procesados</p>
                                    </div>
                                    <div className="w-10 h-10 bg-purple-500/10 rounded-xl flex items-center justify-center text-purple-500 border border-purple-500/20">
                                        <Brain size={20} />
                                    </div>
                                </div>
                                <div className="h-[250px] w-full">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={historyMetrics}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#ffffff05" />
                                            <XAxis
                                                dataKey="fecha"
                                                axisLine={false}
                                                tickLine={false}
                                                tick={{ fill: '#4b5563', fontSize: 10, fontWeight: 900 }}
                                                tickFormatter={(v) => new Date(v).toLocaleDateString('es-AR', { day: '2-digit', month: 'short' })}
                                            />
                                            <YAxis hide />
                                            <Tooltip
                                                contentStyle={{ backgroundColor: '#1c1c1e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '1rem' }}
                                                cursor={{ fill: 'rgba(255,255,255,0.02)' }}
                                            />
                                            <Bar dataKey="rutinas_ia_hoy" name="Rutinas" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                                            <Bar dataKey="videos_procesados_hoy" name="Videos" fill="#d946ef" radius={[4, 4, 0, 0]} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}

                {/* Gyms Tab Content */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {(activeTab === 'gyms' ? gymCards : activeTab === 'saas' ? saasCards : globalCards).map((card, i) => (
                        <motion.div
                            key={i}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.05 }}
                            onClick={() => card.href && router.push(card.href)}
                            className={`bg-[#1c1c1e] p-6 rounded-[2rem] border border-white/5 relative overflow-hidden transition-all ${
                                card.href 
                                    ? `group cursor-pointer ${card.border || ''}` 
                                    : 'cursor-default'
                            }`}
                        >
                            {card.href && (
                                <div className="absolute top-4 right-6 text-white/0 group-hover:text-white/20 transition-all transform translate-x-4 group-hover:translate-x-0">
                                    <ArrowUpRight size={20} />
                                </div>
                            )}
                            <div className={`w-12 h-12 ${card.bg} ${card.color} rounded-2xl flex items-center justify-center mb-4 transition-transform ${card.href ? 'group-hover:scale-110' : ''}`}>
                                {card.icon}
                            </div>
                            <h3 className="text-gray-500 text-[10px] font-black uppercase tracking-widest">{card.title}</h3>
                            <p className="text-3xl font-black text-white mt-1 italic tracking-tighter">{card.value}</p>
                            {card.href && (
                                <div className="mt-4 flex items-center gap-1 text-[10px] font-bold text-gray-500 group-hover:text-white transition-colors">
                                    <span>Administrar</span>
                                    <ChevronRight size={10} />
                                </div>
                            )}
                        </motion.div>
                    ))}
                </div>

                {/* Quick Actions dinámicas por contexto */}
                <div className="bg-[#1c1c1e] border border-white/5 rounded-[2.5rem] p-8">
                    <div className="flex items-center gap-3 mb-8">
                        <Zap size={20} className="text-red-500 fill-red-500" />
                        <h3 className="text-xl font-black text-white italic uppercase tracking-tight">
                            {activeTab === 'gyms' ? 'Operaciones de Red' : activeTab === 'saas' ? 'Control de Negocio' : 'Infraestructura Global'}
                        </h3>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {quickActions[activeTab].map((action, i) => (
                            <Link
                                key={i}
                                href={action.href}
                                onClick={(e) => {
                                    if (action.label === 'Broadcast') {
                                        e.preventDefault();
                                        setShowBroadcastModal(true);
                                    }
                                }}
                                className="group relative h-24 overflow-hidden rounded-2xl"
                            >
                                <div className={`absolute inset-0 bg-gradient-to-br ${action.color} opacity-10 group-hover:opacity-20 transition-opacity`} />
                                <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-transparent via-white/20 to-transparent" />
                                <div className="relative h-full flex flex-col items-center justify-center gap-2 border border-white/5 group-hover:border-white/20 transition-all rounded-2xl">
                                    <div className="p-2 bg-white/5 rounded-xl text-white group-hover:scale-110 transition-transform">
                                        {action.icon}
                                    </div>
                                    <span className="text-[10px] font-black text-gray-400 group-hover:text-white uppercase tracking-widest transition-colors">
                                        {action.label}
                                    </span>
                                </div>
                            </Link>
                        ))}
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Contenido dinámico según el Tab */}
                    {activeTab === 'gyms' && (
                        <>
                            <div className="lg:col-span-2 bg-[#1c1c1e] border border-white/5 rounded-[2.5rem] p-8">
                                <h3 className="text-lg font-black text-white italic uppercase mb-6 tracking-tight flex items-center gap-2">
                                    <Activity size={18} className="text-blue-500" /> Salud de Gimnasios (Red)
                                </h3>
                                <div className="space-y-4">
                                    {gymsHealth.map((gym, i) => (
                                        <div key={i} className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5 group hover:bg-white/[0.07] transition-all">
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 bg-white/5 rounded-xl flex items-center justify-center font-black text-xs text-blue-500">
                                                    {gym.scoring_salud}%
                                                </div>
                                                <div>
                                                    <p className="text-sm text-white font-bold">{gym.nombre}</p>
                                                    <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest">{gym.fase_onboarding}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <button onClick={() => router.push(`/saas-admin/gyms`)} className="p-2 bg-white/5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-all" title="Ver Configuración">
                                                    <ToggleLeft size={16} />
                                                </button>
                                                <button
                                                    onClick={() => handleImpersonate(gym.id, gym.nombre)}
                                                    className="p-2 bg-red-600/10 rounded-lg text-red-500 hover:bg-red-600 hover:text-white transition-all"
                                                    title="Acceso Remoto (Impersonate)"
                                                >
                                                    <Eye size={16} />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                    {gymsHealth.length === 0 && (
                                        <p className="text-xs text-center text-gray-500 py-10 uppercase font-black italic">No hay datos de salud disponibles</p>
                                    )}
                                </div>
                            </div>
                            <div className="bg-[#1c1c1e] border border-white/5 rounded-[2.5rem] p-8">
                                <h3 className="text-lg font-black text-white italic uppercase mb-4 tracking-tight">Alertas de Sedes</h3>
                                <AlertList alerts={alerts.filter(a => a.type === 'ticket')} />
                            </div>
                        </>
                    )}

                    {activeTab === 'saas' && (
                        <>
                            <div className="lg:col-span-2 bg-[#1c1c1e] border border-white/5 rounded-[2.5rem] p-8">
                                <h3 className="text-lg font-black text-white italic uppercase mb-6 tracking-tight flex items-center gap-2">
                                    <TrendingUp size={18} className="text-purple-500" /> Histórico de Churn
                                </h3>
                                <ChurnChart data={churnData} />
                            </div>
                            <div className="bg-gradient-to-br from-emerald-600/10 to-transparent border border-emerald-500/20 rounded-[2.5rem] p-8">
                                <h3 className="text-lg font-black text-white italic uppercase mb-4 tracking-tight flex items-center gap-2">
                                    <CreditCard size={18} className="text-emerald-500" /> Alertas de Pago
                                </h3>
                                <AlertList alerts={alerts.filter(a => a.type === 'payment')} />
                            </div>
                        </>
                    )}

                    {activeTab === 'global' && (
                        <>
                            <div className="lg:col-span-2 bg-[#1c1c1e] border border-white/5 rounded-[2.5rem] p-8">
                                <div className="flex justify-between items-center mb-6">
                                    <h3 className="text-xl font-black text-white italic uppercase tracking-tight flex items-center gap-2">
                                        <Megaphone size={20} className="text-red-500" /> Centro de Comunicados
                                    </h3>
                                    <button
                                        onClick={() => setShowBroadcastModal(true)}
                                        className="px-4 py-2 bg-red-600 text-[10px] font-black uppercase tracking-widest text-white rounded-xl shadow-lg shadow-red-600/20 hover:scale-105 active:scale-95 transition-all"
                                    >
                                        Crear Anuncio
                                    </button>
                                </div>
                                <p className="text-[10px] text-gray-500 font-bold uppercase mb-6">Emite notificaciones en tiempo real a toda la red o roles específicos.</p>
                                <div className="space-y-4">
                                    {announcements.map((ann, i) => (
                                        <div key={i} className="p-4 bg-white/5 border border-white/5 rounded-2xl">
                                            <div className="flex items-center justify-between mb-2">
                                                <div className="flex items-center gap-2">
                                                    <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${ann.tipo === 'alerta' ? 'bg-red-500' : ann.tipo === 'mantenimiento' ? 'bg-orange-500' : 'bg-blue-600'} text-white`}>
                                                        {ann.tipo}
                                                    </span>
                                                    <span className="text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full bg-white/10 text-gray-400">
                                                        Destino: {ann.destino === 'coaches' ? 'Profesores' : ann.destino === 'admin_gym' ? 'Admins Gym' : ann.destino}
                                                    </span>
                                                    {ann.enviado_newsletter && (
                                                        <span className="text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-500 border border-emerald-500/20 flex items-center gap-1">
                                                            <Mail size={8} /> Newsletter Enviado
                                                        </span>
                                                    )}
                                                </div>
                                                <span className="text-[10px] text-gray-600 font-mono italic">{new Date(ann.creado_en).toLocaleDateString('es-AR')}</span>
                                            </div>
                                            <h4 className="text-sm text-white font-bold">{ann.titulo}</h4>
                                            <p className="text-xs text-gray-500 mt-1">{ann.contenido}</p>
                                        </div>
                                    ))}
                                    {announcements.length === 0 && (
                                        <div className="py-20 flex flex-col items-center justify-center opacity-30">
                                            <Megaphone size={40} className="text-white mb-4" />
                                            <p className="text-[10px] font-black uppercase tracking-widest text-white">Silencio total en la red</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div className="space-y-6">
                                <div className="bg-[#1c1c1e] border border-white/5 rounded-[2.5rem] p-8">
                                    <h3 className="text-lg font-black text-white italic uppercase mb-4 tracking-tight flex items-center gap-2">
                                        <ShieldAlert size={18} className="text-orange-500" /> Seguridad
                                    </h3>
                                    <div className="space-y-4">
                                        <SystemRow label="Monitor de Auditoría" status="Activo" color="bg-green-500" />
                                        <SystemRow label="Remote Connect" status="Safe" color="bg-blue-500" />
                                        <div className="mt-4 p-4 bg-blue-500/10 border border-blue-500/20 rounded-2xl">
                                            <p className="text-[9px] font-black text-blue-400 uppercase leading-tight">
                                                Tu acceso está siendo auditado bajo cumplimiento ISO-27001.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                                <div className="bg-[#1c1c1e] border border-white/5 rounded-[2.5rem] p-8">
                                    <h3 className="text-lg font-black text-white italic uppercase mb-4 tracking-tight">Actividad</h3>
                                    <ActivityLog activities={activities.slice(0, 3)} />
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </motion.div>

            {/* Modal de Broadcast */}
            {showBroadcastModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-[#1c1c1e] border border-white/10 rounded-[2.5rem] w-full max-w-lg overflow-hidden shadow-2xl flex flex-col"
                    >
                        <div className="p-8 border-b border-white/5 bg-gradient-to-r from-red-600/10 to-transparent">
                            <h3 className="text-2xl font-black text-white italic uppercase tracking-tighter flex items-center gap-3">
                                <Megaphone className="text-red-500" /> Nuevo Comunicado
                            </h3>
                            <p className="text-gray-500 text-xs mt-1 uppercase font-bold tracking-widest">Red Global de Notificaciones</p>
                        </div>

                        <form onSubmit={handleBroadcast} className="p-8 space-y-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Título del Anuncio</label>
                                <input
                                    type="text"
                                    value={newAnnouncement.titulo}
                                    onChange={e => setNewAnnouncement({ ...newAnnouncement, titulo: e.target.value })}
                                    placeholder="Ej: Mantenimiento Programado"
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-red-500/50 transition-all"
                                    required
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Tipo</label>
                                    <select
                                        value={newAnnouncement.tipo}
                                        onChange={e => setNewAnnouncement({ ...newAnnouncement, tipo: e.target.value })}
                                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-red-500/50 transition-all appearance-none"
                                    >
                                        <option value="info">Información</option>
                                        <option value="alerta">Alerta Crítica</option>
                                        <option value="novedad">Novedad / Update</option>
                                        <option value="mantenimiento">Mantenimiento</option>
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Destinatarios</label>
                                    <select
                                        value={newAnnouncement.destino}
                                        onChange={e => setNewAnnouncement({ ...newAnnouncement, destino: e.target.value })}
                                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-red-500/50 transition-all appearance-none"
                                    >
                                        <option value="todos">Toda la Red (Todos)</option>
                                        <option value="admin_gym">Solo Administradores</option>
                                        <option value="coaches">Solo Profesores / Coaches</option>
                                        <option value="alumnos">Solo Alumnos</option>
                                    </select>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Mensaje Detallado</label>
                                <textarea
                                    rows={4}
                                    value={newAnnouncement.contenido}
                                    onChange={e => setNewAnnouncement({ ...newAnnouncement, contenido: e.target.value })}
                                    placeholder="Escribe aquí el contenido del comunicado..."
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-red-500/50 transition-all resize-none"
                                    required
                                />
                            </div>

                            <div className="flex items-center gap-3 p-4 bg-white/5 rounded-2xl border border-white/5 group hover:border-red-500/30 transition-all cursor-pointer"
                                onClick={() => setNewAnnouncement({ ...newAnnouncement, sendEmail: !newAnnouncement.sendEmail })}>
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${newAnnouncement.sendEmail ? 'bg-red-600 text-white' : 'bg-white/5 text-gray-600'}`}>
                                    <Mail size={20} />
                                </div>
                                <div className="flex-1">
                                    <p className="text-[10px] font-black text-white uppercase italic">Enviar vía Newsletter (Email)</p>
                                    <p className="text-[8px] font-bold text-gray-600 uppercase tracking-widest">Se enviará un correo masivo via Resend</p>
                                </div>
                                <div className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all ${newAnnouncement.sendEmail ? 'bg-red-600 border-red-600' : 'border-white/20'}`}>
                                    {newAnnouncement.sendEmail && <Check size={12} className="text-white" />}
                                </div>
                            </div>

                            <div className="flex gap-4 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setShowBroadcastModal(false)}
                                    className="flex-1 px-6 py-4 bg-white/5 text-white text-[10px] font-black uppercase tracking-widest rounded-2xl hover:bg-white/10 transition-all"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 px-6 py-4 bg-red-600 text-white text-[10px] font-black uppercase tracking-widest rounded-2xl shadow-lg shadow-red-600/20 hover:scale-105 active:scale-95 transition-all"
                                >
                                    Enviar a la Red
                                </button>
                            </div>
                        </form>
                    </motion.div>
                </div>
            )}

            {/* Modal de Impersonación Premium con Justificación de Auditoría */}
            <AnimatePresence>
                {impersonationTarget && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="bg-[#1c1c1e] border border-amber-500/20 rounded-[2.5rem] w-full max-w-lg overflow-hidden shadow-[0_0_50px_rgba(245,158,11,0.15)] flex flex-col"
                        >
                            <div className="p-8 border-b border-white/5 bg-gradient-to-r from-amber-500/10 via-orange-600/5 to-transparent flex items-center gap-4 relative">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full blur-2xl" />
                                <div className="w-12 h-12 bg-amber-500/20 text-amber-400 rounded-2xl flex items-center justify-center border border-amber-500/30 shadow-[0_0_15px_rgba(245,158,11,0.2)] animate-pulse shrink-0">
                                    <ShieldAlert size={24} />
                                </div>
                                <div className="relative z-10">
                                    <h3 className="text-2xl font-black text-white italic uppercase tracking-tighter">Acceso Remoto Auditado</h3>
                                    <p className="text-[10px] text-amber-400/80 font-black uppercase tracking-widest mt-1">Protocolo de Seguridad Nivel 4</p>
                                </div>
                            </div>

                            <div className="p-8 space-y-6">
                                <div className="p-4 bg-amber-500/5 border border-amber-500/10 rounded-2xl">
                                    <p className="text-xs font-black uppercase text-amber-400">Gimnasio Destino:</p>
                                    <p className="text-xl font-black text-white italic uppercase tracking-tight mt-1">{impersonationTarget.nombre}</p>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Motivo / Justificación de Soporte</label>
                                    <textarea
                                        rows={3}
                                        value={impersonationReason}
                                        onChange={e => setImpersonationReason(e.target.value)}
                                        placeholder="Ej: Resolución de incidencia en pasarela de pagos / Diagnóstico técnico..."
                                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-amber-500/50 transition-all resize-none text-xs font-medium"
                                        required
                                    />
                                    <p className="text-[8px] font-black text-gray-600 uppercase tracking-widest leading-none mt-1">
                                        * Esta justificación será guardada de forma inmutable en el historial de auditoría global.
                                    </p>
                                </div>

                                <div className="flex gap-4 pt-4">
                                    <button
                                        type="button"
                                        onClick={() => setImpersonationTarget(null)}
                                        disabled={isImpersonatingApi}
                                        className="flex-1 px-6 py-4 bg-white/5 text-white text-[10px] font-black uppercase tracking-widest rounded-2xl hover:bg-white/10 transition-all border border-white/5 disabled:opacity-50"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        type="button"
                                        onClick={executeImpersonation}
                                        disabled={isImpersonatingApi}
                                        className="flex-1 px-6 py-4 bg-amber-500 hover:bg-amber-400 text-black text-[10px] font-black uppercase tracking-widest rounded-2xl shadow-[0_0_20px_rgba(245,158,11,0.3)] hover:shadow-[0_0_30px_rgba(245,158,11,0.5)] transition-all transform hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50"
                                    >
                                        {isImpersonatingApi ? 'Iniciando Enlace...' : 'Conectar Entorno'}
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}

// -- Sub-componentes para mantener el orden --


function SystemRow({ label, status, color }: { label: string; status: string; color: string }) {
    return (
        <div className="flex items-center justify-between p-3 bg-white/[0.02] border border-white/5 rounded-xl">
            <span className="text-[10px] font-black text-gray-400 uppercase">{label}</span>
            <div className="flex items-center gap-2">
                <div className={`w-1.5 h-1.5 rounded-full ${color} animate-pulse`} />
                <span className="text-[10px] font-black text-white uppercase">{status}</span>
            </div>
        </div>
    );
}

function AlertList({ alerts }: { alerts: Alert[] }) {
    if (alerts.length === 0) {
        return (
            <div className="p-4 bg-white/5 border border-white/5 rounded-2xl flex items-center justify-center">
                <p className="text-[10px] font-black text-gray-500 uppercase italic">Sin alertas en este sector</p>
            </div>
        );
    }
    return (
        <div className="space-y-3">
            {alerts.map((alert) => (
                <Link key={alert.id} href={alert.link} className="block p-4 bg-white/5 border border-white/5 rounded-2xl hover:border-white/20 transition-all">
                    <div className="flex items-center gap-3">
                        <ShieldAlert size={16} className={alert.type === 'payment' ? 'text-red-500' : 'text-amber-500'} />
                        <div className="flex-1 min-w-0">
                            <p className="text-xs text-white font-bold truncate">{alert.message}</p>
                            <p className="text-[8px] font-black text-gray-500 uppercase">{alert.priority}</p>
                        </div>
                        <ChevronRight size={12} className="text-gray-600" />
                    </div>
                </Link>
            ))}
        </div>
    );
}

function ActivityLog({ activities }: { activities: SystemActivity[] }) {
    if (activities.length === 0) return <p className="text-gray-600 text-center py-10 italic">No hay actividad.</p>;
    return (
        <div className="space-y-4">
            {activities.map((act) => (
                <div key={act.id} className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-red-600/10 text-red-500 rounded-xl flex items-center justify-center font-bold text-[8px] uppercase text-center p-1">
                            {act.entidad_tipo?.substring(0, 3)}
                        </div>
                        <div>
                            <p className="text-sm text-gray-200 font-bold">{act.accion.replace(/_/g, ' ')}</p>
                            <p className="text-[10px] text-gray-500 font-medium lowercase italic">
                                {act.perfiles?.nombre_completo || 'Sistema'} @ {act.gimnasios?.nombre || 'General'}
                            </p>
                        </div>
                    </div>
                    <span className="text-[10px] text-gray-600 font-mono">
                        {new Date(act.creado_en).toLocaleString('es-AR', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                </div>
            ))}
        </div>
    );
}

function ChurnChart({ data }: { data: ChurnData[] }) {
    if (data.length === 0) return <p className="text-gray-600 text-xs italic text-center pb-10">Sin datos históricos</p>;
    return (
        <div className="flex items-end gap-3 h-32 mb-4">
            {data.map((d, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-2 group">
                    <div className="w-full bg-white/5 rounded-t-lg relative overflow-hidden h-full flex items-end">
                        <motion.div
                            initial={{ height: 0 }}
                            animate={{ height: `${(d.churn_gyms_mes || 0) * 10}%` }}
                            className="w-full bg-purple-500/40 group-hover:bg-purple-500 transition-all rounded-t-sm"
                        />
                    </div>
                    <span className="text-[8px] font-black text-gray-600 uppercase">
                        {new Date(d.fecha).toLocaleDateString('es-AR', { month: 'short' })}
                    </span>
                </div>
            ))}
        </div>
    );
}
