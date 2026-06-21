'use client';

import React, { Suspense } from 'react';
import { useSearchParams, useRouter, useParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { ShieldAlert } from 'lucide-react';

function BannerContent() {
    const searchParams = useSearchParams();
    const params = useParams();
    const router = useRouter();
    
    const isImpersonating = searchParams?.get('impersonate') === 'true';
    const tenantSlug = params?.tenantSlug;

    if (!isImpersonating) return null;

    const handleExit = () => {
        const destination = tenantSlug ? `/tenants/${tenantSlug}/admin` : '/admin';
        router.push(destination);
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 overflow-hidden rounded-[1.5rem] border border-amber-500/20 bg-gradient-to-r from-amber-500/10 via-amber-600/5 to-transparent p-5 backdrop-blur-xl shadow-[0_0_50px_rgba(245,158,11,0.05)] w-full no-print z-50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
        >
            <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-amber-500/20 text-amber-400 rounded-2xl flex items-center justify-center border border-amber-500/30 shrink-0 shadow-[0_0_15px_rgba(245,158,11,0.15)] animate-pulse">
                    <ShieldAlert size={22} />
                </div>
                <div>
                    <h3 className="text-white text-sm font-black italic uppercase tracking-tight">
                        🔍 Sesión de Soporte Activa — Super Admin
                    </h3>
                    <p className="text-[10px] text-amber-400/80 font-black uppercase tracking-widest mt-1">
                        Estás visualizando el panel como Super Admin. Todas las acciones están auditadas e inmutables.
                    </p>
                </div>
            </div>
            <button
                onClick={handleExit}
                className="w-full sm:w-auto px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-black font-black text-[10px] uppercase tracking-widest rounded-xl transition-all shadow-[0_0_20px_rgba(245,158,11,0.25)] shrink-0"
            >
                Salir del Acceso Remoto
            </button>
        </motion.div>
    );
}

export default function ImpersonationBanner() {
    return (
        <Suspense fallback={null}>
            <BannerContent />
        </Suspense>
    );
}
