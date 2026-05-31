'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-hot-toast';
import {
    Search,
    CheckCircle2,
    AlertTriangle,
    XCircle,
    Wrench,
    History,
    X
} from 'lucide-react';

interface Equipment {
    id: string;
    name: string;
    category: string;
    condition: 'excellent' | 'good' | 'fair' | 'needs_repair';
    is_available: boolean;
    last_maintenance?: string;
}

const CONDITIONS = [
    { value: 'excellent', label: 'Excelente', color: 'green', icon: <CheckCircle2 size={16} /> },
    { value: 'good', label: 'Bueno', color: 'blue', icon: <CheckCircle2 size={16} /> },
    { value: 'fair', label: 'Regular', color: 'orange', icon: <AlertTriangle size={16} /> },
    { value: 'needs_repair', label: 'Mantenimiento', color: 'red', icon: <XCircle size={16} /> },
];

export default function CoachEquipmentPage() {
    const [equipment, setEquipment] = useState<Equipment[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedItem, setSelectedItem] = useState<Equipment | null>(null);
    const [updating, setUpdating] = useState(false);

    useEffect(() => {
        fetchEquipment();
    }, []);

    const fetchEquipment = async () => {
        try {
            const res = await fetch('/api/equipment');
            if (!res.ok) throw new Error();
            const data = await res.json();
            setEquipment(data);
        } catch (error) {
            console.error('Error fetching equipment:', error);
            toast.error('Error al cargar el equipo');
        } finally {
            setLoading(false);
        }
    };

    const handleReportStatus = async (id: string, condition: string) => {
        setUpdating(true);
        try {
            const res = await fetch('/api/equipment', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id,
                    condition,
                    is_available: condition !== 'needs_repair'
                }),
            });

            if (!res.ok) throw new Error();

            toast.success('Estado reportado correctamente');
            setSelectedItem(null);
            fetchEquipment();
        } catch (error) {
            console.error('Error reporting status:', error);
            toast.error('Error al reportar el estado');
        } finally {
            setUpdating(false);
        }
    };

    const filteredEquipment = equipment.filter(item =>
        item.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (loading) return <div className="p-8 text-center text-gray-400">Cargando estado del gimnasio...</div>;

    return (
        <div className="p-8 space-y-8 bg-[#09090b] min-h-screen">
            {/* Header */}
            <div>
                <h1 className="text-4xl font-black text-white">Supervisión de Equipamiento</h1>
                <p className="text-gray-400">Reporta fallos o cambios en el estado de las máquinas</p>
            </div>

            {/* Search */}
            <div className="relative max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                <input
                    type="text"
                    placeholder="Buscar máquina o accesorio..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full bg-[#1c1c1e] border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white focus:border-orange-500 outline-none transition-all"
                />
            </div>

            {/* Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filteredEquipment.map((item) => (
                    <motion.div
                        key={item.id}
                        layoutId={item.id}
                        onClick={() => setSelectedItem(item)}
                        className="bg-[#1c1c1e] border border-white/10 rounded-2xl p-6 cursor-pointer hover:border-orange-500/30 transition-all group"
                    >
                        <div className="flex justify-between items-start mb-4">
                            <div className="p-2 bg-orange-500/10 rounded-lg text-orange-500">
                                <Wrench size={20} />
                            </div>
                            <span className={`text-[10px] font-black uppercase px-2 py-1 rounded-full
                                ${item.condition === 'needs_repair' ? 'bg-red-500/20 text-red-500' : 'bg-green-500/20 text-green-500'}`}>
                                {item.condition === 'needs_repair' ? 'Averiado' : 'Operativo'}
                            </span>
                        </div>

                        <h3 className="text-lg font-bold text-white group-hover:text-orange-500 transition-colors mb-4">
                            {item.name}
                        </h3>

                        <div className="flex items-center gap-2 text-xs text-gray-500 bg-black/20 p-2 rounded-lg">
                            <History size={14} />
                            <span>Mantenimiento: {item.last_maintenance ? new Date(item.last_maintenance).toLocaleDateString() : 'Sin registro'}</span>
                        </div>
                    </motion.div>
                ))}
            </div>

            {/* Modal de Reporte */}
            <AnimatePresence>
                {selectedItem && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 20 }}
                            className="bg-[#1c1c1e] w-full max-w-md rounded-3xl border border-white/10 overflow-hidden shadow-2xl"
                        >
                            <div className="p-6 border-b border-white/5 flex justify-between items-center bg-gradient-to-r from-orange-500/10 to-transparent">
                                <div>
                                    <p className="text-[10px] font-black uppercase text-orange-500 tracking-widest">Reportar Estado</p>
                                    <h2 className="text-xl font-bold text-white">{selectedItem.name}</h2>
                                </div>
                                <button onClick={() => setSelectedItem(null)} className="text-gray-500 hover:text-white transition-colors">
                                    <X size={24} />
                                </button>
                            </div>

                            <div className="p-6 space-y-4">
                                <p className="text-sm text-gray-400 mb-4">Selecciona el estado actual de la máquina para informar a mantenimiento:</p>

                                <div className="grid grid-cols-1 gap-2">
                                    {CONDITIONS.map((c) => (
                                        <button
                                            key={c.value}
                                            onClick={() => handleReportStatus(selectedItem.id, c.value)}
                                            disabled={updating || selectedItem.condition === c.value}
                                            className={`flex items-center justify-between p-4 rounded-xl border transition-all text-sm font-bold
                                                ${selectedItem.condition === c.value
                                                    ? `bg-${c.color}-500/20 border-${c.color}-500 text-${c.color}-400`
                                                    : 'bg-white/5 border-white/5 text-gray-400 hover:border-white/20 hover:text-white'}`}
                                        >
                                            <div className="flex items-center gap-3">
                                                {c.icon}
                                                {c.label}
                                            </div>
                                            {selectedItem.condition === c.value && <CheckCircle2 size={16} />}
                                        </button>
                                    ))}
                                </div>

                                <button
                                    onClick={() => setSelectedItem(null)}
                                    className="w-full mt-4 py-3 bg-white/5 hover:bg-white/10 text-white rounded-xl font-bold transition-all"
                                >
                                    Cancelar
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {filteredEquipment.length === 0 && (
                <div className="text-center py-20 text-gray-600">
                    <p>No se encontraron máquinas con ese nombre.</p>
                </div>
            )}
        </div>
    );
}
