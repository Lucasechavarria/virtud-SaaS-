'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    QrCode,
    CheckCircle,
    XCircle,
    ScanLine,
    User,
    AlertTriangle,
    ArrowRight
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

// Mock DB Returns
const MOCK_SCANS: Record<string, any> = {
    'valid-qr-123': {
        status: 'allowed',
        member: { nombre: 'Carlos Ruiz', avatar: 'https://images.unsplash.com/photo-1599566150163-29194dcaad36?auto=format&fit=crop&q=80&w=200', plan: 'Plan Pro' },
        message: 'Acceso Autorizado',
        racha: 12
    },
    'invalid-deuda-456': {
        status: 'denied',
        reason: 'deuda',
        member: { nombre: 'Ana Gómez', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=200', plan: 'Plan Básico' },
        message: 'Cuota Vencida',
        deuda: 12000
    },
    'invalid-medico-789': {
        status: 'denied',
        reason: 'medico',
        member: { nombre: 'Luis Torres', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=200', plan: 'Plan Pro' },
        message: 'Falta Apto Médico (PAR-Q)',
    }
};

export default function QRAccessPage() {
    const [scanData, setScanData] = useState('');
    const [lastScanResult, setLastScanResult] = useState<any>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const [flashColor, setFlashColor] = useState<'neutral' | 'success' | 'error'>('neutral');

    // Keep focus on hidden input to catch USB Scanner emulated keystrokes
    useEffect(() => {
        const focusInput = () => {
            if (inputRef.current) {
                inputRef.current.focus();
            }
        };

        focusInput();
        const intervalId = setInterval(focusInput, 2000); // Re-focus periodically

        return () => clearInterval(intervalId);
    }, []);

    // Also refocus on click anywhere
    useEffect(() => {
        const handleClick = () => inputRef.current?.focus();
        window.addEventListener('click', handleClick);
        return () => window.removeEventListener('click', handleClick);
    }, []);

    // Auto-clear result after 5 seconds to be ready for next person
    useEffect(() => {
        let timeout: ReturnType<typeof setTimeout>;
        if (lastScanResult) {
            timeout = setTimeout(() => {
                setLastScanResult(null);
                setFlashColor('neutral');
            }, 6000);
        }
        return () => clearTimeout(timeout);
    }, [lastScanResult]);

    const handleScan = (e: React.FormEvent) => {
        e.preventDefault();
        if (!scanData.trim()) return;

        // Simulate API verification
        const result = MOCK_SCANS[scanData.trim()] || null;

        if (result) {
            setLastScanResult(result);
            setFlashColor(result.status === 'allowed' ? 'success' : 'error');
        } else {
            setLastScanResult({ status: 'denied', reason: 'unknown', message: 'QR Inválido o Expirado' });
            setFlashColor('error');
        }

        setScanData(''); // Clear input for next scan
    };

    return (
        <div className={`flex flex-col h-[calc(100vh-8rem)] rounded-[2rem] border overflow-hidden relative transition-colors duration-500
            ${flashColor === 'neutral' ? 'bg-[#1c1c1e] border-white/5' :
                flashColor === 'success' ? 'bg-emerald-950/40 border-emerald-500/50' :
                    'bg-red-950/40 border-red-500/50'}`}
        >
            {/* Hidden Input for Physical USB Scanner Emulation */}
            <form onSubmit={handleScan} className="absolute opacity-0 pointer-events-none">
                <input
                    ref={inputRef}
                    type="text"
                    value={scanData}
                    onChange={(e) => setScanData(e.target.value)}
                    autoFocus
                />
            </form>

            {/* Test Controls (Only for development MVP) */}
            <div className="absolute top-4 left-4 flex gap-2 z-50 opacity-20 hover:opacity-100 transition-opacity">
                <button onClick={() => { setScanData('valid-qr-123'); setTimeout(() => handleScan({ preventDefault: () => { } } as any), 10); }} className="bg-emerald-500/20 text-emerald-500 text-xs px-2 py-1 rounded">Test OK</button>
                <button onClick={() => { setScanData('invalid-deuda-456'); setTimeout(() => handleScan({ preventDefault: () => { } } as any), 10); }} className="bg-red-500/20 text-red-500 text-xs px-2 py-1 rounded">Test Deuda</button>
                <button onClick={() => { setScanData('invalid-medico-789'); setTimeout(() => handleScan({ preventDefault: () => { } } as any), 10); }} className="bg-orange-500/20 text-orange-500 text-xs px-2 py-1 rounded">Test Médico</button>
                <button onClick={() => { setScanData('random-xxx'); setTimeout(() => handleScan({ preventDefault: () => { } } as any), 10); }} className="bg-gray-500/20 text-gray-500 text-xs px-2 py-1 rounded">Test Fail</button>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 flex items-center justify-center p-8">
                <AnimatePresence mode="wait">

                    {/* IDLE STATE */}
                    {!lastScanResult && (
                        <motion.div
                            key="idle"
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 1.1 }}
                            className="flex flex-col items-center justify-center text-center max-w-md"
                        >
                            <div className="relative w-48 h-48 mb-8 border-4 border-dashed border-white/20 rounded-[3rem] flex items-center justify-center overflow-hidden">
                                <motion.div
                                    animate={{
                                        y: ['-100%', '100%'],
                                    }}
                                    transition={{
                                        repeat: Infinity,
                                        duration: 2,
                                        ease: "linear"
                                    }}
                                    className="absolute w-full h-1 bg-emerald-500/50 shadow-[0_0_20px_rgba(16,185,129,0.5)] z-10"
                                />
                                <QrCode size={64} className="text-white/20" />
                            </div>
                            <h1 className="text-4xl font-black italic text-white uppercase tracking-tighter mb-4">Listo para Escanear</h1>
                            <p className="text-gray-400 font-medium">Acerque el código QR del alumno al lector para validar su ingreso.</p>

                            <div className="mt-12 flex items-center justify-center gap-2 text-white/40 animate-pulse">
                                <ScanLine />
                                <span className="text-sm font-black uppercase tracking-widest">Lector Activo</span>
                            </div>
                        </motion.div>
                    )}

                    {/* SUCCESS STATE */}
                    {lastScanResult?.status === 'allowed' && (
                        <motion.div
                            key="success"
                            initial={{ opacity: 0, scale: 0.5, y: 50 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: -50 }}
                            className="bg-emerald-500/10 border-2 border-emerald-500/30 p-10 rounded-[3rem] w-full max-w-2xl text-center shadow-[0_0_100px_rgba(16,185,129,0.15)] relative overflow-hidden"
                        >
                            <div className="absolute top-0 left-0 w-full h-2 bg-emerald-500" />

                            <motion.div
                                initial={{ scale: 0 }} animate={{ scale: 1 }}
                                transition={{ type: 'spring', damping: 12, delay: 0.1 }}
                                className="w-24 h-24 bg-emerald-500 rounded-full flex items-center justify-center mx-auto mb-8 shadow-xl shadow-emerald-500/20 text-white"
                            >
                                <CheckCircle size={48} />
                            </motion.div>

                            <h2 className="text-5xl font-black text-white italic uppercase tracking-tighter mb-2">{lastScanResult.message}</h2>
                            <p className="text-emerald-400 font-bold text-xl uppercase tracking-widest mb-10">Ingreso Registrado</p>

                            <div className="flex items-center bg-black/40 rounded-2xl p-6 border border-emerald-500/20 text-left gap-6">
                                <div className="w-24 h-24 rounded-2xl bg-white/5 border border-white/10 overflow-hidden relative shrink-0">
                                    <Image src={lastScanResult.member.avatar} alt={lastScanResult.member.nombre} fill className="object-cover" />
                                </div>
                                <div>
                                    <p className="text-gray-400 text-xs font-black uppercase tracking-widest mb-1">{lastScanResult.member.plan}</p>
                                    <h3 className="text-3xl font-black text-white">{lastScanResult.member.nombre}</h3>
                                    <div className="mt-3 inline-flex items-center gap-2 bg-white/5 px-3 py-1.5 rounded-lg border border-white/5">
                                        <span className="text-xs font-bold text-gray-400">🔥 Racha Actual:</span>
                                        <span className="text-orange-500 font-black italic">{lastScanResult.racha} Días</span>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {/* DENIED STATE */}
                    {lastScanResult?.status === 'denied' && (
                        <motion.div
                            key="denied"
                            initial={{ opacity: 0, scale: 0.5, y: 50 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: -50 }}
                            className="bg-red-950/30 border-2 border-red-500/30 p-10 rounded-[3rem] w-full max-w-2xl text-center shadow-[0_0_100px_rgba(239,68,68,0.15)] relative overflow-hidden"
                        >
                            <div className="absolute top-0 left-0 w-full h-2 bg-red-500" />

                            <motion.div
                                initial={{ scale: 0 }} animate={{ scale: 1 }}
                                transition={{ type: 'spring', damping: 12, delay: 0.1 }}
                                className="w-24 h-24 bg-red-500 rounded-full flex items-center justify-center mx-auto mb-8 shadow-xl shadow-red-500/20 text-white"
                            >
                                <XCircle size={48} />
                            </motion.div>

                            <h2 className="text-5xl font-black text-white italic uppercase tracking-tighter mb-2">Acceso Denegado</h2>
                            <p className="text-red-400 font-bold text-xl uppercase tracking-widest mb-10 flex items-center justify-center gap-2">
                                <AlertTriangle size={24} />
                                {lastScanResult.message}
                            </p>

                            {lastScanResult.member && (
                                <div className="flex items-center justify-between bg-black/40 rounded-2xl p-6 border border-red-500/20 text-left gap-6 mb-8">
                                    <div className="flex items-center gap-4">
                                        <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 overflow-hidden relative shrink-0">
                                            {lastScanResult.member.avatar ? (
                                                <Image src={lastScanResult.member.avatar} alt={lastScanResult.member.nombre} fill className="object-cover grayscale" />
                                            ) : (
                                                <User className="m-auto mt-4 text-white/20" />
                                            )}
                                        </div>
                                        <div>
                                            <p className="text-gray-400 text-[10px] font-black uppercase tracking-widest mb-1">{lastScanResult.member.plan}</p>
                                            <h3 className="text-2xl font-black text-white">{lastScanResult.member.nombre}</h3>
                                        </div>
                                    </div>

                                    {lastScanResult.reason === 'deuda' && (
                                        <div className="text-right">
                                            <p className="text-red-500 text-sm font-black uppercase tracking-widest">Monto Adeudado</p>
                                            <p className="text-3xl text-white font-black italic tracking-tighter">${lastScanResult.deuda?.toLocaleString('es-AR')}</p>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Acciones para Denegado */}
                            {lastScanResult.reason === 'deuda' && (
                                <Link href="/admin/recepcion/pos">
                                    <motion.button
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                        className="w-full bg-white text-black hover:bg-gray-200 font-black italic uppercase tracking-widest py-5 rounded-2xl flex items-center justify-center gap-3 transition-colors shadow-xl shadow-white/10"
                                    >
                                        Ir al Cajas (POS) para Cobrar <ArrowRight />
                                    </motion.button>
                                </Link>
                            )}

                            {lastScanResult.reason === 'medico' && (
                                <Link href="/admin/users">
                                    <motion.button
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                        className="w-full bg-white text-black hover:bg-gray-200 font-black italic uppercase tracking-widest py-5 rounded-2xl flex items-center justify-center gap-3 transition-colors shadow-xl shadow-white/10"
                                    >
                                        Actualizar Perfil (Firma PAR-Q) <ArrowRight />
                                    </motion.button>
                                </Link>
                            )}
                        </motion.div>
                    )}

                </AnimatePresence>
            </div>
        </div>
    );
}
