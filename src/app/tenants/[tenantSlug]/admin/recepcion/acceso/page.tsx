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
    ArrowRight,
    Search,
    Loader2,
    X,
    ChevronRight
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';

export default function QRAccessPage() {
    const params = useParams();
    const tenantSlug = params?.tenantSlug as string;
    const getTenantLink = (href: string) => {
        return tenantSlug ? `/${tenantSlug}${href}` : href;
    };

    const [scanData, setScanData] = useState('');
    const [lastScanResult, setLastScanResult] = useState<any>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const [flashColor, setFlashColor] = useState<'neutral' | 'success' | 'error'>('neutral');
    const [recentScans, setRecentScans] = useState<any[]>([]);

    // Estados de Ingreso Excepcional (Bypass)
    const [showBypassModal, setShowBypassModal] = useState(false);
    const [bypassJustification, setBypassJustification] = useState('');
    const [submittingBypass, setSubmittingBypass] = useState(false);

    // Estados de Búsqueda Manual
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [searching, setSearching] = useState(false);
    const [isManualSearching, setIsManualSearching] = useState(false);

    // Web Audio API Synthesizers for premium local audio cues without network dependencies
    const playSuccessSound = () => {
        try {
            const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
            const ctx = new AudioContextClass();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            
            osc.type = 'sine';
            osc.frequency.setValueAtTime(880, ctx.currentTime); // High pitch A5 note
            gain.gain.setValueAtTime(0.08, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
            
            osc.start();
            osc.stop(ctx.currentTime + 0.15);
        } catch (e) {
            console.warn('AudioContext blocked or unsupported', e);
        }
    };

    const playErrorSound = () => {
        try {
            const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
            const ctx = new AudioContextClass();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(220, ctx.currentTime); // Low pitch sawtooth
            osc.frequency.linearRampToValueAtTime(110, ctx.currentTime + 0.35); // Dramatic pitch drop
            gain.gain.setValueAtTime(0.08, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
            
            osc.start();
            osc.stop(ctx.currentTime + 0.35);
        } catch (e) {
            console.warn('AudioContext blocked or unsupported', e);
        }
    };

    // Keep focus on hidden input to catch USB Scanner emulated keystrokes
    useEffect(() => {
        const focusInput = () => {
            if (inputRef.current) {
                // Only refocus if the modal and manual search are not active to avoid focus hijacking
                if (!showBypassModal && !isManualSearching) {
                    inputRef.current.focus();
                }
            }
        };

        focusInput();
        const intervalId = setInterval(focusInput, 2000); // Re-focus periodically

        return () => clearInterval(intervalId);
    }, [showBypassModal, isManualSearching]);

    // Also refocus on click anywhere (if modal and manual search are not active)
    useEffect(() => {
        const handleClick = (e: MouseEvent) => {
            // Evitar redirigir el foco si se hace clic dentro del buscador manual
            const searchEl = document.getElementById('manual-search-container');
            if (searchEl && searchEl.contains(e.target as Node)) {
                return;
            }
            if (!showBypassModal && !isManualSearching) {
                inputRef.current?.focus();
            }
        };
        window.addEventListener('click', handleClick);
        return () => window.removeEventListener('click', handleClick);
    }, [showBypassModal, isManualSearching]);

    // Auto-clear result after 6 seconds to be ready for next person
    useEffect(() => {
        let timeout: ReturnType<typeof setTimeout>;
        if (lastScanResult && lastScanResult.status === 'allowed' && !showBypassModal) {
            timeout = setTimeout(() => {
                setLastScanResult(null);
                setFlashColor('neutral');
            }, 6000);
        }
        return () => clearTimeout(timeout);
    }, [lastScanResult, showBypassModal]);

    // Suscripción Realtime (WebSockets) a la tabla de asistencias
    useEffect(() => {
        if (!tenantSlug) return;

        const channel = supabase
            .channel('reception_asistencias_realtime')
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'asistencias' },
                async (payload) => {
                    const newAsistencia = payload.new;
                    if (!newAsistencia || !newAsistencia.usuario_id) return;

                    // Consultar los datos del alumno y su gimnasio (para filtrar multitenant)
                    const { data: student, error: studentError } = await (supabase.from('perfiles') as any)
                        .select(`
                            id,
                            nombre,
                            apellido,
                            nombre_completo,
                            url_avatar,
                            gimnasio_id,
                            gimnasios(slug),
                            plan_id
                        `)
                        .eq('id', newAsistencia.usuario_id)
                        .single();

                    if (studentError || !student) return;

                    const activeGymSlug = student.gimnasios?.slug || student.gimnasio_id;
                    if (activeGymSlug !== tenantSlug) return; // Filtro perimetral del gimnasio actual

                    let planName = 'Sin Plan';
                    if (student.plan_id) {
                        const { data: planData } = await (supabase.from('planes_gimnasio') as any)
                            .select('nombre')
                            .eq('id', student.plan_id)
                            .single();
                        if (planData) planName = planData.nombre;
                    }

                    // Evitar duplicar si se originó en esta misma pestaña hace poco
                    let isDuplicate = false;
                    setRecentScans((prev) => {
                        isDuplicate = prev.some(scan => 
                            scan.member?.id === student.id && 
                            Math.abs(Date.now() - new Date(newAsistencia.entrada).getTime()) < 3000
                        );
                        if (isDuplicate) return prev;

                        const timeNow = new Date(newAsistencia.entrada).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
                        playSuccessSound();

                        // Mostrar el ingreso exitoso en grande
                        setLastScanResult({
                            status: 'allowed',
                            message: newAsistencia.source === 'reception_bypass' ? 'Ingreso Autorizado por Excepción' : 'Acceso Autorizado',
                            racha: 1, // Fallback
                            member: {
                                id: student.id,
                                nombre: student.nombre_completo || `${student.nombre || ''} ${student.apellido || ''}`.trim(),
                                avatar: student.url_avatar,
                                plan: planName
                            }
                        });
                        setFlashColor('success');

                        const scanResult = {
                            id: newAsistencia.id,
                            status: 'allowed',
                            message: newAsistencia.source === 'reception_bypass' ? 'Ingreso Excepcional' : 'Acceso Permitido',
                            reason: newAsistencia.source,
                            timestamp: timeNow,
                            member: {
                                id: student.id,
                                nombre: student.nombre_completo || `${student.nombre || ''} ${student.apellido || ''}`.trim(),
                                avatar: student.url_avatar,
                                plan: planName
                            }
                        };

                        return [scanResult, ...prev].slice(0, 5);
                    });
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [tenantSlug]);

    // Efecto para buscar alumnos con debounce
    useEffect(() => {
        if (!searchQuery.trim()) {
            setSearchResults([]);
            return;
        }

        const delayDebounce = setTimeout(async () => {
            setSearching(true);
            try {
                // Buscar alumnos pertenecientes al gimnasio actual
                const { data, error } = await supabase
                    .from('perfiles')
                    .select('id, nombre_completo, nombre, apellido, correo, dni, url_avatar, estado_membresia')
                    .eq('gimnasio_id', tenantSlug)
                    .or(`nombre_completo.ilike.%${searchQuery}%,correo.ilike.%${searchQuery}%,dni.ilike.%${searchQuery}%`)
                    .limit(10);

                if (error) throw error;
                setSearchResults(data || []);
            } catch (err) {
                console.error('Error al buscar alumnos:', err);
            } finally {
                setSearching(false);
            }
        }, 300);

        return () => clearTimeout(delayDebounce);
    }, [searchQuery, tenantSlug]);

    // Check-in manual por ID de alumno
    const handleManualCheckIn = async (studentId: string) => {
        setFlashColor('neutral');
        setLastScanResult(null);
        
        let result: any = null;
        try {
            const res = await fetch('/api/access/validate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ socioId: studentId })
            });

            if (!res.ok) {
                result = { status: 'denied', reason: 'unknown', message: 'Error al conectar con el servidor' };
            } else {
                result = await res.json();
            }
        } catch (_err) {
            result = { status: 'denied', reason: 'unknown', message: 'Error de red' };
        }

        setLastScanResult(result);
        const isSuccess = result.status === 'allowed';
        setFlashColor(isSuccess ? 'success' : 'error');

        // Reproducir sonidos de feedback
        if (isSuccess) {
            playSuccessSound();
        } else {
            playErrorSound();
        }

        // Agregar al historial local
        if (result.member) {
            const timeNow = new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
            const newScan = {
                id: `${Date.now()}-${Math.random()}`,
                status: result.status,
                message: result.message,
                reason: result.reason || 'reception_manual',
                deuda: result.deuda,
                timestamp: timeNow,
                member: {
                    id: result.member.id,
                    nombre: result.member.nombre,
                    avatar: result.member.avatar,
                    plan: result.member.plan
                }
            };
            setRecentScans(prev => [newScan, ...prev].slice(0, 5));
        }
    };

    const handleScan = async (e: React.FormEvent) => {
        e.preventDefault();
        const tokenVal = scanData.trim();
        if (!tokenVal) return;

        let result: any = null;
        try {
            const res = await fetch('/api/access/validate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token: tokenVal })
            });

            if (!res.ok) {
                result = { status: 'denied', reason: 'unknown', message: 'Error al conectar con el servidor' };
            } else {
                result = await res.json();
            }
        } catch (_err) {
            result = { status: 'denied', reason: 'unknown', message: 'Error de red' };
        }

        setLastScanResult(result);
        const isSuccess = result.status === 'allowed';
        setFlashColor(isSuccess ? 'success' : 'error');

        // Play feedback sounds
        if (isSuccess) {
            playSuccessSound();
        } else {
            playErrorSound();
        }

        // Prepend to recent scans list if it was a success (for dynamic history)
        if (result.member) {
            const timeNow = new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
            const newScan = {
                id: `${Date.now()}-${Math.random()}`,
                status: result.status,
                message: result.message,
                reason: result.reason,
                deuda: result.deuda,
                timestamp: timeNow,
                member: {
                    id: result.member.id,
                    nombre: result.member.nombre,
                    avatar: result.member.avatar,
                    plan: result.member.plan
                }
            };
            setRecentScans(prev => [newScan, ...prev].slice(0, 5));
        }

        setScanData(''); // Clear input for next scan
    };

    // Procesar la autorización de ingreso excepcional (Bypass)
    const handleBypassSubmit = async () => {
        const studentId = lastScanResult?.member?.id;
        if (!studentId || bypassJustification.trim().length < 6) return;

        try {
            setSubmittingBypass(true);
            const res = await fetch('/api/admin/reception/exceptional-access', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    socioId: studentId,
                    motivo: bypassJustification.trim()
                })
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || 'Error al autorizar ingreso');
            }

            // Éxito: actualizamos UI de forma local e instantánea (aunque el canal Realtime también lo capte)
            playSuccessSound();
            
            const autorizadosMsg = 'Ingreso Autorizado por Excepción';
            
            setLastScanResult((prev: any) => ({
                ...prev,
                status: 'allowed',
                message: autorizadosMsg
            }));
            setFlashColor('success');

            const timeNow = new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
            
            // Reemplazar o agregar el escaneo permitido en el historial local
            setRecentScans(prev => {
                const newScan = {
                    id: `${Date.now()}-${Math.random()}`,
                    status: 'allowed',
                    message: autorizadosMsg,
                    reason: 'reception_bypass',
                    timestamp: timeNow,
                    member: lastScanResult.member ? {
                        id: lastScanResult.member.id,
                        nombre: lastScanResult.member.nombre,
                        avatar: lastScanResult.member.avatar,
                        plan: 'Ingreso Excepcional'
                    } : null
                };
                return [newScan, ...prev].slice(0, 5);
            });

            setShowBypassModal(false);
            setBypassJustification('');

        } catch (error: any) {
            console.error('Error al enviar bypass:', error);
            alert(error.message || 'Error inesperado al autorizar el ingreso');
        } finally {
            setSubmittingBypass(false);
        }
    };

    return (
        <div className="flex flex-col lg:flex-row h-[calc(100vh-8rem)] gap-6 text-white overflow-hidden relative">
            
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

            {/* SECCIÓN IZQUIERDA: LECTOR Y RESULTADO GIGANTE */}
            <div className={`flex-1 flex flex-col rounded-[2rem] border overflow-hidden relative transition-colors duration-500
                ${flashColor === 'neutral' ? 'bg-[#1c1c1e] border-white/5' :
                    flashColor === 'success' ? 'bg-emerald-950/40 border-emerald-500/50' :
                        'bg-red-950/40 border-red-500/50'}`}
            >
                {/* Buscador Manual de Alumnos */}
                <div id="manual-search-container" className="p-4 border-b border-white/5 bg-black/20 relative z-40">
                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                            <Search size={18} />
                        </div>
                        <input
                            type="text"
                            placeholder="Buscar alumno manualmente por Nombre, Email o DNI..."
                            value={searchQuery}
                            onChange={(e) => {
                                setSearchQuery(e.target.value);
                                if (e.target.value) {
                                    setIsManualSearching(true);
                                } else {
                                    setIsManualSearching(false);
                                }
                            }}
                            onFocus={() => setIsManualSearching(true)}
                            onBlur={() => {
                                // Retraso leve para registrar click en los resultados
                                setTimeout(() => setIsManualSearching(false), 200);
                            }}
                            className="w-full pl-10 pr-10 py-3 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder-gray-400 focus:outline-none focus:border-emerald-500 transition-colors"
                        />
                        {searching && (
                            <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none">
                                <Loader2 className="animate-spin text-emerald-500" size={18} />
                            </div>
                        )}
                        {!searching && searchQuery && (
                            <button
                                onClick={() => {
                                    setSearchQuery('');
                                    setSearchResults([]);
                                    setIsManualSearching(false);
                                }}
                                className="absolute inset-y-0 right-3 flex items-center text-gray-400 hover:text-white"
                            >
                                <X size={18} />
                            </button>
                        )}
                    </div>

                    {/* Resultados del Buscador */}
                    <AnimatePresence>
                        {isManualSearching && searchResults.length > 0 && (
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: 10 }}
                                className="absolute left-4 right-4 mt-2 bg-[#1c1c1e] border border-white/10 rounded-xl shadow-2xl overflow-hidden z-50 max-h-60 overflow-y-auto"
                            >
                                {searchResults.map((m) => {
                                    const name = m.nombre_completo || `${m.nombre || ''} ${m.apellido || ''}`.trim() || m.correo;
                                    const isActive = m.estado_membresia === 'active';
                                    return (
                                        <button
                                            key={m.id}
                                            onClick={() => {
                                                handleManualCheckIn(m.id);
                                                setSearchQuery('');
                                                setSearchResults([]);
                                                setIsManualSearching(false);
                                            }}
                                            className="w-full px-4 py-3 flex items-center gap-3 hover:bg-white/5 transition-colors text-left border-b border-white/5 last:border-b-0"
                                        >
                                            <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 overflow-hidden relative shrink-0">
                                                {m.url_avatar ? (
                                                    <Image src={m.url_avatar} alt={name} width={32} height={32} className="object-cover w-full h-full" />
                                                ) : (
                                                    <User className="m-auto mt-1.5 text-white/20" size={16} />
                                                )}
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-bold text-sm text-white truncate">{name}</span>
                                                    <span className={`w-2 h-2 rounded-full shrink-0 ${isActive ? 'bg-emerald-500' : 'bg-red-500'}`} />
                                                </div>
                                                <p className="text-[10px] text-gray-400 truncate">DNI: {m.dni || 'Sin DNI'} | {m.correo}</p>
                                            </div>
                                            <div className="shrink-0 text-gray-500">
                                                <ChevronRight size={16} />
                                            </div>
                                        </button>
                                    );
                                })}
                            </motion.div>
                        )}
                        {isManualSearching && searchQuery.trim().length >= 2 && searchResults.length === 0 && !searching && (
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: 10 }}
                                className="absolute left-4 right-4 mt-2 bg-[#1c1c1e] border border-white/10 rounded-xl shadow-2xl p-4 text-center text-xs text-gray-400 z-50"
                            >
                                No se encontraron alumnos para "{searchQuery}"
                            </motion.div>
                        )}
                    </AnimatePresence>
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
                                <button
                                    onClick={() => {
                                        setLastScanResult(null);
                                        setFlashColor('neutral');
                                    }}
                                    className="absolute top-4 right-4 p-2 rounded-full hover:bg-white/10 text-white/50 hover:text-white transition-colors z-30"
                                    title="Limpiar pantalla"
                                >
                                    <X size={20} />
                                </button>

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
                                        {lastScanResult.member?.avatar ? (
                                            <Image src={lastScanResult.member.avatar} alt={lastScanResult.member.nombre} fill className="object-cover" />
                                        ) : (
                                            <User className="m-auto mt-6 text-white/20" size={48} />
                                        )}
                                    </div>
                                    <div>
                                        <p className="text-gray-400 text-xs font-black uppercase tracking-widest mb-1">{lastScanResult.member.plan}</p>
                                        <h3 className="text-3xl font-black text-white">{lastScanResult.member.nombre}</h3>
                                        <div className="mt-3 inline-flex items-center gap-2 bg-white/5 px-3 py-1.5 rounded-lg border border-white/5">
                                            <span className="text-xs font-bold text-gray-400">🔥 Racha Actual:</span>
                                            <span className="text-orange-500 font-black italic">{lastScanResult.racha || 0} Días</span>
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
                                <button
                                    onClick={() => {
                                        setLastScanResult(null);
                                        setFlashColor('neutral');
                                    }}
                                    className="absolute top-4 right-4 p-2 rounded-full hover:bg-white/10 text-white/50 hover:text-white transition-colors z-30"
                                    title="Limpiar pantalla"
                                >
                                    <X size={20} />
                                </button>

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
                                                    <User className="m-auto mt-4 text-white/20" size={32} />
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
                                <div className="space-y-3">
                                    {lastScanResult.reason === 'deuda' && (
                                        <Link href={getTenantLink('/admin/recepcion/pos?socioId=' + lastScanResult.member.id)}>
                                            <motion.button
                                                whileHover={{ scale: 1.02 }}
                                                whileTap={{ scale: 0.98 }}
                                                className="w-full bg-white text-black hover:bg-gray-200 font-black italic uppercase tracking-widest py-5 rounded-2xl flex items-center justify-center gap-3 transition-colors shadow-xl shadow-white/10"
                                            >
                                                Ir a Caja (POS) para Cobrar <ArrowRight />
                                            </motion.button>
                                        </Link>
                                    )}

                                    {lastScanResult.reason === 'medico' && (
                                        <Link href={getTenantLink('/admin/users')}>
                                            <motion.button
                                                whileHover={{ scale: 1.02 }}
                                                whileTap={{ scale: 0.98 }}
                                                className="w-full bg-white text-black hover:bg-gray-200 font-black italic uppercase tracking-widest py-5 rounded-2xl flex items-center justify-center gap-3 transition-colors shadow-xl shadow-white/10"
                                            >
                                                Actualizar Perfil (Firma PAR-Q) <ArrowRight />
                                            </motion.button>
                                        </Link>
                                    )}

                                    {/* Botón de Ingreso Excepcional */}
                                    {lastScanResult.member?.id && (
                                        <motion.button
                                            whileHover={{ scale: 1.02 }}
                                            whileTap={{ scale: 0.98 }}
                                            onClick={() => setShowBypassModal(true)}
                                            className="w-full bg-amber-500 hover:bg-amber-600 text-black font-black italic uppercase tracking-widest py-5 rounded-2xl flex items-center justify-center gap-3 transition-colors shadow-xl shadow-amber-500/10"
                                        >
                                            Autorizar Ingreso Excepcional
                                        </motion.button>
                                    )}
                                </div>
                            </motion.div>
                        )}

                    </AnimatePresence>
                </div>
            </div>

            {/* SECCIÓN DERECHA: HISTORIAL DE ACCESOS RECIENTES */}
            <div className="w-full lg:w-96 bg-[#1c1c1e] rounded-[2rem] border border-white/5 flex flex-col overflow-hidden relative shadow-2xl p-6">
                <div className="flex items-center gap-3 border-b border-white/5 pb-4 mb-4">
                    <div className="bg-emerald-500/10 p-2 rounded-xl border border-emerald-500/20">
                        <ScanLine className="text-emerald-500" size={20} />
                    </div>
                    <div>
                        <h2 className="text-sm font-black italic uppercase tracking-wider">Últimos Accesos</h2>
                        <p className="text-[10px] text-gray-500 uppercase tracking-widest font-black">Historial de la Sesión</p>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto space-y-3 pr-1">
                    <AnimatePresence mode="popLayout">
                        {recentScans.length === 0 ? (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 0.3 }}
                                className="h-full flex flex-col items-center justify-center text-center py-20 text-gray-500 gap-2"
                            >
                                <QrCode size={40} className="stroke-[1.5]" />
                                <p className="text-xs font-bold uppercase tracking-wider italic">Esperando lecturas...</p>
                            </motion.div>
                        ) : (
                            recentScans.map((scan) => (
                                <motion.div
                                    layout
                                    initial={{ opacity: 0, y: -20, scale: 0.95 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.95 }}
                                    transition={{ type: 'spring', damping: 20, stiffness: 300 }}
                                    key={scan.id}
                                    className={`p-4 rounded-2xl border flex items-center justify-between gap-4 transition-all
                                        ${scan.status === 'allowed'
                                            ? 'bg-emerald-500/5 border-emerald-500/10 hover:border-emerald-500/25'
                                            : 'bg-red-500/5 border-red-500/10 hover:border-red-500/25'
                                        }`}
                                >
                                    <div className="flex items-center gap-3 min-w-0">
                                        <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 overflow-hidden relative shrink-0">
                                            {scan.member?.avatar ? (
                                                <Image src={scan.member.avatar} alt={scan.member.nombre} fill className="object-cover" />
                                            ) : (
                                                <User className="m-auto mt-2.5 text-white/20" size={16} />
                                            )}
                                        </div>
                                        <div className="min-w-0">
                                            <h3 className="font-bold text-xs text-white truncate">{scan.member?.nombre || 'QR Externo / Desconocido'}</h3>
                                            <p className="text-[9px] text-gray-500 truncate font-semibold uppercase tracking-wider">
                                                {scan.member?.plan || scan.message || 'Sin detalles'}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="text-right shrink-0 flex flex-col items-end">
                                        <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border mb-1
                                            ${scan.status === 'allowed'
                                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                                : 'bg-red-500/10 text-red-400 border-red-500/20'
                                            }`}
                                        >
                                            {scan.status === 'allowed' ? 'OK' : 'Bloqueado'}
                                        </span>
                                        <span className="text-[9px] text-gray-600 font-mono font-bold">{scan.timestamp}</span>
                                    </div>
                                </motion.div>
                            ))
                        )}
                    </AnimatePresence>
                </div>
            </div>

            {/* Modal de Justificación de Ingreso Excepcional */}
            <AnimatePresence>
                {showBypassModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4"
                    >
                        <motion.div
                            initial={{ scale: 0.9, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.9, y: 20 }}
                            className="bg-[#1c1c1e] border border-white/10 rounded-[2rem] w-full max-w-md overflow-hidden shadow-2xl p-6"
                        >
                            <h3 className="text-xl font-black italic uppercase text-white tracking-tight mb-2">Autorizar Ingreso Excepcional</h3>
                            <p className="text-xs text-gray-400 mb-4">
                                Ingresa la justificación de este acceso excepcional (mínimo 6 caracteres). Este evento quedará registrado de forma inmutable en la auditoría del gimnasio.
                            </p>

                            <textarea
                                value={bypassJustification}
                                onChange={(e) => setBypassJustification(e.target.value)}
                                placeholder="Ej: Trajo certificado médico en papel / Se comprometió a regularizar su deuda mañana..."
                                className="w-full bg-black/50 border border-white/10 rounded-xl p-3 text-sm focus:outline-none focus:border-amber-500 transition-colors h-24 text-white resize-none"
                                disabled={submittingBypass}
                            />

                            <div className="flex gap-3 mt-6">
                                <button
                                    onClick={() => {
                                        setShowBypassModal(false);
                                        setBypassJustification('');
                                    }}
                                    disabled={submittingBypass}
                                    className="flex-1 bg-[#2c2c2e] hover:bg-[#3c3c3e] text-white py-3 rounded-xl font-bold text-xs uppercase tracking-wider transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={handleBypassSubmit}
                                    disabled={submittingBypass || bypassJustification.trim().length < 6}
                                    className="flex-1 bg-amber-500 hover:bg-amber-600 text-black py-3 rounded-xl font-bold text-xs uppercase tracking-wider transition-colors disabled:opacity-50"
                                >
                                    {submittingBypass ? 'Procesando...' : 'Confirmar'}
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

        </div>
    );
}
