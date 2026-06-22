'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import {
    Building2,
    Plus,
    MapPin,
    Users,
    CheckCircle2,
    XCircle,
    Eye,
    ShieldAlert
} from 'lucide-react';
import Image from 'next/image';

interface Sucursal {
    id: string;
    nombre: string;
    direccion: string;
    creado_en: string;
}

interface Gimnasio {
    id: string;
    nombre: string;
    slug: string;
    logo_url: string;
    color_primario: string;
    es_activo: boolean;
    sucursales: Sucursal[];
    modulos_activos: Record<string, boolean>;
    creado_en: string;
    plan_id?: string;
    estado_pago_saas?: string;
    config_visual?: Record<string, unknown>;
}

export default function GymsManagementPage() {
    const [gyms, setGyms] = useState<Gimnasio[]>([]);
    const [loading, setLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showBranchModal, setShowBranchModal] = useState(false);
    const [showConfigModal, setShowConfigModal] = useState(false);
    const [isOnboardMode, setIsOnboardMode] = useState(false);

    const [creating, setCreating] = useState(false);
    const [selectedGym, setSelectedGym] = useState<Gimnasio | null>(null);
    const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
    const [deleteConfirmName, setDeleteConfirmName] = useState('');

    // Estados para el Modal de Impersonación Premium
    const [impersonationTarget, setImpersonationTarget] = useState<{ id: string; nombre: string } | null>(null);
    const [impersonationReason, setImpersonationReason] = useState('Soporte Técnico / Verificación');
    const [isImpersonatingApi, setIsImpersonatingApi] = useState(false);

    // Form states
    const [formData, setFormData] = useState({
        nombre: '',
        slug: '',
        sucursal_nombre: 'Casa Central',
        direccion: '',
        logo_url: '',
        plan_id: '',
        admin_nombre: '',
        admin_email: '',
        admin_password: '',
        mp_public_key: '',
        mp_access_token: '',
        modulos: {
            rutinas_ia: true,
            nutricion_ia: false,
            pagos_online: true,
            clases_reserva: true,
            gamificacion: false
        } as Record<string, boolean>
    });

    const [branchData, setBranchData] = useState({
        nombre: '',
        direccion: ''
    });

    const [configData, setConfigData] = useState({
        nombre: '',
        slug: '',
        es_activo: true,
        logo_url: '',
        plan_id: '',
        estado_pago_saas: '',
        color_primario: '#6d28d9',
        modulos: {} as Record<string, boolean>
    });

    const [plans, setPlans] = useState<{ id: string; nombre: string; precio_mensual: number }[]>([]);

    useEffect(() => {
        fetchGyms();
        fetchPlans();
    }, []);

    const handleImpersonate = (gymId: string, gymName: string) => {
        setImpersonationTarget({ id: gymId, nombre: gymName });
        setImpersonationReason('Soporte Técnico / Verificación');
    };

    const executeImpersonation = async () => {
        if (!impersonationTarget) return;
        setIsImpersonatingApi(true);
        const loadingToast = toast.loading(`Accediendo remotamente al entorno de ${impersonationTarget.nombre}...`);
        try {
            const res = await fetch('/api/admin/impersonate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    gymId: impersonationTarget.id, 
                    reason: impersonationReason || 'Soporte Técnico / Verificación' 
                })
            });

            const data = await res.json();
            if (res.ok) {
                toast.success(data.message);
                window.open(data.redirectUrl, '_blank');
                setImpersonationTarget(null);
                setImpersonationReason('Soporte Técnico / Verificación');
            } else {
                toast.error(data.error || 'Error al intentar el acceso remoto');
            }
        } catch (_err) {
            toast.error('Error de red al intentar el acceso remoto');
        } finally {
            toast.dismiss(loadingToast);
            setIsImpersonatingApi(false);
        }
    };

    const fetchPlans = async () => {
        try {
            const res = await fetch('/api/admin/plans/list');
            const data = await res.json();
            if (res.ok) setPlans(data.plans || []);
        } catch (error) {
            console.error('Error fetching plans:', error);
        }
    };

    const fetchGyms = async () => {
        try {
            const res = await fetch('/api/admin/gyms/list');
            const data = await res.json();
            if (res.ok) {
                setGyms(data.gyms || []);
            } else {
                toast.error(data.error || 'Error al cargar gimnasios');
            }
        } catch (err) {
            console.error(err);
            toast.error('Error de conexión');
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        setCreating(true);
        try {
            const url = isOnboardMode ? '/api/admin/gyms/onboard' : '/api/admin/gyms/create';
            
            const payload = isOnboardMode ? {
                nombre: formData.nombre,
                slug: formData.slug.toLowerCase(),
                sucursal_nombre: formData.sucursal_nombre || 'Casa Central',
                direccion: formData.direccion || '',
                plan_id: formData.plan_id || plans[0]?.id || '',
                modulos: formData.modulos,
                admin_nombre: formData.admin_nombre,
                admin_email: formData.admin_email,
                admin_password: formData.admin_password,
                configuracion: (formData.mp_public_key || formData.mp_access_token) ? {
                    mercado_pago: {
                        public_key: formData.mp_public_key,
                        access_token: formData.mp_access_token,
                        sandbox_mode: true
                    }
                } : {}
            } : formData;

            const res = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const data = await res.json();
            if (res.ok) {
                toast.success(isOnboardMode ? '¡Onboarding completado con éxito!' : '¡Gimnasio creado con éxito!');
                setShowCreateModal(false);
                setIsOnboardMode(false);
                setFormData({
                    nombre: '',
                    slug: '',
                    sucursal_nombre: 'Casa Central',
                    direccion: '',
                    logo_url: '',
                    plan_id: '',
                    admin_nombre: '',
                    admin_email: '',
                    admin_password: '',
                    mp_public_key: '',
                    mp_access_token: '',
                    modulos: {
                        rutinas_ia: true,
                        nutricion_ia: false,
                        pagos_online: true,
                        clases_reserva: true,
                        gamificacion: false
                    }
                });
                fetchGyms();
            } else {
                toast.error(data.error || 'Error al procesar la solicitud');
            }
        } catch (err) {
            console.error('Gym creation error:', err);
            toast.error('Error de red');
        } finally {
            setCreating(false);
        }
    };

    const handleCreateBranch = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedGym) return;
        setCreating(true);
        try {
            const res = await fetch('/api/admin/gyms/branch/create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...branchData, gymId: selectedGym.id })
            });
            if (res.ok) {
                toast.success('Sede añadida correctamente');
                setShowBranchModal(false);
                setBranchData({ nombre: '', direccion: '' });
                fetchGyms();
            } else {
                const data = await res.json();
                toast.error(data.error || 'Error al crear sede');
            }
        } catch (err) {
            console.error('Create branch error:', err);
            toast.error('Error de red');
        } finally {
            setCreating(false);
        }
    };

    const handleUpdateGym = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedGym) return;
        setCreating(true);
        try {
            const res = await fetch('/api/admin/gyms/update', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: selectedGym.id,
                    nombre: configData.nombre,
                    slug: configData.slug,
                    es_activo: configData.es_activo,
                    logo_url: configData.logo_url,
                    color_primario: configData.color_primario,
                    plan_id: configData.plan_id,
                    estado_pago_saas: configData.estado_pago_saas,
                    modulos_activos: configData.modulos,
                    config_visual: {
                        logo_url: configData.logo_url,
                        tema: 'dark'
                    }
                })
            });
            if (res.ok) {
                toast.success('Configuración actualizada');
                setShowConfigModal(false);
                fetchGyms();
            } else {
                const data = await res.json();
                toast.error(data.error || 'Error al actualizar');
            }
        } catch (err) {
            console.error('Update gym error:', err);
            toast.error('Error de red');
        } finally {
            setCreating(false);
        }
    };

    const openConfig = (gym: Gimnasio) => {
        setSelectedGym(gym);
        setShowDeleteConfirmation(false);
        setDeleteConfirmName('');
        setConfigData({
            nombre: gym.nombre,
            slug: gym.slug,
            es_activo: gym.es_activo,
            logo_url: gym.logo_url || '',
            plan_id: gym.plan_id || '',
            estado_pago_saas: gym.estado_pago_saas || 'active',
            color_primario: gym.color_primario || '#6d28d9',
            modulos: gym.modulos_activos || {
                rutinas_ia: true,
                gamificacion: true,
                nutricion_ia: true,
                pagos_online: true,
                clases_reserva: true
            }
        });
        setShowConfigModal(true);
    };

    const handleDeleteGym = async () => {
        if (!selectedGym) return;
        setCreating(true);
        const toastId = toast.loading(`Eliminando ${selectedGym.nombre} y todos sus registros...`);
        try {
            const res = await fetch('/api/admin/gyms/delete', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ gymId: selectedGym.id })
            });
            const data = await res.json();
            if (res.ok) {
                toast.success('Gimnasio eliminado correctamente de la red');
                setShowConfigModal(false);
                fetchGyms();
            } else {
                toast.error(data.error || 'Error al eliminar el gimnasio');
            }
        } catch (err) {
            console.error('Delete gym error:', err);
            toast.error('Error de red al intentar eliminar el gimnasio');
        } finally {
            toast.dismiss(toastId);
            setCreating(false);
        }
    };

    const openBranchModal = (gym: Gimnasio) => {
        setSelectedGym(gym);
        setShowBranchModal(true);
    };

    return (
        <div className="space-y-8 p-4 md:p-8">
            {/* Header section with Stats */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                    <h1 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-white to-primary">
                        🏢 Gestión de Red (SaaS)
                    </h1>
                    <p className="text-gray-400 mt-2 font-medium">
                        Administra múltiples gimnasios y sucursales desde un solo lugar.
                    </p>
                </div>

                <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setShowCreateModal(true)}
                    className="px-6 py-3 bg-primary hover:opacity-90 text-primary-foreground rounded-2xl font-bold flex items-center gap-2 shadow-lg shadow-primary/20 transition-all"
                >
                    <Plus size={20} />
                    Sumar Nuevo Gimnasio
                </motion.button>
            </div>

            {/* Modal de Creación de Gimnasio */}
            <AnimatePresence>
                {showCreateModal && (
                    <Modal onClose={() => setShowCreateModal(false)} title="Nueva Entidad Gym">
                        <form onSubmit={handleCreate} className="space-y-4 max-h-[75vh] overflow-y-auto pr-2">
                            <Input label="Nombre Comercial" value={formData.nombre} onChange={v => setFormData({ ...formData, nombre: v })} placeholder="Ej: PowerBox S.A." />
                            <Input label="Identificador (Slug)" value={formData.slug} onChange={v => setFormData({ ...formData, slug: v })} placeholder="ej: powerbox" className="font-mono text-sm" />
                            <Input label="Nombre Sede Inicial" value={formData.sucursal_nombre} onChange={v => setFormData({ ...formData, sucursal_nombre: v })} />
                            <Input label="Dirección" value={formData.direccion} onChange={v => setFormData({ ...formData, direccion: v })} placeholder="Calle 123, Ciudad" />
                            
                            {/* Switch de Onboarding Completo */}
                            <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/10 my-4">
                                <div className="pr-4">
                                    <p className="text-xs font-black uppercase text-white leading-none">Modo Onboarding Completo</p>
                                    <p className="text-[9px] text-gray-500 font-bold uppercase tracking-wider mt-1.5 leading-tight">
                                        Inicializa simultáneamente la cuenta del administrador, el plan de suscripción y sus módulos autorizados.
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setIsOnboardMode(!isOnboardMode)}
                                    className={`w-14 h-7 rounded-full transition-all relative shrink-0 p-1 flex items-center ${isOnboardMode ? 'bg-primary' : 'bg-zinc-800'}`}
                                >
                                    <div
                                        className={`w-5 h-5 bg-white rounded-full transition-transform duration-300 ${
                                            isOnboardMode ? 'translate-x-7' : 'translate-x-0'
                                        }`}
                                    />
                                </button>
                            </div>

                            {/* Secciones Adicionales de Onboarding */}
                            <AnimatePresence>
                                {isOnboardMode && (
                                    <motion.div
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: 'auto' }}
                                        exit={{ opacity: 0, height: 0 }}
                                        transition={{ duration: 0.3 }}
                                        className="space-y-4 border-t border-white/5 pt-4 overflow-hidden"
                                    >
                                        <div className="border-b border-white/5 pb-2">
                                            <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Credenciales del Administrador</h4>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <Input label="Nombre Administrador" value={formData.admin_nombre} onChange={v => setFormData({ ...formData, admin_nombre: v })} placeholder="Ej: Juan Pérez" />
                                            <Input label="Email Administrador" value={formData.admin_email} onChange={v => setFormData({ ...formData, admin_email: v })} placeholder="juan@gimnasio.com" />
                                        </div>
                                        <Input label="Contraseña Inicial" value={formData.admin_password} onChange={v => setFormData({ ...formData, admin_password: v })} placeholder="Clave temporal" className="font-mono text-sm" />

                                        <div className="border-b border-white/5 pb-2 pt-2">
                                            <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Plan & Módulos Activos</h4>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-2">Plan Comercial</label>
                                            <select
                                                className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-3 text-white focus:border-red-500 outline-none transition-all"
                                                value={formData.plan_id}
                                                onChange={e => setFormData({ ...formData, plan_id: e.target.value })}
                                            >
                                                <option value="" className="bg-[#1c1c1e]">Selecciona un Plan</option>
                                                {plans.map(p => (
                                                    <option key={p.id} value={p.id} className="bg-[#1c1c1e]">{p.nombre} (${p.precio_mensual}/mes)</option>
                                                ))}
                                            </select>
                                        </div>

                                        <div className="grid grid-cols-2 gap-3 pt-2">
                                            {[
                                                { id: 'rutinas_ia', label: 'IA Rutinas' },
                                                { id: 'nutricion_ia', label: 'IA Nutrición' },
                                                { id: 'pagos_online', label: 'Pagos / POS' },
                                                { id: 'clases_reserva', label: 'Reservas' },
                                                { id: 'gamificacion', label: 'Gamificación' }
                                            ].map(m => (
                                                <div key={m.id} className="flex items-center gap-3 p-3 bg-white/5 rounded-xl border border-white/5">
                                                    <button
                                                        type="button"
                                                        onClick={() => setFormData({
                                                            ...formData,
                                                            modulos: {
                                                                ...formData.modulos,
                                                                [m.id]: !formData.modulos[m.id]
                                                            }
                                                        })}
                                                        className={`w-10 h-5 rounded-full transition-all relative shrink-0 p-0.5 flex items-center ${formData.modulos[m.id] ? 'bg-primary' : 'bg-zinc-800'}`}
                                                    >
                                                        <div
                                                            className={`w-4 h-4 bg-white rounded-full transition-transform duration-300 ${
                                                                formData.modulos[m.id] ? 'translate-x-5' : 'translate-x-0'
                                                            }`}
                                                        />
                                                    </button>
                                                    <span className="text-[9px] font-bold text-gray-300 uppercase tracking-wide">{m.label}</span>
                                                </div>
                                            ))}
                                        </div>

                                        <div className="border-b border-white/5 pb-2 pt-4">
                                            <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Pasarela MercadoPago (Opcional)</h4>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <Input label="Access Token MP" value={formData.mp_access_token} onChange={v => setFormData({ ...formData, mp_access_token: v })} placeholder="APP_USR-..." className="text-xs" />
                                            <Input label="Public Key MP" value={formData.mp_public_key} onChange={v => setFormData({ ...formData, mp_public_key: v })} placeholder="APP_USR-..." className="text-xs" />
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            <div className="flex gap-4 pt-4">
                                <ModalButton type="button" onClick={() => { setShowCreateModal(false); setIsOnboardMode(false); }} variant="secondary">Cancelar</ModalButton>
                                <ModalButton type="submit" disabled={creating}>{creating ? 'Procesando...' : isOnboardMode ? 'Completar Onboarding' : 'Confirmar Registro'}</ModalButton>
                            </div>
                        </form>
                    </Modal>
                )}

                {/* Modal de Nueva Sede */}
                {showBranchModal && (
                    <Modal onClose={() => setShowBranchModal(false)} title={`Añadir Sede a ${selectedGym?.nombre}`}>
                        <form onSubmit={handleCreateBranch} className="space-y-4">
                            <Input label="Nombre de la Sede" value={branchData.nombre} onChange={v => setBranchData({ ...branchData, nombre: v })} placeholder="Ej: Sucursal Norte" />
                            <Input label="Dirección" value={branchData.direccion} onChange={v => setBranchData({ ...branchData, direccion: v })} placeholder="Avenida Siempre Viva 742" />
                            <div className="flex gap-4 pt-4">
                                <ModalButton type="button" onClick={() => setShowBranchModal(false)} variant="secondary">Cancelar</ModalButton>
                                <ModalButton type="submit" disabled={creating}>{creating ? 'Guardando...' : 'Crear Sede'}</ModalButton>
                            </div>
                        </form>
                    </Modal>
                )}

                {/* Modal de Configuración Global */}
                {showConfigModal && (
                    <Modal onClose={() => setShowConfigModal(false)} title="Configuración SaaS">
                        <form onSubmit={handleUpdateGym} className="space-y-4">
                            <Input label="Nombre Comercial" value={configData.nombre} onChange={v => setConfigData({ ...configData, nombre: v })} />
                            <Input label="Slug" value={configData.slug} onChange={v => setConfigData({ ...configData, slug: v })} />

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-2">Plan Suscripción</label>
                                    <select
                                        className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-3 text-white focus:border-red-500 outline-none transition-all"
                                        value={configData.plan_id}
                                        onChange={e => setConfigData({ ...configData, plan_id: e.target.value })}
                                    >
                                        <option value="" className="bg-[#1c1c1e]">Sin Plan</option>
                                        {plans.map(p => (
                                            <option key={p.id} value={p.id} className="bg-[#1c1c1e]">{p.nombre} (${p.precio_mensual})</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-2">Estado Cobro</label>
                                    <select
                                        className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-3 text-white focus:border-red-500 outline-none transition-all"
                                        value={configData.estado_pago_saas}
                                        onChange={e => setConfigData({ ...configData, estado_pago_saas: e.target.value })}
                                    >
                                        <option value="active" className="bg-[#1c1c1e] text-green-500">Activo (Al día)</option>
                                        <option value="past_due" className="bg-[#1c1c1e] text-amber-500">Deuda (Past Due)</option>
                                        <option value="unpaid" className="bg-[#1c1c1e] text-red-500">Impago (Bloqueando)</option>
                                        <option value="trialing" className="bg-[#1c1c1e] text-blue-500">Periodo de Prueba</option>
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <Input label="Logo URL" value={configData.logo_url} onChange={v => setConfigData({ ...configData, logo_url: v })} />
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-2">Color Primario</label>
                                    <div className="flex gap-2">
                                        <input
                                            type="color"
                                            className="w-12 h-12 bg-transparent border-none rounded-xl cursor-pointer"
                                            value={configData.color_primario}
                                            onChange={e => setConfigData({ ...configData, color_primario: e.target.value })}
                                        />
                                        <input
                                            type="text"
                                            className="flex-1 bg-white/5 border border-white/10 rounded-2xl px-5 text-white font-mono text-xs outline-none"
                                            value={configData.color_primario}
                                            onChange={e => setConfigData({ ...configData, color_primario: e.target.value })}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center gap-4 p-4 bg-white/5 rounded-2xl border border-white/10">
                                <div className="flex-1">
                                    <p className="text-xs font-black uppercase text-white">Estado del Gimnasio</p>
                                    <p className="text-[10px] text-gray-500 italic">Si se desactiva, ningún usuario podrá acceder.</p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setConfigData({ ...configData, es_activo: !configData.es_activo })}
                                    className={`w-12 h-6 rounded-full transition-all relative ${configData.es_activo ? 'bg-green-500' : 'bg-gray-600'}`}
                                >
                                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${configData.es_activo ? 'right-1' : 'left-1'}`} />
                                </button>
                            </div>

                            {/* Módulos de la App */}
                            <div className="space-y-3">
                                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-2">Módulos de la Plataforma</label>
                                <div className="grid grid-cols-2 gap-3">
                                    {[
                                        { id: 'rutinas_ia', label: 'IA Rutinas' },
                                        { id: 'nutricion_ia', label: 'IA Nutrición' },
                                        { id: 'gamificacion', label: 'Gamificación' },
                                        { id: 'pagos_online', label: 'Pagos Online' },
                                        { id: 'clases_reserva', label: 'Reservas' }
                                    ].map(m => (
                                        <div key={m.id} className="flex items-center gap-3 p-3 bg-white/5 rounded-xl border border-white/5">
                                            <button
                                                type="button"
                                                onClick={() => setConfigData({
                                                    ...configData,
                                                    modulos: {
                                                        ...configData.modulos,
                                                        [m.id]: !configData.modulos?.[m.id]
                                                    }
                                                })}
                                                className={`w-10 h-5 rounded-full transition-all relative ${configData.modulos?.[m.id] ? 'bg-primary' : 'bg-gray-600'}`}
                                            >
                                                <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${configData.modulos?.[m.id] ? 'right-1' : 'left-1'}`} />
                                            </button>
                                            <span className="text-xs font-bold text-gray-300">{m.label}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Zona Peligrosa */}
                            <div className="p-4 bg-red-950/20 border border-red-500/20 rounded-2xl space-y-4">
                                <p className="text-[10px] font-black text-red-500 uppercase tracking-widest">Zona de Peligro</p>
                                
                                {configData.estado_pago_saas !== 'active' && (
                                    <button
                                        type="button"
                                        onClick={async () => {
                                            if (!selectedGym) return;
                                            const res = await fetch('/api/admin/gyms/notify-urgent', {
                                                method: 'POST',
                                                headers: { 'Content-Type': 'application/json' },
                                                body: JSON.stringify({
                                                    gymId: selectedGym.id,
                                                    titulo: 'Problema con tu suscripción',
                                                    mensaje: 'Tu cuenta presenta un problema de cobro. Por favor regulariza tu situación para evitar la suspensión del servicio.'
                                                })
                                            });
                                            if (res.ok) toast.success('Notificación enviada');
                                            else toast.error('Error al enviar');
                                        }}
                                        className="w-full py-2 bg-red-600/20 text-red-400 rounded-xl text-xs font-bold hover:bg-red-600/30 transition-all border border-red-500/20"
                                    >
                                        ⚠️ Enviar Notificación de Urgencia
                                    </button>
                                )}

                                {showDeleteConfirmation ? (
                                    <div className="space-y-3 pt-2 border-t border-red-500/10">
                                        <p className="text-[10px] font-bold text-gray-400">
                                            Escribe <span className="text-red-400 font-mono select-all">{selectedGym?.nombre}</span> para confirmar:
                                        </p>
                                        <input
                                            type="text"
                                            value={deleteConfirmName}
                                            onChange={(e) => setDeleteConfirmName(e.target.value)}
                                            placeholder="Nombre del gimnasio"
                                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white outline-none focus:border-red-500/50 transition-all"
                                        />
                                        <div className="flex gap-2">
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setShowDeleteConfirmation(false);
                                                    setDeleteConfirmName('');
                                                }}
                                                className="flex-1 py-2 bg-white/5 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-white/10 transition-all border border-white/5"
                                            >
                                                Cancelar
                                            </button>
                                            <button
                                                type="button"
                                                disabled={deleteConfirmName !== selectedGym?.nombre || creating}
                                                onClick={handleDeleteGym}
                                                className="flex-1 py-2 bg-red-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-red-500 transition-all disabled:opacity-30 disabled:pointer-events-none"
                                            >
                                                {creating ? 'Eliminando...' : 'Sí, Eliminar de la Red'}
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <button
                                        type="button"
                                        onClick={() => setShowDeleteConfirmation(true)}
                                        className="w-full py-2 bg-red-950/40 hover:bg-red-600/20 text-red-500 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border border-red-500/20"
                                    >
                                        Eliminar Gimnasio de la Red
                                    </button>
                                )}
                            </div>

                            <div className="flex gap-4 pt-4">
                                <ModalButton type="button" onClick={() => setShowConfigModal(false)} variant="secondary">Cerrar</ModalButton>
                                <ModalButton type="submit" disabled={creating}>{creating ? 'Actualizando...' : 'Guardar Cambios'}</ModalButton>
                            </div>
                        </form>
                    </Modal>
                )}
            </AnimatePresence>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-[#1c1c1e] p-6 rounded-[2rem] border border-white/5 flex items-center gap-4">
                    <div className="w-12 h-12 bg-blue-500/10 rounded-2xl flex items-center justify-center text-blue-500">
                        <Building2 size={24} />
                    </div>
                    <div>
                        <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">Total Gimnasios</p>
                        <p className="text-2xl font-black text-white">{gyms.length}</p>
                    </div>
                </div>
                <div className="bg-[#1c1c1e] p-6 rounded-[2rem] border border-white/5 flex items-center gap-4 shadow-lg shadow-green-900/5 transition-all hover:border-green-500/20">
                    <div className="w-12 h-12 bg-green-500/10 rounded-2xl flex items-center justify-center text-green-500">
                        <MapPin size={24} />
                    </div>
                    <div>
                        <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">Sucursales Activas</p>
                        <p className="text-2xl font-black text-white">
                            {gyms.reduce((acc, g) => acc + (g.sucursales?.length || 0), 0)}
                        </p>
                    </div>
                </div>
                <div className={`bg-[#1c1c1e] p-6 rounded-[2rem] border ${gyms.some(g => g.estado_pago_saas === 'unpaid' || !g.es_activo) ? 'border-amber-500/20' : 'border-white/5'} flex items-center gap-4`}>
                    <div className={`w-12 h-12 ${gyms.some(g => g.estado_pago_saas === 'unpaid' || !g.es_activo) ? 'bg-amber-500/10 text-amber-500' : 'bg-purple-500/10 text-purple-500'} rounded-2xl flex items-center justify-center`}>
                        <Users size={24} />
                    </div>
                    <div>
                        <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">Status del Sistema</p>
                        <p className={`text-2xl font-black ${gyms.some(g => g.estado_pago_saas === 'unpaid' || !g.es_activo) ? 'text-amber-500' : 'text-white'}`}>
                            {gyms.some(g => g.estado_pago_saas === 'unpaid' || !g.es_activo) ? 'Alerta' : 'Saludable'}
                        </p>
                    </div>
                </div>
            </div>

            {/* Gyms List */}
            <div className="grid grid-cols-1 gap-6">
                {loading ? (
                    <div className="py-20 flex flex-col items-center justify-center gap-4">
                        <div className="w-12 h-12 border-4 border-red-500/20 border-t-red-500 rounded-full animate-spin" />
                        <p className="text-gray-500 animate-pulse font-bold text-xs uppercase tracking-widest">Escaneando red de gimnasios...</p>
                    </div>
                ) : gyms.length === 0 ? (
                    <div className="bg-[#1c1c1e] rounded-[3rem] p-20 border border-dashed border-white/10 text-center">
                        <p className="text-gray-500">No hay gimnasios registrados en el sistema global.</p>
                    </div>
                ) : (
                    gyms.map((gym, idx) => (
                        <motion.div
                            key={gym.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: idx * 0.1 }}
                            className="bg-[#1c1c1e] rounded-[2.5rem] border border-white/5 overflow-hidden group hover:border-primary/30 transition-all duration-500"
                        >
                            <div className="p-8 flex flex-col lg:flex-row gap-8 items-start lg:items-center">
                                {/* Gym Logo/Icon */}
                                <div className="w-20 h-20 bg-gradient-to-br from-[#2c2c2e] to-[#1c1c1e] rounded-[2rem] border border-white/10 flex items-center justify-center text-3xl shadow-2xl group-hover:rotate-6 transition-transform relative overflow-hidden">
                                    {gym.logo_url ? (
                                        <Image src={gym.logo_url} alt={gym.nombre} fill className="object-contain p-4" unoptimized />
                                    ) : (
                                        "🏢"
                                    )}
                                </div>

                                {/* Info */}
                                <div className="flex-1 space-y-2">
                                    <div className="flex items-center gap-3">
                                        <h2 className="text-3xl font-black text-white italic tracking-tighter uppercase">{gym.nombre}</h2>
                                        {gym.es_activo ? (
                                            <span className="px-3 py-1 bg-green-500/10 text-green-500 border border-green-500/20 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-1">
                                                <CheckCircle2 size={10} /> Activo
                                            </span>
                                        ) : (
                                            <span className="px-3 py-1 bg-gray-500/10 text-gray-400 border border-gray-500/20 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-1">
                                                <XCircle size={10} /> Inactivo
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-gray-500 font-mono text-xs">SLUG: {gym.slug} | ID: {gym.id}</p>

                                    {/* Sucursales Mini-List */}
                                    <div className="flex flex-wrap gap-2 mt-4">
                                        {(gym.sucursales || []).map(s => (
                                            <div key={s.id} className="bg-white/5 px-4 py-2 rounded-xl border border-white/5 text-xs text-gray-400 flex items-center gap-2 hover:bg-white/10 transition-colors pointer-events-none">
                                                <MapPin size={12} className="text-red-500" /> {s.nombre}
                                            </div>
                                        ))}
                                        <button
                                            onClick={() => openBranchModal(gym)}
                                            className="px-3 py-2 rounded-xl border border-dashed border-white/10 text-[10px] font-bold text-gray-500 hover:border-red-500/50 hover:text-red-400 transition-all"
                                        >
                                            + Agregar Sucursal
                                        </button>
                                    </div>
                                </div>

                                {/* Actions */}
                                <div className="flex flex-col gap-3 w-full lg:w-auto shrink-0">
                                    <button
                                        onClick={() => handleImpersonate(gym.id, gym.nombre)}
                                        className="px-8 py-3 bg-amber-500 hover:bg-amber-400 text-black rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-xl shadow-amber-500/10 active:scale-95 flex items-center justify-center gap-2"
                                    >
                                        <Eye size={14} /> Acceso Remoto
                                    </button>
                                    <button
                                        onClick={() => openConfig(gym)}
                                        className="px-8 py-3 bg-primary text-primary-foreground rounded-2xl font-black text-xs uppercase tracking-widest hover:opacity-90 transition-all shadow-xl active:scale-95"
                                    >
                                        Configuración Global
                                    </button>
                                    <button
                                        onClick={() => window.location.href = `/${gym.slug}/admin/finance`}
                                        className="px-8 py-3 bg-white/5 text-gray-400 rounded-2xl font-black text-xs uppercase tracking-widest border border-white/10 hover:bg-white/10 transition-all"
                                    >
                                        Ver Estadísticas
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    ))
                )}
            </div>

            {/* Pro Tips / SaaS Logic */}
            <div className="mt-12 p-8 bg-gradient-to-br from-red-600/10 to-transparent border border-red-500/20 rounded-[3rem]">
                <h3 className="text-xl font-bold text-white mb-2 italic">Vision SaaS 360°</h3>
                <p className="text-gray-400 text-sm leading-relaxed">
                    Como Superadmin, tenés el "Master Key" del sistema. Cada gimnasio que sumes es un entorno aislado
                    donde el Admin de ese gimnasio solo podrá ver a sus profesores y alumnos.
                    <br /><br />
                    En la siguiente actualización, podrás gestionar los planes de suscripción de cada gimnasio y
                    personalizar la App para cada marca (White Label).
                </p>
            </div>

            {/* Modal de Impersonación Premium con Justificación de Auditoría */}
            <AnimatePresence>
                {impersonationTarget && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="bg-[#1c1c1e] border border-amber-500/20 rounded-[2.5rem] w-full max-w-lg overflow-hidden shadow-[0_0_50px_rgba(245,158,11,0.15)] flex flex-col relative z-50 animate-fade-in"
                        >
                            <div className="p-8 border-b border-white/5 bg-gradient-to-r from-amber-500/10 via-orange-600/5 to-transparent flex items-center gap-4 relative">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full blur-2xl" />
                                <div className="w-12 h-12 bg-amber-500/20 text-amber-400 rounded-2xl flex items-center justify-center border border-amber-500/30 shadow-[0_0_15px_rgba(245,158,11,0.2)] animate-pulse shrink-0">
                                    <ShieldAlert size={24} />
                                </div>
                                <div className="relative z-10">
                                    <h3 className="text-2xl font-black text-white italic uppercase tracking-tighter">Acceso Remoto Auditado</h3>
                                    <p className="text-[10px] text-amber-400/80 font-black uppercase tracking-widest mt-1">Protocolo de Seguridad Nivel 4</p>
                                </div>
                            </div>

                            <div className="p-8 space-y-6">
                                <div className="p-4 bg-amber-500/5 border border-amber-500/10 rounded-2xl">
                                    <p className="text-xs font-black uppercase text-amber-400">Gimnasio Destino:</p>
                                    <p className="text-xl font-black text-white italic uppercase tracking-tight mt-1">{impersonationTarget.nombre}</p>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Motivo / Justificación de Soporte</label>
                                    <textarea
                                        rows={3}
                                        value={impersonationReason}
                                        onChange={e => setImpersonationReason(e.target.value)}
                                        placeholder="Ej: Resolución de incidencia en pasarela de pagos / Diagnóstico técnico..."
                                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-amber-500/50 transition-all resize-none text-xs font-medium"
                                        required
                                    />
                                    <p className="text-[8px] font-black text-gray-600 uppercase tracking-widest leading-none mt-1">
                                        * Esta justificación será guardada de forma inmutable en el historial de auditoría global.
                                    </p>
                                </div>

                                <div className="flex gap-4 pt-4">
                                    <button
                                        type="button"
                                        onClick={() => setImpersonationTarget(null)}
                                        disabled={isImpersonatingApi}
                                        className="flex-1 px-6 py-4 bg-white/5 text-white text-[10px] font-black uppercase tracking-widest rounded-2xl hover:bg-white/10 transition-all border border-white/5 disabled:opacity-50"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        type="button"
                                        onClick={executeImpersonation}
                                        disabled={isImpersonatingApi}
                                        className="flex-1 px-6 py-4 bg-amber-500 hover:bg-amber-400 text-black text-[10px] font-black uppercase tracking-widest rounded-2xl shadow-[0_0_20px_rgba(245,158,11,0.3)] hover:shadow-[0_0_30px_rgba(245,158,11,0.5)] transition-all transform hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50"
                                    >
                                        {isImpersonatingApi ? 'Iniciando Enlace...' : 'Conectar Entorno'}
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}

// Reusable Components
function Modal({ children, onClose, title }: { children: React.ReactNode, onClose: () => void, title: string }) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={onClose}
                className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div
                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.9, opacity: 0, y: 20 }}
                className="bg-[#1c1c1e] w-full max-w-lg rounded-[2.5rem] border border-white/10 p-8 relative z-10 shadow-2xl"
            >
                <h2 className="text-2xl font-black text-white italic mb-6 uppercase tracking-tight">{title}</h2>
                {children}
            </motion.div>
        </div>
    );
}

function Input({ label, value, onChange, placeholder, className = "" }: { label: string, value: string, onChange: (v: string) => void, placeholder?: string, className?: string }) {
    return (
        <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-2">{label}</label>
            <input
                type="text"
                placeholder={placeholder}
                className={`w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-3 text-white focus:border-primary outline-none transition-all ${className}`}
                value={value}
                onChange={e => onChange(e.target.value)}
            />
        </div>
    );
}

function ModalButton({ children, onClick, type = "button", disabled = false, variant = "primary" }: { children: React.ReactNode, onClick?: () => void, type?: "button" | "submit", disabled?: boolean, variant?: "primary" | "secondary" }) {
    const styles = variant === "primary"
        ? "bg-primary hover:opacity-90 text-primary-foreground shadow-lg shadow-primary/40 border-primary/20"
        : "bg-white/5 hover:bg-white/10 text-white";

    return (
        <button
            type={type}
            disabled={disabled}
            onClick={onClick}
            className={`flex-1 px-6 py-4 rounded-2xl font-bold transition-all border ${styles} disabled:opacity-50`}
        >
            {children}
        </button>
    );
}
