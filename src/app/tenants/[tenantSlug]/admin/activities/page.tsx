'use client';

import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, X, Save, Clock } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';

interface Activity {
    id: string;
    nombre: string;
    descripcion: string;
    color: string;
    duracion_minutos: number;
    esta_activa: boolean;
    tipo?: string;
    categoria?: string;
    capacidad_maxima?: number;
    url_imagen?: string;
}

export default function AdminActivitiesPage() {
    const [activities, setActivities] = useState<Activity[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingActivity, setEditingActivity] = useState<Activity | null>(null);

    // Form State
    const [formData, setFormData] = useState<Partial<Activity>>({
        nombre: '',
        descripcion: '',
        color: '#3b82f6',
        duracion_minutos: 60,
        esta_activa: true
    });

    useEffect(() => {
        fetchActivities();
    }, []);

    const fetchActivities = async () => {
        try {
            const res = await fetch('/api/admin/activities');
            const data = await res.json();
            if (Array.isArray(data)) setActivities(data);
        } catch (_error) {
            toast.error('Error al cargar actividades');
        } finally {
            setLoading(false);
        }
    };

    const handleOpenModal = (activity?: Activity) => {
        if (activity) {
            setEditingActivity(activity);
            setFormData(activity);
        } else {
            setEditingActivity(null);
            setFormData({
                nombre: '',
                descripcion: '',
                color: '#3b82f6',
                duracion_minutos: 60,
                esta_activa: true
            });
        }
        setIsModalOpen(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const method = editingActivity ? 'PUT' : 'POST';
            const body = editingActivity ? { ...formData, id: editingActivity.id } : formData;

            const res = await fetch('/api/admin/activities', {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...body,
                    categoria: body.categoria || 'Fitness',
                    tipo: body.tipo || 'CLASS'
                })
            });

            const data = await res.json();

            if (!res.ok) throw new Error(data.error || 'Error al guardar');

            toast.success(editingActivity ? 'Actividad actualizada' : 'Actividad creada');
            setIsModalOpen(false);
            fetchActivities();
        } catch (_error) {
            const err = _error as Error;
            console.error('Save activity error:', err);
            toast.error(err.message || 'Ocurrió un error al guardar la actividad');
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('¿Estás seguro? Esto eliminará también los horarios asociados a esta actividad.')) return;

        try {
            const res = await fetch(`/api/admin/activities?id=${id}`, { method: 'DELETE' });
            if (!res.ok) throw new Error('Error al eliminar');

            toast.success('Actividad eliminada');
            fetchActivities();
        } catch (_error) {
            toast.error('Error al eliminar');
        }
    };

    if (loading) return <div className="p-8 text-white">Cargando...</div>;

    return (
        <div className="p-8 space-y-8">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-black text-white">Gestión de Actividades</h1>
                    <p className="text-gray-400">Configura los deportes y clases disponibles en el gimnasio</p>
                </div>
                <button
                    onClick={() => handleOpenModal()}
                    className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors font-bold shadow-lg"
                >
                    <Plus size={20} /> Nueva Actividad
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {activities.map((activity) => (
                    <motion.div
                        key={activity.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-[#1c1c1e] border border-white/5 rounded-2xl p-6 relative overflow-hidden group hover:border-white/20 transition-all"
                    >
                        {/* Color Strip */}
                        <div className="absolute top-0 left-0 w-2 h-full" style={{ backgroundColor: activity.color }} />

                        <div className="ml-4 space-y-4">
                            <div className="flex justify-between items-start">
                                <h3 className="text-xl font-bold text-white">{activity.nombre}</h3>
                                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button
                                        onClick={() => handleOpenModal(activity)}
                                        className="p-2 hover:bg-white/10 rounded-full text-blue-400 transition-colors"
                                    >
                                        <Edit2 size={18} />
                                    </button>
                                    <button
                                        onClick={() => handleDelete(activity.id)}
                                        className="p-2 hover:bg-white/10 rounded-full text-red-400 transition-colors"
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                </div>
                            </div>

                            <p className="text-gray-400 text-sm h-10 line-clamp-2">
                                {activity.descripcion || 'Sin descripción'}
                            </p>

                            <div className="flex items-center gap-4 text-xs text-gray-500 font-mono pt-4 border-t border-white/5">
                                <div className="flex items-center gap-1">
                                    <Clock size={14} />
                                    {activity.duracion_minutos} min
                                </div>
                                <div className="flex items-center gap-1">
                                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: activity.color }} />
                                    {activity.color}
                                </div>
                                <div className={`px-2 py-0.5 rounded-full ${activity.esta_activa ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                                    {activity.esta_activa ? 'Activa' : 'Inactiva'}
                                </div>
                            </div>
                        </div>
                    </motion.div>
                ))}
            </div>

            {/* Modal */}
            <AnimatePresence>
                {isModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="bg-[#2c2c2e] w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden border border-white/10"
                        >
                            <div className="p-6 border-b border-white/10 flex justify-between items-center">
                                <h2 className="text-xl font-bold text-white">
                                    {editingActivity ? 'Editar Actividad' : 'Nueva Actividad'}
                                </h2>
                                <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-white">

                                    <X size={24} />
                                </button>
                            </div>

                            <form onSubmit={handleSubmit} className="p-6 space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-400 mb-1">Nombre</label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.nombre}
                                        onChange={e => setFormData({ ...formData, nombre: e.target.value })}
                                        className="w-full bg-black/30 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple-500"
                                        placeholder="Ej: Yoga, Crossfit..."
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-400 mb-1">Descripción</label>
                                    <textarea
                                        value={formData.descripcion}
                                        onChange={e => setFormData({ ...formData, descripcion: e.target.value })}
                                        className="w-full bg-black/30 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple-500 h-24 resize-none"
                                        placeholder="Breve descripción de la actividad..."
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-400 mb-1">Duración (min)</label>
                                        <input
                                            type="number"
                                            required
                                            value={formData.duracion_minutos}
                                            onChange={e => setFormData({ ...formData, duracion_minutos: Number(e.target.value) })}
                                            className="w-full bg-black/30 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-400 mb-1">Color Identificador</label>
                                        <div className="flex gap-2">
                                            <input
                                                type="color"
                                                value={formData.color}
                                                onChange={e => setFormData({ ...formData, color: e.target.value })}
                                                className="h-10 w-16 bg-transparent cursor-pointer rounded overflow-hidden"
                                            />
                                            <input
                                                type="text"
                                                value={formData.color}
                                                onChange={e => setFormData({ ...formData, color: e.target.value })}
                                                className="flex-1 bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-white text-sm"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2 pt-2">
                                    <input
                                        type="checkbox"
                                        id="isActive"
                                        checked={formData.esta_activa}
                                        onChange={e => setFormData({ ...formData, esta_activa: e.target.checked })}
                                        className="w-4 h-4 rounded border-gray-600 bg-black/30 text-purple-600 focus:ring-purple-500"
                                    />
                                    <label htmlFor="isActive" className="text-sm font-medium text-gray-300 select-none cursor-pointer">
                                        Actividad disponible
                                    </label>
                                </div>

                                <div className="pt-4 flex gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setIsModalOpen(false)}
                                        className="flex-1 py-2 bg-white/5 hover:bg-white/10 text-white rounded-lg font-medium transition-colors"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        type="submit"
                                        className="flex-1 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-bold shadow-lg transition-colors flex justify-center items-center gap-2"
                                    >
                                        <Save size={18} /> Guardar
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )
                }
            </AnimatePresence >
        </div >
    );
}

