'use client';

import React, { useState } from 'react';
import SuperAdminDashboard from '@/features/admin/components/SuperAdminDashboard';
import AutomationCenter from '@/features/admin/components/AutomationCenter';
import BusinessIntelligence from '@/features/admin/components/BusinessIntelligence';
import { LayoutDashboard, Zap, TrendingUp, BarChart3 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function SuperAdminTabs() {
    const [activeTab, setActiveTab] = useState<'overview' | 'automation' | 'bi'>('overview');

    const tabs = [
        { id: 'overview', label: 'Monitor Global', icon: LayoutDashboard },
        { id: 'bi', label: 'Métricas Inteligentes', icon: BarChart3 },
        { id: 'automation', label: 'Centro de Comando', icon: Zap },
    ];

    return (
        <div className="p-6 space-y-10 min-h-screen">
            {/* Header / Global Navigation Stats (Optional) */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex flex-wrap items-center gap-2 bg-[#1c1c1e]/80 backdrop-blur-2xl p-1.5 rounded-[2rem] border border-white/5 shadow-2xl">
                    {tabs.map((tab) => {
                        const Icon = tab.icon;
                        const isActive = activeTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id as any)}
                                className={`flex items-center gap-3 px-6 py-3 rounded-[1.5rem] transition-all font-black uppercase text-[10px] tracking-[0.2em] border ${isActive
                                        ? 'bg-orange-600 border-orange-500 text-white shadow-xl shadow-orange-600/20 active:scale-95'
                                        : 'bg-transparent border-transparent text-gray-500 hover:text-white hover:bg-white/5'
                                    }`}
                            >
                                <Icon size={14} className={isActive ? 'animate-pulse' : ''} />
                                {tab.label}
                            </button>
                        )
                    })}
                </div>
            </div>

            {/* View Transitions */}
            <div className="relative">
                <AnimatePresence mode="wait">
                    {activeTab === 'overview' && (
                        <motion.div
                            key="overview"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.2 }}
                        >
                            <SuperAdminDashboard />
                        </motion.div>
                    )}

                    {activeTab === 'bi' && (
                        <motion.div
                            key="bi"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.2 }}
                        >
                            <BusinessIntelligence />
                        </motion.div>
                    )}

                    {activeTab === 'automation' && (
                        <motion.div
                            key="automation"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.2 }}
                        >
                            <AutomationCenter />
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}
