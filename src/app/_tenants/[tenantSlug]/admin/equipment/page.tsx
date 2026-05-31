'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-hot-toast';
import {
    Plus,
    Edit2,
    Trash2,
    Search,
    CheckCircle2,
    AlertTriangle,
    XCircle,
    Settings,
    Save,
    X
} from 'lucide-react';

interface Equipment {
    id: string;
    name: string;
    category: string;
    condition: 'excellent' | 'good' | 'fair' | 'needs_repair';
    is_available: boolean;
    image_url?: string;
    last_maintenance?: string;
}

const CATEGORIES = ['Cardio', 'Fuerza', 'Funcional', 'Peso Libre', 'Artes Marciales', 'Otro'];
const CONDITIONS = [
    { value: 'excellent', label: 'Excelente', color: 'green', icon: <CheckCircle2 size={14} /> },
    { value: 'good', label: 'Bueno', color: 'blue', icon: <CheckCircle2 size={14} /> },
    { value: 'fair', label: 'Regular', color: 'orange', icon: <AlertTriangle size={14} /> },
    { value: 'needs_repair', label: 'Mantenimiento', color: 'red', icon: <XCircle size={14} /> },
];

export default function AdminEquipmentPage() {
    const [equipment, setEquipment] = useState<Equipment[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('all');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<Partial<Equipment> | null>(null);

    useEffect(() => {
        fetchEquipment();
    }, []);

    const fetchEquipment = async () => {
        try {
            const res = await fetch('/api/equipment');
            if (!res.ok) throw new Error();
            const data = await res.json();
            setEquipment(data);
        } catch (_error) {
            toast.error('Error al cargar el equipo');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const method = editingItem?.id ? 'PATCH' : 'POST';

        try {
            const res = await fetch('/api/equipment', {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(editingItem),
            });

            if (!res.ok) throw new Error();

            toast.success(editingItem?.id ? 'Equipo actualizado' : 'Equipo creado');
            setIsModalOpen(false);
            setEditingItem(null);
            fetchEquipment();
        } catch (_error) {
            toast.error('Error al guardar el equipo');
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('¿Estás seguro de eliminar este equipo?')) return;
        try {
            const res = await fetch(`/api/equipment?id=${id}`, { method: 'DELETE' });
            if (!res.ok) throw new Error();
            toast.success('Equipo eliminado');
            fetchEquipment();
        } catch (_error) {
            toast.error('Error al eliminar');
        }
    };

    const filteredEquipment = equipment.filter(item => {
        const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
        return matchesSearch && matchesCategory;
    });

    if (loading) return <div className="p-8 text-center text-gray-400">Cargando inventario...</div>;

    return (
        <div className="p-8 space-y-8 bg-[#09090b] min-h-screen">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-4xl font-black text-white">Inventario de Equipamiento</h1>
                    <p className="text-gray-400">Gestiona las máquinas y accesorios del gimnasio</p>
                </div>
                <button
                    onClick={() => {
                        setEditingItem({ name: '', category: 'Cardio', condition: 'excellent', is_available: true });
                        setIsModalOpen(true);
                    }}
                    className="flex items-center gap-2 px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold transition-all shadow-lg shadow-purple-900/20"
                >
                    <Plus size={20} /> Nuevo Equipo
                </button>
            </div>

            {/* Toolbar */}
            <div className="flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                    <input
                        type="text"
                        placeholder="Buscar equipo..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-[#1c1c1e] border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white focus:border-purple-500 outline-none transition-all"
                    />
                </div>
                <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="bg-[#1c1c1e] border border-white/10 rounded-xl px-4 py-3 text-white focus:border-purple-500 outline-none transition-all"
                >
                    <option value="all">Todas las Categorías</option>
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
            </div>

            {/* Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
                <AnimatePresence>
                    {filteredEquipment.map((item) => (
                        <motion.div
                            key={item.id}
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            className="bg-[#1c1c1e] border border-white/10 rounded-2xl overflow-hidden group hover:border-purple-500/30 transition-all"
                        >
                            <div className="p-6 space-y-4">
                                <div className="flex justify-between items-start">
                                    <div className={`p-2 rounded-lg bg-gray-800 text-purple-400`}>
                                        <Settings size={20} />
                                    </div>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => { setEditingItem(item); setIsModalOpen(true); }}
                                            className="p-2 hover:bg-white/5 rounded-lg text-gray-400 hover:text-blue-400 transition-all"
                                        >
                                            <Edit2 size={16} />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(item.id)}
                                            className="p-2 hover:bg-white/5 rounded-lg text-gray-400 hover:text-red-400 transition-all"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>

                                <div>
                                    <h3 className="text-lg font-bold text-white group-hover:text-purple-400 transition-colors">
                                        {item.name}
                                    </h3>
                                    <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">{item.category}</p>
                                </div>

                                <div className="flex items-center justify-between pt-4 border-t border-white/5">
                                    <span className={`flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-lg
                                        ${item.condition === 'excellent' ? 'bg-green-500/10 text-green-400' :
                                            item.condition === 'good' ? 'bg-blue-500/10 text-blue-400' :
                                                item.condition === 'fair' ? 'bg-orange-500/10 text-orange-400' :
                                                    'bg-red-500/10 text-red-400'}`}>
                                        {CONDITIONS.find(c => c.value === item.condition)?.icon}
                                        {CONDITIONS.find(c => c.value === item.condition)?.label}
                                    </span>
                                    <span className={`text-[10px] font-black uppercase px-2 py-1 rounded-lg
                                        ${item.is_available ? 'bg-purple-500/10 text-purple-400' : 'bg-gray-800 text-gray-500'}`}>
                                        {item.is_available ? 'Operativo' : 'Fuera de uso'}
                                    </span>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>

            {/* Modal */}
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
                                <h2 className="text-xl font-bold text-white">
                                    {editingItem?.id ? 'Editar Equipo' : 'Nuevo Equipo'}
                                </h2>
                                <button onClick={() => setIsModalOpen(false)} className="text-gray-500 hover:text-white transition-colors">
                                    <X size={24} />
                                </button>
                            </div>

                            <form onSubmit={handleSubmit} className="p-6 space-y-5">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-purple-400 uppercase tracking-[0.2em] ml-1">Nombre del Equipo</label>
                                    <input
                                        type="text"
                                        required
                                        value={editingItem?.name}
                                        onChange={(e) => setEditingItem({ ...editingItem, name: e.target.value })}
                                        className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-3 text-white outline-none focus:border-purple-500/50 focus:bg-white/10 transition-all placeholder:text-gray-600"
                                        placeholder="Ej: Caminadora Pro v2"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black text-purple-400 uppercase tracking-[0.2em] ml-1">Categoría</label>
                                        <div className="relative">
                                            <select
                                                value={editingItem?.category}
                                                onChange={(e) => setEditingItem({ ...editingItem, category: e.target.value })}
                                                className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-3 text-white outline-none focus:border-purple-500/50 focus:bg-white/10 transition-all appearance-none cursor-pointer"
                                            >
                                                {CATEGORIES.map(c => <option key={c} value={c} className="bg-[#1c1c1e] text-white">{c}</option>)}
                                            </select>
                                            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500">
                                                <Plus size={14} className="rotate-45" />
                                            </div>
                                        </div>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black text-purple-400 uppercase tracking-[0.2em] ml-1">Estado</label>
                                        <div className="relative">
                                            <select
                                                value={editingItem?.condition}
                                                onChange={(e) => setEditingItem({ ...editingItem, condition: e.target.value as Equipment['condition'] })}
                                                className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-3 text-white outline-none focus:border-purple-500/50 focus:bg-white/10 transition-all appearance-none cursor-pointer"
                                            >
                                                {CONDITIONS.map(c => <option key={c.value} value={c.value} className="bg-[#1c1c1e] text-white">{c.label}</option>)}
                                            </select>
                                            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500">
                                                <Plus size={14} className="rotate-45" />
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-3 p-4 bg-purple-500/5 rounded-2xl border border-purple-500/10 hover:bg-purple-500/10 transition-colors cursor-pointer group">
                                    <div className="relative flex items-center">
                                        <input
                                            type="checkbox"
                                            id="available"
                                            checked={editingItem?.is_available}
                                            onChange={(e) => setEditingItem({ ...editingItem, is_available: e.target.checked })}
                                            className="w-5 h-5 rounded-lg bg-white/5 border-white/10 text-purple-600 focus:ring-purple-500/50 transition-all cursor-pointer"
                                        />
                                    </div>
                                    <label htmlFor="available" className="text-sm text-gray-300 font-medium cursor-pointer select-none group-hover:text-white transition-colors">
                                        ¿Está disponible para los alumnos?
                                    </label>
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
                                        className="flex-1 py-4 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-2xl font-bold transition-all shadow-xl shadow-purple-900/40 flex items-center justify-center gap-2 border border-white/10 hover:scale-[1.02] active:scale-[0.98]"
                                    >
                                        <Save size={18} /> {editingItem?.id ? 'Actualizar' : 'Crear Equipo'}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {filteredEquipment.length === 0 && (
                <div className="flex flex-col items-center justify-center py-20 text-gray-600 space-y-4">
                    <div className="text-6xl">🔧</div>
                    <p className="text-xl font-medium">No hay equipos registrados en esta categoría</p>
                </div>
            )}
        </div>
    );
}
