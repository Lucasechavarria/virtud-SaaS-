'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { supabase } from '@/lib/supabase/client';
import { Zap, ChevronRight } from 'lucide-react';

export function VisionAlert({ itemVariants, getLink }: { itemVariants: any; getLink?: (path: string) => string }) {
    const [newAnalyses, setNewAnalyses] = useState(0);
    
    // ... (fetch useEffect remains unchanged) ...
    
    useEffect(() => {
        const fetchNewAnalyses = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { count } = await supabase
                .from('videos_ejercicio')
                .select('*', { count: 'exact', head: true })
                .eq('usuario_id', user.id)
                .eq('estado', 'analizado')
                .eq('visto_por_alumno', false);

            setNewAnalyses(count || 0);
        };

        fetchNewAnalyses();

        const channel = supabase
            .channel('dashboard_vision_alerts')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'videos_ejercicio' },
                () => fetchNewAnalyses()
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    if (newAnalyses === 0) return null;

    const visionLink = getLink ? getLink('/member/dashboard/vision') : '/dashboard/vision';

    return (
        <motion.div
            variants={itemVariants}
            className="bg-indigo-500/10 border border-indigo-500/30 rounded-2xl p-4 flex items-center justify-between"
        >
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-indigo-500 rounded-xl flex items-center justify-center animate-pulse">
                    <Zap className="text-white fill-current" size={20} />
                </div>
                <div>
                    <p className="text-white font-bold">¡Nuevo análisis técnico disponible!</p>
                    <p className="text-indigo-400 text-sm">
                        Tienes {newAnalyses} {newAnalyses === 1 ? 'nuevo análisis' : 'nuevos análisis'} de tu biomecánica esperando revisión.
                    </p>
                </div>
            </div>
            <Link
                href={visionLink}
                className="bg-indigo-500 hover:bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-1 group"
            >
                Ver Análisis
                <ChevronRight size={16} className="group-hover:translate-x-1 transition-transform" />
            </Link>
        </motion.div>
    );
}
