'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, KeyRound, ShieldCheck, CheckCircle2, XCircle, AlertTriangle, ArrowRight, Zap, RefreshCw, Flame } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useTenantNavigation } from '@/hooks/useTenantNavigation';
import { toast } from 'react-hot-toast';

export default function StudentQRPage() {
    const params = useParams();
    const tenantSlug = params?.tenantSlug as string;
    const { tenantHref } = useTenantNavigation();

    const [activeTab, setActiveTab] = useState<'camera' | 'pin'>('camera');
    const [loading, setLoading] = useState(true);
    const [profile, setProfile] = useState<any>(null);

    // PIN Input state
    const [pinInput, setPinInput] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Camera Scan State
    const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
    const [cameraError, setCameraError] = useState<string | null>(null);
    const videoRef = useRef<HTMLVideoElement | null>(null);

    // Check-In Result State
    const [checkInResult, setCheckInResult] = useState<{
        status: 'allowed' | 'denied';
        reason?: string;
        message: string;
        racha?: number;
        puntosGanados?: number;
        deuda?: number;
        member?: any;
    } | null>(null);

    const supabase = createClient();

    // 1. Fetch user profile
    useEffect(() => {
        const fetchProfile = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const { data } = await supabase
                    .from('perfiles')
                    .select('nombre_completo, url_avatar, estado_membresia, exencion_aceptada, parq_firmado')
                    .eq('id', user.id)
                    .single();
                setProfile(data);
            }
            setLoading(false);
        };
        fetchProfile();
    }, [supabase]);

    // 2. Control del Stream de la Cámara
    useEffect(() => {
        if (activeTab !== 'camera' || loading) return;

        let activeStream: MediaStream | null = null;

        const startCamera = async () => {
            try {
                setCameraError(null);
                const stream = await navigator.mediaDevices.getUserMedia({
                    video: { facingMode: 'environment' }
                });
                activeStream = stream;
                setCameraStream(stream);
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                }
            } catch (err: any) {
                console.warn('Error accediendo a la cámara:', err);
                setCameraError('No se pudo acceder a la cámara. Revisa los permisos o usa el PIN de 6 dígitos.');
            }
        };

        startCamera();

        return () => {
            if (activeStream) {
                activeStream.getTracks().forEach(track => track.stop());
            }
        };
    }, [activeTab, loading]);

    // Web Audio Synthesizer para Feedback de Entrada
    const playSoundEffect = (type: 'success' | 'error') => {
        try {
            const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
            const ctx = new AudioCtx();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);

            if (type === 'success') {
                osc.type = 'sine';
                osc.frequency.setValueAtTime(880, ctx.currentTime);
                gain.gain.setValueAtTime(0.1, ctx.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
                osc.start();
                osc.stop(ctx.currentTime + 0.2);
            } else {
                osc.type = 'sawtooth';
                osc.frequency.setValueAtTime(220, ctx.currentTime);
                osc.frequency.linearRampToValueAtTime(110, ctx.currentTime + 0.3);
                gain.gain.setValueAtTime(0.1, ctx.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
                osc.start();
                osc.stop(ctx.currentTime + 0.3);
            }
        } catch (_e) {
            // Audio failopen
        }
    };

    const triggerVibration = (type: 'success' | 'error') => {
        if (typeof window !== 'undefined' && 'vibrate' in navigator) {
            if (type === 'success') {
                navigator.vibrate([100, 50, 100]);
            } else {
                navigator.vibrate([200, 100, 200]);
            }
        }
    };

    // Procesar la solicitud de Check-In
    const submitCheckIn = async (payload: { gymToken?: string; pinCode?: string }) => {
        setIsSubmitting(true);
        try {
            const res = await fetch('/api/student/check-in', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...payload,
                    gymSlug: tenantSlug
                })
            });

            const data = await res.json();
            setCheckInResult(data);

            const isAllowed = data.status === 'allowed';
            playSoundEffect(isAllowed ? 'success' : 'error');
            triggerVibration(isAllowed ? 'success' : 'error');

            if (isAllowed) {
                toast.success('¡Check-in registrado con éxito!');
            } else {
                toast.error(data.message || 'Ingreso denegado');
            }

        } catch (err: any) {
            console.error('Error submitting check-in:', err);
            toast.error('Error al conectar con la central de recepción');
        } finally {
            setIsSubmitting(false);
        }
    };

    // Enviar PIN de 6 dígitos
    const handlePINSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (pinInput.length !== 6) {
            toast.error('El PIN debe contener exactamente 6 dígitos');
            return;
        }
        submitCheckIn({ pinCode: pinInput });
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-[#09090b] flex items-center justify-center p-6 text-white">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
                    <p className="text-zinc-500 font-bold text-xs uppercase tracking-widest animate-pulse">Sincronizando Carnet Digital...</p>
                </div>
            </div>
        );
    }

    const hasMedicalWaiver = Boolean(profile?.exencion_aceptada || profile?.parq_firmado);
    const isMembershipActive = profile?.estado_membresia === 'active';

    return (
        <div className="min-h-screen bg-[#09090b] text-white p-4 md:p-8 relative overflow-hidden font-rajdhani selection:bg-emerald-500/30 pb-32">
            {/* Background Glow */}
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-emerald-500/5 rounded-full blur-[140px] pointer-events-none" />

            <div className="max-w-md mx-auto space-y-8 relative z-10">

                {/* Header */}
                <div className="text-center space-y-2">
                    <div className="inline-flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 px-4 py-1.5 rounded-full text-emerald-400 text-xs font-black uppercase tracking-[0.3em]">
                        <ShieldCheck size={14} /> Escáner de Ingreso Táctico
                    </div>
                    <h1 className="text-4xl font-black italic uppercase tracking-tighter text-white">
                        Ingreso al Gimnasio
                    </h1>
                    <p className="text-zinc-400 text-xs font-bold uppercase tracking-widest">
                        Escanea el QR de Recepción o ingresa el PIN
                    </p>
                </div>

                {/* Tab Switcher */}
                <div className="bg-zinc-900/60 p-1.5 rounded-[2rem] border border-white/5 flex gap-1 backdrop-blur-xl">
                    <button
                        onClick={() => {
                            setActiveTab('camera');
                            setCheckInResult(null);
                        }}
                        className={`flex-1 py-3.5 rounded-[1.6rem] text-xs font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${activeTab === 'camera' ? 'bg-emerald-500 text-white shadow-xl shadow-emerald-500/20' : 'text-zinc-500 hover:text-white'}`}
                    >
                        <Camera size={16} /> Cámara
                    </button>
                    <button
                        onClick={() => {
                            setActiveTab('pin');
                            setCheckInResult(null);
                        }}
                        className={`flex-1 py-3.5 rounded-[1.6rem] text-xs font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${activeTab === 'pin' ? 'bg-emerald-500 text-white shadow-xl shadow-emerald-500/20' : 'text-zinc-500 hover:text-white'}`}
                    >
                        <KeyRound size={16} /> PIN (6 Dígitos)
                    </button>
                </div>

                {/* Main Card */}
                <div className="bg-zinc-900/50 rounded-[3rem] border border-white/10 p-8 shadow-2xl relative overflow-hidden backdrop-blur-3xl">

                    {/* User Mini Profile Header */}
                    <div className="flex items-center gap-4 mb-8 pb-6 border-b border-white/5">
                        <div className="w-14 h-14 rounded-full bg-white/5 border-2 border-white/20 overflow-hidden flex items-center justify-center shrink-0 relative">
                            {profile?.url_avatar ? (
                                <Image src={profile.url_avatar} alt="Avatar" fill className="object-cover" />
                            ) : (
                                <span className="text-xl font-black text-white/50">{profile?.nombre_completo?.[0] || 'V'}</span>
                            )}
                        </div>
                        <div className="min-w-0 flex-1">
                            <h3 className="text-lg font-black text-white truncate">{profile?.nombre_completo || 'Usuario VIRTUD'}</h3>
                            <div className="flex items-center gap-2 mt-1">
                                <span className={`inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full ${isMembershipActive ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-red-500/20 text-red-400 border border-red-500/30'}`}>
                                    {isMembershipActive ? 'Membresía Activa' : 'Inactiva'}
                                </span>
                                {hasMedicalWaiver && (
                                    <span className="text-[9px] font-black uppercase tracking-widest bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 px-2 py-0.5 rounded-full">
                                        PAR-Q OK
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* TAB 1: CAMERA SCANNER */}
                    {activeTab === 'camera' && (
                        <div className="space-y-6">
                            <div className="relative w-full aspect-square bg-black rounded-[2.5rem] border-4 border-white/10 overflow-hidden flex items-center justify-center">
                                {cameraError ? (
                                    <div className="p-6 text-center space-y-4">
                                        <AlertTriangle size={48} className="text-amber-500 mx-auto" />
                                        <p className="text-xs text-zinc-400 font-bold">{cameraError}</p>
                                        <button
                                            onClick={() => setActiveTab('pin')}
                                            className="px-6 py-3 bg-emerald-500 text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-lg shadow-emerald-500/20"
                                        >
                                            Usar PIN de 6 Dígitos
                                        </button>
                                    </div>
                                ) : (
                                    <>
                                        <video
                                            ref={videoRef}
                                            autoPlay
                                            playsInline
                                            muted
                                            className="w-full h-full object-cover"
                                        />

                                        {/* Cyber Scanning Overlay */}
                                        <div className="absolute inset-0 border-[12px] border-black/40 pointer-events-none" />
                                        <motion.div
                                            animate={{ y: ['-100%', '100%'] }}
                                            transition={{ repeat: Infinity, duration: 2, ease: 'linear' }}
                                            className="absolute w-full h-1 bg-emerald-500/80 shadow-[0_0_20px_rgba(16,185,129,0.9)] z-20 pointer-events-none"
                                        />
                                        <div className="absolute inset-12 border-2 border-dashed border-emerald-500/50 rounded-3xl pointer-events-none flex items-center justify-center">
                                            <span className="text-[9px] font-black text-emerald-400/60 uppercase tracking-[0.4em] bg-black/60 px-3 py-1 rounded-full">
                                                Apunta al QR de Recepción
                                            </span>
                                        </div>
                                    </>
                                )}
                            </div>

                            <p className="text-center text-[10px] text-zinc-500 font-black uppercase tracking-widest">
                                Posiciona la cámara frente a la pantalla de recepción del gimnasio
                            </p>
                        </div>
                    )}

                    {/* TAB 2: PIN INPUT FALLBACK */}
                    {activeTab === 'pin' && (
                        <form onSubmit={handlePINSubmit} className="space-y-6">
                            <div className="space-y-2 text-center">
                                <label className="text-xs font-black text-emerald-400 uppercase tracking-widest">
                                    PIN Dinámico del Gimnasio
                                </label>
                                <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">
                                    Copia los 6 números que se muestran debajo del QR de recepción
                                </p>
                            </div>

                            <input
                                type="text"
                                maxLength={6}
                                value={pinInput}
                                onChange={(e) => setPinInput(e.target.value.replace(/\D/g, ''))}
                                placeholder="000 000"
                                className="w-full py-5 bg-black rounded-3xl text-center text-4xl font-mono font-black text-emerald-400 tracking-[0.4em] focus:outline-none focus:ring-4 focus:ring-emerald-500/20 border border-white/10 transition-all placeholder:text-zinc-800"
                                autoFocus
                            />

                            <button
                                type="submit"
                                disabled={isSubmitting || pinInput.length !== 6}
                                className="w-full py-5 bg-emerald-500 hover:bg-emerald-400 text-white font-black rounded-2xl text-xs uppercase italic tracking-[0.2em] shadow-xl shadow-emerald-500/20 transition-all disabled:opacity-30"
                            >
                                {isSubmitting ? 'VALIDANDO...' : 'REGISTRAR INGRESO ➜'}
                            </button>
                        </form>
                    )}
                </div>

                {/* RESULT MODAL CYBER-ELITE */}
                <AnimatePresence>
                    {checkInResult && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 bg-black/90 backdrop-blur-2xl z-50 flex items-center justify-center p-6"
                        >
                            <motion.div
                                initial={{ scale: 0.8, y: 30 }}
                                animate={{ scale: 1, y: 0 }}
                                exit={{ scale: 0.8, y: 30 }}
                                className={`w-full max-w-md p-10 rounded-[3.5rem] border text-center shadow-2xl relative overflow-hidden ${checkInResult.status === 'allowed' ? 'bg-emerald-950/40 border-emerald-500/40 shadow-emerald-500/10' : 'bg-red-950/40 border-red-500/40 shadow-red-500/10'}`}
                            >
                                {/* Glow Bar */}
                                <div className={`absolute top-0 left-0 w-full h-2 ${checkInResult.status === 'allowed' ? 'bg-emerald-500' : 'bg-red-500'}`} />

                                <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 text-white shadow-xl ${checkInResult.status === 'allowed' ? 'bg-emerald-500 shadow-emerald-500/30' : 'bg-red-500 shadow-red-500/30'}`}>
                                    {checkInResult.status === 'allowed' ? <CheckCircle2 size={48} /> : <XCircle size={48} />}
                                </div>

                                <h2 className="text-4xl font-black italic uppercase tracking-tighter text-white mb-2">
                                    {checkInResult.message}
                                </h2>

                                {checkInResult.status === 'allowed' ? (
                                    <div className="space-y-6 my-6">
                                        <div className="bg-black/40 border border-emerald-500/20 p-6 rounded-3xl flex items-center justify-around">
                                            <div className="text-center">
                                                <p className="text-[9px] font-black text-zinc-500 uppercase tracking-widest mb-1">Racha Fuego</p>
                                                <p className="text-2xl font-black text-orange-500 italic flex items-center justify-center gap-1">
                                                    <Flame size={20} className="fill-orange-500" /> {checkInResult.racha || 1} Días
                                                </p>
                                            </div>
                                            <div className="w-px h-10 bg-white/10" />
                                            <div className="text-center">
                                                <p className="text-[9px] font-black text-zinc-500 uppercase tracking-widest mb-1">XP Ganada</p>
                                                <p className="text-2xl font-black text-emerald-400 italic">
                                                    +{checkInResult.puntosGanados || 50} PTS
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="my-6 p-6 bg-black/40 border border-red-500/20 rounded-3xl space-y-4">
                                        <p className="text-xs font-bold text-red-300">
                                            {checkInResult.reason === 'medico' && 'Debes completar tu Apto Médico (PAR-Q) digital para habilitar el ingreso.'}
                                            {checkInResult.reason === 'inactive' && 'Tu membresía se encuentra vencida o inactiva.'}
                                            {checkInResult.reason === 'deuda' && `Posees un saldo pendiente de $${checkInResult.deuda?.toLocaleString('es-AR')}.`}
                                            {checkInResult.reason === 'passback' && 'Ya registraste tu ingreso en los últimos 15 minutos.'}
                                        </p>

                                        {checkInResult.reason === 'medico' && (
                                            <Link href={tenantHref('/member/dashboard/profile/parq')}>
                                                <button className="w-full py-4 bg-emerald-500 text-white font-black rounded-2xl text-xs uppercase tracking-widest shadow-lg shadow-emerald-500/20">
                                                    Firmar PAR-Q Digital Ahora ➜
                                                </button>
                                            </Link>
                                        )}

                                        {checkInResult.reason === 'inactive' && (
                                            <Link href={tenantHref('/member/dashboard/payments')}>
                                                <button className="w-full py-4 bg-red-500 text-white font-black rounded-2xl text-xs uppercase tracking-widest shadow-lg shadow-red-500/20">
                                                    Renovar Membresía Ahora ➜
                                                </button>
                                            </Link>
                                        )}
                                    </div>
                                )}

                                <button
                                    onClick={() => setCheckInResult(null)}
                                    className="w-full py-4 bg-white/10 hover:bg-white/20 text-white font-black rounded-2xl text-xs uppercase tracking-widest border border-white/10 transition-colors"
                                >
                                    Cerrar
                                </button>
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}
