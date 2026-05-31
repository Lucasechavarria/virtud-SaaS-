'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import ChatTactical from '@/features/chat/components/ChatTactical';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { ChevronLeft, Activity } from 'lucide-react';

export default function StudentMessagesPage({ _params }: { _params: { gymId: string } }) {
    const [user, setUser] = useState<any>(null);

    useEffect(() => {
        const getUser = async () => {
            const { data: { user: authUser } } = await supabase.auth.getUser();
            if (authUser) {
                const { data: profile } = await supabase.from('perfiles').select('*').eq('id', authUser.id).single();
                setUser(profile);
            }
        };
        getUser();
    }, []);

    if (!user) return (
        <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
            <div className="flex flex-col items-center gap-4">
                <Activity className="text-orange-500 animate-pulse" size={40} />
                <span className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.4em]">Sincronizando Comunicaciones...</span>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-zinc-950 p-6 sm:p-10 flex flex-col gap-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                <div className="flex items-center gap-6">
                    <Link
                        href="/dashboard"
                        className="p-4 rounded-2xl bg-zinc-900 border border-white/5 text-zinc-500 hover:text-orange-500 hover:border-orange-500/50 transition-all shadow-xl active:scale-95"
                    >
                        <ChevronLeft size={24} />
                    </Link>
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <Activity size={12} className="text-orange-500" />
                            <span className="text-[10px] font-black text-zinc-600 uppercase tracking-[0.4em]">Intelligence Channel</span>
                        </div>
                        <h1 className="text-3xl sm:text-5xl font-black text-white italic tracking-tighter uppercase">
                            Enlace <span className="text-orange-500 text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-orange-600">Directo</span>
                        </h1>
                    </div>
                </div>

                <div className="hidden lg:flex items-center gap-4 bg-zinc-900/50 px-6 py-4 rounded-[2rem] border border-white/5 backdrop-blur-3xl">
                    <div className="text-right">
                        <p className="text-[10px] font-black text-zinc-600 uppercase tracking-widest leading-none">Status Operativo</p>
                        <p className="text-xs font-bold text-orange-400 uppercase mt-1">SISTEMA ENCRIPTADO</p>
                    </div>
                    <div className="w-2 h-2 rounded-full bg-orange-500 animate-ping" />
                </div>
            </div>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex-1 min-h-0"
            >
                <ChatTactical currentUser={user} />
            </motion.div>
        </div>
    );
}
