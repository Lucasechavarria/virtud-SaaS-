'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    AlertTriangle,
    CreditCard,
    Lock,
    MessageSquare,
    ExternalLink,
    Zap,
    TrendingUp,
    ChevronRight
} from 'lucide-react';
import Link from 'next/link';

interface SaaSGuardProps {
    children: React.ReactNode;
}

export default function SaaSGuard({ children }: SaaSGuardProps) {
    const [status, setStatus] = useState<'loading' | 'active' | 'suspended' | 'near_limit'>('loading');
    const [gymData, setGymData] = useState<any>(null);

    useEffect(() => {
        const checkStatus = async () => {
            try {
                const res = await fetch('/api/admin/gyms/current');
                const data = await res.json();

                if (res.ok && data.gym) {
                    setGymData(data.gym);

                    if (data.gym.estado_pago_saas === 'suspendido') {
                        setStatus('suspended');
                        return;
                    }

                    // Logica de limite (90%)
                    const students = data.gym.stats?.students || 0;
                    const limit = data.gym.planes_suscripcion?.limite_usuarios || 50;

                    if (students >= limit * 0.9) {
                        setStatus('near_limit');
                    } else {
                        setStatus('active');
                    }
                } else {
                    setStatus('active'); // Fallback para no bloquear
                }
            } catch (_error) {
                setStatus('active');
            }
        };

        checkStatus();
    }, []);

    if (status === 'loading') return children; // No bloqueamos mientras carga para evitar parpadeos

    if (status === 'suspended') {
        return (
            <div className="fixed inset-0 z-[9999] bg-black flex items-center justify-center p-6">
                <div className="absolute inset-0 bg-gradient-to-br from-red-900/40 via-black to-black opacity-60" />

                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="relative bg-[#1c1c1e] max-w-xl w-full rounded-[3rem] border border-red-500/20 p-12 text-center shadow-[0_0_100px_rgba(239,68,68,0.15)] overflow-hidden"
                >
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-red-500 to-transparent" />

                    <div className="w-24 h-24 bg-red-600/10 rounded-[2rem] flex items-center justify-center mx-auto mb-8 border border-red-500/20">
                        <Lock size={40} className="text-red-500" />
                    </div>

                    <h2 className="text-4xl font-black text-white italic uppercase tracking-tighter mb-4">Acceso Suspendido</h2>
                    <p className="text-gray-400 mb-10 leading-relaxed font-medium">
                        Hemos detectado un problema con la suscripción de <span className="text-white font-bold">{gymData?.nombre || 'tu institución'}</span>.
                        Para garantizar la continuidad del servicio, es necesario regularizar el pago.
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                        <div className="p-4 bg-white/5 rounded-2xl border border-white/5 text-left">
                            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-1">Motivo</p>
                            <p className="text-xs text-white font-bold italic uppercase">Falta de Pago</p>
                        </div>
                        <div className="p-4 bg-white/5 rounded-2xl border border-white/5 text-left">
                            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-1">Tu ID de Gimnasio</p>
                            <p className="text-xs text-white font-mono">{gymData?.id?.split('-')[0] || '---'}</p>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <button
                            className="w-full py-5 bg-white text-black rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-red-600 hover:text-white transition-all shadow-xl active:scale-95 flex items-center justify-center gap-2"
                            onClick={() => window.open('https://pagos.virtud.com', '_blank')}
                        >
                            <CreditCard size={18} />
                            Regularizar Pago Ahora
                        </button>
                        <Link
                            href="/admin/settings/support"
                            className="w-full py-5 bg-white/5 border border-white/10 text-gray-400 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-white/10 transition-all flex items-center justify-center gap-2"
                        >
                            <MessageSquare size={18} />
                            Contactar con Soporte Técnico
                        </Link>
                    </div>

                    <p className="mt-8 text-[10px] text-gray-600 font-bold uppercase tracking-widest">
                        Plataforma SaaS gestionada por Virtud &copy; 2026
                    </p>
                </motion.div>
            </div>
        );
    }

    // El banner de Upgrade (90%) puede ser un componente que se rinde encima pero no bloquea totalmente o un aviso persistente.
    // Aquí implementamos un Aviso flotante.

    return (
        <div className="relative">
            {status === 'near_limit' && (
                <motion.div
                    initial={{ y: -100, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    className="fixed top-0 left-0 right-0 z-[100] p-4 flex justify-center pointer-events-none"
                >
                    <div className="bg-amber-600/90 backdrop-blur-md text-white px-8 py-3 rounded-full flex items-center gap-4 shadow-2xl border border-amber-500/50 pointer-events-auto">
                        <TrendingUp size={18} className="animate-bounce" />
                        <span className="text-xs font-black uppercase tracking-widest">
                            🔥 Estás al {Math.round((gymData.stats.students / gymData.planes_suscripcion.limite_usuarios) * 100)}% de tu límite de alumnos ({gymData.stats.students}/{gymData.planes_suscripcion.limite_usuarios})
                        </span>
                        <div className="w-px h-4 bg-white/20" />
                        <button
                            onClick={() => window.location.href = '/admin/plans'}
                            className="text-[10px] font-black uppercase bg-white text-amber-600 px-4 py-1.5 rounded-full hover:bg-amber-50 shadow-sm transition-all"
                        >
                            Subir de Plan
                        </button>
                    </div>
                </motion.div>
            )}
            {children}
        </div>
    );
}
