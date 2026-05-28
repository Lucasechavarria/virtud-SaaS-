'use client';

import React, { useState, useEffect } from 'react';
import {
    Settings,
    Cpu,
    CreditCard,
    Terminal,
    Save,
    Building2,
    CheckCircle2,
    AlertTriangle,
    ShieldAlert,
    RefreshCw,
    Sliders,
    Zap,
    Users,
    Video,
    Sparkles
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';

interface Gym {
    id: string;
    nombre: string;
    slug: string;
    es_activo: boolean;
    plan_id?: string;
    estado_pago_saas?: string;
    modulos_activos: Record<string, boolean>;
    configuracion: Record<string, any>;
}

interface SystemSettings {
    modo_mantenimiento: boolean;
    mantenimiento_mensaje: string;
    correo_soporte: string;
    gateway_sandbox: boolean;
    comision_pos: number;
    ia_global_activa: boolean;
    vision_computacional_activa: boolean;
    limite_tokens_diarios: number;
}

export default function SaaSAdminSettingsPage() {
    const [settings, setSettings] = useState<SystemSettings | null>(null);
    const [gyms, setGyms] = useState<Gym[]>([]);
    const [loading, setLoading] = useState(true);
    const [updating, setUpdating] = useState(false);
    const [activeTab, setActiveTab] = useState<'system' | 'ai' | 'gateway' | 'quotas' | 'sandbox'>('system');

    // Quotas Override States
    const [selectedGymId, setSelectedGymId] = useState<string>('');
    const [selectedGym, setSelectedGym] = useState<Gym | null>(null);
    const [gymQuotaForm, setGymQuotaForm] = useState({
        es_activo: true,
        videos_ia: true,
        rutinas_ia: true,
        max_videos_mensual: 100,
        max_alumnos: 500,
        estado_pago: 'active'
    });

    // Sandbox States
    const [sandboxGymId, setSandboxGymId] = useState<string>('');
    const [simulating, setSimulating] = useState(false);

    useEffect(() => {
        fetchSettings();
        fetchGyms();
    }, []);

    useEffect(() => {
        if (selectedGymId) {
            const gym = gyms.find(g => g.id === selectedGymId) || null;
            setSelectedGym(gym);
            if (gym) {
                setGymQuotaForm({
                    es_activo: gym.es_activo ?? true,
                    videos_ia: gym.modulos_activos?.videos_ia ?? true,
                    rutinas_ia: gym.modulos_activos?.rutinas_ia ?? true,
                    max_videos_mensual: gym.configuracion?.limites?.max_videos_mensual ?? 100,
                    max_alumnos: gym.configuracion?.limites?.max_alumnos ?? 500,
                    estado_pago: gym.estado_pago_saas ?? 'active'
                });
            }
        } else {
            setSelectedGym(null);
        }
    }, [selectedGymId, gyms]);

    const fetchSettings = async () => {
        try {
            const res = await fetch('/api/saas-admin/settings');
            const data = await res.json();
            if (res.ok) setSettings(data.settings);
        } catch (_err) {
            toast.error('Error al cargar configuración global');
        }
    };

    const fetchGyms = async () => {
        try {
            const res = await fetch('/api/admin/gyms/list');
            const data = await res.json();
            if (res.ok) {
                const list = data.gyms || [];
                setGyms(list);
                if (list.length > 0) {
                    setSandboxGymId(list[0].id);
                }
            }
        } catch (_err) {
            toast.error('Error al cargar red de gimnasios');
        } finally {
            setLoading(false);
        }
    };

    const handleSaveSettings = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!settings) return;
        setUpdating(true);
        try {
            const res = await fetch('/api/saas-admin/settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(settings)
            });
            const data = await res.json();
            if (res.ok) {
                toast.success('Configuración del sistema guardada con éxito');
                setSettings(data.settings);
            } else {
                toast.error(data.error || 'Error al guardar');
            }
        } catch (_err) {
            toast.error('Error de red al guardar ajustes');
        } finally {
            setUpdating(false);
        }
    };

    const handleSaveGymQuotas = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedGym) return;
        setUpdating(true);
        try {
            // Actualizar usando la API robusta existente /api/admin/gyms/update
            const res = await fetch('/api/admin/gyms/update', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: selectedGym.id,
                    nombre: selectedGym.nombre,
                    slug: selectedGym.slug,
                    es_activo: gymQuotaForm.es_activo,
                    plan_id: selectedGym.plan_id,
                    estado_pago_saas: gymQuotaForm.estado_pago,
                    modulos_activos: {
                        ...selectedGym.modulos_activos,
                        videos_ia: gymQuotaForm.videos_ia,
                        rutinas_ia: gymQuotaForm.rutinas_ia
                    },
                    configuracion: {
                        ...selectedGym.configuracion,
                        limites: {
                            max_videos_mensual: Number(gymQuotaForm.max_videos_mensual),
                            max_alumnos: Number(gymQuotaForm.max_alumnos)
                        }
                    }
                })
            });

            if (res.ok) {
                toast.success(`Cuotas de "${selectedGym.nombre}" actualizadas correctamente.`);
                fetchGyms(); // Recargar listado
            } else {
                const data = await res.json();
                toast.error(data.error || 'Error al actualizar cuotas del gimnasio');
            }
        } catch (_err) {
            toast.error('Error de red al actualizar cuotas');
        } finally {
            setUpdating(false);
        }
    };

    const handleTriggerSandbox = async (action: string) => {
        setSimulating(true);
        try {
            const res = await fetch('/api/saas-admin/sandbox/trigger', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action, gymId: sandboxGymId })
            });
            const data = await res.json();
            if (res.ok) {
                toast.success(data.message, { duration: 6000 });
            } else {
                toast.error(data.error || 'Error al gatillar simulación');
            }
        } catch (_err) {
            toast.error('Error de red al gatillar sandbox');
        } finally {
            setSimulating(false);
        }
    };

    if (loading || !settings) {
        return (
            <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4">
                <div className="w-12 h-12 border-4 border-tactical-cyan/20 border-t-tactical-cyan rounded-full animate-spin" />
                <p className="text-zinc-500 font-bold text-xs uppercase tracking-widest animate-pulse">Cargando consola de infraestructura...</p>
            </div>
        );
    }

    return (
        <div className="space-y-8 p-4 md:p-8 font-rajdhani relative overflow-hidden">
            {/* Background design elements */}
            <div className="absolute top-0 right-0 w-80 h-80 bg-tactical-cyan/5 rounded-full blur-3xl -mr-40 -mt-40 z-0" />
            <div className="absolute bottom-0 left-0 w-80 h-80 bg-tactical-magenta/5 rounded-full blur-3xl -ml-40 -mb-40 z-0" />

            {/* Header section */}
            <div className="relative z-10 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
                <div>
                    <h1 className="text-4xl font-black text-transparent bg-clip-text bg-linear-to-r from-white via-white to-tactical-cyan italic uppercase tracking-tighter leading-none flex items-center gap-3">
                        ⚙️ Ajustes Globales & Sandbox
                    </h1>
                    <p className="text-zinc-400 mt-2 font-medium tracking-wide">
                        Administra los parámetros críticos de red, límites de procesamiento de IA, pasarelas globales y simuladores de desarrollo.
                    </p>
                </div>

                {/* Switcher Tabs */}
                <div className="flex bg-zinc-950/80 p-1.5 rounded-2xl border border-white/5 shadow-inner flex-wrap gap-1">
                    {[
                        { id: 'system', label: 'Sistema', icon: <Settings size={14} /> },
                        { id: 'ai', label: 'IA & GPU', icon: <Cpu size={14} /> },
                        { id: 'gateway', label: 'Pasarelas', icon: <CreditCard size={14} /> },
                        { id: 'quotas', label: 'Cuotas Red', icon: <Sliders size={14} /> },
                        { id: 'sandbox', label: 'Developer Sandbox', icon: <Terminal size={14} /> }
                    ].map(t => (
                        <button
                            key={t.id}
                            onClick={() => setActiveTab(t.id as any)}
                            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
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
            </div>

            {/* Banner Mantenimiento Táctico (Visualización de prueba para el superadmin en tiempo real) */}
            {settings.modo_mantenimiento && (
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-2xl flex items-center gap-4 text-amber-400 relative z-10"
                >
                    <AlertTriangle className="shrink-0 text-amber-500 animate-pulse" size={24} />
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-widest leading-none">MODO MANTENIMIENTO ACTIVO EN LA RED</p>
                        <p className="text-xs font-semibold mt-1 opacity-90">{settings.mantenimiento_mensaje}</p>
                    </div>
                </motion.div>
            )}

            {/* Main Tabs Container */}
            <div className="relative z-10">
                <AnimatePresence mode="wait">
                    {/* Tab 1: System Settings */}
                    {activeTab === 'system' && (
                        <motion.form
                            key="system"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0 }}
                            onSubmit={handleSaveSettings}
                            className="bg-zinc-950 p-8 rounded-[2.5rem] border border-white/5 space-y-6 shadow-2xl"
                        >
                            <div className="border-b border-white/5 pb-4 mb-6">
                                <h3 className="text-xl font-black text-white italic uppercase flex items-center gap-2">
                                    <Settings className="text-tactical-cyan" size={18} /> Configuración Operativa Global
                                </h3>
                                <p className="text-zinc-500 text-[10px] font-black uppercase tracking-widest mt-1">Límites y alertas globales del ecosistema SaaS</p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-4">
                                    <div className="p-5 bg-white/2 border border-white/5 rounded-2xl flex items-center justify-between group hover:border-tactical-cyan/20 transition-all">
                                        <div>
                                            <p className="text-sm font-black text-white uppercase italic">Modo Mantenimiento Programado</p>
                                            <p className="text-[10px] text-zinc-500 font-bold uppercase mt-1 leading-tight max-w-sm">
                                                Al activarse, muestra un banner táctico superior informativo sin interrumpir los entrenamientos en curso de los usuarios.
                                            </p>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => setSettings({ ...settings, modo_mantenimiento: !settings.modo_mantenimiento })}
                                            className={`w-14 h-8 rounded-full p-1 transition-colors outline-none flex items-center ${
                                                settings.modo_mantenimiento ? 'bg-tactical-cyan' : 'bg-zinc-800'
                                            }`}
                                        >
                                            <div
                                                className={`w-6 h-6 rounded-full bg-black shadow-md transform transition-transform duration-300 ${
                                                    settings.modo_mantenimiento ? 'translate-x-6' : 'translate-x-0'
                                                }`}
                                            />
                                        </button>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Mensaje de Mantenimiento Táctico</label>
                                        <textarea
                                            rows={3}
                                            value={settings.mantenimiento_mensaje}
                                            onChange={e => setSettings({ ...settings, mantenimiento_mensaje: e.target.value })}
                                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-xs font-bold focus:outline-none focus:border-tactical-cyan transition-all resize-none placeholder:text-zinc-700"
                                            disabled={!settings.modo_mantenimiento}
                                        />
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Correo Electrónico de Soporte Global</label>
                                        <input
                                            type="email"
                                            value={settings.correo_soporte}
                                            onChange={e => setSettings({ ...settings, correo_soporte: e.target.value })}
                                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-xs font-bold focus:outline-none focus:border-tactical-cyan transition-all"
                                            required
                                        />
                                    </div>
                                    
                                    <div className="p-4 bg-tactical-cyan/5 border border-tactical-cyan/15 rounded-2xl flex gap-3 text-tactical-cyan mt-6">
                                        <ShieldAlert size={20} className="shrink-0" />
                                        <p className="text-[10px] font-black uppercase tracking-wider leading-relaxed">
                                            Los ajustes de Modo Mantenimiento impactan visualmente a todas las sedes clientes de manera progresiva. Se recomienda activar fuera de horarios pico de concurrencia.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="flex justify-end pt-4 border-t border-white/5">
                                <button
                                    type="submit"
                                    disabled={updating}
                                    className="px-6 py-4 bg-tactical-cyan text-black text-[10px] font-black uppercase tracking-widest rounded-2xl shadow-lg shadow-tactical-cyan/20 hover:scale-105 transition-all flex items-center gap-2"
                                >
                                    <Save size={16} /> Guardar Cambios Operativos
                                </button>
                            </div>
                        </motion.form>
                    )}

                    {/* Tab 2: AI & GPU Control */}
                    {activeTab === 'ai' && (
                        <motion.form
                            key="ai"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0 }}
                            onSubmit={handleSaveSettings}
                            className="bg-zinc-950 p-8 rounded-[2.5rem] border border-white/5 space-y-6 shadow-2xl"
                        >
                            <div className="border-b border-white/5 pb-4 mb-6">
                                <h3 className="text-xl font-black text-white italic uppercase flex items-center gap-2">
                                    <Cpu className="text-tactical-cyan" size={18} /> Control de Carga de Cómputo e IA
                                </h3>
                                <p className="text-zinc-500 text-[10px] font-black uppercase tracking-widest mt-1">Límites preventivos de procesamiento de GPU y visión computacional</p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-4">
                                    <div className="p-5 bg-white/2 border border-white/5 rounded-2xl flex items-center justify-between group hover:border-tactical-cyan/20 transition-all">
                                        <div>
                                            <p className="text-sm font-black text-white uppercase italic">Rutinas Automáticas LLM</p>
                                            <p className="text-[10px] text-zinc-500 font-bold uppercase mt-1 leading-tight max-w-sm">
                                                Habilitar o suspender temporalmente la generación de planes de entrenamiento y dietas con IA en toda la red.
                                            </p>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => setSettings({ ...settings, ia_global_activa: !settings.ia_global_activa })}
                                            className={`w-14 h-8 rounded-full p-1 transition-colors outline-none flex items-center ${
                                                settings.ia_global_activa ? 'bg-tactical-cyan' : 'bg-zinc-800'
                                            }`}
                                        >
                                            <div
                                                className={`w-6 h-6 rounded-full bg-black shadow-md transform transition-transform duration-300 ${
                                                    settings.ia_global_activa ? 'translate-x-6' : 'translate-x-0'
                                                }`}
                                            />
                                        </button>
                                    </div>

                                    <div className="p-5 bg-white/2 border border-white/5 rounded-2xl flex items-center justify-between group hover:border-tactical-cyan/20 transition-all">
                                        <div>
                                            <p className="text-sm font-black text-white uppercase italic">Análisis de Video Biomecánico</p>
                                            <p className="text-[10px] text-zinc-500 font-bold uppercase mt-1 leading-tight max-w-sm">
                                                Controla el servicio de visión artificial en la nube para videos de ejercicios subidos por los alumnos.
                                            </p>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => setSettings({ ...settings, vision_computacional_activa: !settings.vision_computacional_activa })}
                                            className={`w-14 h-8 rounded-full p-1 transition-colors outline-none flex items-center ${
                                                settings.vision_computacional_activa ? 'bg-tactical-cyan' : 'bg-zinc-800'
                                            }`}
                                        >
                                            <div
                                                className={`w-6 h-6 rounded-full bg-black shadow-md transform transition-transform duration-300 ${
                                                    settings.vision_computacional_activa ? 'translate-x-6' : 'translate-x-0'
                                                }`}
                                            />
                                        </button>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Límite Global de Tokens (Diario)</label>
                                        <input
                                            type="number"
                                            value={settings.limite_tokens_diarios}
                                            onChange={e => setSettings({ ...settings, limite_tokens_diarios: Number(e.target.value) })}
                                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-xs font-bold focus:outline-none focus:border-tactical-cyan transition-all"
                                            required
                                        />
                                    </div>

                                    <div className="p-4 bg-tactical-magenta/5 border border-tactical-magenta/15 rounded-2xl flex gap-3 text-tactical-magenta mt-4">
                                        <Cpu size={20} className="shrink-0" />
                                        <p className="text-[10px] font-black uppercase tracking-wider leading-relaxed">
                                            La desactivación global de APIs de IA previene cobros excesivos del servidor en periodos de alto tráfico, deteniendo temporalmente el procesamiento de colas de videos biomecánicos en caliente.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="flex justify-end pt-4 border-t border-white/5">
                                <button
                                    type="submit"
                                    disabled={updating}
                                    className="px-6 py-4 bg-tactical-cyan text-black text-[10px] font-black uppercase tracking-widest rounded-2xl shadow-lg shadow-tactical-cyan/20 hover:scale-105 transition-all flex items-center gap-2"
                                >
                                    <Save size={16} /> Guardar Parámetros Cognitivos
                                </button>
                            </div>
                        </motion.form>
                    )}

                    {/* Tab 3: Gateway & Fees */}
                    {activeTab === 'gateway' && (
                        <motion.form
                            key="gateway"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0 }}
                            onSubmit={handleSaveSettings}
                            className="bg-zinc-950 p-8 rounded-[2.5rem] border border-white/5 space-y-6 shadow-2xl"
                        >
                            <div className="border-b border-white/5 pb-4 mb-6">
                                <h3 className="text-xl font-black text-white italic uppercase flex items-center gap-2">
                                    <CreditCard className="text-tactical-cyan" size={18} /> Pasarela y Tasas Comerciales
                                </h3>
                                <p className="text-zinc-500 text-[10px] font-black uppercase tracking-widest mt-1">Configuración del procesador MercadoPago e ingresos directos del POS</p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-4">
                                    <div className="p-5 bg-white/2 border border-white/5 rounded-2xl flex items-center justify-between group hover:border-tactical-cyan/20 transition-all">
                                        <div>
                                            <p className="text-sm font-black text-white uppercase italic">Modo Sandbox de MercadoPago</p>
                                            <p className="text-[10px] text-zinc-500 font-bold uppercase mt-1 leading-tight max-w-sm">
                                                Activa credenciales de simulación sandbox globales para la red de gimnasios del SaaS.
                                            </p>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => setSettings({ ...settings, gateway_sandbox: !settings.gateway_sandbox })}
                                            className={`w-14 h-8 rounded-full p-1 transition-colors outline-none flex items-center ${
                                                settings.gateway_sandbox ? 'bg-tactical-cyan' : 'bg-zinc-800'
                                            }`}
                                        >
                                            <div
                                                className={`w-6 h-6 rounded-full bg-black shadow-md transform transition-transform duration-300 ${
                                                    settings.gateway_sandbox ? 'translate-x-6' : 'translate-x-0'
                                                }`}
                                            />
                                        </button>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Comisión del SaaS por Pago POS (%)</label>
                                        <input
                                            type="number"
                                            step="0.1"
                                            value={settings.comision_pos}
                                            onChange={e => setSettings({ ...settings, comision_pos: Number(e.target.value) })}
                                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-xs font-bold focus:outline-none focus:border-tactical-cyan transition-all"
                                            required
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="flex justify-end pt-4 border-t border-white/5">
                                <button
                                    type="submit"
                                    disabled={updating}
                                    className="px-6 py-4 bg-tactical-cyan text-black text-[10px] font-black uppercase tracking-widest rounded-2xl shadow-lg shadow-tactical-cyan/20 hover:scale-105 transition-all flex items-center gap-2"
                                >
                                    <Save size={16} /> Guardar Parámetros Financieros
                                </button>
                            </div>
                        </motion.form>
                    )}

                    {/* Tab 4: Quotas Red (Overrides por gimnasio) */}
                    {activeTab === 'quotas' && (
                        <motion.div
                            key="quotas"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0 }}
                            className="grid grid-cols-1 lg:grid-cols-3 gap-8"
                        >
                            {/* Gym Selector Panel */}
                            <div className="bg-zinc-950 p-6 rounded-[2rem] border border-white/5 space-y-4 shadow-xl lg:col-span-1">
                                <h3 className="text-md font-black text-white italic uppercase tracking-tight flex items-center gap-2">
                                    <Building2 className="text-tactical-cyan" size={16} /> Sedes en Red
                                </h3>
                                <p className="text-[10px] text-zinc-500 font-bold uppercase">Selecciona un gimnasio para ver y configurar sus límites individuales:</p>
                                
                                <div className="space-y-2 max-h-[450px] overflow-y-auto pr-2 divide-y divide-white/5">
                                    {gyms.map((g) => (
                                        <button
                                            key={g.id}
                                            onClick={() => setSelectedGymId(g.id)}
                                            className={`w-full text-left p-3.5 rounded-xl border transition-all flex items-center justify-between ${
                                                selectedGymId === g.id
                                                    ? 'bg-tactical-cyan/10 border-tactical-cyan text-white shadow-[0_0_10px_rgba(0,245,255,0.05)]'
                                                    : 'bg-white/2 border-white/5 text-zinc-400 hover:text-white hover:bg-white/[0.05]'
                                            }`}
                                        >
                                            <div className="min-w-0">
                                                <p className="text-xs font-black uppercase truncate">{g.nombre}</p>
                                                <p className="text-[9px] font-mono text-zinc-500 mt-1 uppercase tracking-widest">{g.slug}</p>
                                            </div>
                                            <div className="flex gap-2">
                                                {g.modulos_activos?.videos_ia && <Video size={12} className="text-tactical-cyan shrink-0" />}
                                                {g.modulos_activos?.rutinas_ia && <Sparkles size={12} className="text-tactical-magenta shrink-0" />}
                                            </div>
                                        </button>
                                    ))}
                                    {gyms.length === 0 && (
                                        <p className="text-xs text-center text-zinc-500 italic py-10 uppercase font-black">No hay gimnasios en la red</p>
                                    )}
                                </div>
                            </div>

                            {/* Quota Config Form Panel */}
                            <div className="bg-zinc-950 p-8 rounded-[2.5rem] border border-white/5 shadow-2xl lg:col-span-2">
                                <AnimatePresence mode="wait">
                                    {selectedGym ? (
                                        <motion.form
                                            key={selectedGym.id}
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            exit={{ opacity: 0 }}
                                            onSubmit={handleSaveGymQuotas}
                                            className="space-y-6"
                                        >
                                            <div className="border-b border-white/5 pb-4">
                                                <div className="flex justify-between items-start">
                                                    <div>
                                                        <span className="text-[9px] font-black uppercase tracking-widest px-2.5 py-1 bg-tactical-cyan/10 text-tactical-cyan rounded-full border border-tactical-cyan/20">override de cuotas</span>
                                                        <h3 className="text-xl font-black text-white italic uppercase tracking-tight mt-2">{selectedGym.nombre}</h3>
                                                    </div>
                                                    <span className={`text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-full ${
                                                        gymQuotaForm.estado_pago === 'active' || gymQuotaForm.estado_pago === 'al_dia'
                                                            ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                                                            : 'bg-red-500/10 text-red-400 border border-red-500/20'
                                                    }`}>
                                                        {gymQuotaForm.estado_pago === 'active' ? 'AL DIA' : 'DEUDA / MOROSO'}
                                                    </span>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                <div className="space-y-4">
                                                    <h4 className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1 border-b border-white/5 pb-1">Módulos y Servicios</h4>
                                                    
                                                    <div className="p-4 bg-white/2 border border-white/5 rounded-2xl flex items-center justify-between">
                                                        <div className="flex items-center gap-3">
                                                            <Video className="text-tactical-cyan" size={16} />
                                                            <div>
                                                                <p className="text-xs font-black text-white uppercase italic leading-none">Lectura de Videos Biomecánicos</p>
                                                                <p className="text-[9px] text-zinc-500 font-bold uppercase mt-1">Análisis por visión artificial</p>
                                                            </div>
                                                        </div>
                                                        <input
                                                            type="checkbox"
                                                            checked={gymQuotaForm.videos_ia}
                                                            onChange={e => setGymQuotaForm({ ...gymQuotaForm, videos_ia: e.target.checked })}
                                                            className="w-4 h-4 rounded text-tactical-cyan bg-zinc-800 border-white/10 outline-none"
                                                        />
                                                    </div>

                                                    <div className="p-4 bg-white/2 border border-white/5 rounded-2xl flex items-center justify-between">
                                                        <div className="flex items-center gap-3">
                                                            <Sparkles className="text-tactical-magenta" size={16} />
                                                            <div>
                                                                <p className="text-xs font-black text-white uppercase italic leading-none">Generación de Rutinas IA</p>
                                                                <p className="text-[9px] text-zinc-500 font-bold uppercase mt-1">Planes inteligentes automatizados</p>
                                                            </div>
                                                        </div>
                                                        <input
                                                            type="checkbox"
                                                            checked={gymQuotaForm.rutinas_ia}
                                                            onChange={e => setGymQuotaForm({ ...gymQuotaForm, rutinas_ia: e.target.checked })}
                                                            className="w-4 h-4 rounded text-tactical-magenta bg-zinc-800 border-white/10 outline-none"
                                                        />
                                                    </div>

                                                    <div className="p-4 bg-white/2 border border-white/5 rounded-2xl flex items-center justify-between">
                                                        <div className="flex items-center gap-3">
                                                            <CheckCircle2 className="text-green-500" size={16} />
                                                            <div>
                                                                <p className="text-xs font-black text-white uppercase italic leading-none">Estado de Acceso General</p>
                                                                <p className="text-[9px] text-zinc-500 font-bold uppercase mt-1">Permite el acceso a la plataforma</p>
                                                            </div>
                                                        </div>
                                                        <input
                                                            type="checkbox"
                                                            checked={gymQuotaForm.es_activo}
                                                            onChange={e => setGymQuotaForm({ ...gymQuotaForm, es_activo: e.target.checked })}
                                                            className="w-4 h-4 rounded text-green-500 bg-zinc-800 border-white/10 outline-none"
                                                        />
                                                    </div>
                                                </div>

                                                <div className="space-y-4">
                                                    <h4 className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1 border-b border-white/5 pb-1">Cuotas Mensuales Permitidas</h4>
                                                    
                                                    <div className="space-y-2">
                                                        <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1 flex items-center gap-1">
                                                            <Video size={12} className="text-tactical-cyan" /> Límite de Videos Biomecánicos / mes
                                                        </label>
                                                        <input
                                                            type="number"
                                                            value={gymQuotaForm.max_videos_mensual}
                                                            onChange={e => setGymQuotaForm({ ...gymQuotaForm, max_videos_mensual: Number(e.target.value) })}
                                                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-xs font-bold focus:outline-none focus:border-tactical-cyan transition-all"
                                                            required
                                                            disabled={!gymQuotaForm.videos_ia}
                                                        />
                                                    </div>

                                                    <div className="space-y-2">
                                                        <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1 flex items-center gap-1">
                                                            <Users size={12} className="text-tactical-magenta" /> Límite de Alumnos Permitidos
                                                        </label>
                                                        <input
                                                            type="number"
                                                            value={gymQuotaForm.max_alumnos}
                                                            onChange={e => setGymQuotaForm({ ...gymQuotaForm, max_alumnos: Number(e.target.value) })}
                                                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-xs font-bold focus:outline-none focus:border-tactical-cyan transition-all"
                                                            required
                                                        />
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex justify-end pt-4 border-t border-white/5 gap-3">
                                                <button
                                                    type="submit"
                                                    disabled={updating}
                                                    className="px-6 py-4 bg-tactical-cyan text-black text-[10px] font-black uppercase tracking-widest rounded-2xl shadow-lg shadow-tactical-cyan/20 hover:scale-105 transition-all flex items-center gap-2"
                                                >
                                                    <Save size={16} /> Aplicar Cuotas Especiales
                                                </button>
                                            </div>
                                        </motion.form>
                                    ) : (
                                        <div className="min-h-[300px] flex flex-col items-center justify-center text-center opacity-30 select-none">
                                            <Sliders size={48} className="text-white mb-4" />
                                            <p className="text-sm font-black uppercase tracking-widest text-white italic">Consola de Override de Recursos</p>
                                            <p className="text-[10px] text-zinc-500 font-bold uppercase mt-1 max-w-sm">Selecciona una sede en el panel lateral para personalizar sus cuotas de video, rutinas de IA y límites del sistema.</p>
                                        </div>
                                    )}
                                </AnimatePresence>
                            </div>
                        </motion.div>
                    )}

                    {/* Tab 5: Sandbox Developer Console */}
                    {activeTab === 'sandbox' && (
                        <motion.div
                            key="sandbox"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0 }}
                            className="bg-zinc-950 p-8 rounded-[2.5rem] border border-white/5 space-y-6 shadow-2xl relative overflow-hidden"
                        >
                            <div className="absolute top-0 right-0 w-32 h-32 bg-tactical-magenta/5 rounded-full blur-3xl -mr-16 -mt-16" />
                            
                            <div className="border-b border-white/5 pb-4 mb-6">
                                <h3 className="text-xl font-black text-white italic uppercase flex items-center gap-2">
                                    <Terminal className="text-tactical-magenta" size={18} /> Sandbox Developer Simulator
                                </h3>
                                <p className="text-zinc-500 text-[10px] font-black uppercase tracking-widest mt-1">Mando de simulación de infraestructura, transacciones y alertas en caliente</p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="space-y-6">
                                    <h4 className="text-[10px] font-black text-zinc-500 uppercase tracking-widest border-b border-white/5 pb-1">1. Simulación de Pasarela y Webhooks</h4>
                                    
                                    <div className="space-y-4">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1 flex items-center gap-1">
                                                <Building2 size={12} className="text-tactical-cyan" /> Gimnasio Cliente Objetivo
                                            </label>
                                            <select
                                                value={sandboxGymId}
                                                onChange={e => setSandboxGymId(e.target.value)}
                                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 text-white text-xs uppercase font-black tracking-wider focus:outline-none focus:border-tactical-cyan transition-all appearance-none"
                                            >
                                                {gyms.map((g) => (
                                                    <option key={g.id} value={g.id} className="bg-zinc-950 text-white">
                                                        {g.nombre} ({g.slug})
                                                    </option>
                                                ))}
                                            </select>
                                        </div>

                                        <div className="flex flex-col sm:flex-row gap-3 pt-2">
                                            <button
                                                type="button"
                                                disabled={simulating}
                                                onClick={() => handleTriggerSandbox('simulate_payment')}
                                                className="flex-1 px-5 py-4 bg-tactical-cyan text-black text-[10px] font-black uppercase tracking-widest rounded-2xl shadow-lg shadow-tactical-cyan/20 hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                                            >
                                                <Zap size={14} className="fill-black" /> Simular Cobro Membresía SaaS
                                            </button>
                                            
                                            <button
                                                type="button"
                                                disabled={simulating}
                                                onClick={() => handleTriggerSandbox('simulate_alert')}
                                                className="flex-1 px-5 py-4 bg-tactical-magenta text-white text-[10px] font-black uppercase tracking-widest rounded-2xl shadow-lg shadow-tactical-magenta/20 hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50 border border-tactical-magenta/20"
                                            >
                                                <ShieldAlert size={14} /> Simular Alerta Caída/Soporte
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-6">
                                    <h4 className="text-[10px] font-black text-zinc-500 uppercase tracking-widest border-b border-white/5 pb-1">2. Sincronización Manual Forzada</h4>
                                    
                                    <div className="space-y-4">
                                        <p className="text-zinc-500 text-xs font-semibold uppercase tracking-wider leading-relaxed">
                                            Fuerza la recalculación e inyección inmediata del Snapshot diario general de métricas en la base de datos de Supabase. Recalcula el MRR global, ingresos mensuales y sedes de la red al instante.
                                        </p>

                                        <button
                                            type="button"
                                            disabled={simulating}
                                            onClick={() => handleTriggerSandbox('sync_metrics')}
                                            className="px-6 py-4 bg-white/5 hover:bg-white/10 text-white text-[10px] font-black uppercase tracking-widest rounded-2xl transition-all border border-white/10 flex items-center gap-2 shadow-inner disabled:opacity-50"
                                        >
                                            <RefreshCw size={14} className={simulating ? 'animate-spin' : ''} /> Forzar Sincronización Métricas
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <div className="p-4 bg-tactical-magenta/5 border border-tactical-magenta/20 rounded-2xl flex gap-3 text-tactical-magenta mt-6 relative z-10">
                                <Terminal size={20} className="shrink-0" />
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-widest leading-none">entorno sandbox seguro</p>
                                    <p className="text-[10px] font-bold uppercase tracking-wider leading-relaxed mt-1 opacity-80">
                                        Las simulaciones de transacciones insertan registros en la tabla real de pagos SaaS utilizando pasarelas simuladas. Esto permite validar los flujos analíticos, la facturación del MRR y las alertas en tiempo real de forma segura.
                                    </p>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}
