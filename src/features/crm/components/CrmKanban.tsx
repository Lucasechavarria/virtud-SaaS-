'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    UserPlus,
    MessageSquare,
    Calendar,
    CheckCircle2,
    XCircle,
    TrendingUp,
    Plus,
    Phone,
    Mail,
    Search,
    X,
    Save,
    Trash2
} from 'lucide-react';
import toast from 'react-hot-toast';

type ProspectState = 'nuevo' | 'contactado' | 'prueba_agendada' | 'convertido' | 'perdido';

interface Prospect {
    id: string;
    nombre_completo: string;
    telefono: string;
    email: string;
    estado: ProspectState;
    valor_estimado: number;
    origen: string;
}

const COLUMNS: { id: ProspectState; label: string; icon: React.ReactNode; color: string }[] = [
    { id: 'nuevo', label: 'Nuevos Leads', icon: <UserPlus size={16} />, color: 'from-blue-500/20 to-blue-600/5' },
    { id: 'contactado', label: 'Contactados', icon: <MessageSquare size={16} />, color: 'from-amber-500/20 to-amber-600/5' },
    { id: 'prueba_agendada', label: 'Clase de Prueba', icon: <Calendar size={16} />, color: 'from-purple-500/20 to-purple-600/5' },
    { id: 'convertido', label: 'Ganados', icon: <CheckCircle2 size={16} />, color: 'from-green-500/20 to-green-600/5' },
    { id: 'perdido', label: 'Perdidos', icon: <XCircle size={16} />, color: 'from-red-500/20 to-red-600/5' },
];

export default function CrmKanban() {
    const [prospects, setProspects] = useState<Prospect[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    // Form State
    const [formData, setFormData] = useState({
        nombre_completo: '',
        telefono: '',
        email: '',
        valor_estimado: '',
        origen: 'Instagram',
        estado: 'nuevo' as ProspectState
    });

    useEffect(() => {
        fetchProspects();
    }, []);

    const fetchProspects = async () => {
        try {
            const res = await fetch('/api/admin/crm/leads');
            if (!res.ok) throw new Error();
            const data = await res.json();
            setProspects(data);
        } catch (_err) {
            toast.error('Error al cargar prospectos');
        } finally {
            setLoading(false);
        }
    };

    const handleDragStart = (e: React.DragEvent, id: string) => {
        e.dataTransfer.setData('text/plain', id);
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
    };

    const handleDrop = async (e: React.DragEvent, targetState: ProspectState) => {
        e.preventDefault();
        const id = e.dataTransfer.getData('text/plain');
        if (!id) return;

        // Cambiar estado localmente para feedback inmediato
        const prevProspects = [...prospects];
        setProspects(prev => prev.map(p => p.id === id ? { ...p, estado: targetState } : p));

        try {
            const res = await fetch('/api/admin/crm/leads', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id, estado: targetState })
            });

            if (!res.ok) throw new Error();
            toast.success('Estado actualizado');
        } catch (_err) {
            setProspects(prevProspects);
            toast.error('Error al actualizar el estado');
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.nombre_completo.trim()) return;

        setSubmitting(true);
        try {
            const res = await fetch('/api/admin/crm/leads', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            if (!res.ok) throw new Error();
            toast.success('Prospecto creado');
            setIsModalOpen(false);
            setFormData({
                nombre_completo: '',
                telefono: '',
                email: '',
                valor_estimado: '',
                origen: 'Instagram',
                estado: 'nuevo'
            });
            fetchProspects();
        } catch (_err) {
            toast.error('Error al crear prospecto');
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('¿Estás seguro de eliminar este prospecto?')) return;

        try {
            const res = await fetch(`/api/admin/crm/leads?id=${id}`, {
                method: 'DELETE'
            });

            if (!res.ok) throw new Error();
            toast.success('Prospecto eliminado');
            fetchProspects();
        } catch (_err) {
            toast.error('Error al eliminar prospecto');
        }
    };

    const filteredProspects = prospects.filter(p =>
        p.nombre_completo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.email.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const totalPipeline = filteredProspects.reduce((acc, p) => acc + Number(p.valor_estimado || 0), 0);

    if (loading) return <div className="p-8 text-center text-gray-400 font-bold uppercase tracking-widest animate-pulse">Cargando CRM...</div>;

    return (
        <div className="space-y-6">
            {/* Header / Stats Overlay */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                    <h2 className="text-3xl font-black text-white italic uppercase tracking-tighter">Pipeline de Ventas</h2>
                    <p className="text-gray-500 text-sm flex items-center gap-2">
                        <TrendingUp size={14} className="text-green-500" />
                        Valor acumulado en juego: <span className="text-white font-bold">${totalPipeline.toLocaleString('es-AR')}</span>
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={14} />
                        <input
                            type="text"
                            placeholder="Buscar prospecto..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="bg-[#1c1c1e] border border-white/5 rounded-xl pl-9 pr-4 py-2 text-sm text-white focus:outline-none focus:border-orange-500/50 transition-all w-64"
                        />
                    </div>
                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="bg-orange-600 hover:bg-orange-500 text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 shadow-lg shadow-orange-600/20 transition-all"
                    >
                        <Plus size={16} />
                        Nuevo Prospecto
                    </button>
                </div>
            </div>

            {/* Kanban Board */}
            <div className="flex gap-4 overflow-x-auto pb-6 -mx-4 px-4 scrollbar-hide">
                {COLUMNS.map((col) => (
                    <div
                        key={col.id}
                        className="min-w-[300px] w-[300px] flex flex-col gap-4"
                        onDragOver={handleDragOver}
                        onDrop={(e) => handleDrop(e, col.id)}
                    >
                        {/* Column Header */}
                        <div className={`p-4 rounded-2xl bg-gradient-to-br ${col.color} border border-white/5 flex items-center justify-between`}>
                            <div className="flex items-center gap-2">
                                <span className="text-white bg-white/10 p-1.5 rounded-lg">{col.icon}</span>
                                <h3 className="text-xs font-black text-white uppercase tracking-widest">{col.label}</h3>
                            </div>
                            <span className="text-[10px] font-bold text-gray-400 bg-white/5 px-2 py-1 rounded-full">
                                {filteredProspects.filter(p => p.estado === col.id).length}
                            </span>
                        </div>

                        {/* Drop Zone */}
                        <div className="flex-1 flex flex-col gap-3 min-h-[500px] bg-white/[0.01] hover:bg-white/[0.02] rounded-3xl p-2 transition-all">
                            {filteredProspects.filter(p => p.estado === col.id).map((prospect) => (
                                <motion.div
                                    key={prospect.id}
                                    layoutId={prospect.id}
                                    draggable
                                    onDragStart={(e: any) => handleDragStart(e, prospect.id)}
                                    className="p-4 rounded-2xl bg-[#1c1c1e] border border-white/5 hover:border-white/10 transition-all group cursor-grab active:cursor-grabbing shadow-lg relative"
                                >
                                    <div className="flex justify-between items-start mb-3">
                                        <div>
                                            <p className="font-extrabold text-white text-sm group-hover:text-orange-400 transition-colors uppercase italic tracking-tighter pr-6">
                                                {prospect.nombre_completo}
                                            </p>
                                            <p className="text-[10px] font-bold text-gray-600 uppercase tracking-widest mt-0.5">
                                                Vía {prospect.origen}
                                            </p>
                                        </div>
                                        <button
                                            onClick={() => handleDelete(prospect.id)}
                                            className="text-gray-600 hover:text-red-400 transition-colors p-1"
                                            title="Eliminar Prospecto"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>

                                    <div className="space-y-2 mb-4">
                                        {prospect.telefono && (
                                            <div className="flex items-center gap-2 text-xs text-gray-400">
                                                <Phone size={10} className="text-orange-500" />
                                                <span>{prospect.telefono}</span>
                                            </div>
                                        )}
                                        {prospect.email && (
                                            <div className="flex items-center gap-2 text-xs text-gray-400">
                                                <Mail size={10} className="text-blue-500" />
                                                <span className="truncate">{prospect.email}</span>
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex items-center justify-between pt-3 border-t border-white/5">
                                        <div className="bg-green-500/10 text-green-400 text-[10px] font-black px-2 py-1 rounded-lg">
                                            ${Number(prospect.valor_estimado || 0).toLocaleString('es-AR')}
                                        </div>
                                    </div>
                                </motion.div>
                            ))}

                            {/* Empty State placeholder in column */}
                            {filteredProspects.filter(p => p.estado === col.id).length === 0 && (
                                <div className="flex-1 rounded-2xl border-2 border-dashed border-white/5 flex items-center justify-center p-8 opacity-20">
                                    <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">Sin prospectos</p>
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {/* Modal de Crear Prospecto */}
            <AnimatePresence>
                {isModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="bg-[#1c1c1e] w-full max-w-lg rounded-3xl border border-white/10 overflow-hidden shadow-2xl"
                        >
                            <div className="p-6 border-b border-white/5 flex justify-between items-center">
                                <h2 className="text-xl font-bold text-white">Nuevo Prospecto</h2>
                                <button
                                    onClick={() => setIsModalOpen(false)}
                                    className="text-gray-500 hover:text-white transition-colors"
                                >
                                    <X size={24} />
                                </button>
                            </div>

                            <form onSubmit={handleSubmit} className="p-6 space-y-5">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-orange-400 uppercase tracking-[0.2em] ml-1">Nombre Completo</label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.nombre_completo}
                                        onChange={(e) => setFormData({ ...formData, nombre_completo: e.target.value })}
                                        className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-3 text-white outline-none focus:border-orange-500/50 focus:bg-white/10 transition-all placeholder:text-gray-600"
                                        placeholder="Ej: Julián Rossi"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black text-orange-400 uppercase tracking-[0.2em] ml-1">Teléfono</label>
                                        <input
                                            type="text"
                                            value={formData.telefono}
                                            onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                                            className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-3 text-white outline-none focus:border-orange-500/50 focus:bg-white/10 transition-all placeholder:text-gray-600"
                                            placeholder="Ej: 11 2345 6789"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black text-orange-400 uppercase tracking-[0.2em] ml-1">Email</label>
                                        <input
                                            type="email"
                                            value={formData.email}
                                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                            className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-3 text-white outline-none focus:border-orange-500/50 focus:bg-white/10 transition-all placeholder:text-gray-600"
                                            placeholder="Ej: julian@example.com"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black text-orange-400 uppercase tracking-[0.2em] ml-1">Valor Estimado ($)</label>
                                        <input
                                            type="number"
                                            value={formData.valor_estimado}
                                            onChange={(e) => setFormData({ ...formData, valor_estimado: e.target.value })}
                                            className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-3 text-white outline-none focus:border-orange-500/50 focus:bg-white/10 transition-all placeholder:text-gray-600"
                                            placeholder="Ej: 45000"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black text-orange-400 uppercase tracking-[0.2em] ml-1">Origen / Canal</label>
                                        <select
                                            value={formData.origen}
                                            onChange={(e) => setFormData({ ...formData, origen: e.target.value })}
                                            className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-3 text-white outline-none focus:border-orange-500/50 focus:bg-white/10 transition-all appearance-none cursor-pointer"
                                        >
                                            <option value="Instagram" className="bg-[#1c1c1e]">Instagram</option>
                                            <option value="Facebook" className="bg-[#1c1c1e]">Facebook</option>
                                            <option value="Google" className="bg-[#1c1c1e]">Google Search</option>
                                            <option value="Recomendado" className="bg-[#1c1c1e]">Recomendado</option>
                                            <option value="Otro" className="bg-[#1c1c1e]">Otro</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="pt-4 flex gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setIsModalOpen(false)}
                                        className="flex-1 py-4 bg-white/5 hover:bg-white/10 text-white rounded-2xl font-bold transition-all border border-white/5"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={submitting}
                                        className="flex-1 py-4 bg-orange-600 hover:bg-orange-500 text-white rounded-2xl font-bold transition-all shadow-xl shadow-orange-950/40 flex items-center justify-center gap-2 border border-white/10"
                                    >
                                        <Save size={18} /> {submitting ? 'Creando...' : 'Crear Prospecto'}
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
