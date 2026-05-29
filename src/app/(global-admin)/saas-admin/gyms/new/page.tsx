'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ChevronLeft,
    Building2,
    UserPlus,
    Zap,
    CheckCircle2,
    ArrowRight,
    ShieldCheck,
    Globe,
    Gem,
    Loader2,
    PartyPopper,
    LayoutDashboard
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';

export default function GymOnboardingPage() {
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [plans, setPlans] = useState<{ id: string; nombre: string; precio_mensual: number }[]>([]);
    const router = useRouter();

    const [formData, setFormData] = useState({
        nombre: '',
        slug: '',
        plan_id: '',
        modulos: {
            rutinas_ia: true,
            gamificacion: true,
            nutricion_ia: false,
            pagos_online: false
        },
        admin_nombre: '',
        admin_email: '',
        admin_password: '',
        configuracion: {
            modelo_facturacion: 'membresia',
            limites: {
                max_videos_mensual: 100,
                max_alumnos: 500
            }
        }
    });

    useEffect(() => {
        const fetchPlans = async () => {
            const res = await fetch('/api/admin/plans');
            const data = await res.json();
            if (res.ok) {
                setPlans(data.plans);
                if (data.plans.length > 0) {
                    setFormData(prev => ({ ...prev, plan_id: data.plans[0].id }));
                }
            }
        };
        fetchPlans();
    }, []);

    const handleNext = () => setStep(prev => prev + 1);
    const handleBack = () => setStep(prev => prev - 1);

    const handleSubmit = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/admin/gyms/onboard', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            if (res.ok) {
                toast.success('¡Gimnasio y administrador configurados con éxito!');
                setSuccess(true);
            } else {
                const data = await res.json();
                toast.error(data.error || 'Error en el alta');
            }
        } catch (error) {
            console.error('Onboarding Error:', error);
            toast.error('Error de red');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-black text-white p-6 md:p-10 flex flex-col">
            {/* Header */}
            <div className="max-w-4xl mx-auto w-full mb-12">
                <button
                    onClick={() => router.back()}
                    className="flex items-center gap-2 text-gray-500 hover:text-white transition-colors text-[10px] font-black uppercase tracking-widest mb-8 group"
                >
                    <ChevronLeft size={14} className="group-hover:-translate-x-1 transition-transform" />
                    Cancelar
                </button>

                <h1 className="text-5xl font-black italic uppercase tracking-tighter leading-none mb-4">
                    Onboarding <span className="text-red-600">Express</span>
                </h1>
                <p className="text-gray-500 text-xs font-black uppercase tracking-[0.2em]">Despliegue de Nueva Infraestructura Gym</p>
            </div>

            {/* Stepper Progress */}
            <div className="max-w-4xl mx-auto w-full mb-16 px-4">
                <div className="flex items-center justify-between relative">
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-[1px] bg-white/5 z-0" />
                    <div
                        className="absolute left-0 top-1/2 -translate-y-1/2 h-[2px] bg-red-600 z-0 transition-all duration-500"
                        style={{ width: `${((step - 1) / 2) * 100}%` }}
                    />

                    {[
                        { n: 1, label: 'Identidad', icon: <Building2 size={16} /> },
                        { n: 2, label: 'Módulos', icon: <Zap size={16} /> },
                        { n: 3, label: 'Autoridad', icon: <ShieldCheck size={16} /> }
                    ].map(s => (
                        <div key={s.n} className="relative z-10 flex flex-col items-center gap-3">
                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-500 border ${step >= s.n ? 'bg-red-600 text-white border-red-500 shadow-lg shadow-red-600/30' : 'bg-[#1c1c1e] text-gray-600 border-white/5'
                                }`}>
                                {step > s.n ? <CheckCircle2 size={24} /> : s.icon}
                            </div>
                            <span className={`text-[9px] font-black uppercase tracking-widest ${step >= s.n ? 'text-white' : 'text-gray-600'}`}>{s.label}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Form Content */}
            <div className="max-w-2xl mx-auto w-full flex-1">
                <AnimatePresence mode="wait">
                    {step === 1 && (
                        <motion.div
                            key="step1"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="space-y-8"
                        >
                            <div className="bg-[#1c1c1e] border border-white/5 rounded-[3rem] p-10 space-y-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] ml-2">Nombre de la Sede</label>
                                    <input
                                        type="text"
                                        placeholder="Ej: PowerHouse Central"
                                        className="w-full bg-black/40 border border-white/10 rounded-2xl px-6 py-4 text-white focus:border-red-600 outline-none transition-all font-bold"
                                        value={formData.nombre}
                                        onChange={e => {
                                            const val = e.target.value;
                                            setFormData({
                                                ...formData,
                                                nombre: val,
                                                slug: val.toLowerCase().replace(/ /g, '-').replace(/[^\w-]/g, '')
                                            });
                                        }}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] ml-2">Slug del Dominio (vitudgym.vercel.app/g/...)</label>
                                    <div className="flex items-center gap-3 bg-black/40 border border-white/10 rounded-2xl px-6 py-4">
                                        <Globe size={18} className="text-gray-600" />
                                        <input
                                            type="text"
                                            placeholder="power-house-central"
                                            className="w-full bg-transparent text-white focus:outline-none font-mono text-sm"
                                            value={formData.slug}
                                            onChange={e => setFormData({ ...formData, slug: e.target.value })}
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] ml-2">Plan Comercial Inicial</label>
                                    <div className="grid grid-cols-1 gap-3">
                                        {plans.map(plan => (
                                            <button
                                                key={plan.id}
                                                onClick={() => setFormData({ ...formData, plan_id: plan.id })}
                                                className={`flex items-center justify-between p-6 rounded-2xl border transition-all ${formData.plan_id === plan.id ? 'bg-red-600/10 border-red-600 text-white' : 'bg-black/20 border-white/5 text-gray-500 hover:border-white/20'
                                                    }`}
                                            >
                                                <div className="flex items-center gap-4">
                                                    <Gem size={20} className={formData.plan_id === plan.id ? 'text-red-500' : 'text-gray-700'} />
                                                    <div className="text-left">
                                                        <p className="font-black uppercase text-xs italic tracking-tighter">{plan.nombre}</p>
                                                        <p className="text-[10px] text-gray-600 font-bold">${plan.precio_mensual}/mes</p>
                                                    </div>
                                                </div>
                                                {formData.plan_id === plan.id && <CheckCircle2 size={24} className="text-red-600" />}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] ml-2">Modelo de Facturación Inicial</label>
                                    <div className="grid grid-cols-2 gap-3">
                                        {[
                                            { id: 'membresia', label: 'Membresía Fija', desc: 'Suscripción + alumnos extras' },
                                            { id: 'consumo', label: 'Pago x Consumo', desc: 'Pago por uso (POS + IA)' }
                                        ].map(model => (
                                            <button
                                                key={model.id}
                                                type="button"
                                                onClick={() => setFormData({
                                                    ...formData,
                                                    configuracion: {
                                                        ...formData.configuracion,
                                                        modelo_facturacion: model.id
                                                    }
                                                })}
                                                className={`p-5 rounded-2xl border text-left transition-all ${formData.configuracion?.modelo_facturacion === model.id ? 'bg-red-600/10 border-red-600 text-white' : 'bg-black/20 border-white/5 text-gray-500 hover:border-white/20'
                                                    }`}
                                            >
                                                <p className="font-black uppercase text-[10px] tracking-widest leading-none mb-1">{model.label}</p>
                                                <p className="text-[8px] text-gray-600 font-bold leading-normal">{model.desc}</p>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                            <button
                                onClick={handleNext}
                                disabled={!formData.nombre || !formData.slug}
                                className="w-full py-6 bg-white text-black rounded-3xl font-black uppercase tracking-widest text-xs hover:bg-red-600 hover:text-white transition-all shadow-2xl flex items-center justify-center gap-3 disabled:opacity-50"
                            >
                                Configurar Módulos Técnico
                                <ArrowRight size={18} />
                            </button>
                        </motion.div>
                    )}

                    {step === 2 && (
                        <motion.div
                            key="step2"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="space-y-8"
                        >
                            <div className="bg-[#1c1c1e] border border-white/5 rounded-[3rem] p-10 space-y-8">
                                <div className="text-center mb-4">
                                    <h3 className="text-2xl font-black italic uppercase italic">Control de Infraestructura</h3>
                                    <p className="text-[10px] font-black text-gray-600 uppercase tracking-widest mt-1">Activa las llaves tecnológicas</p>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {[
                                        { id: 'rutinas_ia', label: 'Rutinas IA', desc: 'Generación por biomecánica' },
                                        { id: 'gamificacion', label: 'Ecosistema de Puntos', desc: 'Ranking y misiones' },
                                        { id: 'nutricion_ia', label: 'Nutrición IA', desc: 'Escaneo MacroSnap' },
                                        { id: 'pagos_online', label: 'Pasarela Pagos', desc: 'Checkouts locales' }
                                    ].map(mod => (
                                        <button
                                            key={mod.id}
                                            onClick={() => setFormData({
                                                ...formData,
                                                modulos: { ...formData.modulos, [mod.id]: !formData.modulos[mod.id as keyof typeof formData.modulos] }
                                            })}
                                            className={`p-6 rounded-3xl border text-left transition-all ${formData.modulos[mod.id as keyof typeof formData.modulos]
                                                ? 'bg-emerald-500/10 border-emerald-500/50 text-white'
                                                : 'bg-black/20 border-white/5 text-gray-600'
                                                }`}
                                        >
                                            <div className="flex justify-between items-start mb-4">
                                                <Zap size={20} className={formData.modulos[mod.id as keyof typeof formData.modulos] ? 'text-emerald-500' : 'text-gray-800'} />
                                                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${formData.modulos[mod.id as keyof typeof formData.modulos] ? 'bg-emerald-500 border-emerald-400' : 'border-gray-800'
                                                    }`}>
                                                    {formData.modulos[mod.id as keyof typeof formData.modulos] && <CheckCircle2 size={12} className="text-white" />}
                                                </div>
                                            </div>
                                            <p className="font-black uppercase text-[10px] tracking-widest mb-1">{mod.label}</p>
                                            <p className="text-[9px] font-bold text-gray-500 italic lowercase">{mod.desc}</p>
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div className="flex gap-4">
                                <button onClick={handleBack} className="flex-1 py-6 bg-white/5 text-white rounded-3xl font-black uppercase text-xs border border-white/10">Volver</button>
                                <button onClick={handleNext} className="flex-[2] py-6 bg-white text-black rounded-3xl font-black uppercase tracking-widest text-xs hover:bg-emerald-500 transition-all flex items-center justify-center gap-3">
                                    Definir Autoridad
                                    <ArrowRight size={18} />
                                </button>
                            </div>
                        </motion.div>
                    )}

                    {step === 3 && (
                        <motion.div
                            key="step3"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="space-y-8"
                        >
                            <div className="bg-[#1c1c1e] border border-white/5 rounded-[3rem] p-10 space-y-6">
                                <div className="text-center mb-8">
                                    <div className="w-16 h-16 bg-blue-600/20 rounded-2xl flex items-center justify-center text-blue-500 border border-blue-500/20 mx-auto mb-4">
                                        <UserPlus size={32} />
                                    </div>
                                    <h3 className="text-2xl font-black italic uppercase italic">Administrador Maestro</h3>
                                    <p className="text-[10px] font-black text-gray-600 uppercase tracking-widest mt-1">Crea la credencial del dueño</p>
                                </div>

                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-2">Nombre Completo</label>
                                        <input
                                            type="text"
                                            className="w-full bg-black/40 border border-white/10 rounded-2xl px-6 py-4 text-white focus:border-blue-600 outline-none transition-all font-bold"
                                            value={formData.admin_nombre}
                                            onChange={e => setFormData({ ...formData, admin_nombre: e.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-2">Email Profesional</label>
                                        <input
                                            type="email"
                                            className="w-full bg-black/40 border border-white/10 rounded-2xl px-6 py-4 text-white focus:border-blue-600 outline-none transition-all font-bold"
                                            value={formData.admin_email}
                                            onChange={e => setFormData({ ...formData, admin_email: e.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-2">Contraseña Inicial</label>
                                        <input
                                            type="password"
                                            className="w-full bg-black/40 border border-white/10 rounded-2xl px-6 py-4 text-white focus:border-blue-600 outline-none transition-all font-bold"
                                            value={formData.admin_password}
                                            onChange={e => setFormData({ ...formData, admin_password: e.target.value })}
                                        />
                                    </div>
                                </div>
                            </div>
                            <div className="flex gap-4">
                                <button onClick={handleBack} className="flex-1 py-6 bg-white/5 text-white rounded-3xl font-black uppercase text-xs border border-white/10">Volver</button>
                                <button
                                    onClick={handleSubmit}
                                    disabled={loading || !formData.admin_email || !formData.admin_password}
                                    className="flex-[2] py-6 bg-blue-600 text-white rounded-3xl font-black uppercase tracking-widest text-xs hover:bg-blue-700 transition-all flex items-center justify-center gap-3 shadow-xl shadow-blue-900/40"
                                >
                                    {loading ? <Loader2 className="animate-spin" size={20} /> : <ShieldCheck size={20} />}
                                    Finalizar y Desplegar
                                </button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                <AnimatePresence>
                    {success && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="fixed inset-0 z-[100] bg-black flex items-center justify-center p-6 text-center"
                        >
                            <div className="max-w-md space-y-8">
                                <div className="w-24 h-24 bg-emerald-500/10 rounded-[2rem] flex items-center justify-center text-emerald-500 border border-emerald-500/20 mx-auto shadow-2xl shadow-emerald-500/20">
                                    <PartyPopper size={48} />
                                </div>
                                <div className="space-y-4">
                                    <h2 className="text-4xl font-black italic uppercase italic leading-none">Despliegue <span className="text-emerald-500">Exitoso</span></h2>
                                    <p className="text-gray-500 text-xs font-black uppercase tracking-[0.2em]">El gimnasio {formData.nombre} ahora está en línea</p>
                                </div>
                                <div className="bg-[#1c1c1e] p-6 rounded-3xl border border-white/5 space-y-4 text-left">
                                    <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-gray-500">
                                        <span>Credenciales Auth</span>
                                        <span className="text-emerald-500">Activas</span>
                                    </div>
                                    <div className="p-4 bg-black/40 rounded-2xl border border-white/5 space-y-2">
                                        <p className="text-[10px] font-bold text-gray-400">Usuario: <span className="text-white">{formData.admin_email}</span></p>
                                        <p className="text-[10px] font-bold text-gray-400">Acceso: <span className="text-white">vitudgym.vercel.app/g/{formData.slug}</span></p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => router.push('/admin')}
                                    className="w-full py-6 bg-emerald-600 text-white rounded-3xl font-black uppercase tracking-widest text-xs hover:bg-emerald-700 transition-all shadow-xl shadow-emerald-900/40 flex items-center justify-center gap-3"
                                >
                                    <LayoutDashboard size={20} />
                                    Regresar al HUB
                                </button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}
