'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import QRCode from 'react-qr-code';
import { useParams } from 'next/navigation';
import { QrCode, RefreshCw, ShieldCheck, Clock, KeyRound, Sparkles } from 'lucide-react';
import { toast } from 'react-hot-toast';

export default function ReceptionDisplayQRPage() {
    const params = useParams();
    const tenantSlug = params?.tenantSlug as string;

    const [loading, setLoading] = useState(true);
    const [tokenData, setTokenData] = useState<{
        token: string;
        pin: string;
        gymName: string;
        expiraEn: string;
        duracionSegundos: number;
    } | null>(null);

    const [timeLeft, setTimeLeft] = useState(300); // 5 Minutos (300s)

    const fetchDynamicQR = async () => {
        try {
            const res = await fetch(`/api/reception/qr-token?slug=${tenantSlug || ''}`);
            const data = await res.json();
            if (res.ok && data.success) {
                setTokenData({
                    token: data.token,
                    pin: data.pin,
                    gymName: data.gymName,
                    expiraEn: data.expira_en,
                    duracionSegundos: data.duracion_segundos || 300
                });
                setTimeLeft(data.duracion_segundos || 300);
            } else {
                toast.error(data.error || 'Error al actualizar código del gimnasio');
            }
        } catch (err) {
            console.error('Error fetching dynamic gym QR:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDynamicQR();
    }, [tenantSlug]);

    // Timer de rotación de 5 minutos
    useEffect(() => {
        if (loading) return;

        const timer = setInterval(() => {
            setTimeLeft((prev) => {
                if (prev <= 1) {
                    fetchDynamicQR();
                    return 300;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, [loading]);

    const formatTime = (seconds: number) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-[#09090b] flex flex-col items-center justify-center p-6 text-white">
                <motion.div
                    animate={{ rotate: 360, scale: [1, 1.1, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="w-16 h-16 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full mb-4"
                />
                <p className="text-zinc-500 font-black text-xs uppercase tracking-[0.4em] animate-pulse">
                    Generando QR Dinámico de Gimnasio...
                </p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#09090b] text-white flex flex-col items-center justify-center p-6 relative overflow-hidden font-rajdhani selection:bg-emerald-500/30">
            {/* Background Aurora Accents */}
            <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-emerald-500/5 rounded-full blur-[160px] pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-cyan-500/5 rounded-full blur-[160px] pointer-events-none" />

            <div className="max-w-xl w-full text-center space-y-8 relative z-10">

                {/* Header Gym Branding */}
                <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="space-y-2">
                    <div className="inline-flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 px-4 py-1.5 rounded-full text-emerald-400 text-xs font-black uppercase tracking-[0.3em]">
                        <ShieldCheck size={14} /> Recepción Digital • Check-In
                    </div>
                    <h1 className="text-4xl md:text-5xl font-black text-white italic tracking-tighter uppercase leading-none">
                        {tokenData?.gymName || 'Virtud Gym'}
                    </h1>
                    <p className="text-zinc-400 text-xs font-bold uppercase tracking-widest">
                        Escanea con tu celular para registrar ingreso
                    </p>
                </motion.div>

                {/* Dynamic QR Card Cyber-Elite */}
                <motion.div
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="bg-zinc-900/60 backdrop-blur-3xl border border-white/10 p-8 md:p-12 rounded-[3.5rem] shadow-2xl relative overflow-hidden flex flex-col items-center"
                >
                    {/* Top Glow bar */}
                    <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-emerald-500 via-cyan-500 to-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.5)]" />

                    {/* QR Code Container */}
                    <div className="relative bg-white p-8 rounded-[2.5rem] shadow-2xl border-4 border-emerald-500/30 group mb-8">
                        {/* Scanning beam effect */}
                        <motion.div
                            animate={{ y: ['-100%', '100%'] }}
                            transition={{ repeat: Infinity, duration: 2.5, ease: 'linear' }}
                            className="absolute w-full h-1 left-0 bg-emerald-500/60 shadow-[0_0_15px_rgba(16,185,129,0.8)] z-20 pointer-events-none"
                        />

                        {tokenData?.token ? (
                            <QRCode
                                value={tokenData.token}
                                size={240}
                                className="w-56 h-56 md:w-64 md:h-64 object-contain"
                            />
                        ) : (
                            <div className="w-64 h-64 flex items-center justify-center text-zinc-400">
                                <QrCode size={120} />
                            </div>
                        )}
                    </div>

                    {/* Fallback 6-Digit PIN Display */}
                    <div className="w-full bg-black/40 border border-white/5 rounded-2xl p-4 flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-emerald-500/10 rounded-xl flex items-center justify-center border border-emerald-500/20 text-emerald-400">
                                <KeyRound size={20} />
                            </div>
                            <div className="text-left">
                                <p className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">¿Sin Cámara?</p>
                                <p className="text-xs font-bold text-white uppercase tracking-wider">PIN Backup de 6 Dígitos</p>
                            </div>
                        </div>
                        <div className="bg-emerald-500/20 border border-emerald-500/40 px-5 py-2 rounded-xl text-emerald-400 font-mono text-2xl md:text-3xl font-black tracking-[0.2em]">
                            {tokenData?.pin || '------'}
                        </div>
                    </div>

                    {/* Timer & Expiry */}
                    <div className="mt-8 w-full space-y-3">
                        <div className="flex justify-between items-center text-xs">
                            <span className="text-zinc-500 font-black uppercase tracking-widest flex items-center gap-2">
                                <Clock size={14} className="text-emerald-500" /> Rotación de Código
                            </span>
                            <span className="text-emerald-400 font-mono font-black text-lg">
                                {formatTime(timeLeft)}
                            </span>
                        </div>

                        {/* Progress Bar */}
                        <div className="h-2 w-full bg-black/60 rounded-full overflow-hidden border border-white/5">
                            <motion.div
                                className="h-full bg-gradient-to-r from-emerald-500 to-cyan-400 shadow-[0_0_10px_rgba(16,185,129,0.5)]"
                                initial={{ width: '100%' }}
                                animate={{ width: `${(timeLeft / 300) * 100}%` }}
                                transition={{ duration: 1, ease: 'linear' }}
                            />
                        </div>
                    </div>
                </motion.div>

                {/* Manual Refresh Button */}
                <button
                    onClick={fetchDynamicQR}
                    className="inline-flex items-center gap-2 text-zinc-500 hover:text-white text-xs font-black uppercase tracking-widest transition-colors"
                >
                    <RefreshCw size={14} /> Forzar Actualización
                </button>
            </div>
        </div>
    );
}
