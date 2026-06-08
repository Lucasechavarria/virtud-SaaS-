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
    Calendar,
    ChevronLeft,
    Tag,
    Percent
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useRouter, useParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

interface GymPlan {
    id: string;
    nombre: string;
    descripcion: string;
    precio: number;
    duracion_meses: number;
    esta_activo: boolean;
    beneficios: {
        descuento?: number;
        caracteristicas?: string[];
    } | any;
}

export default function GymPlansManagementPage() {
    const supabase = createClient();
    const router = useRouter();
    const params = useParams();
    const tenantSlug = params?.tenantSlug as string;

    const [plans, setPlans] = useState<GymPlan[]>([]);
    const [loading, setLoading] = useState(true);
    const [checkingAccess, setCheckingAccess] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingPlan, setEditingPlan] = useState<GymPlan | null>(null);

    const [formData, setFormData] = useState({
        nombre: '',
        descripcion: '',
        precio: 0,
        duracion_meses: 1,
        esta_activo: true,
        descuento: 0,
        caracteristicasRaw: ''
    });

    useEffect(() => {
        if (tenantSlug) {
            checkAccessAndLoad();
        }
    }, [tenantSlug]);

    const checkAccessAndLoad = async () => {
        try {
            const { data: { user: currentUser } } = await supabase.auth.getUser();
            if (!currentUser) {
                router.push('/login');
                return;
            }

            const { data: profile } = await (supabase
                .from('perfiles') as any)
                .select('rol, permisos')
                .eq('id', currentUser.id)
                .single();

            if (profile?.rol === 'recepcion' && (profile?.permisos as any)?.acceso_planes !== true) {
                toast.error('Acceso denegado: No tienes permisos para gestionar planes');
                router.push(tenantSlug ? `/${tenantSlug}/admin/recepcion/pos` : '/admin/recepcion/pos');
                return;
            }

            setCheckingAccess(false);
            fetchPlans();
        } catch (error) {
            console.error('Error checking access:', error);
            setCheckingAccess(false);
            fetchPlans();
        }
    };

    const fetchPlans = async () => {
        setLoading(true);
        try {
            const url = tenantSlug 
                ? `/api/admin/gym-plans?gymId=${tenantSlug}` 
                : '/api/admin/gym-plans';
            const res = await fetch(url);
            const data = await res.json();
            if (res.ok && data.success) {
                setPlans(data.plans || []);
            } else {
                toast.error(data.error || 'Error al obtener planes');
            }
        } catch (_error) {
            toast.error('Error de red al cargar planes');
        } finally {
            setLoading(false);
        }
    };

    const handleOpenModal = (plan: GymPlan | null = null) => {
        if (plan) {
            setEditingPlan(plan);
            const ben = plan.beneficios || {};
            setFormData({
                nombre: plan.nombre || '',
                descripcion: plan.descripcion || '',
                precio: plan.precio || 0,
                duracion_meses: plan.duracion_meses || 1,
                esta_activo: plan.esta_activo !== false,
                descuento: ben.descuento || 0,
                caracteristicasRaw: (ben.caracteristicas || []).join('\n')
            });
        } else {
            setEditingPlan(null);
            setFormData({
                nombre: '',
                descripcion: '',
                precio: 0,
                duracion_meses: 1,
                esta_activo: true,
                descuento: 0,
                caracteristicasRaw: 'Acceso libre a sala de musculación\nSeguimiento de profesores\nRutina personalizada'
            });
        }
        setIsModalOpen(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        const url = editingPlan ? `/api/admin/gym-plans/${editingPlan.id}` : '/api/admin/gym-plans';
        const method = editingPlan ? 'PUT' : 'POST';

        const caracteristicasArray = formData.caracteristicasRaw
            .split('\n')
            .map(line => line.trim())
            .filter(line => line.length > 0);

        const payload = {
            nombre: formData.nombre,
            descripcion: formData.descripcion,
            precio: Number(formData.precio),
            duracion_meses: Number(formData.duracion_meses),
            esta_activo: formData.esta_activo,
            beneficios: {
                descuento: Number(formData.descuento || 0),
                caracteristicas: caracteristicasArray
            }
        };

        try {
            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const data = await res.json();
            if (res.ok && data.success) {
                toast.success(editingPlan ? 'Plan de membresía actualizado' : 'Plan de membresía creado');
                setIsModalOpen(false);
                fetchPlans();
            } else {
                toast.error(data.error || 'Error al procesar el plan');
            }
        } catch (_error) {
            toast.error('Error de red al guardar el plan');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: string, name: string) => {
        if (!confirm(`¿Estás seguro de eliminar o desactivar el plan "${name}"?`)) return;
        setLoading(true);
        try {
            const res = await fetch(`/api/admin/gym-plans/${id}`, { method: 'DELETE' });
            const data = await res.json();
            if (res.ok && data.success) {
                toast.success(data.message || 'Plan modificado con éxito');
                fetchPlans();
            } else {
                toast.error(data.error || 'Error al eliminar');
            }
        } catch (_error) {
            toast.error('Error de red al eliminar el plan');
        } finally {
            setLoading(false);
        }
    };

    if (checkingAccess) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a]">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-purple-500" />
            </div>
        );
    }

    return (
        <div className="space-y-8 p-6 md:p-10 max-w-7xl mx-auto pb-32">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                    <button
                        onClick={() => router.back()}
                        className="flex items-center gap-2 text-gray-500 hover:text-white transition-colors text-[10px] font-black uppercase tracking-widest mb-4 group"
                    >
                        <ChevronLeft size={14} className="group-hover:-translate-x-1 transition-transform" />
                        Volver
                    </button>
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-purple-600/20 rounded-2xl flex items-center justify-center text-purple-500 border border-purple-500/20">
                            <Gem size={24} />
                        </div>
                        <div>
                            <h1 className="text-4xl font-black text-white italic uppercase tracking-tighter leading-none">
                                Planes de <span className="text-purple-500">Membresía</span>
                            </h1>
                            <p className="text-gray-500 text-xs font-bold uppercase tracking-widest mt-1 opacity-60">Configuración de Planes para Alumnos (B2C)</p>
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

            {loading && plans.length === 0 ? (
                <div className="py-20 flex flex-col items-center gap-4">
                    <div className="w-10 h-10 border-4 border-purple-500/20 border-t-purple-500 rounded-full animate-spin" />
                    <p className="text-[10px] font-black text-purple-400 uppercase tracking-widest">Cargando catálogo local...</p>
                </div>
            ) : plans.length === 0 ? (
                <div className="py-20 text-center bg-[#1c1c1e]/40 border border-white/5 rounded-3xl p-8">
                    <p className="text-4xl mb-4">💎</p>
                    <h3 className="text-xl font-bold text-white mb-2">Sin Planes Configurados</h3>
                    <p className="text-gray-400 text-sm max-w-md mx-auto mb-6">
                        Aún no has creado planes de membresía locales para tus alumnos. Crea tu primer plan (ej. Pase Mensual o Pase Anual) para habilitar cobros en el POS.
                    </p>
                    <button
                        onClick={() => handleOpenModal()}
                        className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white text-xs font-black uppercase tracking-widest rounded-xl transition-all"
                    >
                        Crear Primer Plan
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {plans.map((plan, i) => {
                        const ben = plan.beneficios || {};
                        const discount = Number(ben.descuento || 0);
                        const finalPrice = discount > 0 ? plan.precio * (1 - discount / 100) : plan.precio;
                        const featuresList = ben.caracteristicas || [];

                        return (
                            <motion.div
                                key={plan.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.1 }}
                                className={`group relative bg-[#1c1c1e] border rounded-[3rem] p-8 transition-all overflow-hidden flex flex-col justify-between ${
                                    plan.esta_activo ? 'border-white/5 hover:border-purple-500/30' : 'border-red-500/20 opacity-60'
                                }`}
                            >
                                <div className="absolute top-0 right-0 w-32 h-32 bg-purple-600/5 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-purple-600/10 transition-colors" />

                                <div>
                                    <div className="flex justify-between items-start mb-6">
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <h3 className="text-2xl font-black text-white italic uppercase tracking-tight">{plan.nombre}</h3>
                                                {!plan.esta_activo && (
                                                    <span className="px-2 py-0.5 bg-red-500/20 text-red-400 text-[8px] font-black uppercase rounded border border-red-500/30">Inactivo</span>
                                                )}
                                            </div>
                                            <p className="text-xs text-gray-500 mt-1 line-clamp-2">{plan.descripcion || 'Sin descripción'}</p>
                                        </div>
                                        <div className="flex gap-1">
                                            <button
                                                onClick={() => handleOpenModal(plan)}
                                                className="p-2 bg-white/5 rounded-xl text-gray-400 hover:text-white hover:bg-white/10 transition-all"
                                            >
                                                <Edit2 size={14} />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(plan.id, plan.nombre)}
                                                className="p-2 bg-red-600/10 rounded-xl text-red-500 hover:bg-red-600 hover:text-white transition-all"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    </div>

                                    <div className="mb-10">
                                        {discount > 0 ? (
                                            <div>
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className="text-gray-500 line-through text-lg font-bold">${plan.precio}</span>
                                                    <span className="px-2 py-0.5 bg-purple-500/20 text-purple-400 text-[9px] font-black rounded-full border border-purple-500/30 flex items-center gap-0.5">
                                                        <Percent size={10} /> {discount} OFF
                                                    </span>
                                                </div>
                                                <div className="flex items-baseline gap-1">
                                                    <span className="text-5xl font-black italic tracking-tighter text-white">${finalPrice.toLocaleString()}</span>
                                                    <span className="text-gray-500 text-xs font-bold uppercase tracking-widest">ARS</span>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="flex items-baseline gap-1">
                                                <span className="text-5xl font-black italic tracking-tighter text-white">${plan.precio.toLocaleString()}</span>
                                                <span className="text-gray-500 text-xs font-bold uppercase tracking-widest">ARS</span>
                                            </div>
                                        )}
                                        <p className="text-[10px] text-gray-500 mt-2 font-mono uppercase tracking-widest flex items-center gap-1.5">
                                            <Calendar size={12} className="text-purple-400" /> Duración: {plan.duracion_meses} {plan.duracion_meses === 1 ? 'Mes' : 'Meses'}
                                        </p>
                                    </div>

                                    <div className="space-y-3 pt-6 border-t border-white/5">
                                        <p className="text-[10px] font-black text-gray-600 uppercase tracking-widest mb-4">Beneficios Incluidos</p>
                                        {featuresList.length === 0 ? (
                                            <p className="text-xs text-gray-500 italic">Acceso estándar de membresía</p>
                                        ) : (
                                            featuresList.map((feat: string, idx: number) => (
                                                <div key={idx} className="flex items-start gap-2.5">
                                                    <CheckCircle2 size={14} className="text-emerald-500 shrink-0 mt-0.5" />
                                                    <span className="text-xs text-gray-300 tracking-tight leading-relaxed">{feat}</span>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            </motion.div>
                        );
                    })}
                </div>
            )}

            {/* Modal de Crear/Editar */}
            <AnimatePresence>
                {isModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 20 }}
                            className="bg-[#1c1c1e] border border-white/10 rounded-[3rem] w-full max-w-2xl overflow-hidden shadow-2xl"
                        >
                            <div className="p-8 border-b border-white/5 bg-gradient-to-r from-purple-600/10 to-transparent flex justify-between items-center">
                                <div>
                                    <h3 className="text-3xl font-black text-white italic uppercase tracking-tighter flex items-center gap-3 leading-none">
                                        {editingPlan ? 'Editar Plan de Membresía' : 'Crear Plan de Membresía'}
                                    </h3>
                                    <p className="text-gray-500 text-[10px] font-black uppercase tracking-widest mt-2">Detalla los servicios de este plan B2C</p>
                                </div>
                                <button onClick={() => setIsModalOpen(false)} className="p-3 bg-white/5 rounded-2xl text-gray-400 hover:text-white transition-all">
                                    <X size={20} />
                                </button>
                            </div>

                            <form onSubmit={handleSubmit} className="p-8 space-y-6 max-h-[75vh] overflow-y-auto">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Nombre del Plan</label>
                                        <input
                                            type="text"
                                            value={formData.nombre}
                                            onChange={e => setFormData({ ...formData, nombre: e.target.value })}
                                            className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white focus:outline-none focus:border-purple-500/50 transition-all placeholder:text-gray-600"
                                            placeholder="Pase Libre Mensual"
                                            required
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Precio Fijo (ARS)</label>
                                        <input
                                            type="number"
                                            value={formData.precio}
                                            onChange={e => setFormData({ ...formData, precio: Number(e.target.value) })}
                                            className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white focus:outline-none focus:border-purple-500/50 transition-all font-mono"
                                            placeholder="12000"
                                            required
                                        />
                                        <p className="text-[9px] text-gray-500 mt-1 ml-1">Costo base que se cobrará al alumno en la Caja POS.</p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Duración (Meses)</label>
                                        <select
                                            value={formData.duracion_meses}
                                            onChange={e => setFormData({ ...formData, duracion_meses: Number(e.target.value) })}
                                            className="w-full bg-[#1c1c1e] border border-white/10 rounded-2xl px-6 py-4 text-white focus:outline-none focus:border-purple-500/50 transition-all text-xs font-bold uppercase tracking-widest"
                                        >
                                            <option value={1}>1 Mes (Mensual)</option>
                                            <option value={3}>3 Meses (Trimestral)</option>
                                            <option value={6}>6 Meses (Semestral)</option>
                                            <option value={12}>12 Meses (Anual)</option>
                                        </select>
                                        <p className="text-[9px] text-gray-500 mt-1 ml-1">Periodo de vigencia del pase contratado para controlar los accesos.</p>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Descuento Promocional (%)</label>
                                        <div className="relative">
                                            <Percent className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={14} />
                                            <input
                                                type="number"
                                                min="0"
                                                max="90"
                                                value={formData.descuento}
                                                onChange={e => setFormData({ ...formData, descuento: Number(e.target.value) })}
                                                className="w-full bg-white/5 border border-white/10 rounded-2xl pl-10 pr-4 py-4 text-white focus:outline-none focus:border-purple-500/50 transition-all font-mono"
                                                placeholder="15"
                                            />
                                        </div>
                                        <p className="text-[9px] text-gray-500 mt-1 ml-1">Porcentaje de descuento automático que se restará en el cobro del POS.</p>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Descripción Breve</label>
                                    <textarea
                                        value={formData.descripcion}
                                        onChange={e => setFormData({ ...formData, descripcion: e.target.value })}
                                        className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white focus:outline-none focus:border-purple-500/50 transition-all placeholder:text-gray-600 h-20 resize-none text-xs"
                                        placeholder="Acceso total para alumnos que entrenan musculación sin límites de horario."
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Características (Una por línea)</label>
                                    <textarea
                                        value={formData.caracteristicasRaw}
                                        onChange={e => setFormData({ ...formData, caracteristicasRaw: e.target.value })}
                                        className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white focus:outline-none focus:border-purple-500/50 transition-all placeholder:text-gray-600 h-28 resize-none text-xs font-mono leading-relaxed"
                                        placeholder="Acceso libre a aparatos&#10;Incluye sala de cardio&#10;1 consulta de nutrición mensual"
                                    />
                                </div>

                                <label className="flex items-center gap-3 p-3 bg-black/20 rounded-2xl border border-white/5 cursor-pointer hover:bg-black/30 transition-all">
                                    <input
                                        type="checkbox"
                                        checked={formData.esta_activo}
                                        onChange={e => setFormData({ ...formData, esta_activo: e.target.checked })}
                                        className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500 bg-[#1c1c1e] border-white/10"
                                    />
                                    <div>
                                        <p className="text-xs font-bold text-white uppercase tracking-wider">Plan Activo</p>
                                        <p className="text-[9px] text-gray-500">Habilitado para la venta y visible para los alumnos.</p>
                                    </div>
                                </label>

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
                                        {editingPlan ? 'Guardar Cambios' : 'Crear Plan'}
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
