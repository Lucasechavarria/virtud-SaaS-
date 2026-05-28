'use client';

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';

export default function NotFound() {
    return (
        <div className="min-h-screen bg-zinc-950 font-rajdhani flex flex-col items-center justify-center p-6 relative overflow-hidden select-none">
            {/* Tactical Grid Overlay */}
            <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:4rem_4rem] pointer-events-none" />

            {/* Aurora / Nebula Effects */}
            <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-tactical-cyan/10 rounded-full filter blur-[120px] mix-blend-screen animate-pulse pointer-events-none" />
            <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-tactical-magenta/10 rounded-full filter blur-[120px] mix-blend-screen animate-pulse pointer-events-none" />

            {/* Content Container */}
            <div className="max-w-xl w-full text-center relative z-10 space-y-10 px-4">
                {/* 404 Glitch Number */}
                <div className="relative inline-block select-none">
                    <motion.h1
                        initial={{ opacity: 0, y: -50 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8, type: 'spring' }}
                        className="text-[12rem] md:text-[15rem] font-black leading-none tracking-tighter text-transparent bg-clip-text bg-linear-to-b from-white via-zinc-400 to-zinc-800 drop-shadow-[0_0_30px_rgba(0,245,255,0.15)] uppercase italic"
                    >
                        404
                    </motion.h1>
                    
                    {/* Cybernetic Accent Line */}
                    <div className="absolute top-1/2 left-0 right-0 h-[2px] bg-linear-to-r from-transparent via-tactical-cyan to-transparent shadow-[0_0_10px_#00F5FF] pointer-events-none" />
                </div>

                {/* Text Block */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.3, duration: 0.6 }}
                    className="space-y-4"
                >
                    <h2 className="text-3xl md:text-4xl font-black text-white tracking-widest uppercase italic">
                        COORDENADAS NO ENCONTRADAS
                    </h2>
                    <p className="text-zinc-500 text-sm font-bold uppercase tracking-[0.2em] max-w-md mx-auto leading-relaxed">
                        El enlace interdimensional que buscas no existe o ha sido deslocalizado del sistema global.
                    </p>
                </motion.div>

                {/* Dashboard Action Button */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5, duration: 0.6 }}
                    className="pt-6"
                >
                    <Link href="/dashboard" className="inline-block relative group">
                        {/* Glow Behind Button */}
                        <div className="absolute -inset-1 rounded-2xl bg-linear-to-r from-tactical-cyan to-tactical-magenta opacity-70 blur-md group-hover:opacity-100 transition-opacity duration-300" />
                        
                        <div className="relative bg-zinc-950 text-white border border-white/10 px-10 py-5 rounded-2xl font-black uppercase text-xs tracking-[0.3em] flex items-center justify-center gap-3 transition-transform duration-300 active:scale-95">
                            <span className="text-tactical-cyan animate-pulse">⚡</span>
                            Reconectar Dashboard
                            <span className="text-tactical-magenta animate-pulse">⚡</span>
                        </div>
                    </Link>
                </motion.div>
            </div>

            {/* Corner Decorative Elements */}
            <div className="absolute top-10 left-10 text-[9px] font-mono text-zinc-700 tracking-widest pointer-events-none uppercase">
                SYSTEM: VIRTUD SAAS // ONLINE<br />
                BUILD: V4.0.26 // PRODUCTION
            </div>
            <div className="absolute bottom-10 right-10 text-[9px] font-mono text-zinc-700 tracking-widest pointer-events-none uppercase text-right">
                LATENCY: 14MS // SECURE CONNECTION<br />
                ENCRYPTION: ACTIVE (AES-256)
            </div>
        </div>
    );
}
