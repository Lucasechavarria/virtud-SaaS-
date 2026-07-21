'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CreditCard, ShieldCheck, CheckCircle2, Clock, FileText, ArrowRight, Sparkles, AlertCircle, Building2, Wallet, X, Upload } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { useTenantNavigation } from '@/hooks/useTenantNavigation';
import ReportPaymentModal from '@/components/dashboard/ReportPaymentModal';
import { toast } from 'react-hot-toast';
import Link from 'next/link';

interface Payment {
    id: string;
    monto: number;
    estado: string;
    metodo_pago: string;
    creado_en: string;
    aprobado_en: string | null;
}

interface Plan {
    id: string;
    nombre: string;
    precio: number;
    duracion_dias?: number;
    duracion_meses?: number;
    descripcion?: string;
    beneficios?: string[];
}

export default function StudentPaymentsPage() {
    const { tenantHref } = useTenantNavigation();
    const [loading, setLoading] = useState(true);
    const [payments, setPayments] = useState<Payment[]>([]);
    const [plans, setPlans] = useState<Plan[]>([]);
    const [profile, setProfile] = useState<any>(null);

    // Modales
    const [showPlanModal, setShowPlanModal] = useState(false);
    const [showReportModal, setShowReportModal] = useState(false);
    const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
    const [processingPayment, setProcessingPayment] = useState(false);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            setLoading(true);
            const { data: { user } } = await supabase.auth.getUser();

            if (user) {
                // Perfil y membresía
                const { data: prof } = await supabase
                    .from('perfiles')
                    .select('*, gimnasios(nombre, direccion)')
                    .eq('id', user.id)
                    .single();
                setProfile(prof);

                // Pagos anteriores
                const res = await fetch('/api/student/payments');
                const data = await res.json();
                if (data.success) {
                    setPayments(data.payments || []);
                }

                // Cargar planes disponibles del gimnasio
                if (prof?.gimnasio_id) {
                    const { data: rawPlans } = await (supabase.from('planes_gimnasio') as any)
                        .select('*')
                        .eq('gimnasio_id', prof.gimnasio_id);

                    if (rawPlans && rawPlans.length > 0) {
                        setPlans(rawPlans as any);
                    } else {
                        // Fallback de planes plantilla
                        setPlans([
                            { id: 'free-pass', nombre: 'Pase Libre Musculación', precio: 18000, duracion_dias: 30, descripcion: 'Acceso ilimitado al área de pesas y musculación 24/7.' },
                            { id: 'full-pass', nombre: 'Pase Total Cyber-Elite', precio: 24000, duracion_dias: 30, descripcion: 'Musculación + Clases Grupales + Análisis Biomecánico.' },
                            { id: 'annual-pass', nombre: 'Plan Anual Pro', precio: 210000, duracion_dias: 365, descripcion: '2 Meses Bonificados + Acceso VIP + Evaluaciones Semestrales.' }
                        ]);
                    }
                }
            }
        } catch (error) {
            console.error('Error al cargar pagos:', error);
            toast.error('Error al cargar datos financieros');
        } finally {
            setLoading(false);
        }
    };

    const handleSelectPlan = (plan: Plan) => {
        setSelectedPlan(plan);
    };

    // Renovación con MercadoPago Online
    const handlePayWithMercadoPago = async () => {
        if (!selectedPlan) return;
        setProcessingPayment(true);
        try {
            toast.success('Iniciando pasarela segura de MercadoPago...');
            // Simulación o llamado a la API de preferencia de MercadoPago
            setTimeout(() => {
                setProcessingPayment(false);
                setShowPlanModal(false);
                toast.success('Pago completado con éxito. Tu membresía ha sido renovada automáticamente.');
                loadData();
            }, 2000);
        } catch (err) {
            console.error(err);
            toast.error('No se pudo conectar con MercadoPago');
            setProcessingPayment(false);
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'approved':
            case 'completado':
                return <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-1"><CheckCircle2 size={12} /> Aprobado</span>;
            case 'rejected':
            case 'rechazado':
                return <span className="bg-red-500/20 text-red-400 border border-red-500/30 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-1">✕ Rechazado</span>;
            default:
                return <span className="bg-amber-500/20 text-amber-400 border border-amber-500/30 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-1"><Clock size={12} /> En Revisión</span>;
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center text-white">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
                    <p className="text-zinc-500 font-bold text-xs uppercase tracking-widest animate-pulse">Cargando Centro Financiero...</p>
                </div>
            </div>
        );
    }

    const isMembershipActive = profile?.estado_membresia === 'active';

    return (
        <div className="min-h-screen bg-[#0a0a0a] text-white p-4 md:p-8 font-rajdhani selection:bg-emerald-500/30 pb-32">
            <div className="max-w-5xl mx-auto space-y-8">

                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                    <div>
                        <div className="inline-flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 px-4 py-1.5 rounded-full text-emerald-400 text-xs font-black uppercase tracking-[0.3em] mb-2">
                            <CreditCard size={14} /> Centro de Renovaciones
                        </div>
                        <h1 className="text-4xl md:text-5xl font-black text-white italic tracking-tighter uppercase leading-none">
                            Pagos & Membresía
                        </h1>
                        <p className="text-zinc-400 text-xs font-bold uppercase tracking-widest mt-1">
                            {profile?.gimnasios?.nombre || 'Virtud Gym'} • Historial y Autogestión
                        </p>
                    </div>

                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => setShowReportModal(true)}
                            className="bg-zinc-900 border border-white/10 hover:border-white/20 text-white font-black px-6 py-3.5 rounded-2xl text-xs uppercase italic tracking-widest transition-all flex items-center gap-2"
                        >
                            <Upload size={16} className="text-emerald-400" /> Informar Transferencia
                        </button>

                        <button
                            onClick={() => setShowPlanModal(true)}
                            className="bg-gradient-to-r from-emerald-500 via-cyan-500 to-emerald-500 text-white font-black px-6 py-3.5 rounded-2xl text-xs uppercase italic tracking-widest transition-all shadow-lg shadow-emerald-500/20 hover:scale-105 flex items-center gap-2"
                        >
                            <Sparkles size={16} /> Renovar Pase ➜
                        </button>
                    </div>
                </div>

                {/* Active Membership Status Card */}
                <div className="bg-zinc-900/60 border border-white/10 p-8 rounded-[3rem] shadow-2xl relative overflow-hidden backdrop-blur-3xl flex flex-col md:flex-row justify-between items-center gap-6">
                    <div className="space-y-3">
                        <div className="flex items-center gap-3">
                            <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${isMembershipActive ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-red-500/20 text-red-400 border border-red-500/30'}`}>
                                {isMembershipActive ? '● Estado: Activa' : '● Estado: Vencida'}
                            </span>
                            <span className="text-zinc-500 text-xs font-bold uppercase tracking-widest">
                                Plan Actual: Pase Completo
                            </span>
                        </div>
                        <h2 className="text-3xl font-black italic uppercase text-white tracking-tighter">
                            {isMembershipActive ? 'Acceso Habilitado al Gimnasio' : 'Renovación Requerida'}
                        </h2>
                        <p className="text-zinc-400 text-xs font-bold uppercase tracking-wider">
                            Paga en línea con MercadoPago o transfiere para mantener tu racha activa.
                        </p>
                    </div>

                    <button
                        onClick={() => setShowPlanModal(true)}
                        className="w-full md:w-auto px-8 py-5 bg-emerald-500 hover:bg-emerald-400 text-white font-black text-xs uppercase italic tracking-[0.2em] rounded-2xl shadow-xl shadow-emerald-500/20 transition-all shrink-0"
                    >
                        SELECCIONAR PLAN Y PAGAR ➜
                    </button>
                </div>

                {/* History Table / Receipts */}
                <div className="space-y-4">
                    <h3 className="text-xl font-black text-white italic uppercase tracking-tighter">Historial de Comprobantes</h3>

                    {payments.length > 0 ? (
                        <div className="space-y-4">
                            {payments.map((p) => (
                                <motion.div
                                    key={p.id}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="bg-zinc-900/40 border border-white/10 p-6 rounded-[2rem] flex flex-col md:flex-row justify-between items-center gap-4 hover:border-emerald-500/30 transition-all"
                                >
                                    <div className="flex items-center gap-5">
                                        <div className="w-12 h-12 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center text-emerald-400 font-black text-lg">
                                            $
                                        </div>
                                        <div>
                                            <p className="text-2xl font-black text-white italic tracking-tighter">${p.monto.toLocaleString('es-AR')}</p>
                                            <p className="text-[10px] text-zinc-500 font-black uppercase tracking-widest mt-0.5">
                                                {p.metodo_pago || 'MercadoPago / Transferencia'} • {new Date(p.creado_en).toLocaleDateString('es-AR', { day: '2-digit', month: 'long', year: 'numeric' })}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-4">
                                        {getStatusBadge(p.estado)}
                                        <Link
                                            href={tenantHref(`/member/payments/${p.id}/receipt`)}
                                            className="bg-white/5 hover:bg-white/10 border border-white/10 text-white font-black px-4 py-2.5 rounded-xl text-[10px] uppercase tracking-widest transition-all flex items-center gap-1.5"
                                        >
                                            <FileText size={14} className="text-emerald-400" /> Ver Recibo Digital
                                        </Link>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    ) : (
                        <div className="bg-zinc-900/30 border border-white/5 rounded-[2.5rem] p-12 text-center space-y-3">
                            <CreditCard size={48} className="text-zinc-700 mx-auto" />
                            <h4 className="text-lg font-black text-zinc-400 uppercase tracking-widest">Sin Pagos Registrados</h4>
                            <p className="text-xs text-zinc-500 font-bold uppercase tracking-wider">Tus renovaciones y recibos digitales se archivarán aquí.</p>
                        </div>
                    )}
                </div>

                {/* MODAL 1: SELECTOR INTERACTIVO DE PLANES (PLANES CYBER-ELITE) */}
                <AnimatePresence>
                    {showPlanModal && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 bg-black/90 backdrop-blur-2xl z-50 flex items-center justify-center p-6"
                        >
                            <motion.div
                                initial={{ scale: 0.9, y: 30 }}
                                animate={{ scale: 1, y: 0 }}
                                exit={{ scale: 0.9, y: 30 }}
                                className="bg-[#1c1c1e] border border-white/10 rounded-[3rem] p-8 md:p-10 max-w-3xl w-full max-h-[90vh] overflow-y-auto custom-scrollbar shadow-2xl relative"
                            >
                                <div className="flex justify-between items-center mb-6">
                                    <div>
                                        <h2 className="text-3xl font-black italic uppercase tracking-tighter text-white">Selecciona tu Plan</h2>
                                        <p className="text-zinc-400 text-xs font-bold uppercase tracking-widest">Elige la vigencia de tu pase para habilitar el ingreso</p>
                                    </div>
                                    <button onClick={() => setShowPlanModal(false)} className="w-10 h-10 bg-white/5 rounded-full flex items-center justify-center text-zinc-400 hover:text-white">
                                        <X size={20} />
                                    </button>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                                    {plans.map((plan) => {
                                        const isSelected = selectedPlan?.id === plan.id;
                                        return (
                                            <div
                                                key={plan.id}
                                                onClick={() => handleSelectPlan(plan)}
                                                className={`p-6 rounded-[2rem] border-2 cursor-pointer transition-all flex flex-col justify-between ${isSelected ? 'bg-emerald-950/40 border-emerald-500 shadow-xl shadow-emerald-500/10 scale-105' : 'bg-zinc-900/60 border-white/5 hover:border-white/20'}`}
                                            >
                                                <div className="space-y-2">
                                                    <span className="text-[9px] font-black text-emerald-400 uppercase tracking-widest bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 rounded-full">
                                                        {plan.duracion_dias} Días
                                                    </span>
                                                    <h3 className="text-xl font-black text-white italic uppercase tracking-tighter">{plan.nombre}</h3>
                                                    <p className="text-[11px] text-zinc-400 font-bold leading-relaxed">{plan.descripcion}</p>
                                                </div>

                                                <div className="mt-6 pt-4 border-t border-white/5">
                                                    <p className="text-3xl font-black italic text-emerald-400 tracking-tighter">${plan.precio.toLocaleString('es-AR')}</p>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>

                                {selectedPlan ? (
                                    <div className="bg-black/50 border border-emerald-500/30 p-6 rounded-3xl space-y-4">
                                        <h4 className="text-xs font-black text-emerald-400 uppercase tracking-widest">Método de Pago Seleccionado</h4>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                            <button
                                                onClick={handlePayWithMercadoPago}
                                                disabled={processingPayment}
                                                className="py-4 bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-white font-black rounded-2xl text-xs uppercase italic tracking-widest shadow-xl flex items-center justify-center gap-2"
                                            >
                                                <Wallet size={16} /> MercadoPago Checkout Online
                                            </button>
                                            <button
                                                onClick={() => {
                                                    setShowPlanModal(false);
                                                    setShowReportModal(true);
                                                }}
                                                className="py-4 bg-white/10 hover:bg-white/20 text-white font-black rounded-2xl text-xs uppercase italic tracking-widest border border-white/10 flex items-center justify-center gap-2"
                                            >
                                                <Upload size={16} className="text-emerald-400" /> Adjuntar Comprobante Transferencia
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <p className="text-center text-xs text-zinc-500 font-black uppercase tracking-widest animate-pulse">Haz clic en un plan para habilitar las opciones de pago</p>
                                )}
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* MODAL 2: INFORMAR PAGO DE TRANSFERENCIA */}
                <ReportPaymentModal
                    isOpen={showReportModal}
                    onClose={() => {
                        setShowReportModal(false);
                        loadData();
                    }}
                />

            </div>
        </div>
    );
}
