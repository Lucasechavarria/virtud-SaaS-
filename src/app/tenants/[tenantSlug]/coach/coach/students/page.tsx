'use client';

import React from 'react';
import StudentsGrid from '@/features/coach/components/StudentsGrid';

export default function CoachStudentsPage() {
    return (
        <div className="space-y-12 relative z-10 p-4 md:p-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
                <div className="space-y-2">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-2 h-8 bg-orange-500 rounded-full" />
                        <p className="text-[10px] font-black text-orange-500 uppercase tracking-[0.3em]">Tactical Overview</p>
                    </div>
                    <h1 className="text-6xl font-black text-white italic tracking-tighter uppercase leading-none">
                        Mis <span className="text-orange-500">Atletas</span>
                    </h1>
                    <p className="text-gray-400 text-sm font-bold uppercase tracking-widest opacity-60">
                        Gestión de Operaciones de Alto Rendimiento
                    </p>
                </div>

                <div className="flex gap-4">
                    <div className="bg-zinc-900/50 backdrop-blur-xl border border-orange-500/20 px-6 py-4 rounded-[1.5rem] flex flex-col items-center min-w-[120px]">
                        <span className="text-2xl font-black text-white italic">32</span>
                        <span className="text-[9px] font-black text-orange-500 uppercase tracking-widest">Activos</span>
                    </div>
                    <div className="bg-zinc-900/50 backdrop-blur-xl border border-white/5 px-6 py-4 rounded-[1.5rem] flex flex-col items-center min-w-[120px]">
                        <span className="text-2xl font-black text-white italic">05</span>
                        <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Nuevos</span>
                    </div>
                </div>
            </div>

            <div className="relative">
                <div className="absolute -top-24 -right-24 w-96 h-96 bg-orange-500/5 rounded-full blur-[100px] pointer-events-none" />
                <StudentsGrid />
            </div>
        </div>
    );
}
