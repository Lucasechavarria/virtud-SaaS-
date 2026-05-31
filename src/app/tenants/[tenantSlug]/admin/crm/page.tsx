'use client';

import React, { useState } from 'react';
import CrmKanban from '@/features/crm/components/CrmKanban';
import ChurnAnalysis from '@/features/crm/components/ChurnAnalysis';
import { Target, UserX, LayoutDashboard } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function CrmPage() {
    const [activeTab, setActiveTab] = useState<'leads' | 'churn' | 'overview'>('leads');

    const tabs = [
        { id: 'overview', label: 'Estrategia', icon: LayoutDashboard },
        { id: 'leads', label: 'Prospectos (CRM)', icon: Target },
        { id: 'churn', label: 'Retención (Churn)', icon: UserX },
    ];

    return (
        <div className="p-6 space-y-10 min-h-screen">
            {/* Tab Navigation Dashboard Style */}
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
                                    : 'bg-transparent border-transparent text-gray-500 hover:text-white hover:bg-white/5'
                                }`}
                        >
                            <Icon size={16} />
                            {tab.label}
                        </button>
                    )
                })}
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
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="h-[60vh] flex flex-col items-center justify-center text-center p-12 bg-white/5 rounded-[4rem] border border-white/5"
                        >
                            <LayoutDashboard size={80} className="text-gray-700 mb-6" />
                            <h2 className="text-3xl font-black text-white uppercase italic tracking-tighter mb-4">Gestión Inteligente del Cliente</h2>
                            <p className="max-w-md mx-auto text-gray-500 text-sm leading-relaxed mb-8 font-medium">
                                En el CRM puedes gestionar proactivamente tanto la entrada de nuevos socios como la retención de los actuales. Selecciona una pestaña para empezar.
                            </p>
                            <div className="grid grid-cols-2 gap-4 w-full max-w-sm">
                                <button onClick={() => setActiveTab('leads')} className="bg-white text-black py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-white/5 hover:scale-105 transition-all">Prospectos</button>
                                <button onClick={() => setActiveTab('churn')} className="bg-orange-600 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-orange-600/20 hover:scale-105 transition-all">Retención</button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}
