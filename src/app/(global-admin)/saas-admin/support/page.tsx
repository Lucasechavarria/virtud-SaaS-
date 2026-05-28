'use client';

import React, { useState, useEffect } from 'react';
import {
    ShieldAlert,
    Clock,
    CheckCircle2,
    MessageSquare,
    Search,
    ChevronLeft,
    AlertTriangle,
    Eye,
    TrendingUp,
    Settings,
    DollarSign,
    X
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { useRouter } from 'next/navigation';

interface SupportTicket {
    id: string;
    asunto: string;
    descripcion: string;
    prioridad: string;
    estado: string;
    categoria: string;
    creado_en: string;
    actualizado_en: string;
    usuario_nombre: string;
    usuario_email: string;
    gimnasio_nombre: string;
}

export default function SaaSAdminSupportPage() {
    const [tickets, setTickets] = useState<SupportTicket[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState<string>('all');
    const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
    const [updating, setUpdating] = useState(false);
    const router = useRouter();

    useEffect(() => {
        fetchTickets();
    }, []);

    const fetchTickets = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/saas-admin/tickets');
            const data = await res.json();
            if (res.ok) setTickets(data.tickets || []);
        } catch (_err) {
            toast.error('Error al cargar la mesa de ayuda B2B');
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateStatus = async (ticketId: string, status: string) => {
        setUpdating(true);
        try {
            const res = await fetch('/api/saas-admin/tickets', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ticketId, status })
            });

            if (res.ok) {
                toast.success(`Ticket marcado como ${status.replace('_', ' ')}`);
                fetchTickets();
                if (selectedTicket && selectedTicket.id === ticketId) {
                    setSelectedTicket(prev => prev ? { ...prev, estado: status } : null);
                }
            } else {
                toast.error('Error al actualizar el estado');
            }
        } catch (_err) {
            toast.error('Error de red al actualizar ticket');
        } finally {
            setUpdating(false);
        }
    };

    const filteredTickets = tickets.filter(t => {
        const matchesSearch = t.asunto.toLowerCase().includes(searchTerm.toLowerCase()) ||
            t.descripcion.toLowerCase().includes(searchTerm.toLowerCase()) ||
            t.gimnasio_nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
            t.usuario_nombre.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesStatus = filterStatus === 'all' || t.estado === filterStatus;

        return matchesSearch && matchesStatus;
    });

    const openCount = tickets.filter(t => t.estado === 'abierto').length;
    const progressCount = tickets.filter(t => t.estado === 'en_progreso').length;
    const resolvedCount = tickets.filter(t => t.estado === 'resuelto' || t.estado === 'cerrado').length;
    const criticalCount = tickets.filter(t => (t.prioridad === 'critica' || t.prioridad === 'alta') && t.estado !== 'resuelto' && t.estado !== 'cerrado').length;

    return (
        <div className="space-y-8 p-4 md:p-8 font-rajdhani max-w-7xl mx-auto pb-32">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                    <button
                        onClick={() => router.back()}
                        className="flex items-center gap-2 text-zinc-500 hover:text-white transition-colors text-[10px] font-black uppercase tracking-widest mb-4 group"
                    >
                        <ChevronLeft size={14} className="group-hover:-translate-x-1 transition-transform" />
                        Volver al Dashboard
                    </button>
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-red-600/20 rounded-2xl flex items-center justify-center text-red-500 border border-red-500/20 shadow-lg">
                            <ShieldAlert size={24} />
                        </div>
                        <div>
                            <h1 className="text-4xl font-black text-white italic uppercase tracking-tighter leading-none">
                                Mesa de Ayuda <span className="text-red-500">SaaS B2B</span>
                            </h1>
                            <p className="text-xs text-zinc-500 font-bold uppercase tracking-widest mt-1 opacity-60">
                                Gestión y Respuesta a Tickets de Soporte del Ecosistema
                            </p>
                        </div>
                    </div>
                </div>

                <div className="flex bg-zinc-900/80 p-1.5 rounded-2xl border border-white/5 shadow-inner">
                    {[
                        { id: 'all', label: 'Todos' },
                        { id: 'abierto', label: 'Abiertos' },
                        { id: 'en_progreso', label: 'En Curso' },
                        { id: 'resuelto', label: 'Resueltos' }
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setFilterStatus(tab.id)}
                            className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                                filterStatus === tab.id
                                    ? 'bg-red-600 text-white shadow-lg shadow-red-600/20'
                                    : 'text-zinc-500 hover:text-white'
                            }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Quick Metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <MetricCard title="Tickets Abiertos" value={openCount} color="text-red-500" bg="bg-red-500/10" border="border-red-500/10" />
                <MetricCard title="En Curso" value={progressCount} color="text-amber-500" bg="bg-amber-500/10" border="border-amber-500/10" />
                <MetricCard title="Resueltos / Cerrados" value={resolvedCount} color="text-green-500" bg="bg-green-500/10" border="border-green-500/10" />
                <MetricCard title="Urgencias Críticas" value={criticalCount} color="text-tactical-magenta" bg="bg-tactical-magenta/10" border="border-tactical-magenta/10" isAlert={criticalCount > 0} />
            </div>

            {/* Main Interface */}
            <div className="bg-zinc-950 rounded-[2.5rem] border border-white/5 shadow-2xl overflow-hidden">
                <div className="p-8 border-b border-white/5 flex flex-col md:flex-row justify-between gap-4">
                    <h3 className="text-xl font-black text-white italic uppercase tracking-wider">Tickets Recibidos</h3>
                    <div className="relative max-w-md w-full">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600" size={18} />
                        <input
                            type="text"
                            placeholder="Buscar por asunto, gimnasio, descripción..."
                            className="w-full bg-white/5 border border-white/10 rounded-2xl pl-12 pr-4 py-3 text-xs text-white uppercase font-bold tracking-wider focus:border-red-500 outline-none transition-all placeholder:text-zinc-600"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-black/40 text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] border-b border-white/5">
                                <th className="px-8 py-5">Gimnasio / Remitente</th>
                                <th className="px-8 py-5">Asunto / Categoría</th>
                                <th className="px-8 py-5">Prioridad</th>
                                <th className="px-8 py-5">Estado</th>
                                <th className="px-8 py-5">Fecha Reporte</th>
                                <th className="px-8 py-5 text-right font-black">Acción</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {loading ? (
                                [1, 2, 3].map(i => (
                                    <tr key={i} className="animate-pulse">
                                        <td colSpan={6} className="h-16 bg-white/2"></td>
                                    </tr>
                                ))
                            ) : filteredTickets.map((ticket) => (
                                <tr key={ticket.id} className="hover:bg-white/2 transition-colors">
                                    <td className="px-8 py-5">
                                        <div className="flex flex-col">
                                            <span className="text-sm font-black text-white">{ticket.gimnasio_nombre}</span>
                                            <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">{ticket.usuario_nombre}</span>
                                        </div>
                                    </td>
                                    <td className="px-8 py-5">
                                        <div className="flex flex-col">
                                            <span className="text-xs font-black text-white tracking-wider max-w-[200px] truncate">{ticket.asunto}</span>
                                            <span className="text-[8px] font-black uppercase tracking-widest text-zinc-500 flex items-center gap-1 mt-0.5">
                                                {ticket.categoria === 'tecnico' && <Settings size={10} className="text-tactical-cyan" />}
                                                {ticket.categoria === 'facturacion' && <DollarSign size={10} className="text-tactical-magenta" />}
                                                {ticket.categoria === 'sugerencia' && <MessageSquare size={10} className="text-yellow-400" />}
                                                {ticket.categoria}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-8 py-5">
                                        <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${
                                            ticket.prioridad === 'critica' ? 'bg-red-500/10 text-red-500 border-red-500/20' :
                                            ticket.prioridad === 'alta' ? 'bg-orange-500/10 text-orange-400 border-orange-500/20' :
                                            ticket.prioridad === 'media' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                                            'bg-zinc-500/10 text-zinc-400 border-zinc-500/20'
                                        }`}>
                                            {ticket.prioridad}
                                        </span>
                                    </td>
                                    <td className="px-8 py-5">
                                        <div className="flex items-center gap-2">
                                            <div className={`w-2 h-2 rounded-full ${
                                                ticket.estado === 'abierto' ? 'bg-red-500 animate-pulse' :
                                                ticket.estado === 'en_progreso' ? 'bg-amber-500 animate-pulse' : 'bg-green-500'
                                            }`} />
                                            <span className={`text-[10px] font-black uppercase tracking-widest ${
                                                ticket.estado === 'abierto' ? 'text-red-500' :
                                                ticket.estado === 'en_progreso' ? 'text-amber-500' : 'text-green-500'
                                            }`}>
                                                {ticket.estado.replace('_', ' ')}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-8 py-5 text-xs text-zinc-400 font-bold uppercase tracking-wider">
                                        {new Date(ticket.creado_en).toLocaleDateString('es-AR')}
                                    </td>
                                    <td className="px-8 py-5 text-right">
                                        <button
                                            onClick={() => setSelectedTicket(ticket)}
                                            className="p-3 bg-white/5 hover:bg-red-600/15 border border-white/10 hover:border-red-500/25 rounded-2xl text-zinc-400 hover:text-red-400 transition-all active:scale-95"
                                        >
                                            <Eye size={16} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {filteredTickets.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="py-20 text-center text-zinc-500 font-bold uppercase tracking-widest italic text-xs">
                                        No se encontraron tickets en esta categoría
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal de Detalle y Respuesta del Ticket */}
            <AnimatePresence>
                {selectedTicket && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            className="bg-zinc-950 border border-white/10 rounded-[2.5rem] w-full max-w-lg overflow-hidden shadow-2xl flex flex-col relative"
                        >
                            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-500 to-tactical-magenta" />
                            
                            <div className="p-8 border-b border-white/5 flex justify-between items-start">
                                <div>
                                    <span className="px-2 py-0.5 bg-white/5 border border-white/5 rounded text-[8px] font-black uppercase text-zinc-500 tracking-widest">{selectedTicket.categoria}</span>
                                    <h3 className="text-xl font-black text-white italic uppercase tracking-tight mt-1">{selectedTicket.asunto}</h3>
                                    <p className="text-[10px] text-zinc-500 font-black uppercase tracking-widest mt-1">Remite: {selectedTicket.gimnasio_nombre}</p>
                                </div>
                                <button
                                    onClick={() => setSelectedTicket(null)}
                                    className="p-2 bg-white/5 hover:bg-white/10 rounded-xl transition-colors text-zinc-400 hover:text-white"
                                >
                                    <X size={16} />
                                </button>
                            </div>

                            <div className="p-8 space-y-6 flex-1 overflow-y-auto">
                                <div className="space-y-2">
                                    <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">Descripción del Incidente</span>
                                    <div className="bg-white/2 border border-white/5 rounded-2xl p-5 text-sm text-zinc-300 leading-relaxed max-h-[160px] overflow-y-auto font-medium">
                                        {selectedTicket.descripcion}
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4 text-[10px] font-black uppercase tracking-widest text-zinc-500">
                                    <div>
                                        <span>Prioridad</span>
                                        <p className="text-sm font-black text-white italic mt-1">{selectedTicket.prioridad}</p>
                                    </div>
                                    <div>
                                        <span>Contacto Administrador</span>
                                        <p className="text-xs font-mono text-zinc-400 mt-1 truncate">{selectedTicket.usuario_email}</p>
                                    </div>
                                </div>

                                <div className="space-y-3 pt-4 border-t border-white/5">
                                    <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">Control Operativo</span>
                                    <div className="grid grid-cols-3 gap-3">
                                        {[
                                            { id: 'abierto', label: 'Abierto', color: 'hover:bg-red-500/10 text-red-500 hover:border-red-500/30' },
                                            { id: 'en_progreso', label: 'En Curso', color: 'hover:bg-amber-500/10 text-amber-500 hover:border-amber-500/30' },
                                            { id: 'resuelto', label: 'Resuelto', color: 'hover:bg-green-500/10 text-green-500 hover:border-green-500/30' }
                                        ].map(state => (
                                            <button
                                                key={state.id}
                                                disabled={updating}
                                                onClick={() => handleUpdateStatus(selectedTicket.id, state.id)}
                                                className={`px-4 py-3 bg-white/2 border border-white/5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                                                    selectedTicket.estado === state.id
                                                        ? 'bg-white/10 border-white/20 text-white shadow-inner scale-95 font-black'
                                                        : state.color
                                                }`}
                                            >
                                                {state.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}

function MetricCard({ title, value, color, bg, border, isAlert = false }: { title: string; value: number; color: string; bg: string; border: string; isAlert?: boolean }) {
    return (
        <div className={`bg-zinc-950 p-6 rounded-[2rem] border ${border} flex items-center justify-between shadow-xl relative overflow-hidden`}>
            {isAlert && <div className="absolute top-0 left-0 w-full h-[2px] bg-tactical-magenta animate-pulse shadow-[0_0_10px_#FF00FF]" />}
            <div className="flex items-center gap-4">
                <div className={`w-12 h-12 ${bg} ${color} rounded-2xl flex items-center justify-center border border-white/5 shadow-inner`}>
                    {isAlert ? <AlertTriangle size={24} className="animate-bounce" /> : <Clock size={24} />}
                </div>
                <div>
                    <p className="text-[9px] text-zinc-500 font-black uppercase tracking-wider">{title}</p>
                    <p className={`text-2xl font-black italic ${color}`}>{value}</p>
                </div>
            </div>
        </div>
    );
}
