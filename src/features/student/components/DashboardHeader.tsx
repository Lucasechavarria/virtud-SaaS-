import React from 'react';
import { motion } from 'framer-motion';
import { Activity, Zap, MessageSquare, Bell } from 'lucide-react';
import { ItemVariants } from '@/types/student-components';
import Link from 'next/link';
import { EliteButton } from '@/components/ui/EliteButton';


interface DashboardHeaderProps {
    gender: string | null;
    itemVariants: ItemVariants;
}

export function DashboardHeader({ gender, itemVariants }: DashboardHeaderProps) {
    const greeting = gender === 'female' ? 'Campeona' : gender === 'male' ? 'Campeón' : 'Campeón/a';

    return (
        <motion.div
            variants={itemVariants}
            className="relative overflow-hidden rounded-[3rem] bg-tactical-black border border-white/5 p-10 sm:p-12 shadow-2xl group transition-all"
        >
            {/* Tactical Brand Decoration */}
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-gradient-to-br from-tactical-cyan/10 to-transparent rounded-full blur-[120px] -mr-48 -mt-48 animate-pulse pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-48 h-1 bg-gradient-to-r from-tactical-cyan to-transparent rounded-full ml-12 mb-8 opacity-40 shadow-[0_0_10px_rgba(0,245,255,0.5)]" />


            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8">
                <div className="space-y-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-white/5 rounded-2xl flex items-center justify-center border border-white/5 shadow-inner group-hover:rotate-12 transition-transform">
                            <Zap size={20} className="text-orange-500 fill-orange-500" />
                        </div>
                        <span className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.4em]">Central Intelligence v2.0</span>
                    </div>

                    <div>
                        <h1 className="text-4xl sm:text-7xl font-rajdhani font-black text-white tracking-tight uppercase leading-none">
                            Status: <span className="text-transparent bg-clip-text bg-gradient-to-r from-tactical-cyan to-[#0099FF] animate-pulse">{greeting}</span>
                        </h1>
                        <p className="text-zinc-500 text-sm sm:text-lg font-medium max-w-xl mt-4 opacity-70 decoration-tactical-cyan/20 underline underline-offset-8">
                            "La disciplina Virtud es el único camino hacia el dominio táctico de tu cuerpo."
                        </p>
                    </div>

                </div>

                <div className="flex flex-wrap items-center gap-6">
                    <Link href="/dashboard/chat">
                        <EliteButton variant="cyan" size="lg" className="shadow-neon-cyan/20 px-8">
                            <MessageSquare size={18} />
                            <span>Enlace Táctico</span>
                            <div className="ml-2 px-2 py-0.5 bg-black/80 text-tactical-cyan rounded-full text-[10px] border border-tactical-cyan/50 font-black">3</div>
                        </EliteButton>
                    </Link>


                    <div className="hidden lg:flex items-center gap-6 bg-black/60 px-8 py-5 rounded-[2.5rem] border border-tactical-cyan/10 backdrop-blur-3xl shadow-inner shadow-tactical-cyan/5">
                        <div className="text-right">
                            <p className="text-[10px] font-black text-zinc-600 uppercase tracking-[0.3em] leading-none">Canal Seguro</p>
                            <p className="text-xs font-black text-tactical-cyan uppercase mt-1 tracking-widest">SISTEMA ONLINE</p>
                        </div>
                        <Activity className="text-tactical-cyan animate-pulse shadow-neon-cyan" size={28} />
                    </div>

                </div>
            </div>

            {/* HUD Scan Animation */}
            <motion.div 
                initial={{ top: '-100%' }}
                animate={{ top: '100%' }}
                transition={{ 
                    duration: 2, 
                    repeat: Infinity, 
                    ease: "linear" 
                }}
                className="absolute left-0 right-0 h-[100px] bg-gradient-to-b from-transparent via-tactical-cyan/10 to-transparent pointer-events-none z-20 motion-reduce:hidden"
            />

            {/* Scanline Effect */}
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-white/5 to-transparent h-[2px] w-full animate-scanline pointer-events-none opacity-20 motion-reduce:hidden" />

        </motion.div>
    );
}
