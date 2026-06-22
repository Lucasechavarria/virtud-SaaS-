'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useParams } from 'next/navigation';
import {
    UserX,
    Phone,
    MessageCircle,
    TrendingDown,
    AlertTriangle,
    Clock,
    UserCheck,
    ChevronRight,
    Search
} from 'lucide-react';
import toast from 'react-hot-toast';

interface ChurnRiskStudent {
    id: string;
    nombre: string;
    correo: string;
    telefono: string | null;
    ultima_asistencia: string;
    dias_ausente: number;
    promedio_mensual: number;
    nivel_riesgo: 'alto' | 'medio';
}

export default function ChurnAnalysis() {
    const params = useParams();
    const tenantSlug = (params?.tenantSlug) as string | undefined;
    const [risks, setRisks] = useState<ChurnRiskStudent[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        fetchChurnData();
    }, []);

    const fetchChurnData = async () => {
        try {
            const url = tenantSlug
                ? `/api/admin/crm/churn?gymId=${tenantSlug}`
                : '/api/admin/crm/churn';
            const res = await fetch(url);
            if (!res.ok) throw new Error();
            const data = await res.json();
            setRisks(data);
        } catch (_err) {
            toast.error('Error al cargar análisis de retención');
        } finally {
            setLoading(false);
        }
    };

    const handleWhatsAppMessage = (student: ChurnRiskStudent) => {
        const phone = student.telefono;
        if (!phone) {
            toast.error('El alumno no tiene un número de teléfono registrado.');
            return;
        }
        
        // Limpiar caracteres no numéricos
        const cleanPhone = phone.replace(/[^0-9]/g, '');
        if (!cleanPhone) {
            toast.error('El número de teléfono registrado no es válido.');
            return;
        }

        const message = encodeURIComponent(`Hola ${student.nombre}, ¡te extrañamos en el gimnasio! Hace ${student.dias_ausente} días que no registras actividad. ¿Todo bien?`);
        window.open(`https://wa.me/${cleanPhone}?text=${message}`, '_blank');
    };

    const filteredRisks = risks.filter(r =>
        r.nombre.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const criticalCount = filteredRisks.filter(r => r.nivel_riesgo === 'alto').length;
    const churnRate = risks.length > 0 ? Math.min((risks.length / 25) * 100, 100).toFixed(1) : "0.0";

    if (loading) return <div className="p-8 text-center text-gray-400 font-bold uppercase tracking-widest animate-pulse">Analizando deserción...</div>;

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-black text-white italic uppercase tracking-tighter">Retención Proactiva</h2>
                    <p className="text-gray-500 text-sm flex items-center gap-2">
                        <TrendingDown size={14} className="text-red-500" />
                        Detectando alumnos con posible deserción (Churn)
                    </p>
                </div>
                <div className="hidden md:flex items-center gap-2">
                    <div className="bg-red-500/10 text-red-500 text-[10px] font-black px-3 py-1 rounded-full border border-red-500/20">
                        {criticalCount} CRÍTICOS
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                {/* Search & Sidebar for Analysis */}
                <div className="lg:col-span-1 space-y-4">
                    <div className="bg-[#1c1c1e] border border-white/5 rounded-3xl p-6 space-y-6 shadow-xl">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={14} />
                            <input
                                type="text"
                                placeholder="Filtrar alumnos..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full bg-black/20 border border-white/5 rounded-xl pl-9 pr-4 py-2 text-xs text-white"
                            />
                        </div>

                        <div className="space-y-3">
                            <p className="text-[10px] font-bold text-gray-600 uppercase tracking-widest">Estado del Churn</p>
                            <div className="space-y-2">
                                <div className="flex justify-between text-xs">
                                    <span className="text-gray-400">Tasa de Deserción</span>
                                    <span className="text-red-400 font-bold">{churnRate}%</span>
                                </div>
                                <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                                    <div className="h-full bg-red-500 transition-all duration-500" style={{ width: `${churnRate}%` }} />
                                </div>
                            </div>
                        </div>

                        <div className="pt-4 border-t border-white/5">
                            <button
                                onClick={fetchChurnData}
                                className="w-full bg-white/5 hover:bg-white/10 text-white text-[10px] font-black py-3 rounded-xl uppercase tracking-tighter border border-white/5 transition-all"
                            >
                                Recargar Análisis
                            </button>
                        </div>
                    </div>
                </div>

                {/* Churn Risk List */}
                <div className="lg:col-span-3 space-y-4">
                    <AnimatePresence>
                        {filteredRisks.map((student, idx) => (
                            <motion.div
                                key={student.id}
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: idx * 0.1 }}
                                className={`p-5 rounded-[2.5rem] bg-[#1c1c1e] border border-white/5 hover:border-white/10 transition-all group flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-2xl relative overflow-hidden`}
                            >
                                {/* Risk Indicator Line */}
                                <div className={`absolute left-0 top-0 bottom-0 w-2 ${student.nivel_riesgo === 'alto' ? 'bg-red-500' : 'bg-orange-500'}`} />

                                <div className="flex items-center gap-5 pl-4">
                                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-white ${student.nivel_riesgo === 'alto' ? 'bg-red-500/10 text-red-500' : 'bg-orange-500/10 text-orange-500'}`}>
                                        <AlertTriangle size={24} />
                                    </div>
                                    <div className="space-y-1">
                                        <h4 className="text-lg font-black text-white italic uppercase tracking-tighter leading-none">{student.nombre}</h4>
                                        <div className="flex items-center gap-3 text-xs text-gray-500 font-bold">
                                            <span className="flex items-center gap-1">
                                                <Clock size={12} />
                                                Ausente {student.ultima_asistencia}
                                            </span>
                                            <span className="w-1 h-1 bg-gray-700 rounded-full" />
                                            <span className="flex items-center gap-1">
                                                <UserCheck size={12} />
                                                Frecuencia: {student.promedio_mensual} v/sem
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-3 pl-4 md:pl-0">
                                    <div className="grid grid-cols-2 gap-2">
                                        <button
                                            onClick={() => handleWhatsAppMessage(student)}
                                            className="p-4 rounded-2xl bg-white/5 hover:bg-green-500/20 text-green-400 border border-white/5 hover:border-green-500/30 transition-all flex flex-col items-center gap-1 group/btn"
                                        >
                                            <MessageCircle size={18} className="group-hover/btn:scale-110 transition-transform" />
                                            <span className="text-[10px] font-black">WSapp</span>
                                        </button>
                                        <button
                                            onClick={() => window.open(`mailto:${student.correo}`)}
                                            className="p-4 rounded-2xl bg-white/5 hover:bg-blue-500/20 text-blue-400 border border-white/5 hover:border-blue-500/30 transition-all flex flex-col items-center gap-1 group/btn"
                                        >
                                            <Phone size={18} className="group-hover/btn:scale-110 transition-transform" />
                                            <span className="text-[10px] font-black">Mail</span>
                                        </button>
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </AnimatePresence>

                    {filteredRisks.length === 0 && (
                        <div className="p-12 text-center text-gray-500 italic bg-white/2 rounded-[2.5rem] border border-white/5">
                            ¡Gran trabajo! No hay alumnos en riesgo de deserción en este momento.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
