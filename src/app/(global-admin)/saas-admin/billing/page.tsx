'use client';

import React, { useState, useEffect } from 'react';
import {
    Calendar,
    Percent,
    CheckCircle2,
    AlertCircle,
    Activity,
    Search,
    Power,
    Gem,
    Plus,
    Trash2,
    Edit3,
    Layers,
    ListFilter,
    Users
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';

interface GymBilling {
    id: string;
    nombre: string;
    slug: string;
    estado_pago_saas: string;
    fecha_proximo_pago: string;
    descuento_saas: number;
    planes_suscripcion: { nombre: string };
}

interface SubscriptionPlan {
    id: string;
    nombre: string;
    precio_mensual: number;
    limite_sucursales: number;
    limite_usuarios: number;
    caracteristicas: string[];
}

export default function AdminBillingPage() {
    const [gyms, setGyms] = useState<GymBilling[]>([]);
    const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'billing' | 'plans'>('billing');
    const [searchTerm, setSearchTerm] = useState('');
    const [updating, setUpdating] = useState(false);

    // CRUD Plan States
    const [showPlanModal, setShowPlanModal] = useState(false);
    const [editingPlan, setEditingPlan] = useState<SubscriptionPlan | null>(null);
    const [planForm, setPlanForm] = useState({
        nombre: '',
        precio_mensual: 0,
        limite_sucursales: 1,
        limite_usuarios: 100,
        caracteristicasStr: '',
        modulos: {
            rutinas_ia: true,
            nutricion_ia: false,
            vision_ia: false,
            pagos_online: true,
            crm: false,
            tienda_pos: false,
            equipamiento_ia: false,
            gamificacion: false,
            clases_reserva: true
        }
    });

    useEffect(() => {
        if (activeTab === 'billing') {
            fetchGyms();
        } else {
            fetchPlans();
        }
    }, [activeTab]);

    const fetchGyms = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/admin/billing');
            const data = await res.json();
            if (res.ok) setGyms(data.gyms || []);
        } catch (_error) {
            toast.error('Error al cargar datos financieros');
        } finally {
            setLoading(false);
        }
    };

    const fetchPlans = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/admin/plans');
            const data = await res.json();
            if (res.ok) setPlans(data.plans || []);
        } catch (_error) {
            toast.error('Error al cargar el catálogo de planes');
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateStatus = async (gymId: string, status: string) => {
        setUpdating(true);
        try {
            const res = await fetch('/api/admin/billing', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ gymId, status })
            });
            if (res.ok) {
                toast.success('Estado de pago actualizado');
                fetchGyms();
            }
        } catch (_error) {
            toast.error('Error al actualizar estado');
        } finally {
            setUpdating(false);
        }
    };

    const handleUpdateDiscount = async (gymId: string, discount: number) => {
        setUpdating(true);
        try {
            const res = await fetch('/api/admin/billing', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ gymId, discount })
            });
            if (res.ok) {
                toast.success(`Descuento del ${discount}% aplicado`);
                fetchGyms();
            }
        } catch (_error) {
            toast.error('Error al aplicar descuento');
        } finally {
            setUpdating(false);
        }
    };

    // CRUD Plan Actions
    const openCreatePlan = () => {
        setEditingPlan(null);
        setPlanForm({
            nombre: '',
            precio_mensual: 29.00,
            limite_sucursales: 1,
            limite_usuarios: 100,
            caracteristicasStr: 'Soporte B2B Técnico',
            modulos: {
                rutinas_ia: true,
                nutricion_ia: false,
                vision_ia: false,
                pagos_online: true,
                crm: false,
                tienda_pos: false,
                equipamiento_ia: false,
                gamificacion: false,
                clases_reserva: true
            }
        });
        setShowPlanModal(true);
    };

    const openEditPlan = (plan: SubscriptionPlan) => {
        setEditingPlan(plan);
        const caracts = plan.caracteristicas || [];
        const modulos = {
            rutinas_ia: caracts.includes('Módulo: Rutinas IA'),
            nutricion_ia: caracts.includes('Módulo: Nutrición IA'),
            vision_ia: caracts.includes('Módulo: Visión Lab'),
            pagos_online: caracts.includes('Módulo: Pagos Online'),
            crm: caracts.includes('Módulo: CRM Ventas'),
            tienda_pos: caracts.includes('Módulo: Tienda & POS'),
            equipamiento_ia: caracts.includes('Módulo: Equipamiento (IA)'),
            gamificacion: caracts.includes('Módulo: Gamificación'),
            clases_reserva: caracts.includes('Módulo: Clases & Reservas')
        };
        const filtradas = caracts.filter(x => !x.startsWith('Módulo: '));

        setPlanForm({
            nombre: plan.nombre,
            precio_mensual: plan.precio_mensual,
            limite_sucursales: plan.limite_sucursales || 1,
            limite_usuarios: plan.limite_usuarios || 100,
            caracteristicasStr: filtradas.join('\n'),
            modulos
        });
        setShowPlanModal(true);
    };

    const handleSavePlan = async (e: React.FormEvent) => {
        e.preventDefault();
        setUpdating(true);
        try {
            const url = editingPlan ? `/api/admin/plans/${editingPlan.id}` : '/api/admin/plans';
            const method = editingPlan ? 'PUT' : 'POST';
            
            const caractsList: string[] = [];
            if (planForm.modulos.rutinas_ia) caractsList.push('Módulo: Rutinas IA');
            if (planForm.modulos.nutricion_ia) caractsList.push('Módulo: Nutrición IA');
            if (planForm.modulos.vision_ia) caractsList.push('Módulo: Visión Lab');
            if (planForm.modulos.pagos_online) caractsList.push('Módulo: Pagos Online');
            if (planForm.modulos.crm) caractsList.push('Módulo: CRM Ventas');
            if (planForm.modulos.tienda_pos) caractsList.push('Módulo: Tienda & POS');
            if (planForm.modulos.equipamiento_ia) caractsList.push('Módulo: Equipamiento (IA)');
            if (planForm.modulos.gamificacion) caractsList.push('Módulo: Gamificación');
            if (planForm.modulos.clases_reserva) caractsList.push('Módulo: Clases & Reservas');

            const adicionales = planForm.caracteristicasStr.split('\n').filter(x => x.trim() !== '');

            const payload = {
                nombre: planForm.nombre,
                precio_mensual: Number(planForm.precio_mensual),
                limite_sucursales: Number(planForm.limite_sucursales),
                limite_usuarios: Number(planForm.limite_usuarios),
                caracteristicas: [...caractsList, ...adicionales]
            };

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                toast.success(editingPlan ? 'Plan actualizado con éxito' : 'Nuevo plan catalogado con éxito');
                setShowPlanModal(false);
                fetchPlans();
            } else {
                const data = await res.json();
                toast.error(data.error || 'Error al guardar el plan');
            }
        } catch (_err) {
            toast.error('Error de red al guardar plan');
        } finally {
            setUpdating(false);
        }
    };

    const handleDeletePlan = async (planId: string, planName: string) => {
        if (!confirm(`¿Estás completamente seguro de eliminar el plan "${planName}"?\nEsta acción retirará el plan del catálogo y no se podrá deshacer.`)) return;
        setUpdating(true);
        try {
            const res = await fetch(`/api/admin/plans/${planId}`, {
                method: 'DELETE'
            });
            if (res.ok) {
                toast.success('Plan eliminado correctamente');
                fetchPlans();
            } else {
                const data = await res.json();
                toast.error(data.error || 'Error al eliminar');
            }
        } catch (_err) {
            toast.error('Error de red al intentar eliminar');
        } finally {
            setUpdating(false);
        }
    };

    const filteredGyms = gyms.filter(g =>
        g.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
        g.slug.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-8 p-4 md:p-8 font-rajdhani">
            {/* Header section with Stats */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                    <h1 className="text-4xl font-black text-transparent bg-clip-text bg-linear-to-r from-white via-white to-tactical-cyan italic uppercase tracking-tighter leading-none">
                        💰 Facturación & Suscripciones B2B
                    </h1>
                    <p className="text-zinc-400 mt-2 font-medium tracking-wide">
                        {activeTab === 'billing' 
                            ? 'Administra el estado de pago de los gimnasios de la red, aplica descuentos y suspende accesos.'
                            : 'Gestiona la oferta comercial del SaaS. Crea, modifica y retira planes del catálogo oficial.'}
                    </p>
                </div>

                <div className="flex items-center gap-4">
                    {/* Tab Selector */}
                    <div className="flex bg-zinc-900/80 p-1.5 rounded-2xl border border-white/5 shadow-inner">
                        {[
                            { id: 'billing', label: 'Cobros Gimnasios', icon: <ListFilter size={14} /> },
                            { id: 'plans', label: 'Gestor de Planes', icon: <Gem size={14} /> }
                        ].map(t => (
                            <button
                                key={t.id}
                                onClick={() => setActiveTab(t.id as 'billing' | 'plans')}
                                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                                    activeTab === t.id
                                        ? 'bg-tactical-cyan text-black shadow-[0_0_15px_rgba(0,245,255,0.25)]'
                                        : 'text-zinc-500 hover:text-white'
                                }`}
                            >
                                {t.icon}
                                {t.label}
                            </button>
                        ))}
                    </div>

                    {activeTab === 'plans' && (
                        <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={openCreatePlan}
                            className="px-5 py-3 bg-tactical-cyan text-black rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center gap-2 shadow-lg shadow-tactical-cyan/20"
                        >
                            <Plus size={16} />
                            Crear Nuevo Plan
                        </motion.button>
                    )}
                </div>
            </div>

            <AnimatePresence mode="wait">
                {loading && (activeTab === 'billing' ? gyms.length === 0 : plans.length === 0) ? (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="min-h-[40vh] flex flex-col items-center justify-center gap-4"
                    >
                        <div className="w-12 h-12 border-4 border-tactical-cyan/20 border-t-tactical-cyan rounded-full animate-spin" />
                        <p className="text-zinc-500 font-bold text-xs uppercase tracking-widest animate-pulse">Sincronizando con el catálogo...</p>
                    </motion.div>
                ) : activeTab === 'billing' ? (
                    <motion.div
                        key="billing"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className="space-y-8"
                    >
                        {/* Quick Stats Header */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                            <div className="bg-zinc-950 p-6 rounded-[2rem] border border-white/5 flex items-center gap-4 relative overflow-hidden">
                                <div className="absolute top-0 left-0 w-1/3 h-[2px] bg-green-500/40" />
                                <div className="w-12 h-12 bg-green-500/10 rounded-2xl flex items-center justify-center text-green-500">
                                    <Activity size={24} />
                                </div>
                                <div>
                                    <p className="text-[10px] text-zinc-500 font-black uppercase tracking-wider">Activos al Día</p>
                                    <p className="text-2xl font-black text-white italic">{gyms.filter(g => g.estado_pago_saas === 'al_dia' || g.estado_pago_saas === 'active').length}</p>
                                </div>
                            </div>
                            <div className="bg-zinc-950 p-6 rounded-[2rem] border border-white/5 flex items-center gap-4 relative overflow-hidden">
                                <div className="absolute top-0 left-0 w-1/3 h-[2px] bg-amber-500/40" />
                                <div className="w-12 h-12 bg-amber-500/10 rounded-2xl flex items-center justify-center text-amber-500">
                                    <AlertCircle size={24} />
                                </div>
                                <div>
                                    <p className="text-[10px] text-zinc-500 font-black uppercase tracking-wider">Pendientes de Pago</p>
                                    <p className="text-2xl font-black text-white italic">{gyms.filter(g => g.estado_pago_saas === 'pendiente' || g.estado_pago_saas === 'past_due').length}</p>
                                </div>
                            </div>
                            <div className="bg-zinc-950 p-6 rounded-[2rem] border border-white/5 flex items-center gap-4 relative overflow-hidden">
                                <div className="absolute top-0 left-0 w-1/3 h-[2px] bg-red-500/40" />
                                <div className="w-12 h-12 bg-red-500/10 rounded-2xl flex items-center justify-center text-red-500">
                                    <Power size={24} />
                                </div>
                                <div>
                                    <p className="text-[10px] text-zinc-500 font-black uppercase tracking-wider">Suspendidos / Impagos</p>
                                    <p className="text-2xl font-black text-white italic">{gyms.filter(g => g.estado_pago_saas === 'suspendido' || g.estado_pago_saas === 'unpaid').length}</p>
                                </div>
                            </div>
                        </div>

                        {/* Main List Table */}
                        <div className="bg-zinc-950 rounded-[2.5rem] border border-white/5 overflow-hidden shadow-2xl">
                            <div className="p-8 border-b border-white/5 flex flex-col md:flex-row justify-between gap-4">
                                <h3 className="text-xl font-black text-white italic uppercase">Clientes de la Red</h3>
                                <div className="relative max-w-md w-full">
                                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600" size={18} />
                                    <input
                                        type="text"
                                        placeholder="Buscar gimnasio o slug..."
                                        className="w-full bg-white/5 border border-white/10 rounded-2xl pl-12 pr-4 py-3 text-xs text-white uppercase font-bold tracking-wider focus:border-tactical-cyan outline-none transition-all placeholder:text-zinc-600"
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                    />
                                </div>
                            </div>

                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead>
                                        <tr className="bg-black/40 text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] border-b border-white/5">
                                            <th className="px-8 py-5">Gimnasio</th>
                                            <th className="px-8 py-5">Plan actual</th>
                                            <th className="px-8 py-5">Estado Pago</th>
                                            <th className="px-8 py-5">Próx. Vencimiento</th>
                                            <th className="px-8 py-5">Descuento</th>
                                            <th className="px-8 py-5 text-right font-black">Mando Global</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5">
                                        {filteredGyms.map((gym) => (
                                            <tr key={gym.id} className="hover:bg-white/2 transition-colors">
                                                <td className="px-8 py-5">
                                                    <div className="flex flex-col">
                                                        <span className="text-sm font-black text-white">{gym.nombre}</span>
                                                        <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">{gym.slug}</span>
                                                    </div>
                                                </td>
                                                <td className="px-8 py-5">
                                                    <span className="px-3 py-1 bg-purple-500/10 text-purple-400 rounded-full text-[9px] font-black uppercase tracking-widest border border-purple-500/20">
                                                        {gym.planes_suscripcion?.nombre || 'Personalizado'}
                                                    </span>
                                                </td>
                                                <td className="px-8 py-5">
                                                    <div className="flex items-center gap-2">
                                                        <div className={`w-2 h-2 rounded-full ${
                                                            gym.estado_pago_saas === 'al_dia' || gym.estado_pago_saas === 'active' ? 'bg-green-500' :
                                                            gym.estado_pago_saas === 'pendiente' || gym.estado_pago_saas === 'past_due' ? 'bg-amber-500' : 'bg-red-500'
                                                        } animate-pulse`} />
                                                        <span className={`text-[10px] font-black uppercase tracking-widest ${
                                                            gym.estado_pago_saas === 'al_dia' || gym.estado_pago_saas === 'active' ? 'text-green-500' :
                                                            gym.estado_pago_saas === 'pendiente' || gym.estado_pago_saas === 'past_due' ? 'text-amber-500' : 'text-red-500'
                                                        }`}>
                                                            {gym.estado_pago_saas === 'active' ? 'AL DIA' : gym.estado_pago_saas === 'past_due' ? 'DEUDA' : gym.estado_pago_saas.replace('_', ' ')}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="px-8 py-5">
                                                    <div className="flex items-center gap-2 text-xs text-zinc-400 font-medium">
                                                        <Calendar size={14} className="text-tactical-cyan" />
                                                        {gym.fecha_proximo_pago ? new Date(gym.fecha_proximo_pago).toLocaleDateString('es-AR') : 'Sin fecha'}
                                                    </div>
                                                </td>
                                                <td className="px-8 py-5">
                                                    <div className="flex items-center gap-2">
                                                        <Percent size={14} className="text-tactical-magenta" />
                                                        <input
                                                            type="number"
                                                            className="w-16 bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-xs text-white font-bold outline-none"
                                                            defaultValue={gym.descuento_saas}
                                                            onBlur={(e) => handleUpdateDiscount(gym.id, parseInt(e.target.value) || 0)}
                                                        />
                                                    </div>
                                                </td>
                                                <td className="px-8 py-5 text-right">
                                                    <div className="flex justify-end gap-2">
                                                        <button
                                                            onClick={() => handleUpdateStatus(gym.id, 'active')}
                                                            disabled={updating}
                                                            className="p-2 hover:bg-green-500/10 text-zinc-600 hover:text-green-400 transition-all rounded-xl disabled:opacity-50"
                                                            title="Marcar como Al Día"
                                                        >
                                                            <CheckCircle2 size={18} />
                                                        </button>
                                                        <button
                                                            onClick={() => handleUpdateStatus(gym.id, 'unpaid')}
                                                            disabled={updating}
                                                            className="p-2 hover:bg-red-500/10 text-zinc-600 hover:text-red-400 transition-all rounded-xl disabled:opacity-50"
                                                            title="Suspender acceso"
                                                        >
                                                            <Power size={18} />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </motion.div>
                ) : (
                    <motion.div
                        key="plans"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className="grid grid-cols-1 md:grid-cols-3 gap-8"
                    >
                        {plans.map((plan) => (
                            <motion.div
                                key={plan.id}
                                whileHover={{ y: -5 }}
                                className="bg-zinc-950 rounded-[2.5rem] border border-white/5 p-8 flex flex-col justify-between relative overflow-hidden shadow-2xl group hover:border-tactical-cyan/30 transition-all duration-500"
                            >
                                <div className="absolute top-0 right-0 w-24 h-24 bg-tactical-cyan/5 rounded-full blur-2xl" />
                                <div>
                                    <div className="flex justify-between items-start mb-6">
                                        <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center text-tactical-cyan border border-white/5 shadow-inner">
                                            <Gem size={20} />
                                        </div>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => openEditPlan(plan)}
                                                className="p-2 bg-white/5 hover:bg-tactical-cyan/20 text-zinc-400 hover:text-tactical-cyan rounded-xl border border-white/5 transition-colors"
                                                title="Editar Plan"
                                            >
                                                <Edit3 size={14} />
                                            </button>
                                            <button
                                                onClick={() => handleDeletePlan(plan.id, plan.nombre)}
                                                className="p-2 bg-white/5 hover:bg-red-600/20 text-zinc-400 hover:text-red-400 rounded-xl border border-white/5 transition-colors"
                                                title="Eliminar Plan"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    </div>

                                    <h3 className="text-2xl font-black text-white italic uppercase tracking-tight">{plan.nombre}</h3>
                                    <div className="my-6">
                                        <span className="text-4xl font-black text-tactical-cyan italic">${plan.precio_mensual}</span>
                                        <span className="text-zinc-500 text-xs font-black uppercase tracking-widest"> / mes</span>
                                    </div>

                                    <div className="space-y-3 py-4 border-t border-b border-white/5 my-6 text-[10px] font-black uppercase tracking-widest text-zinc-400">
                                        <div className="flex items-center gap-2">
                                            <Layers className="w-4 h-4 text-tactical-magenta" />
                                            <span>Límite de Sedes: {plan.limite_sucursales}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Users className="w-4 h-4 text-tactical-magenta" />
                                            <span>Límite de Alumnos: {plan.limite_usuarios}</span>
                                        </div>
                                    </div>

                                    <ul className="space-y-3">
                                        {(plan.caracteristicas || []).map((feat, idx) => {
                                            const isModulo = feat.startsWith('Módulo: ');
                                            const displayName = isModulo ? feat.replace('Módulo: ', '') : feat;
                                            return (
                                                <li key={idx} className={`flex items-center gap-3 text-xs font-bold uppercase tracking-wider ${
                                                    isModulo ? 'text-tactical-cyan' : 'text-zinc-400'
                                                }`}>
                                                    {isModulo ? (
                                                        <span className="text-tactical-magenta filter drop-shadow-[0_0_4px_rgba(255,0,255,0.4)]">⚡</span>
                                                    ) : (
                                                        <span className="text-tactical-cyan filter drop-shadow-[0_0_4px_rgba(0,245,255,0.4)]">✓</span>
                                                    )}
                                                    {displayName}
                                                </li>
                                            );
                                        })}
                                    </ul>
                                </div>
                            </motion.div>
                        ))}
                        {plans.length === 0 && (
                            <div className="col-span-full py-20 text-center text-zinc-500 border border-dashed border-white/10 rounded-[2.5rem]">
                                No hay planes registrados en la oferta comercial.
                            </div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Modal para Crear / Editar Plan */}
            {showPlanModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-zinc-950 border border-white/10 rounded-[2.5rem] w-full max-w-lg overflow-hidden shadow-2xl flex flex-col relative"
                    >
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-tactical-cyan to-tactical-magenta" />
                        
                        <div className="p-8 border-b border-white/5">
                            <h3 className="text-2xl font-black text-white italic uppercase tracking-tighter flex items-center gap-3">
                                <Gem className="text-tactical-cyan" /> {editingPlan ? 'Editar Plan B2B' : 'Nuevo Plan SaaS'}
                            </h3>
                            <p className="text-zinc-500 text-[10px] mt-1 uppercase font-black tracking-widest">Catálogo de Suscripciones Globales</p>
                        </div>

                        <form onSubmit={handleSavePlan} className="p-8 space-y-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Nombre Comercial del Plan</label>
                                <input
                                    type="text"
                                    value={planForm.nombre}
                                    onChange={e => setPlanForm({ ...planForm, nombre: e.target.value })}
                                    placeholder="Ej: Plan VIP Elite"
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-xs uppercase font-bold tracking-wider focus:outline-none focus:border-tactical-cyan transition-all placeholder:text-zinc-600"
                                    required
                                />
                            </div>

                            <div className="grid grid-cols-3 gap-4">
                                <div className="space-y-2 col-span-1">
                                    <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Precio (USD)</label>
                                    <input
                                        type="number"
                                        value={planForm.precio_mensual}
                                        onChange={e => setPlanForm({ ...planForm, precio_mensual: Number(e.target.value) })}
                                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-xs font-bold focus:outline-none focus:border-tactical-cyan transition-all"
                                        required
                                    />
                                </div>
                                <div className="space-y-2 col-span-1">
                                    <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Límite Sedes</label>
                                    <input
                                        type="number"
                                        value={planForm.limite_sucursales}
                                        onChange={e => setPlanForm({ ...planForm, limite_sucursales: Number(e.target.value) })}
                                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-xs font-bold focus:outline-none focus:border-tactical-cyan transition-all"
                                        required
                                    />
                                </div>
                                <div className="space-y-2 col-span-1">
                                    <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Límite Usuarios</label>
                                    <input
                                        type="number"
                                        value={planForm.limite_usuarios}
                                        onChange={e => setPlanForm({ ...planForm, limite_usuarios: Number(e.target.value) })}
                                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-xs font-bold focus:outline-none focus:border-tactical-cyan transition-all"
                                        required
                                    />
                                </div>
                            </div>

                                <div className="space-y-3 border-t border-b border-white/5 py-4 my-2">
                                <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Módulos del Sistema Incluidos</label>
                                <div className="grid grid-cols-2 gap-3 text-xs font-bold uppercase">
                                    {[
                                        { key: 'rutinas_ia', label: '🧠 Rutinas IA' },
                                        { key: 'nutricion_ia', label: '🥗 Nutrición IA' },
                                        { key: 'vision_ia', label: '🎥 Visión Lab (Videos)' },
                                        { key: 'pagos_online', label: '💳 Pagos Online / POS' },
                                        { key: 'crm', label: '🎯 CRM Ventas' },
                                        { key: 'tienda_pos', label: '🛒 Tienda & POS' },
                                        { key: 'equipamiento_ia', label: '🏋️ Equipamiento (IA)' },
                                        { key: 'gamificacion', label: '⚔️ Gamificación' },
                                        { key: 'clases_reserva', label: '📅 Clases & Reservas' }
                                    ].map((m) => (
                                        <label key={m.key} className="flex items-center gap-2 p-3 bg-white/2 border border-white/5 rounded-xl cursor-pointer hover:border-tactical-cyan/20 transition-all select-none">
                                            <input
                                                type="checkbox"
                                                checked={(planForm.modulos as any)[m.key]}
                                                onChange={e => setPlanForm({
                                                    ...planForm,
                                                    modulos: {
                                                        ...planForm.modulos,
                                                        [m.key]: e.target.checked
                                                    }
                                                })}
                                                className="w-4 h-4 rounded text-tactical-cyan bg-zinc-800 border-white/10 outline-none"
                                            />
                                            <span>{m.label}</span>
                                        </label>
                                    ))}
                                </div>
                             </div>

                             <div className="space-y-2">
                                 <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Características Adicionales (Una por línea)</label>
                                 <textarea
                                     rows={3}
                                     value={planForm.caracteristicasStr}
                                     onChange={e => setPlanForm({ ...planForm, caracteristicasStr: e.target.value })}
                                     placeholder="Ej: Soporte B2B Técnico Premium..."
                                     className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-xs font-bold focus:outline-none focus:border-tactical-cyan transition-all resize-none"
                                 />
                             </div>

                            <div className="flex gap-4 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setShowPlanModal(false)}
                                    className="flex-1 px-6 py-4 bg-white/5 text-white text-[10px] font-black uppercase tracking-widest rounded-2xl hover:bg-white/10 transition-all border border-white/5"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={updating}
                                    className="flex-1 px-6 py-4 bg-tactical-cyan text-black text-[10px] font-black uppercase tracking-widest rounded-2xl shadow-lg shadow-tactical-cyan/20 hover:scale-105 transition-all"
                                >
                                    Guardar Plan
                                </button>
                            </div>
                        </form>
                    </motion.div>
                </div>
            )}
        </div>
    );
}
