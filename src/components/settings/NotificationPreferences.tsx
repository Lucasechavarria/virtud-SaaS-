'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Bell, BellOff, Clock, Save, Loader2 } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface NotificationPrefs {
    pagos_vencimiento: boolean;
    pagos_confirmacion: boolean;
    clases_recordatorio: boolean;
    clases_cancelacion: boolean;
    logros_nuevos: boolean;
    mensajes_nuevos: boolean;
    rutinas_nuevas: boolean;
    recordatorio_clases_horas: number;
}

export function NotificationPreferences() {
    const [prefs, setPrefs] = useState<NotificationPrefs | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        fetchPreferences();
    }, []);

    const fetchPreferences = async () => {
        try {
            const res = await fetch('/api/notifications/preferences');
            if (!res.ok) throw new Error('Error al cargar preferencias');
            const data = await res.json();
            setPrefs(data);
        } catch (error) {
            console.error('Error:', error);
            toast.error('Error al cargar preferencias');
        } finally {
            setLoading(false);
        }
    };

    const updatePreference = async (key: keyof NotificationPrefs, value: boolean | number) => {
        if (!prefs) return;

        const updatedPrefs = { ...prefs, [key]: value };
        setPrefs(updatedPrefs);

        setSaving(true);
        try {
            const res = await fetch('/api/notifications/preferences', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updatedPrefs),
            });

            if (!res.ok) throw new Error('Error al guardar');

            toast.success('Preferencias actualizadas');
        } catch (error) {
            console.error('Error:', error);
            toast.error('Error al guardar preferencias');
            // Revertir cambio
            setPrefs(prefs);
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center p-12">
                <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
            </div>
        );
    }

    if (!prefs) return null;

    const notificationTypes = [
        {
            key: 'pagos_vencimiento' as keyof NotificationPrefs,
            label: 'Pagos por vencer',
            description: 'Recibe alertas antes de que venza tu pago',
            icon: '💳',
        },
        {
            key: 'pagos_confirmacion' as keyof NotificationPrefs,
            label: 'Confirmación de pagos',
            description: 'Notificación cuando tu pago sea procesado',
            icon: '✅',
        },
        {
            key: 'clases_recordatorio' as keyof NotificationPrefs,
            label: 'Recordatorios de clases',
            description: 'Te avisamos antes de que comience tu clase',
            icon: '🏋️',
        },
        {
            key: 'clases_cancelacion' as keyof NotificationPrefs,
            label: 'Cancelaciones de clases',
            description: 'Entérate si una clase es cancelada',
            icon: '🚫',
        },
        {
            key: 'logros_nuevos' as keyof NotificationPrefs,
            label: 'Nuevos logros',
            description: 'Celebra tus logros y trofeos desbloqueados',
            icon: '🏆',
        },
        {
            key: 'mensajes_nuevos' as keyof NotificationPrefs,
            label: 'Nuevos mensajes',
            description: 'Recibe notificaciones de mensajes de tu coach',
            icon: '💬',
        },
        {
            key: 'rutinas_nuevas' as keyof NotificationPrefs,
            label: 'Nuevas rutinas',
            description: 'Cuando tu coach te asigne una nueva rutina',
            icon: '📋',
        },
    ];

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-2xl">
                    <Bell className="w-6 h-6 text-purple-400" />
                </div>
                <div>
                    <h2 className="text-2xl font-black text-white">Notificaciones</h2>
                    <p className="text-sm text-zinc-400">Personaliza tus alertas y recordatorios</p>
                </div>
            </div>

            {/* Configuración de timing */}
            <motion.div
                className="bg-gradient-to-br from-zinc-900/80 to-zinc-800/80 rounded-3xl p-6 border border-white/5"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
            >
                <div className="flex items-center gap-3 mb-4">
                    <Clock className="w-5 h-5 text-blue-400" />
                    <h3 className="text-lg font-bold text-white">Timing de Recordatorios</h3>
                </div>
                <div className="flex items-center gap-4">
                    <span className="text-sm text-zinc-400">Recordar clases</span>
                    <select
                        value={prefs.recordatorio_clases_horas}
                        onChange={(e) => updatePreference('recordatorio_clases_horas', parseInt(e.target.value))}
                        className="px-4 py-2 bg-zinc-800 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                        disabled={saving}
                    >
                        <option value={1}>1 hora antes</option>
                        <option value={2}>2 horas antes</option>
                        <option value={3}>3 horas antes</option>
                        <option value={6}>6 horas antes</option>
                        <option value={12}>12 horas antes</option>
                        <option value={24}>24 horas antes</option>
                    </select>
                </div>
            </motion.div>

            {/* Lista de preferencias */}
            <div className="space-y-3">
                {notificationTypes.map(({ key, label, description, icon }, index) => (
                    <motion.div
                        key={key}
                        className="bg-gradient-to-br from-zinc-900/80 to-zinc-800/80 rounded-3xl p-5 border border-white/5 flex items-center justify-between group hover:border-purple-500/30 transition-all"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                        whileHover={{ scale: 1.01 }}
                    >
                        <div className="flex items-center gap-4 flex-1">
                            <div className="text-3xl">{icon}</div>
                            <div className="flex-1">
                                <h4 className="text-sm font-bold text-white">{label}</h4>
                                <p className="text-xs text-zinc-500">{description}</p>
                            </div>
                        </div>

                        <button
                            onClick={() => updatePreference(key, !prefs[key])}
                            disabled={saving}
                            className={`p-3 rounded-xl transition-all ${prefs[key]
                                    ? 'bg-gradient-to-br from-green-500 to-emerald-600 shadow-lg shadow-green-500/20'
                                    : 'bg-zinc-700/50'
                                } ${saving ? 'opacity-50 cursor-not-allowed' : 'hover:scale-110'}`}
                        >
                            {prefs[key] ? (
                                <Bell size={20} className="text-white" />
                            ) : (
                                <BellOff size={20} className="text-zinc-400" />
                            )}
                        </button>
                    </motion.div>
                ))}
            </div>

            {/* Estado de guardado */}
            {saving && (
                <motion.div
                    className="flex items-center justify-center gap-2 text-sm text-zinc-400"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                >
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Guardando...</span>
                </motion.div>
            )}
        </div>
    );
}
