'use client';

import React, { useState, useEffect } from 'react';
import CrmKanban from '@/features/crm/components/CrmKanban';
import ChurnAnalysis from '@/features/crm/components/ChurnAnalysis';
import { Target, UserX, LayoutDashboard, Users, HeartPulse, CheckSquare, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useParams } from 'next/navigation';

export default function CrmPage() {
    const params = useParams();
    const tenantSlug = (params?.tenantSlug) as string | undefined;
    const [activeTab, setActiveTab] = useState<'leads' | 'churn' | 'overview'>('overview');
    const [overviewData, setOverviewData] = useState<any>(null);
    const [loadingOverview, setLoadingOverview] = useState(true);

    const tabs = [
        { id: 'overview', label: 'Estrategia', icon: LayoutDashboard },
        { id: 'leads', label: 'Prospectos (CRM)', icon: Target },
        { id: 'churn', label: 'Retención (Churn)', icon: UserX },
    ];

    const fetchOverview = async () => {
        try {
            setLoadingOverview(true);
            const url = tenantSlug
                ? `/api/admin/crm/overview?gymId=${tenantSlug}`
                : '/api/admin/crm/overview';
            const res = await fetch(url);
            const data = await res.json();
            if (data.success) {
                setOverviewData(data.kpis);
            }
        } catch (err) {
            console.error('Error fetching CRM overview:', err);
        } finally {
            setLoadingOverview(false);
        }
    };

    useEffect(() => {
        if (activeTab === 'overview') {
            fetchOverview();
        }
    }, [activeTab]);

    return (
        <div className="p-6 space-y-10 min-h-screen font-rajdhani">
            {/* Tab Navigation Dashboard Style */}
            <div className="flex flex-wrap items-center justify-between gap-6 border-b border-white/5 pb-6">
                <div className="flex flex-wrap items-center gap-3 bg-[#1c1c1e]/60 backdrop-blur-3xl p-2 rounded-3xl border border-white/5 w-fit">
                    {tabs.map((tab) => {
                        const Icon = tab.icon;
                        const isActive = activeTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id as any)}
                                className={`flex items-center gap-3 px-6 py-3 rounded-2xl transition-all font-black uppercase text-xs tracking-widest border ${isActive
                                        ? 'bg-orange-600 border-orange-500 text-white shadow-xl shadow-orange-600/20 active:scale-95'
                                        : 'bg-transparent border-transparent text-zinc-500 hover:text-white hover:bg-white/5'
                                    }`}
                            >
                                <Icon size={16} />
                                {tab.label}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Content Area */}
            <div className="relative overflow-hidden min-h-[70vh]">
                <AnimatePresence mode="wait">
                    {activeTab === 'leads' && (
                        <motion.div
                            key="leads"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.2 }}
                        >
                            <CrmKanban />
                        </motion.div>
                    )}

                    {activeTab === 'churn' && (
                        <motion.div
                            key="churn"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.2 }}
                        >
                            <ChurnAnalysis />
                        </motion.div>
                    )}

                    {activeTab === 'overview' && (
                        <motion.div
                            key="overview"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="space-y-8"
                        >
                            {loadingOverview ? (
                                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 animate-pulse">
                                    {[1, 2, 3, 4].map(i => (
                                        <div key={i} className="h-32 bg-white/5 rounded-3xl border border-white/5" />
                                    ))}
                                </div>
                            ) : (
                                <>
                                    {/* Cabecera de KPIs */}
                                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                                        <div className="bg-[#1c1c1e]/60 border border-white/15 p-6 rounded-3xl flex flex-col justify-between">
                                            <div className="flex items-center justify-between text-zinc-500 mb-4">
                                                <span className="text-[10px] font-black uppercase tracking-widest">Prospectos Activos</span>
                                                <Users size={18} className="text-orange-500" />
                                            </div>
                                            <div>
                                                <h3 className="text-4xl font-black text-white italic leading-none">
                                                    {overviewData?.totalLeads || 0}
                                                </h3>
                                                <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider mt-2">Leads en pipeline</p>
                                            </div>
                                        </div>

                                        <div className="bg-[#1c1c1e]/60 border border-white/15 p-6 rounded-3xl flex flex-col justify-between">
                                            <div className="flex items-center justify-between text-zinc-500 mb-4">
                                                <span className="text-[10px] font-black uppercase tracking-widest">Conversión</span>
                                                <Sparkles size={18} className="text-green-500 animate-pulse" />
                                            </div>
                                            <div>
                                                <h3 className="text-4xl font-black text-white italic leading-none">
                                                    {overviewData?.conversionRate || 0}%
                                                </h3>
                                                <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider mt-2">Leads ganados / total</p>
                                            </div>
                                        </div>

                                        <div className="bg-[#1c1c1e]/60 border border-white/15 p-6 rounded-3xl flex flex-col justify-between">
                                            <div className="flex items-center justify-between text-zinc-500 mb-4">
                                                <span className="text-[10px] font-black uppercase tracking-widest">Alerta Churn</span>
                                                <HeartPulse size={18} className="text-red-500 animate-pulse" />
                                            </div>
                                            <div>
                                                <h3 className="text-4xl font-black text-white italic leading-none">
                                                    {overviewData?.churnRiskCount || 0}
                                                </h3>
                                                <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider mt-2">Socios en riesgo de fuga</p>
                                            </div>
                                        </div>

                                        <div className="bg-[#1c1c1e]/60 border border-white/15 p-6 rounded-3xl flex flex-col justify-between">
                                            <div className="flex items-center justify-between text-zinc-500 mb-4">
                                                <span className="text-[10px] font-black uppercase tracking-widest">Onboarding Promedio</span>
                                                <CheckSquare size={18} className="text-blue-500" />
                                            </div>
                                            <div>
                                                <h3 className="text-4xl font-black text-white italic leading-none">
                                                    {overviewData?.averageOnboardingDays || 0}d
                                                </h3>
                                                <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider mt-2">Días promedio de inducción</p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Gráficos / Sub-tarjetas */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        {/* Origen de Leads */}
                                        <div className="bg-[#1c1c1e]/60 border border-white/10 rounded-3xl p-6">
                                            <h4 className="text-white font-black text-xs uppercase tracking-widest mb-4">Canales de Adquisición (Origen)</h4>
                                            <div className="space-y-3">
                                                {overviewData?.leadOrigins?.map((item: any) => {
                                                    const pct = overviewData.totalLeads > 0 ? Math.round((item.value / overviewData.totalLeads) * 100) : 0;
                                                    return (
                                                        <div key={item.name} className="space-y-1">
                                                            <div className="flex items-center justify-between text-xs font-bold">
                                                                <span className="text-white uppercase tracking-tight">{item.name}</span>
                                                                <span className="text-orange-500">{item.value} ({pct}%)</span>
                                                            </div>
                                                            <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                                                                <div className="h-full bg-orange-500" style={{ width: `${pct}%` }} />
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                                {(!overviewData?.leadOrigins || overviewData.leadOrigins.length === 0) && (
                                                    <p className="text-zinc-500 text-xs text-center py-6 uppercase font-bold tracking-wider">Sin datos de canales registrados</p>
                                                )}
                                            </div>
                                        </div>

                                        {/* Onboarding Status */}
                                        <div className="bg-[#1c1c1e]/60 border border-white/10 rounded-3xl p-6 flex flex-col justify-between">
                                            <div>
                                                <h4 className="text-white font-black text-xs uppercase tracking-widest mb-4">Inducción de Socios (Onboarding)</h4>
                                                <div className="space-y-4">
                                                    <div className="flex items-center justify-between p-3 bg-white/5 rounded-2xl border border-white/5">
                                                        <div className="flex items-center gap-3">
                                                            <span className="w-2.5 h-2.5 rounded-full bg-green-500" />
                                                            <span className="text-zinc-400 text-xs font-bold uppercase tracking-wide">Completado</span>
                                                        </div>
                                                        <span className="text-white font-black text-sm">{overviewData?.onboardingStatus?.completado || 0}</span>
                                                    </div>

                                                    <div className="flex items-center justify-between p-3 bg-white/5 rounded-2xl border border-white/5">
                                                        <div className="flex items-center gap-3">
                                                            <span className="w-2.5 h-2.5 rounded-full bg-yellow-500" />
                                                            <span className="text-zinc-400 text-xs font-bold uppercase tracking-wide">Pendiente</span>
                                                        </div>
                                                        <span className="text-white font-black text-sm">{overviewData?.onboardingStatus?.pendiente || 0}</span>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="mt-6 pt-4 border-t border-white/5 flex gap-4">
                                                <button onClick={() => setActiveTab('leads')} className="flex-1 py-3 bg-orange-600 hover:bg-orange-500 text-white font-black text-[10px] tracking-widest uppercase rounded-xl transition-all">Ver Leads</button>
                                                <button onClick={() => setActiveTab('churn')} className="flex-1 py-3 bg-white text-black hover:bg-gray-200 font-black text-[10px] tracking-widest uppercase rounded-xl transition-all">Ver Churn</button>
                                            </div>
                                        </div>
                                    </div>
                                </>
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}
