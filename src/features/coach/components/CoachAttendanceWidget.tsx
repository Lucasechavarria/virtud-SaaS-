'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-hot-toast';

export function CoachAttendanceWidget() {
    const [status, setStatus] = useState<'checked-in' | 'checked-out' | 'loading'>('loading');
    const [activeSession, setActiveSession] = useState<any>(null);
    const [showAbsenceModal, setShowAbsenceModal] = useState(false);
    const [absenceReason, setAbsenceReason] = useState('');
    const [reporting, setReporting] = useState(false);

    useEffect(() => {
        checkStatus();
    }, []);

    const checkStatus = async () => {
        try {
            const res = await fetch('/api/coach/attendance?limit=1');
            const data = await res.json();
            if (data.activeSession) {
                setStatus('checked-in');
                setActiveSession(data.activeSession);
            } else {
                setStatus('checked-out');
            }
        } catch (error) {
            console.error('Error checking status:', error);
        }
    };

    const handleCheckIn = async () => {
        const toastId = toast.loading('Registrando entrada...');
        try {
            const res = await fetch('/api/coach/attendance/check-in', {
                method: 'POST'
            });
            const data = await res.json();

            if (!res.ok) throw new Error(data.error);

            toast.success('¡Entrada registrada! Buena jornada.', { id: toastId });
            setStatus('checked-in');
            setActiveSession(data.attendance);
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Error al registrar entrada';
            toast.error(message, { id: toastId });
        }
    };

    const handleCheckOut = async () => {
        const toastId = toast.loading('Registrando salida...');
        try {
            const res = await fetch('/api/coach/attendance/check-out', {
                method: 'PUT'
            });
            const data = await res.json();

            if (!res.ok) throw new Error(data.error);

            toast.success('¡Salida registrada! Descansa.', { id: toastId });
            setStatus('checked-out');
            setActiveSession(null);
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Error al registrar salida';
            toast.error(message, { id: toastId });
        }
    };

    const handleReportAbsence = async () => {
        if (!absenceReason.trim()) {
            toast.error('Por favor, ingresa el motivo de la falta.');
            return;
        }

        setReporting(true);
        const toastId = toast.loading('Registrando ausencia...');
        try {
            const res = await fetch('/api/coach/attendance', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ reason: absenceReason })
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error);

            toast.success('Ausencia reportada al administrador.', { id: toastId });
            setShowAbsenceModal(false);
            setAbsenceReason('');
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Error al reportar ausencia';
            toast.error(message, { id: toastId });
        } finally {
            setReporting(false);
        }
    };

    if (status === 'loading') return null;

    return (
        <>
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className={`p-6 rounded-2xl border ${status === 'checked-in'
                    ? 'bg-green-900/20 border-green-500/30'
                    : 'bg-[#1c1c1e]/60 border-white/10'
                    } backdrop-blur-xl shadow-xl transition-colors duration-500`}
            >
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-bold text-white flex items-center gap-2">
                        ⏱️ Control de Asistencia
                    </h3>
                    {status === 'checked-in' && (
                        <span className="px-3 py-1 bg-green-500/20 text-green-400 rounded-full text-xs font-bold animate-pulse">
                            EN TURNO
                        </span>
                    )}
                </div>

                {status === 'checked-in' ? (
                    <div>
                        <p className="text-gray-300 text-sm mb-4">
                            Ingreso: <span className="font-mono text-white font-bold">{new Date(activeSession?.check_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </p>
                        <button
                            onClick={handleCheckOut}
                            className="w-full py-3 bg-red-500/80 hover:bg-red-600 text-white font-bold rounded-xl transition-all shadow-lg"
                        >
                            Marcar Salida
                        </button>
                        <p className="text-center mt-2 text-xs text-green-400">
                            * Recuerda marcar salida al terminar.
                        </p>
                    </div>
                ) : (
                    <div>
                        <p className="text-gray-400 text-sm mb-4">
                            No has registrado entrada hoy.
                        </p>
                        <button
                            onClick={handleCheckIn}
                            className="w-full py-3 bg-green-500 hover:bg-green-600 text-white font-bold rounded-xl transition-all shadow-lg shadow-green-500/20"
                        >
                            Marcar Entrada
                        </button>
                    </div>
                )}

                {status !== 'checked-in' && (
                    <button
                        onClick={() => setShowAbsenceModal(true)}
                        className="w-full mt-3 py-2 bg-gray-700/50 hover:bg-gray-700 text-gray-300 font-medium rounded-xl transition-all text-xs"
                    >
                        Reportar Falta Justificada
                    </button>
                )}
            </motion.div>

            {/* Modal Dialog for Justification Input */}
            <AnimatePresence>
                {showAbsenceModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="w-full max-w-md bg-[#1c1c1e] border border-white/10 rounded-2xl p-6 shadow-2xl relative overflow-hidden"
                        >
                            <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/5 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none" />
                            
                            <h4 className="text-lg font-black text-white uppercase italic tracking-wider mb-2">
                                📝 Justificar Ausencia
                            </h4>
                            <p className="text-gray-400 text-xs mb-4">
                                Explica brevemente al administrador el motivo de tu inasistencia para la jornada de hoy.
                            </p>

                            <textarea
                                value={absenceReason}
                                onChange={(e) => setAbsenceReason(e.target.value)}
                                placeholder="Escribe el motivo aquí..."
                                className="w-full h-32 bg-white/5 border border-white/10 rounded-xl p-4 text-sm font-bold text-white placeholder:text-gray-600 focus:outline-none focus:border-orange-500/30 transition-all uppercase tracking-widest shadow-inner shadow-black/20 resize-none"
                            />

                            <div className="flex gap-3 mt-6">
                                <button
                                    onClick={() => {
                                        setShowAbsenceModal(false);
                                        setAbsenceReason('');
                                    }}
                                    disabled={reporting}
                                    className="flex-1 py-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white font-bold rounded-xl text-xs uppercase tracking-wider transition-all"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={handleReportAbsence}
                                    disabled={reporting || !absenceReason.trim()}
                                    className="flex-1 py-3 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-bold rounded-xl text-xs uppercase tracking-wider transition-all shadow-lg shadow-orange-500/10"
                                >
                                    Enviar Reporte
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </>
    );
}
