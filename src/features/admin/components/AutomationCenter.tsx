'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Zap,
    MessageCircle,
    CreditCard,
    UserX,
    Cake,
    Play,
    Pause,
    Settings2,
    History,
    CheckCircle2,
    AlertCircle,
    ArrowRight,
    Megaphone,
    X
} from 'lucide-react';
import { useParams } from 'next/navigation';
import { toast } from 'react-hot-toast';

interface Campaign {
    id: string;
    nombre: string;
    tipo: 'recordatorio_pago' | 'reengagement' | 'promocion' | 'personalizada';
    mensaje_titulo: string;
    mensaje_cuerpo: string;
    estado: 'activa' | 'pausada' | 'completada';
    enviados: number;
    abiertos: number;
    clicks: number;
    creado_en: string;
}

interface ActivityLog {
    id: string;
    accion: string;
    creado_en: string;
    usuario: string;
}

// Iconos y colores por tipo de campaña
const CAMPAIGN_CONFIG = {
    recordatorio_pago: {
        icon: CreditCard,
        color: 'text-green-500',
        bg: 'bg-green-500/10',
        label: 'Recordatorio de Pago'
    },
    reengagement: {
        icon: UserX,
        color: 'text-red-500',
        bg: 'bg-red-500/10',
        label: 'Recuperación'
    },
    promocion: {
        icon: Cake,
        color: 'text-pink-500',
        bg: 'bg-pink-500/10',
        label: 'Promoción / Cumpleaños'
    },
    personalizada: {
        icon: Zap,
        color: 'text-blue-500',
        bg: 'bg-blue-500/10',
        label: 'Personalizada'
    }
};

export default function AutomationCenter() {
    const params = useParams();
    const tenantSlug = params?.tenantSlug as string;

    const [campaigns, setCampaigns] = useState<Campaign[]>([]);
    const [activities, setActivities] = useState<ActivityLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

    // Formulario de nueva campaña
    const [newCampaign, setNewCampaign] = useState({
        nombre: '',
        tipo: 'recordatorio_pago' as Campaign['tipo'],
        mensaje_titulo: '',
        mensaje_cuerpo: '',
        segmento: {}
    });

    const [submitting, setSubmitting] = useState(false);

    const fetchAutomationData = async () => {
        try {
            const url = tenantSlug 
                ? `/api/admin/automation?gymId=${tenantSlug}` 
                : '/api/admin/automation';
            const res = await fetch(url);
            const data = await res.json();
            if (res.ok && data.success) {
                setCampaigns(data.campaigns || []);
                setActivities(data.activityLog || []);
            } else {
                toast.error(data.error || 'Error al cargar campañas');
            }
        } catch (error) {
            console.error('Error fetching automations:', error);
            toast.error('Error de red al conectar con el motor de automatización');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAutomationData();
    }, [tenantSlug]);

    const toggleStatus = async (id: string, currentStatus: string) => {
        const nextStatus = currentStatus === 'activa' ? 'pausada' : 'activa';
        const loadingToast = toast.loading('Actualizando estado...');
        try {
            const res = await fetch('/api/admin/automation', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id, estado: nextStatus })
            });
            const data = await res.json();
            if (res.ok && data.success) {
                toast.success(`Campaña ${nextStatus === 'activa' ? 'activada' : 'pausada'} correctamente`);
                setCampaigns(prev => prev.map(c => c.id === id ? { ...c, estado: nextStatus } : c));
            } else {
                toast.error(data.error || 'Error al actualizar campaña');
            }
        } catch (_err) {
            toast.error('Error de red');
        } finally {
            toast.dismiss(loadingToast);
        }
    };

    const handleCreateCampaign = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newCampaign.nombre || !newCampaign.mensaje_titulo || !newCampaign.mensaje_cuerpo) {
            toast.error('Todos los campos son obligatorios');
            return;
        }

        setSubmitting(true);
        const loadingToast = toast.loading('Creando campaña...');
        try {
            const res = await fetch('/api/admin/automation', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...newCampaign,
                    gymId: tenantSlug // Enviado para impersonación/superadmin
                })
            });

            const data = await res.json();
            if (res.ok && data.success) {
                toast.success('Campaña creada y activada');
                setCampaigns(prev => [data.campaign, ...prev]);
                setIsCreateModalOpen(false);
                setNewCampaign({
                    nombre: '',
                    tipo: 'recordatorio_pago',
                    mensaje_titulo: '',
                    mensaje_cuerpo: '',
                    segmento: {}
                });
            } else {
                toast.error(data.error || 'Error al guardar la campaña');
            }
        } catch (_err) {
            toast.error('Error de red al guardar campaña');
        } finally {
            toast.dismiss(loadingToast);
            setSubmitting(false);
        }
    };

    // Formatear acciones de log a español descriptivo
    const formatActionText = (action: string, user: string) => {
        switch (action) {
            case 'failed_login':
                return `Intento fallido de login por ${user}`;
            case 'routine_access':
                return `${user} accedió a su rutina de entrenamiento`;
            case 'login_success':
                return `${user} inició sesión correctamente`;
            default:
                return `${user} realizó una acción (${action})`;
        }
    };

    // Calcular estadísticas globales rápidas
    const totalActions = campaigns.reduce((acc, curr) => acc + (curr.enviados || 0), 0);

    return (
        <div className="space-y-8 pb-10">
            {/* Header / Stats Overlay */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="space-y-1">
                    <h2 className="text-4xl font-black text-white italic uppercase tracking-tighter flex items-center gap-3">
                        <Zap className="text-orange-500 fill-orange-500 animate-pulse" size={32} />
                        Automation Engine
                    </h2>
                    <p className="text-gray-500 text-sm font-medium">El sistema inteligente que trabaja 24/7 por tu negocio.</p>
                </div>

                <div className="flex items-center gap-4 bg-white/5 border border-white/10 p-4 rounded-3xl backdrop-blur-xl shadow-2xl">
                    <div className="text-right">
                        <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Acciones Totales</p>
                        <p className="text-2xl font-black text-white italic tracking-tighter">
                            {loading ? '...' : totalActions.toLocaleString('es-AR')}
                        </p>
                    </div>
                    <div className="w-10 h-10 rounded-2xl bg-orange-500/20 flex items-center justify-center text-orange-500">
                        <History size={20} />
                    </div>
                </div>
            </div>

            {loading ? (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-pulse">
                    <div className="lg:col-span-2 space-y-4">
                        {[1, 2].map(i => (
                            <div key={i} className="h-28 bg-white/5 rounded-[2.5rem] border border-white/5" />
                        ))}
                    </div>
                    <div className="h-[400px] bg-white/5 rounded-[3rem] border border-white/5" />
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Active Automation Cards */}
                    <div className="lg:col-span-2 space-y-4">
                        <p className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.2em] ml-4">Disparadores Activos ({campaigns.length})</p>
                        <div className="grid grid-cols-1 gap-4">
                            {campaigns.map((trigger) => {
                                const config = CAMPAIGN_CONFIG[trigger.tipo] || CAMPAIGN_CONFIG.personalizada;
                                const IconComponent = config.icon;
                                const isActive = trigger.estado === 'activa';

                                return (
                                    <motion.div
                                        key={trigger.id}
                                        layout
                                        className={`p-6 rounded-[2.5rem] bg-[#1c1c1e] border transition-all ${
                                            isActive 
                                                ? 'border-orange-500/20 shadow-xl shadow-orange-500/5' 
                                                : 'border-white/5 opacity-50'
                                        }`}
                                    >
                                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                                            <div className="flex items-center gap-5">
                                                <div className={`w-14 h-14 rounded-2xl ${config.bg} flex items-center justify-center ${config.color} border border-white/5`}>
                                                    <IconComponent size={28} />
                                                </div>
                                                <div className="space-y-1">
                                                    <div className="flex items-center gap-2">
                                                        <h4 className="text-xl font-black text-white uppercase italic tracking-tighter">{trigger.nombre}</h4>
                                                        <span className="text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full bg-white/5 text-gray-400">
                                                            {config.label}
                                                        </span>
                                                    </div>
                                                    <p className="text-xs text-gray-400 max-w-sm font-medium">{trigger.mensaje_titulo}</p>
                                                    <p className="text-[10px] text-gray-600 line-clamp-1">{trigger.mensaje_cuerpo}</p>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-3">
                                                <div className="text-right hidden md:block pr-2">
                                                    <p className="text-[9px] font-black text-gray-600 uppercase tracking-wider">Enviados</p>
                                                    <p className="text-xs text-white font-bold">{trigger.enviados || 0}</p>
                                                </div>
                                                <button
                                                    onClick={() => toggleStatus(trigger.id, trigger.estado)}
                                                    className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${
                                                        isActive 
                                                            ? 'bg-orange-600 text-white shadow-lg shadow-orange-600/20 hover:scale-105 active:scale-95' 
                                                            : 'bg-white/10 text-gray-400 hover:text-white'
                                                    }`}
                                                >
                                                    {isActive ? <Pause size={20} /> : <Play size={20} />}
                                                </button>
                                            </div>
                                        </div>
                                    </motion.div>
                                );
                            })}

                            {campaigns.length === 0 && (
                                <div className="p-12 border-2 border-dashed border-white/5 rounded-[2.5rem] text-center bg-white/[0.01]">
                                    <AlertCircle className="mx-auto text-gray-600 mb-3" size={32} />
                                    <p className="text-xs font-black uppercase text-gray-500 tracking-wider">No hay campañas configuradas</p>
                                    <p className="text-[10px] text-gray-600 mt-1 max-w-xs mx-auto">Crea un nuevo disparador inteligente abajo para automatizar la retención de tus socios.</p>
                                </div>
                            )}
                        </div>

                        <button 
                            onClick={() => setIsCreateModalOpen(true)}
                            className="w-full py-6 rounded-[2rem] border-2 border-dashed border-white/5 hover:border-orange-500/30 text-gray-600 hover:text-orange-500 transition-all font-black uppercase text-xs tracking-[0.2em] flex items-center justify-center gap-3 group"
                        >
                            <Plus size={18} className="group-hover:rotate-90 transition-transform" />
                            Añadir nuevo Trigger (Custom)
                        </button>
                    </div>

                    {/* Live Activity Feed */}
                    <div className="space-y-4">
                        <p className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.2em] ml-4">Actividad en Tiempo Real</p>
                        <div className="bg-[#1c1c1e] border border-white/5 rounded-[3rem] p-6 h-[500px] overflow-hidden flex flex-col shadow-2xl relative">
                            <div className="flex-1 overflow-y-auto space-y-6 scrollbar-hide">
                                {activities.map((log, i) => (
                                    <div key={log.id} className="flex gap-4 relative group">
                                        {i !== activities.length - 1 && <div className="absolute left-[11px] top-8 bottom-0 w-[2px] bg-white/5" />}
                                        <div className={`w-6 h-6 rounded-full flex items-center justify-center z-10 ${
                                            i === 0 
                                                ? 'bg-orange-500 shadow-lg shadow-orange-500/40' 
                                                : 'bg-white/10 border border-white/5'
                                        }`}>
                                            <CheckCircle2 size={12} className={i === 0 ? 'text-white' : 'text-gray-600'} />
                                        </div>
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-2">
                                                <p className="text-[9px] font-black text-white uppercase italic tracking-tighter">Evento Sistema</p>
                                                <span className="text-[8px] font-bold text-gray-600">
                                                    {new Date(log.creado_en).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                            </div>
                                            <p className="text-xs text-gray-400 leading-tight">
                                                {formatActionText(log.accion, log.usuario)}
                                            </p>
                                        </div>
                                    </div>
                                ))}

                                {activities.length === 0 && (
                                    <div className="py-20 flex flex-col items-center justify-center opacity-30 text-center">
                                        <CheckCircle2 size={32} className="text-white mb-2" />
                                        <p className="text-[10px] font-black uppercase tracking-widest text-white">Sin actividad hoy</p>
                                    </div>
                                )}
                            </div>

                            <div className="pt-6 border-t border-white/5 mt-auto">
                                <button className="w-full flex items-center justify-between text-xs text-gray-500 hover:text-white transition-colors group">
                                    <span className="font-bold uppercase tracking-widest">Actividad del local</span>
                                    <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal de Creación Premium */}
            <AnimatePresence>
                {isCreateModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="bg-[#1c1c1e] border border-white/10 rounded-[3rem] w-full max-w-lg overflow-hidden shadow-2xl relative"
                        >
                            {/* Glass decoration glows */}
                            <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none" />

                            <div className="p-8 border-b border-white/5 bg-gradient-to-r from-orange-500/10 to-transparent flex justify-between items-center">
                                <div>
                                    <h3 className="text-2xl font-black text-white italic uppercase tracking-tighter flex items-center gap-3">
                                        <Megaphone className="text-orange-500" /> Crear Automatización
                                    </h3>
                                    <p className="text-gray-500 text-[9px] mt-1 uppercase font-black tracking-widest">Configuración de Trigger Inteligente</p>
                                </div>
                                <button
                                    onClick={() => setIsCreateModalOpen(false)}
                                    className="w-10 h-10 rounded-2xl bg-white/5 hover:bg-white/10 flex items-center justify-center text-gray-400 hover:text-white transition-colors border border-white/5"
                                >
                                    <X size={18} />
                                </button>
                            </div>

                            <form onSubmit={handleCreateCampaign} className="p-8 space-y-5">
                                <div className="space-y-1">
                                    <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest ml-1">Nombre del Trigger</label>
                                    <input
                                        type="text"
                                        value={newCampaign.nombre}
                                        onChange={e => setNewCampaign({ ...newCampaign, nombre: e.target.value })}
                                        placeholder="Ej: Saludo de Cumpleaños Especial"
                                        className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-sm text-white focus:outline-none focus:border-orange-500/50 transition-all"
                                        required
                                        disabled={submitting}
                                    />
                                </div>

                                <div className="space-y-1">
                                    <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest ml-1">Tipo de Evento</label>
                                    <select
                                        value={newCampaign.tipo}
                                        onChange={e => setNewCampaign({ ...newCampaign, tipo: e.target.value as any })}
                                        className="w-full bg-[#1c1c1e] border border-white/10 rounded-2xl px-4 py-3 text-sm text-white focus:outline-none focus:border-orange-500/50 transition-all appearance-none cursor-pointer"
                                        disabled={submitting}
                                    >
                                        <option value="recordatorio_pago">Recordatorio de Pago (Vencimientos)</option>
                                        <option value="reengagement">Alerta de Inactividad (Socios ausentes)</option>
                                        <option value="promocion">Campañas de Promoción / Tienda</option>
                                        <option value="personalizada">Regla Personalizada</option>
                                    </select>
                                </div>

                                <div className="space-y-1">
                                    <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest ml-1">Título del Mensaje (WhatsApp/Push)</label>
                                    <input
                                        type="text"
                                        value={newCampaign.mensaje_titulo}
                                        onChange={e => setNewCampaign({ ...newCampaign, mensaje_titulo: e.target.value })}
                                        placeholder="Ej: ¡Felicidades en tu día especial!"
                                        className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-sm text-white focus:outline-none focus:border-orange-500/50 transition-all"
                                        required
                                        disabled={submitting}
                                    />
                                </div>

                                <div className="space-y-1">
                                    <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest ml-1">Cuerpo del Mensaje (Variables dinámicas permitidas)</label>
                                    <textarea
                                        rows={3}
                                        value={newCampaign.mensaje_cuerpo}
                                        onChange={e => setNewCampaign({ ...newCampaign, mensaje_cuerpo: e.target.value })}
                                        placeholder="Ej: Hola {{name}}, queremos regalarte un 10% de descuento en la tienda por tu cumpleaños..."
                                        className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-sm text-white focus:outline-none focus:border-orange-500/50 transition-all resize-none"
                                        required
                                        disabled={submitting}
                                    />
                                </div>

                                <div className="flex gap-4 pt-3">
                                    <button
                                        type="button"
                                        onClick={() => setIsCreateModalOpen(false)}
                                        className="flex-1 px-6 py-4 bg-white/5 text-white text-[10px] font-black uppercase tracking-widest rounded-2xl hover:bg-white/10 transition-all border border-white/5"
                                        disabled={submitting}
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        type="submit"
                                        className="flex-1 px-6 py-4 bg-orange-600 text-white text-[10px] font-black uppercase tracking-widest rounded-2xl hover:bg-orange-500 transition-all shadow-lg shadow-orange-600/20"
                                        disabled={submitting}
                                    >
                                        Crear Disparador
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

function Plus({ size, className }: { size: number, className?: string }) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
        </svg>
    );
}
