'use client';

import React, { Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Lock, ArrowLeft, HelpCircle, MessageSquare } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

function ModuloBloqueadoContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const { userRole } = useAuth();
    
    const modulo = searchParams.get('modulo') || 'Módulo';
    const isDashboardAdmin = ['admin', 'superadmin', 'recepcion'].includes(userRole ?? '');

    const handleGoBack = () => {
        // Redirige al panel correspondiente de manera segura
        if (isDashboardAdmin) {
            router.push('/admin');
        } else if (userRole === 'coach') {
            router.push('/coach');
        } else {
            router.push('/member/dashboard');
        }
    };

    return (
        <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-6 selection:bg-red-500 selection:text-white relative overflow-hidden">
            {/* Fondo de Gradientes Premium Animados */}
            <div className="absolute inset-0 z-0 overflow-hidden">
                <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] rounded-full bg-red-900/10 blur-[120px] animate-pulse" style={{ animationDuration: '8s' }} />
                <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] rounded-full bg-blue-900/10 blur-[120px] animate-pulse" style={{ animationDuration: '12s' }} />
            </div>

            <motion.div 
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, ease: 'easeOut' }}
                className="relative z-10 w-full max-w-lg p-10 bg-[#0c0c0c] border border-white/5 rounded-[3.5rem] shadow-2xl backdrop-blur-md text-center space-y-8"
            >
                {/* Ícono de Candado Premium con Micro-animación */}
                <div className="flex justify-center">
                    <motion.div
                        animate={{ 
                            scale: [1, 1.05, 1],
                            rotate: [0, -3, 3, 0]
                        }}
                        transition={{ 
                            repeat: Infinity, 
                            duration: 5,
                            ease: 'easeInOut' 
                        }}
                        className="relative w-24 h-24 rounded-[2rem] bg-red-600/10 border border-red-500/20 flex items-center justify-center text-red-500 shadow-lg shadow-red-900/20"
                    >
                        <Lock size={40} className="stroke-[1.5]" />
                        <div className="absolute inset-0 rounded-[2rem] bg-gradient-to-tr from-transparent via-red-500/5 to-transparent animate-pulse" />
                    </motion.div>
                </div>

                {/* Textos Informativos */}
                <div className="space-y-4">
                    <span className="inline-block px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-[9px] font-black uppercase tracking-[0.25em] text-gray-400">
                        Servicio No Contratado
                    </span>
                    <h1 className="text-4xl md:text-5xl font-black italic uppercase tracking-tighter leading-none">
                        Módulo de {modulo} Bloqueado
                    </h1>
                    
                    <p className="text-sm text-gray-500 max-w-sm mx-auto leading-relaxed">
                        {isDashboardAdmin 
                            ? 'Este módulo no se encuentra activo en el plan contratado por tu gimnasio. Activa esta funcionalidad en la consola global SaaS.'
                            : 'Tu centro deportivo aún no tiene contratado este servicio en su membresía de plataforma. Solicita su activación a la administración para disfrutar de esta experiencia.'}
                    </p>
                </div>

                {/* Acciones y Botones Premium */}
                <div className="flex flex-col gap-4 pt-4 border-t border-white/5">
                    {isDashboardAdmin ? (
                        <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => router.push('/saas-admin/billing')}
                            className="w-full py-4.5 bg-red-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-red-700 transition-all shadow-xl shadow-red-900/15"
                        >
                            Adquirir Módulo en SaaS Admin
                        </motion.button>
                    ) : (
                        <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            className="w-full py-4.5 bg-white/5 border border-white/10 text-gray-300 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-white/10 transition-all flex items-center justify-center gap-3"
                        >
                            <MessageSquare size={16} />
                            Enviar Sugerencia a Administración
                        </motion.button>
                    )}

                    <motion.button
                        whileHover={{ x: -4 }}
                        onClick={handleGoBack}
                        className="w-full py-4 text-gray-400 hover:text-white transition-all font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2"
                    >
                        <ArrowLeft size={14} />
                        Volver al Panel Seguro
                    </motion.button>
                </div>
            </motion.div>

            {/* Ayuda / Footer */}
            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-2 text-gray-600 hover:text-gray-400 cursor-pointer transition-colors text-[9px] font-black uppercase tracking-widest">
                <HelpCircle size={12} />
                <span>Soporte Técnico Virtud</span>
            </div>
        </div>
    );
}

export default function ModuloBloqueadoPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-black flex flex-col items-center justify-center text-white space-y-4">
                <div className="w-12 h-12 border-4 border-red-600 border-t-transparent rounded-full animate-spin" />
                <p className="font-black italic uppercase tracking-widest text-[10px]">Cargando experiencia...</p>
            </div>
        }>
            <ModuloBloqueadoContent />
        </Suspense>
    );
}
