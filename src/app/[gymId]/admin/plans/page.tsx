'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Gem,
    Plus,
    Edit2,
    Trash2,
    Save,
    X,
    CheckCircle2,
    Users,
    Building2,
    Zap,
    ChevronLeft
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useRouter } from 'next/navigation';

interface Plan {
    id: string;
    nombre: string;
    precio_mensual: number;
    limite_sucursales: number;
    limite_usuarios: number;
    caracteristicas: string[];
}

export default function PlansManagementPage() {
    const [plans, setPlans] = useState<Plan[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
    const router = useRouter();

    const [formData, setFormData] = useState<Partial<Plan>>({
        nombre: '',
        precio_mensual: 0,
        limite_sucursales: 1,
        limite_usuarios: 100,
        caracteristicas: []
    });

    useEffect(() => {
        fetchPlans();
    }, []);

    const fetchPlans = async () => {
        try {
            const res = await fetch('/api/admin/plans');
            const data = await res.json();
            if (res.ok) {
                setPlans(data.plans);
            } else {
                toast.error(data.error);
            }
        } catch (_error) {
            toast.error('Error al cargar planes');
        } finally {
            setLoading(false);
        }
    };

    const handleOpenModal = (plan: Plan | null = null) => {
        if (plan) {
            setEditingPlan(plan);
            setFormData(plan);
        } else {
            setEditingPlan(null);
            setFormData({
                nombre: '',
                precio_mensual: 0,
                limite_sucursales: 1,
                limite_usuarios: 100,
                caracteristicas: []
            });
        }
        setIsModalOpen(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const url = editingPlan ? `/api/admin/plans/${editingPlan.id}` : '/api/admin/plans';
        const method = editingPlan ? 'PUT' : 'POST';

        try {
            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            if (res.ok) {
                toast.success(editingPlan ? 'Plan actualizado' : 'Plan creado');
                setIsModalOpen(false);
                fetchPlans();
            } else {
                const data = await res.json();
                toast.error(data.error);
            }
        } catch (_error) {
            toast.error('Error al procesar la solicitud');
        }
    };

    const handleDelete = async (id: string, name: string) => {
        if (!confirm(`¿Estás seguro de eliminar el plan "${name}"?`)) return;

        try {
            const res = await fetch(`/api/admin/plans/${id}`, { method: 'DELETE' });
            if (res.ok) {
                toast.success('Plan eliminado');
                fetchPlans();
            } else {
                const data = await res.json();
                toast.error(data.error);
            }
        } catch (_error) {
            toast.error('Error al eliminar');
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="w-12 h-12 border-4 border-red-600/20 border-t-red-600 rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="space-y-8 p-6 md:p-10 max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                    <button
                        onClick={() => router.back()}
                        className="flex items-center gap-2 text-gray-500 hover:text-white transition-colors text-[10px] font-black uppercase tracking-widest mb-4 group"
                    >
                        <ChevronLeft size={14} className="group-hover:-translate-x-1 transition-transform" />
                        Volver al Dashboard
                    </button>
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-purple-600/20 rounded-2xl flex items-center justify-center text-purple-500 border border-purple-500/20">
                            <Gem size={24} />
                        </div>
                        <div>
                            <h1 className="text-4xl font-black text-white italic uppercase tracking-tighter leading-none">
                                Planes <span className="text-purple-500">SaaS</span>
                            </h1>
                            <p className="text-gray-500 text-xs font-bold uppercase tracking-widest mt-1 opacity-60">Control Comercial de la Plataforma</p>
                        </div>
                    </div>
                </div>

                <button
                    onClick={() => handleOpenModal()}
                    className="px-8 py-4 bg-purple-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-purple-700 transition-all shadow-xl shadow-purple-900/20 flex items-center gap-2 group"
                >
                    <Plus size={18} className="group-hover:rotate-90 transition-transform" />
                    Nuevo Plan
                </button>
            </div>

            {/* Plans Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {plans.map((plan, i) => (
                    <motion.div
                        key={plan.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.1 }}
                        className="group relative bg-[#1c1c1e] border border-white/5 rounded-[3rem] p-8 hover:border-purple-500/30 transition-all overflow-hidden"
                    >
                        {/* Glow effect */}
                        <div className="absolute top-0 right-0 w-32 h-32 bg-purple-600/5 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-purple-600/10 transition-colors" />

                        <div className="relative z-10">
                            <div className="flex justify-between items-start mb-6">
                                <h3 className="text-2xl font-black text-white italic uppercase tracking-tight">{plan.nombre}</h3>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => handleOpenModal(plan)}
                                        className="p-2 bg-white/5 rounded-xl text-gray-400 hover:text-white hover:bg-white/10 transition-all"
                                    >
                                        <Edit2 size={16} />
                                    </button>
                                    <button
                                        onClick={() => handleDelete(plan.id, plan.nombre)}
                                        className="p-2 bg-red-600/10 rounded-xl text-red-500 hover:bg-red-600 hover:text-white transition-all"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>

                            <div className="flex items-baseline gap-1 mb-10">
                                <span className="text-5xl font-black italic tracking-tighter text-white">${plan.precio_mensual}</span>
                                <span className="text-gray-500 text-xs font-bold uppercase tracking-widest">/ mes</span>
                            </div>

                            <div className="space-y-4 mb-10">
                                <div className="flex items-center gap-3 text-xs font-bold text-gray-400 uppercase tracking-wider">
                                    <Building2 size={16} className="text-purple-500" />
                                    <span>Límite Sedes: <span className="text-white font-black">{plan.limite_sucursales === -1 ? '∞' : plan.limite_sucursales}</span></span>
                                </div>
                                <div className="flex items-center gap-3 text-xs font-bold text-gray-400 uppercase tracking-wider">
                                    <Users size={16} className="text-blue-500" />
                                    <span>Límite Usuarios: <span className="text-white font-black">{plan.limite_usuarios === -1 ? '∞' : plan.limite_usuarios}</span></span>
                                </div>
                            </div>

                            <div className="space-y-3 pt-6 border-t border-white/5">
                                <p className="text-[10px] font-black text-gray-600 uppercase tracking-widest mb-4">Módulos Incluidos</p>
                                {plan.caracteristicas?.map((feat, idx) => (
                                    <div key={idx} className="flex items-center gap-3">
                                        <CheckCircle2 size={14} className="text-emerald-500" />
                                        <span className="text-[11px] font-bold text-gray-300 uppercase tracking-tighter truncate">
                                            {feat.replace(/_/g, ' ')}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </motion.div>
                ))}
            </div>

            {/* Modal de Create/Edit */}
            <AnimatePresence>
                {isModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 20 }}
                            className="bg-[#1c1c1e] border border-white/10 rounded-[3rem] w-full max-w-2xl overflow-hidden shadow-2xl"
                        >
                            <div className="p-10 border-b border-white/5 bg-gradient-to-r from-purple-600/10 to-transparent flex justify-between items-center">
                                <div>
                                    <h3 className="text-3xl font-black text-white italic uppercase tracking-tighter flex items-center gap-3 leading-none">
                                        {editingPlan ? 'Editar Plan' : 'Crear Nuevo Plan'}
                                    </h3>
                                    <p className="text-gray-500 text-[10px] font-black uppercase tracking-widest mt-2">Configura los límites comerciales</p>
                                </div>
                                <button onClick={() => setIsModalOpen(false)} className="p-3 bg-white/5 rounded-2xl text-gray-400 hover:text-white transition-all">
                                    <X size={24} />
                                </button>
                            </div>

                            <form onSubmit={handleSubmit} className="p-10 space-y-8 max-h-[70vh] overflow-y-auto">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Nombre Comercial</label>
                                        <input
                                            type="text"
                                            value={formData.nombre}
                                            onChange={e => setFormData({ ...formData, nombre: e.target.value })}
                                            className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white focus:outline-none focus:border-purple-500/50 transition-all"
                                            placeholder="Plan Enterprise"
                                            required
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Precio Mensual ($)</label>
                                        <input
                                            type="number"
                                            value={formData.precio_mensual}
                                            onChange={e => setFormData({ ...formData, precio_mensual: Number(e.target.value) })}
                                            className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white focus:outline-none focus:border-purple-500/50 transition-all font-mono"
                                            placeholder="99.99"
                                            step="0.01"
                                            required
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Límite de Sedes (-1: ∞)</label>
                                        <input
                                            type="number"
                                            value={formData.limite_sucursales}
                                            onChange={e => setFormData({ ...formData, limite_sucursales: Number(e.target.value) })}
                                            className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white focus:outline-none focus:border-purple-500/50 transition-all"
                                            required
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Límite de Usuarios (-1: ∞)</label>
                                        <input
                                            type="number"
                                            value={formData.limite_usuarios}
                                            onChange={e => setFormData({ ...formData, limite_usuarios: Number(e.target.value) })}
                                            className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white focus:outline-none focus:border-purple-500/50 transition-all"
                                            required
                                        />
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Características y Módulos</label>
                                    <div className="grid grid-cols-2 gap-3">
                                        {['rutinas_ia', 'gamificacion', 'nutricion_ia', 'pagos_online', 'api_access', 'asistencias_qr', 'personal_trainer_ia', 'reportes_avanzados'].map(feat => (
                                            <button
                                                key={feat}
                                                type="button"
                                                onClick={() => {
                                                    const current = formData.caracteristicas || [];
                                                    const next = current.includes(feat)
                                                        ? current.filter(f => f !== feat)
                                                        : [...current, feat];
                                                    setFormData({ ...formData, caracteristicas: next });
                                                }}
                                                className={`flex items-center gap-3 p-4 rounded-2xl border transition-all text-left ${formData.caracteristicas?.includes(feat)
                                                        ? 'bg-purple-600/10 border-purple-500/50 text-white'
                                                        : 'bg-white/5 border-white/10 text-gray-500 hover:border-white/20'
                                                    }`}
                                            >
                                                <div className={`w-4 h-4 rounded-full flex items-center justify-center border ${formData.caracteristicas?.includes(feat) ? 'bg-purple-500 border-purple-400' : 'border-gray-700'
                                                    }`}>
                                                    {formData.caracteristicas?.includes(feat) && <Zap size={8} fill="white" />}
                                                </div>
                                                <span className="text-[10px] font-bold uppercase truncate">{feat.replace(/_/g, ' ')}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="flex gap-4 pt-4">
                                    <button
                                        type="button"
                                        onClick={() => setIsModalOpen(false)}
                                        className="flex-1 px-8 py-5 bg-white/5 text-white text-[10px] font-black uppercase tracking-widest rounded-2xl hover:bg-white/10 transition-all border border-white/10"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        type="submit"
                                        className="flex-1 px-8 py-5 bg-purple-600 text-white text-[10px] font-black uppercase tracking-widest rounded-2xl shadow-xl shadow-purple-900/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3"
                                    >
                                        <Save size={18} />
                                        {editingPlan ? 'Guardar Cambios' : 'Lanzar Plan'}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
