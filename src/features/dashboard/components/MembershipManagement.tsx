'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ShieldCheck,
    CreditCard,
    Download,
    XCircle,
    TrendingUp,
    Clock,
    ChevronRight,
    AlertCircle,
    Calendar,
    ArrowUpCircle,
    CheckCircle2
} from 'lucide-react';
import { toast } from 'react-hot-toast';

interface Payment {
    id: string;
    creado_en: string;
    monto: number;
    metodo_pago: string;
    concepto: string;
    estado: 'approved' | 'pending' | 'rejected' | 'refunded';
}

interface GymPlan {
    id: string;
    nombre: string;
    descripcion: string;
    precio: number;
    duracion_meses: number;
    beneficios: string[];
}

interface MembershipInfo {
    estado_membresia: string;
    fecha_inicio_membresia: string | null;
    fecha_fin_membresia: string | null;
    plan_actual: GymPlan | null;
}

export default function MembershipManagement() {
    const [isCancelling, setIsCancelling] = useState(false);
    const [isUpgrading, setIsUpgrading] = useState(false);
    const [membership, setMembership] = useState<MembershipInfo | null>(null);
    const [payments, setPayments] = useState<Payment[]>([]);
    const [availablePlans, setAvailablePlans] = useState<GymPlan[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchInitialData();
    }, []);

    const fetchInitialData = async () => {
        setLoading(true);
        try {
            const [membershipRes, paymentsRes, plansRes] = await Promise.all([
                fetch('/api/student/membership'),
                fetch('/api/student/payments'),
                fetch('/api/student/membership/available-plans')
            ]);

            const membershipData = await membershipRes.json();
            const paymentsData = await paymentsRes.json();
            const plansData = await plansRes.json();

            if (membershipData.success) setMembership(membershipData.membership);
            if (paymentsData.success) setPayments(paymentsData.payments);
            if (plansData.success) setAvailablePlans(plansData.plans);
        } catch (error) {
            console.error('Error loading membership data:', error);
            toast.error('Error al cargar datos de membresía');
        } finally {
            setLoading(false);
        }
    };

    const handleCancelRequest = async () => {
        toast.loading('Enviando solicitud de cancelación...');
        // Simulación de envío de correo o registro de cancelación
        setTimeout(() => {
            toast.dismiss();
            toast.success('Solicitud enviada. Un administrador se contactará contigo.');
            setIsCancelling(false);
        }, 2000);
    };

    const handleUpgrade = (_planId: string) => {
        toast.loading('Redirigiendo a pasarela de pago...');
        // Aquí se llamaría a la API de MercadoPago para el proporcional o nuevo plan
        setTimeout(() => {
            toast.dismiss();
            toast.error('Módulo de pago en mantenimiento. Contacta a recepción.');
            setIsUpgrading(false);
        }, 2000);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="space-y-8 pb-20">
            {/* Header / Active Plan Card */}
            <div className="relative overflow-hidden p-1 bg-[#1c1c1e]/60 backdrop-blur-3xl rounded-[3rem] border border-white/5 shadow-2xl">
                <div className="absolute top-0 right-0 w-64 h-64 bg-orange-600/10 rounded-full blur-[80px] -mr-32 -mt-32" />

                <div className="relative p-10 flex flex-col md:flex-row md:items-center justify-between gap-8">
                    <div className="space-y-4">
                        <div className="flex items-center gap-3">
                            <div className="p-3 bg-orange-600/20 text-orange-500 rounded-2xl border border-orange-500/20">
                                <ShieldCheck size={28} />
                            </div>
                            <div>
                                <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest leading-none">Tu Plan Actual</h3>
                                <p className="text-4xl font-black text-white italic tracking-tighter uppercase mt-1">
                                    {membership?.plan_actual?.nombre || 'Sin Plan Activo'}
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-6">
                            <div className="flex items-center gap-2 text-xs font-bold text-gray-400 uppercase">
                                <Calendar size={14} className="text-orange-500" />
                                {membership?.estado_membresia === 'active' ? 'Próximo cobro: ' : 'Venció el: '}
                                <span className="text-white">
                                    {membership?.fecha_fin_membresia ? new Date(membership.fecha_fin_membresia).toLocaleDateString() : 'N/A'}
                                </span>
                            </div>
                            <div className="flex items-center gap-2 text-xs font-bold text-gray-400 uppercase">
                                <CreditCard size={14} className="text-orange-500" />
                                {membership?.plan_actual ? `$${membership.plan_actual.precio.toLocaleString()} / ${membership.plan_actual.duracion_meses > 1 ? membership.plan_actual.duracion_meses + ' meses' : 'mes'}` : 'N/A'}
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                        <button
                            onClick={() => setIsUpgrading(true)}
                            className="bg-white text-black px-6 py-4 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center gap-2 hover:scale-105 transition-all shadow-xl shadow-white/5 active:scale-95"
                        >
                            <ArrowUpCircle size={16} />
                            Upgrade de Plan
                        </button>
                        <button
                            onClick={() => setIsCancelling(true)}
                            className="bg-white/5 hover:bg-red-500/10 hover:text-red-500 text-gray-500 px-6 py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all border border-white/5"
                        >
                            <XCircle size={16} />
                            Cancelar
                        </button>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Payment History */}
                <div className="lg:col-span-2 space-y-4">
                    <h4 className="text-xs font-black text-gray-500 uppercase tracking-[0.3em] ml-4 flex items-center gap-2">
                        <Clock size={14} /> Historial de Pagos
                    </h4>
                    <div className="space-y-3">
                        {payments.length === 0 ? (
                            <div className="p-10 border border-dashed border-white/10 rounded-[2rem] text-center text-gray-500">
                                <p className="text-sm font-bold uppercase tracking-widest">No hay pagos registrados</p>
                            </div>
                        ) : (
                            payments.map((payment) => (
                                <motion.div
                                    key={payment.id}
                                    whileHover={{ scale: 1.01, border: '1px solid rgba(255,255,255,0.1)' }}
                                    className="p-5 bg-[#1c1c1e] border border-white/5 rounded-3xl flex items-center justify-between transition-all group"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center text-gray-400 group-hover:text-white transition-colors">
                                            <Clock size={20} />
                                        </div>
                                        <div>
                                            <p className="font-bold text-white text-sm">{payment.concepto}</p>
                                            <p className="text-[10px] font-bold text-gray-600 uppercase tracking-widest">
                                                {new Date(payment.creado_en).toLocaleDateString()}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-6">
                                        <div className="text-right">
                                            <p className="font-black text-white italic tracking-tighter">${Number(payment.monto).toLocaleString()}</p>
                                            <span className={`text-[10px] font-bold uppercase tracking-widest ${payment.estado === 'approved' ? 'text-green-500' :
                                                payment.estado === 'pending' ? 'text-orange-500' : 'text-red-500'
                                                }`}>
                                                {payment.estado === 'approved' ? 'Saldado' :
                                                    payment.estado === 'pending' ? 'Pendiente' : 'Rechazado'}
                                            </span>
                                        </div>
                                        <button
                                            onClick={() => window.open(`/payments/${payment.id}/receipt`, '_blank')}
                                            className="p-3 bg-white/5 hover:bg-white/10 text-gray-500 hover:text-white rounded-xl transition-all border border-white/5"
                                        >
                                            <Download size={16} />
                                        </button>
                                    </div>
                                </motion.div>
                            ))
                        )}
                    </div>
                </div>

                {/* Right Panel: Auto-management Tips / Cards */}
                <div className="space-y-6">
                    <div className="p-8 rounded-[3rem] bg-gradient-to-br from-orange-600 to-orange-500 text-black shadow-2xl relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-10 opacity-10 group-hover:scale-110 transition-transform">
                            <TrendingUp size={100} />
                        </div>
                        <h4 className="text-2xl font-black italic uppercase tracking-tighter mb-4">¿Quieres ahorrar entrenando?</h4>
                        <p className="text-sm font-bold opacity-80 mb-6 leading-tight">Pasa al plan anual hoy mismo y obtén 2 meses totalmente gratis.</p>
                        <button
                            onClick={() => setIsUpgrading(true)}
                            className="bg-black text-white px-6 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center gap-2 hover:scale-105 transition-all"
                        >
                            Ver Planes Anuales
                            <ChevronRight size={14} />
                        </button>
                    </div>

                    <div className="p-8 rounded-[3rem] bg-[#1c1c1e] border border-white/5 space-y-4">
                        <div className="flex items-center gap-3 text-orange-500 mb-2">
                            <AlertCircle size={20} />
                            <p className="text-[10px] font-black uppercase tracking-[0.2em]">Importante</p>
                        </div>
                        <p className="text-xs text-gray-400 leading-relaxed">
                            Al cancelar tu suscripción, mantendrás el acceso hasta el fin del periodo actual. Cumplimos con el Botón de Arrepentimiento según la Ley 24.240.
                        </p>
                    </div>
                </div>
            </div>

            {/* Upgrade Modal */}
            <AnimatePresence>
                {isUpgrading && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/90 backdrop-blur-2xl">
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="max-w-4xl w-full bg-[#111] border border-white/10 p-10 rounded-[3rem] space-y-10 shadow-2xl max-h-[90vh] overflow-y-auto custom-scrollbar"
                        >
                            <div className="flex justify-between items-start">
                                <div className="space-y-2">
                                    <h3 className="text-4xl font-black text-white uppercase italic tracking-tighter leading-none">Mejora tu <br /> experiencia</h3>
                                    <p className="text-gray-500 text-sm font-medium uppercase tracking-[0.2em]">Selecciona un nuevo plan para potenciar tu entrenamiento</p>
                                </div>
                                <button onClick={() => setIsUpgrading(false)} className="p-4 bg-white/5 rounded-full hover:bg-white/10 transition-colors">
                                    <XCircle size={24} />
                                </button>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {availablePlans.map((plan) => (
                                    <div key={plan.id} className="p-8 bg-[#1c1c1e] border border-white/5 rounded-[2rem] flex flex-col justify-between hover:border-orange-500/30 transition-all group">
                                        <div className="space-y-6">
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <h4 className="text-xl font-black text-white uppercase italic tracking-tighter">{plan.nombre}</h4>
                                                    <p className="text-xs text-gray-500 mt-1">{plan.descripcion}</p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-2xl font-black text-white italic tracking-tighter">${plan.precio.toLocaleString()}</p>
                                                    <p className="text-[10px] font-bold text-gray-600 uppercase">/ {plan.duracion_meses > 1 ? `${plan.duracion_meses} meses` : 'mes'}</p>
                                                </div>
                                            </div>
                                            <div className="space-y-3">
                                                {plan.beneficios.map((b, i) => (
                                                    <div key={i} className="flex items-center gap-2 text-[11px] text-gray-400">
                                                        <CheckCircle2 size={14} className="text-orange-500" />
                                                        {b}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => handleUpgrade(plan.id)}
                                            className="mt-8 bg-white text-black py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-orange-500 hover:text-white transition-all shadow-lg"
                                        >
                                            Cambiar a este plan
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Cancelation Modal */}
            <AnimatePresence>
                {isCancelling && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/80 backdrop-blur-xl">
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="max-w-md w-full bg-[#1c1c1e] border border-white/10 p-10 rounded-[3rem] text-center space-y-8 shadow-2xl"
                        >
                            <div className="flex justify-center">
                                <div className="p-5 bg-red-500/10 text-red-500 rounded-full border border-red-500/20">
                                    <XCircle size={40} />
                                </div>
                            </div>
                            <div className="space-y-4">
                                <h3 className="text-3xl font-black text-white uppercase italic tracking-tighter leading-none">¿Seguro que <br /> quieres irte?</h3>
                                <p className="text-gray-500 text-sm font-medium">Perderás tu racha de gamificación y tus rutinas guardadas una vez finalice el periodo actual.</p>
                            </div>
                            <div className="grid gap-3">
                                <button onClick={() => setIsCancelling(false)} className="bg-white text-black py-4 rounded-2xl font-black text-xs uppercase tracking-widest">No, continuar entrenando</button>
                                <button
                                    onClick={handleCancelRequest}
                                    className="bg-white/5 hover:text-red-500 py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all"
                                >
                                    Sí, solicitar cancelación
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
