'use client';

import React from 'react';
import { cn } from '@/lib/utils';

import { motion } from 'framer-motion';
import { TrendingUp, Activity, Weight, Target } from 'lucide-react';
import { ItemVariants } from '@/types/student-components';
import { EliteCard } from '@/components/ui/EliteCard';


interface Stat {
    label: string;
    value: string;
    icon: string;
    trend: string;
    color: string;
}

interface StatsOverviewProps {
    stats: Stat[];
    itemVariants: ItemVariants;
}

export function StatsOverview({ stats, itemVariants }: StatsOverviewProps) {
    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {stats.map((stat, i) => (
                <EliteCard
                    key={i}
                    variants={itemVariants}
                    variant={i % 2 === 0 ? 'cyan' : 'magenta'}
                    whileHover={{ y: -10, scale: 1.05 }}
                    accent="left"
                    particles={true}
                    className="p-0"
                >
                    <div className="relative z-10 flex flex-col justify-between h-full">
                        <div className="flex items-center justify-between mb-8">
                            <div className={cn(
                                "p-4 bg-black/40 rounded-2xl border border-white/10 shadow-inner group-hover:scale-110 transition-transform",
                                i % 2 === 0 ? "text-tactical-cyan" : "text-tactical-magenta"
                            )}>
                                <span className="text-3xl filter drop-shadow-[0_0_8px_currentColor]">{stat.icon}</span>
                            </div>
                            <div className="flex items-center gap-2 bg-black/60 px-3 py-1.5 rounded-full border border-white/5">
                                <TrendingUp size={12} className={i % 2 === 0 ? "text-tactical-cyan" : "text-tactical-magenta"} />
                                <span className="text-[9px] font-black text-zinc-500 uppercase tracking-[0.2em]">{stat.trend}</span>
                            </div>
                        </div>

                        <div className="space-y-1">
                            <p className="text-[10px] font-black text-zinc-600 uppercase tracking-[0.3em] mb-1 font-rajdhani">{stat.label}</p>
                            <div className="flex items-baseline gap-2">
                                <p className="text-5xl font-rajdhani font-black text-white tracking-tighter leading-none italic">{stat.value.split(' ')[0]}</p>
                                <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">{stat.value.split(' ')[1] || ''}</p>
                            </div>
                        </div>
                    </div>
                </EliteCard>
            ))}

        </div>
    );
}
