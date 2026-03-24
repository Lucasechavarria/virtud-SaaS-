'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
    Users,
    Calendar,
    TrendingUp,
    History,
    ChevronRight,
    ArrowUpRight,
    Zap,
    CreditCard,
    LayoutDashboard,
    PlusCircle,
    Settings,
    Building2,
    ShieldAlert
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface GymStats {
    activeMembers: number;
    totalUsers: number;
    classesToday: number;
    revenue: number;
    membershipExpiring: Array<{
        id: string;
        nombre_completo: string;
        fecha_fin_membresia: string;
    }>;
    recentActivity: Array<{
        id: string;
        description: string;
        date: string;
        user: {
            nombre?: string;
            nombre_completo: string;
        };
    }>;
}

export default function GymAdminDashboard({ gymId }: { gymId: string }) {
    const [stats, setStats] = useState<GymStats | null>(null);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        const fetchGymData = async () => {
            try {
                const res = await fetch(`/api/admin/gym-stats?gymId=${gymId}`);
                if (res.ok) {
                    const data = await res.json();
                    setStats(data);
                }
            } catch (error) {
                console.error('Error fetching gym stats:', error);
            } finally {
                setLoading(false);
            }
        };

        if (gymId) fetchGymData();
    }, [gymId]);

    if (loading) {
        return (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 animate-pulse">
                {[1, 2, 3, 4].map(i => (
                    <div key={i} className="h-32 bg-white/5 rounded-2xl border border-white/5" />
                ))}
            </div>
        );
    }

    const cards = [
        { title: 'Socios Activos', value: stats?.activeMembers || 0, icon: <Users />, color: 'text-green-500', bg: 'bg-green-500/10', border: 'hover:border-green-500/50', href: '/admin/users' },
        { title: 'Usuarios Totales', value: stats?.totalUsers || 0, icon: <Building2 />, color: 'text-blue-500', bg: 'bg-blue-500/10', border: 'hover:border-blue-500/50', href: '/admin/users' },
        { title: 'Clases Hoy', value: stats?.classesToday || 0, icon: <Calendar />, color: 'text-amber-500', bg: 'bg-amber-500/10', border: 'hover:border-amber-500/50', href: '/admin/classes' },
        { title: 'Recaudación Mes', value: `$${stats?.revenue.toLocaleString('es-AR')}`, icon: <TrendingUp />, color: 'text-purple-500', bg: 'bg-purple-500/10', border: 'hover:border-purple-500/50', href: '/admin/finance' },
    ];

    const quickActions = [
        { label: 'Nuevo Socio', icon: <PlusCircle size={20} />, href: '/admin/users?action=new', color: 'from-blue-600 to-cyan-500' },
        { label: 'Cobrar Cuota', icon: <CreditCard size={20} />, href: '/admin/finance?action=payment', color: 'from-green-600 to-emerald-500' },
        { label: 'Configurar Gym', icon: <Settings size={20} />, href: '/admin/settings', color: 'from-gray-600 to-slate-500' },
        { label: 'Dashboard App', icon: <LayoutDashboard size={20} />, href: '/', color: 'from-orange-600 to-red-500' },
    ];

    return (
        <div className="space-y-8">
            {/* Header / Brand */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-black text-white italic uppercase tracking-tighter">Mi Gimnasio</h1>
                    <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mt-1">Panel de Control Local</p>
                </div>
                <div className="flex p-1 bg-white/5 rounded-xl border border-white/5">
                    <span className="px-3 py-1 text-[8px] font-black text-white uppercase tracking-widest bg-red-600 rounded-lg">Admin View</span>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {cards.map((card, i) => (
                    <motion.div
                        key={i}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.1 }}
                        onClick={() => router.push(card.href)}
                        className={`bg-[#1c1c1e] p-6 rounded-[2rem] border border-white/5 group ${card.border} transition-all cursor-pointer relative overflow-hidden`}
                    >
                        <div className="absolute top-4 right-6 text-white/0 group-hover:text-white/20 transition-all transform translate-x-4 group-hover:translate-x-0">
                            <ArrowUpRight size={20} />
                        </div>
                        <div className={`w-12 h-12 ${card.bg} ${card.color} rounded-2xl flex items-center justify-center mb-4 transition-transform group-hover:scale-110`}>
                            {card.icon}
                        </div>
                        <h3 className="text-gray-500 text-[10px] font-black uppercase tracking-widest">{card.title}</h3>
                        <p className="text-3xl font-black text-white mt-1 italic tracking-tighter">{card.value}</p>
                        <div className="mt-4 flex items-center gap-1 text-[10px] font-bold text-gray-500 group-hover:text-white transition-colors">
                            <span>Gestionar</span>
                            <ChevronRight size={10} />
                        </div>
                    </motion.div>
                ))}
            </div>

            {/* Operaciones Rápidas */}
            <div className="bg-[#1c1c1e] border border-white/5 rounded-[2.5rem] p-8">
                <div className="flex items-center gap-3 mb-8">
                    <Zap size={20} className="text-red-500 fill-red-500" />
                    <h3 className="text-xl font-black text-white italic uppercase tracking-tight">Acciones Frecuentes</h3>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {quickActions.map((action, i) => (
                        <Link key={i} href={action.href} className="group relative h-24 overflow-hidden rounded-2xl">
                            <div className={`absolute inset-0 bg-gradient-to-br ${action.color} opacity-10 group-hover:opacity-20 transition-opacity`} />
                            <div className="relative h-full flex flex-col items-center justify-center gap-2 border border-white/5 group-hover:border-white/20 transition-all rounded-2xl">
                                <div className="p-2 bg-white/5 rounded-xl text-white group-hover:scale-110 transition-transform">
                                    {action.icon}
                                </div>
                                <span className="text-[10px] font-black text-gray-400 group-hover:text-white uppercase tracking-widest text-center">
                                    {action.label}
                                </span>
                            </div>
                        </Link>
                    ))}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Registros Recientes */}
                <div className="lg:col-span-2 bg-[#1c1c1e] border border-white/5 rounded-[2.5rem] p-8">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-xl font-black text-white italic uppercase tracking-tight">Últimos Movimientos</h3>
                        <Link href="/admin/auditoria" className="text-[10px] font-black text-gray-500 uppercase tracking-widest hover:text-white">Ver Todo</Link>
                    </div>
                    <div className="space-y-4">
                        {stats?.recentActivity.map((act, i) => (
                            <div key={i} className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 bg-blue-500/10 text-blue-500 rounded-xl flex items-center justify-center font-bold text-xs">
                                        {act.user?.nombre?.substring(0, 1)}
                                    </div>
                                    <div>
                                        <p className="text-sm text-gray-200 font-bold">{act.description}</p>
                                        <p className="text-[10px] text-gray-500 italic uppercase font-black">{act.user?.nombre_completo}</p>
                                    </div>
                                </div>
                                <span className="text-[10px] text-gray-600 font-mono italic">{new Date(act.date).toLocaleDateString('es-AR')}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Vencimientos */}
                <div className="bg-[#1c1c1e] border border-white/5 rounded-[2.5rem] p-8">
                    <h3 className="text-lg font-black text-white italic uppercase mb-6 tracking-tight flex items-center gap-2">
                        <ShieldAlert size={18} className="text-red-500" /> Próximos Vencimientos
                    </h3>
                    <div className="space-y-3">
                        {stats?.membershipExpiring.map((m, i) => (
                            <div key={i} className="p-4 bg-red-500/5 border border-red-500/10 rounded-2xl flex items-center justify-between group hover:bg-red-500/10 transition-all cursor-pointer" onClick={() => router.push(`/admin/users?search=${m.nombre_completo}`)}>
                                <div>
                                    <p className="text-xs text-white font-bold">{m.nombre_completo}</p>
                                    <p className="text-[8px] font-black text-red-400 uppercase tracking-widest mt-0.5">Vence: {new Date(m.fecha_fin_membresia).toLocaleDateString('es-AR')}</p>
                                </div>
                                <ChevronRight size={14} className="text-red-500 group-hover:translate-x-1 transition-transform" />
                            </div>
                        ))}
                        {stats?.membershipExpiring.length === 0 && (
                            <p className="text-[10px] font-black text-gray-500 uppercase italic text-center py-4">Sin vencimientos próximos</p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
