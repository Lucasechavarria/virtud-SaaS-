'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import NextImage from 'next/image';
import { motion } from 'framer-motion';
import { toast } from 'react-hot-toast';
import { CoachAttendanceWidget } from '@/features/coach/components/CoachAttendanceWidget';
import { IntelligenceCardsGrid } from '@/components/coach/IntelligenceCards';
import { BulkStudentManager } from '@/components/coach/BulkStudentManager';
import { Zap, Users, Calendar, ClipboardCheck, Bell, Activity, ShieldCheck, Mail, BarChart3 } from 'lucide-react';

const container = {
    hidden: { opacity: 0 },
    show: {
        opacity: 1,
        transition: {
            staggerChildren: 0.1
        }
    }
};

const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
};

export default function CoachDashboard({ params }: { params: { tenantSlug: string } }) {
    const [loading, setLoading] = useState(true);
    const [sendingPush, setSendingPush] = useState(false);
    const [analytics, setAnalytics] = useState<any>(null);
    const [_students, setStudents] = useState<any[]>([]);
    const [data, setData] = useState<any>({
        stats: { activeStudents: 0 },
        upcomingClasses: [],
        recentReports: []
    });

    useEffect(() => {
        const fetchDashboardData = async () => {
            const gymSlug = params.tenantSlug;
            if (!gymSlug) return;
            try {
                const [dashboardRes, analyticsRes, studentsRes] = await Promise.all([
                    fetch(`/api/coach/dashboard?gymId=${gymSlug}`),
                    fetch(`/api/coach/analytics?gymId=${gymSlug}`),
                    fetch(`/api/coach/students?gymId=${gymSlug}`),
                ]);

                if (dashboardRes.ok) {
                    const dashboardData = await dashboardRes.json();
                    setData(dashboardData);
                }

                if (analyticsRes.ok) {
                    const analyticsData = await analyticsRes.json();
                    setAnalytics(analyticsData);
                }

                if (studentsRes.ok) {
                    const studentsData = await studentsRes.json();
                    setStudents(studentsData.students || []);
                }
            } catch (error) {
                console.error('Error fetching coach dashboard:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchDashboardData();
    }, [params.tenantSlug]);

    const sendTestPush = async () => {
        setSendingPush(true);
        const toastId = toast.loading('Enviando señal táctica...');
        try {
            const res = await fetch('/api/push/test', { method: 'POST' });
            const result = await res.json();
            if (!res.ok) throw new Error(result.error);
            toast.success('¡Señal enviada con éxito!', { id: toastId });
        } catch (error: any) {
            toast.error(error.message || 'Error al enviar señal', { id: toastId });
        } finally {
            setSendingPush(false);
        }
    };

    const nextClass = data.upcomingClasses[0];

    return (
        <motion.div
            variants={container}
            initial="hidden"
            animate="show"
            className="space-y-8 relative z-10 pb-20"
        >
            {/* Command Header */}
            <motion.div variants={item} className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <div className="flex items-center gap-2 mb-2">
                        <div className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
                        <span className="text-[10px] font-black tracking-widest text-orange-500 uppercase">Coach Command Center</span>
                    </div>
                    <h2 className="text-5xl font-black tracking-tighter">
                        <span className="text-transparent bg-clip-text bg-gradient-to-b from-white to-gray-500">
                            HOLA, COACH
                        </span>{' '}
                        <span className="inline-block origin-bottom animate-bounce">👋</span>
                    </h2>
                </div>

                {/* Tactical Push Test Button */}
                <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={sendTestPush}
                    disabled={sendingPush}
                    className="flex items-center gap-3 bg-zinc-900/80 border border-orange-500/30 backdrop-blur-md px-6 py-3 rounded-2xl hover:border-orange-500 transition-all group shadow-[0_0_20px_rgba(249,115,22,0.1)]"
                >
                    <Zap className={`w-5 h-5 ${sendingPush ? 'animate-spin' : 'group-hover:text-orange-500'} transition-colors`} />
                    <div className="text-left">
                        <p className="text-[10px] uppercase font-black tracking-wider text-gray-500 group-hover:text-orange-400">Push System</p>
                        <p className="text-sm font-bold text-white uppercase tracking-tighter">Send Test Signal</p>
                    </div>
                </motion.button>
            </motion.div>

            {/* Intelligence Cards Grid */}
            {analytics && (
                <motion.div variants={item}>
                    <IntelligenceCardsGrid analytics={analytics} />
                </motion.div>
            )}

            {/* Main Intelligence Grid */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

                {/* Next Class Hero - High Profile */}
                <div className="xl:col-span-2">
                    <Link href="/coach/classes">
                        <motion.div
                            variants={item}
                            whileHover={{ y: -5 }}
                            className="h-full bg-gradient-to-br from-orange-600 via-orange-700 to-red-900 rounded-[2.5rem] p-10 relative overflow-hidden shadow-2xl border border-white/10 group group cursor-pointer"
                        >
                            {/* Futuristic Background Elements */}
                            <div className="absolute top-0 right-0 w-1/3 h-full bg-gradient-to-l from-white/10 to-transparent skew-x-12 transform translate-x-20" />
                            <div className="absolute -right-20 -bottom-20 w-96 h-96 bg-orange-400/20 rounded-full blur-[100px] group-hover:bg-orange-400/30 transition-all duration-700" />

                            <div className="relative z-10 flex flex-col h-full justify-between gap-12">
                                <div>
                                    <div className="flex items-center gap-3 mb-6">
                                        <div className="bg-black/40 backdrop-blur-xl border border-white/10 px-4 py-2 rounded-2xl">
                                            <p className="text-[10px] font-black text-orange-400 tracking-widest uppercase">Próxima Misión</p>
                                        </div>
                                        {nextClass && (
                                            <div className="bg-white/10 backdrop-blur-md px-4 py-2 rounded-2xl border border-white/5">
                                                <p className="text-[10px] font-black text-white tracking-widest uppercase">
                                                    {new Date(nextClass.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </p>
                                            </div>
                                        )}
                                    </div>

                                    {loading ? (
                                        <div className="animate-pulse space-y-4">
                                            <div className="h-16 w-3/4 bg-white/20 rounded-2xl" />
                                            <div className="h-6 w-1/2 bg-white/20 rounded-xl" />
                                        </div>
                                    ) : nextClass ? (
                                        <>
                                            <h3 className="text-7xl font-black text-white leading-none tracking-tighter mb-4 italic uppercase">
                                                {nextClass.activities?.name || 'Clase'}
                                            </h3>
                                            <div className="flex items-center gap-6 text-orange-100/80">
                                                <div className="flex items-center gap-2">
                                                    <Activity className="w-5 h-5" />
                                                    <span className="font-bold tracking-tight">Sala Principal</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <Users className="w-5 h-5" />
                                                    <span className="font-bold tracking-tight">{nextClass.bookings?.[0]?.count || 0} Operativos</span>
                                                </div>
                                            </div>
                                        </>
                                    ) : (
                                        <>
                                            <h3 className="text-6xl font-black text-white leading-none tracking-tighter mb-4 italic uppercase">
                                                Zona Despejada
                                            </h3>
                                            <p className="text-orange-100/60 font-bold max-w-sm">No hay clases programadas para las próximas horas. Momento táctico para reporte y descanso.</p>
                                        </>
                                    )}
                                </div>

                                <div className="flex items-center gap-4">
                                    <div className="px-6 py-3 bg-white text-black font-black uppercase tracking-tighter rounded-2xl text-xs hover:bg-orange-100 transition-colors shadow-xl">
                                        Abrir Lista de Asistencia
                                    </div>
                                    <div className="w-12 h-12 bg-black/20 backdrop-blur-md rounded-2xl flex items-center justify-center border border-white/10">
                                        <ShieldCheck className="w-6 h-6 text-white" />
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </Link>
                </div>

                {/* Intelligence Feed (Reports) */}
                {/* Signals & Active Units Column */}
                <div className="flex flex-col gap-6">
                    {/* Active Units Monitor */}
                    <motion.div variants={item} className="bg-zinc-950/40 backdrop-blur-2xl rounded-[2.5rem] border border-orange-500/20 p-8 shadow-2xl relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/5 rounded-full blur-3xl -mr-16 -mt-16" />

                        <div className="flex items-center justify-between mb-8 relative z-10">
                            <div>
                                <p className="text-[10px] font-black text-orange-500 uppercase tracking-widest mb-1">Field Monitor</p>
                                <h3 className="text-2xl font-black text-white italic tracking-tighter uppercase">Unidades <span className="text-orange-500">en Campo</span></h3>
                            </div>
                            <div className="flex items-center gap-2 bg-orange-500/10 px-3 py-1.5 rounded-full border border-orange-500/20">
                                <Activity className="w-3 h-3 text-orange-500 animate-pulse" />
                                <span className="text-[9px] font-black text-orange-500 uppercase tracking-widest">{data.stats.activeUnits?.length || 0} Live</span>
                            </div>
                        </div>

                        <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar relative z-10">
                            {loading ? (
                                <div className="h-20 bg-white/5 rounded-2xl animate-pulse" />
                            ) : data.stats.activeUnits?.length > 0 ? (
                                data.stats.activeUnits.map((unit: any) => (
                                    <div key={unit.id} className="flex items-center gap-4 p-4 rounded-2xl bg-white/5 border border-white/5 hover:border-orange-500/20 transition-all">
                                        <div className="w-10 h-10 rounded-full bg-zinc-800 border border-orange-500/30 overflow-hidden relative">
                                            {unit.perfiles?.url_avatar ? (
                                                <NextImage src={unit.perfiles.url_avatar} alt="" fill className="object-cover" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-white font-black text-xs uppercase">
                                                    {unit.perfiles?.nombre_completo?.charAt(0)}
                                                </div>
                                            )}
                                        </div>
                                        <div>
                                            <p className="text-xs font-black text-white uppercase tracking-tight">{unit.perfiles?.nombre_completo}</p>
                                            <p className="text-[9px] font-bold text-orange-500 uppercase tracking-[0.2em]">En Operación • {new Date(unit.creado_en).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="py-10 text-center opacity-30 border-2 border-dashed border-white/5 rounded-[2rem]">
                                    <Users className="w-8 h-8 mx-auto mb-3" />
                                    <p className="text-[9px] font-black uppercase tracking-widest">Sin Unidades Activas</p>
                                </div>
                            )}
                        </div>
                    </motion.div>

                    {/* Intelligence Feed */}
                    <motion.div variants={item} className="bg-zinc-950/40 backdrop-blur-2xl rounded-[2.5rem] border border-white/5 p-8 flex flex-col shadow-2xl flex-1">
                        <div className="flex items-center justify-between mb-8">
                            <div>
                                <p className="text-[10px] font-black text-orange-500 uppercase tracking-widest mb-1">Signals Hub</p>
                                <h3 className="text-2xl font-black text-white italic tracking-tighter uppercase">Alertas</h3>
                            </div>
                            <div className="w-10 h-10 rounded-full bg-orange-500/10 flex items-center justify-center border border-orange-500/20">
                                <Bell className="w-5 h-5 text-orange-500" />
                            </div>
                        </div>

                        <div className="flex-1 space-y-4 overflow-y-auto max-h-[300px] pr-2 custom-scrollbar">
                            {loading ? (
                                Array(2).fill(0).map((_, i) => (
                                    <div key={i} className="h-20 bg-white/5 rounded-2xl animate-pulse" />
                                ))
                            ) : data.recentReports?.length > 0 ? (
                                data.recentReports.map((report: any) => (
                                    <StudentCard
                                        key={report.id}
                                        name={report.perfiles?.nombre_completo || 'Alumno'}
                                        status={report.titulo || 'Nuevo reporte'}
                                        delay={0.1}
                                    />
                                ))
                            ) : (
                                <div className="flex flex-col items-center justify-center h-full text-center py-10 opacity-40">
                                    <ShieldCheck className="w-12 h-12 mb-4" />
                                    <p className="text-sm font-bold uppercase tracking-widest text-white">Red Estabilizada</p>
                                </div>
                            )}
                        </div>

                        <Link href="/coach/messages" className="mt-8">
                            <div className="w-full py-4 bg-zinc-900 border border-white/5 rounded-2xl flex items-center justify-center gap-3 group hover:border-orange-500/50 transition-all">
                                <span className="text-xs font-black uppercase text-gray-400 group-hover:text-white transition-colors">Intelligence Chat</span>
                                <Mail className="w-4 h-4 text-orange-500" />
                            </div>
                        </Link>
                    </motion.div>
                </div>

            </div>

            {/* Secondary Operations Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

                {/* Attendance Control */}
                <div className="lg:col-span-4">
                    <CoachAttendanceWidget />
                </div>

                {/* Tactical Operations (Action Grid) */}
                <div className="lg:col-span-8 grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <ActionCard label="Rutinas" sub="Digital Gear" icon={<ClipboardCheck />} href="/coach/routines" delay={0.4} color="gray" />
                    <ActionCard label="Clases" sub="Operation Log" icon={<Calendar />} href="/coach/classes" delay={0.5} color="gray" />
                    <ActionCard label="Asistencia" sub="Check-In" icon={< ShieldCheck />} href="/coach/classes" delay={0.6} color="gray" />
                    <ActionCard label="Alumnos" sub={`${data.stats.activeStudents} Unidades`} icon={<Users />} href="/coach/students" delay={0.7} color="orange" />
                </div>

            </div>
        </motion.div>
    );
}

function StudentCard({ name, status, delay }: any) {
    return (
        <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay }}
            whileHover={{ x: 5, backgroundColor: 'rgba(255,255,255,0.05)' }}
            className="flex items-center gap-4 p-4 rounded-2xl border border-white/5 bg-black/20 transition-all group cursor-pointer"
        >
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-zinc-800 to-zinc-900 flex items-center justify-center font-black text-white border border-white/10 group-hover:border-orange-500 transition-colors">
                {name.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
                <h4 className="font-bold text-white truncate text-sm leading-tight italic uppercase">{name}</h4>
                <p className="text-[10px] text-orange-500 font-black uppercase tracking-widest">{status}</p>
            </div>
            <Zap className="w-4 h-4 text-gray-700 group-hover:text-orange-500 transition-colors" />
        </motion.div>
    )
}

function ActionCard({ label, sub, icon, href, delay, color }: { label: string, sub: string, icon: React.ReactNode, href?: string, delay?: number, color: 'orange' | 'gray' }) {
    const isOrange = color === 'orange';

    const content = (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay }}
            whileHover={{ y: -5, boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)' }}
            whileTap={{ scale: 0.95 }}
            className={`flex flex-col h-full items-start p-6 rounded-[2rem] border transition-all group overflow-hidden relative
                ${isOrange
                    ? 'bg-orange-600 border-white/20 text-white'
                    : 'bg-zinc-900/50 border-white/5 text-gray-400 hover:border-orange-500/50'}`}
        >
            {/* Background Icon Watermark */}
            <div className="absolute -right-4 -bottom-4 opacity-[0.03] transform scale-150 rotate-12 group-hover:scale-[1.7] transition-transform duration-700">
                {icon}
            </div>

            <div className={`p-4 rounded-2xl mb-6 shadow-inner
                ${isOrange ? 'bg-white/20' : 'bg-black/20 group-hover:bg-orange-500/10 transition-colors'}`}>
                <div className={`w-6 h-6 ${isOrange ? 'text-white' : 'group-hover:text-orange-500 transition-colors'}`}>
                    {icon}
                </div>
            </div>

            <div className="mt-auto">
                <p className={`text-[9px] font-black uppercase tracking-[0.2em] mb-1
                    ${isOrange ? 'text-orange-100/60' : 'text-gray-500 group-hover:text-orange-400'}`}>
                    {sub}
                </p>
                <p className={`text-xl font-black italic uppercase tracking-tighter
                    ${isOrange ? 'text-white' : 'text-gray-400 group-hover:text-white transition-colors'}`}>
                    {label}
                </p>
            </div>
        </motion.div>
    );

    if (href) {
        return (
            <Link href={href} className="block h-full">
                {content}
            </Link>
        );
    }

    return (
        <button className="block h-full w-full text-left">
            {content}
        </button>
    );
}
