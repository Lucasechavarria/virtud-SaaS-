'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import ChatTactical from '@/features/chat/components/ChatTactical';
import { Activity } from 'lucide-react';

export default function CoachMessagesPage() {
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
        <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-10">
            <div className="flex flex-col items-center gap-4">
                <Activity className="text-orange-500 animate-ping" size={40} />
                <span className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.4em]">Sincronizando Centro de Comando...</span>
            </div>
        </div>
    );

    return (
        <div className="min-h-[calc(100vh-8rem)] bg-zinc-950 p-6 sm:p-10 flex flex-col gap-8 rounded-[3rem] border border-white/5">
            <div className="flex items-center justify-between">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <Activity size={12} className="text-orange-500" />
                        <span className="text-[10px] font-black text-zinc-600 uppercase tracking-[0.4em]">Operational Support</span>
                    </div>
                    <h1 className="text-3xl sm:text-5xl font-black text-white italic tracking-tighter uppercase">
                        Gestión de <span className="text-orange-500">Operativos</span>
                    </h1>
                </div>

                <div className="hidden lg:flex items-center gap-4 bg-zinc-900/50 px-6 py-4 rounded-[2rem] border border-white/5 backdrop-blur-3xl shadow-xl">
                    <div className="text-right">
                        <p className="text-[10px] font-black text-zinc-600 uppercase tracking-widest leading-none">Canal de Mando</p>
                        <p className="text-xs font-bold text-orange-400 uppercase mt-1">ENLACE ACTIVO</p>
                    </div>
                    <div className="w-2 h-2 rounded-full bg-orange-500 animate-pulse shadow-[0_0_10px_rgba(249,115,22,0.5)]" />
                </div>
            </div>

            <div className="flex-1 min-h-0 bg-black/20 rounded-[2rem] overflow-hidden">
                <ChatTactical currentUser={user} />
            </div>
        </div>
    );
}
