'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { QrCode, RotateCcw, ShieldCheck, Clock, User } from 'lucide-react';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/client';

export default function StudentQRPage({ _params }: { _params: { gymId: string } }) {
    const [timeLeft, setTimeLeft] = useState(30);
    const [qrValue, setQrValue] = useState('generando...');
    const [loading, setLoading] = useState(true);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [profile, setProfile] = useState<any>(null);
    const supabase = createClient();

    // Fetch user profile
    useEffect(() => {
        const fetchProfile = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const { data } = await supabase
                    .from('perfiles')
                    .select('nombre_completo, url_avatar, estado_membresia')
                    .eq('id', user.id)
                    .single();
                setProfile(data);
            }
            setLoading(false);
        };
        fetchProfile();
    }, [supabase]);

    // Timer logic
    useEffect(() => {
        if (loading) return;

        // Función para rotar el QR cada 30 segundos
        const rotateQR = () => {
            const tempToken = `VIRTUD-${Date.now().toString(36)}-${Math.random().toString(36).substring(7)}`;
            setQrValue(tempToken);
            setTimeLeft(30);
        };

        // Primera vez
        if (qrValue === 'generando...') {
            rotateQR();
        }

        const timer = setInterval(() => {
            setTimeLeft((prev) => {
                if (prev <= 1) {
                    rotateQR();
                    return 30;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, [loading, qrValue]);

    if (loading) {
        return (
            <div className="flex items-center justify-center p-8 text-emerald-500 animate-pulse">
                <QrCode size={48} />
            </div>
        );
    }

    const isActive = profile?.estado_membresia !== 'inactive';

    return (
        <div className="max-w-md mx-auto py-8">
            <h1 className="text-3xl font-black italic uppercase tracking-tighter mb-8 bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
                Mi Carnet Digital
            </h1>

            <div className="relative">
                {/* Status Glow Background */}
                <div className={`absolute inset-0 blur-[100px] opacity-20 -z-10 ${isActive ? 'bg-emerald-500' : 'bg-red-500'}`} />

                <div className="bg-[#1c1c1e] rounded-[3rem] border border-white/10 p-8 shadow-2xl relative overflow-hidden">

                    {/* Header: User Info */}
                    <div className="flex items-center gap-4 mb-8">
                        <div className="w-16 h-16 rounded-full bg-white/5 border-2 border-white/20 overflow-hidden flex items-center justify-center shrink-0 relative">
                            {profile?.url_avatar ? (
                                <Image src={profile.url_avatar} alt="Avatar" fill className="object-cover" />
                            ) : (
                                <User className="text-white/40" size={32} />
                            )}
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-white">{profile?.nombre_completo || 'Usuario VIRTUD'}</h2>
                            <span className={`inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full mt-1 ${isActive ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
                                {isActive ? 'Membresía Activa' : 'Membresía Inactiva'}
                            </span>
                        </div>
                    </div>

                    {/* QR Code Area */}
                    <div className={`relative bg-white p-6 rounded-[2rem] flex flex-col items-center justify-center transition-all ${!isActive ? 'opacity-50 grayscale' : ''}`}>

                        {/* Placeholder for real QR code (could use react-qr-code) */}
                        <div className="w-48 h-48 border-8 border-gray-100 rounded-xl flex items-center justify-center relative bg-gray-50">
                            {/* Animated scanning line overlay */}
                            <motion.div
                                animate={{ y: ['-100%', '100%'] }}
                                transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
                                className="absolute w-full h-1 bg-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.5)] z-20"
                            />
                            {/* A mockup of a QR pattern using Lucide and some styled divs */}
                            <QrCode size={120} className="text-black" />

                            {/* Watermark Logo */}
                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20">
                                <span className="font-black italic text-2xl rotate-45 text-black">VIRTUD</span>
                            </div>
                        </div>

                        {!isActive && (
                            <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center rounded-[2rem] text-white p-6 text-center">
                                <ShieldCheck size={48} className="text-red-500 mb-4" />
                                <h3 className="text-xl font-black italic uppercase tracking-tighter mb-2">Acceso Denegado</h3>
                                <p className="text-sm font-bold text-gray-400">Debes regularizar tu membresía o firmar el deslinde médico para acceder al QR.</p>
                            </div>
                        )}
                    </div>

                    {/* Timer & Security Info */}
                    <AnimatePresence mode="popLayout">
                        {isActive && (
                            <motion.div
                                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                                className="mt-8 text-center"
                            >
                                <div className="flex items-center justify-center gap-2 text-emerald-500 mb-3">
                                    <Clock size={16} className={timeLeft <= 5 ? "animate-pulse text-red-500" : ""} />
                                    <span className={`font-mono font-bold text-lg ${timeLeft <= 5 ? "text-red-500" : ""}`}>
                                        00:{timeLeft.toString().padStart(2, '0')}
                                    </span>
                                </div>

                                {/* Progress Bar */}
                                <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden mb-6">
                                    <motion.div
                                        className={`h-full ${timeLeft <= 5 ? "bg-red-500" : "bg-emerald-500"}`}
                                        initial={{ width: '100%' }}
                                        animate={{ width: `${(timeLeft / 30) * 100}%` }}
                                        transition={{ duration: 1, ease: 'linear' }}
                                    />
                                </div>

                                <div className="flex items-center justify-center gap-2 text-gray-500 text-xs font-bold uppercase tracking-widest bg-white/5 mx-auto py-2 px-4 rounded-xl">
                                    <RotateCcw size={14} />
                                    <span>Código Dinámico Encriptado</span>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>

            <p className="text-center text-xs text-gray-600 font-bold uppercase tracking-widest mt-8">
                Presenta este código en el ingreso del gimnasio
            </p>
        </div>
    );
}
