'use client';

import React, { useState, useEffect } from 'react';
import {
    MessageSquare,
    Building2,
    Send,
    Filter,
    ArrowLeft,
    Plus,
    X,
    AlertTriangle,
    ShieldCheck,
    Clock,
    Settings,
    DollarSign,
    LifeBuoy
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';

interface SupportTicket {
    id: string;
    asunto: string;
    prioridad: string;
    estado: string;
    categoria?: string;
    creado_en: string;
    actualizado_en: string;
    perfiles: { nombre_completo: string };
    gimnasios: { nombre: string };
}

interface Message {
    id: string;
    mensaje: string;
    es_del_staff_saas: boolean;
    creado_en: string;
    perfiles: { nombre_completo: string, rol: string };
}

export default function TenantGymSupportPage() {
    const [tickets, setTickets] = useState<SupportTicket[]>([]);
    const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const [filterStatus, setFilterStatus] = useState<string>('all');

    // New Ticket Modal States
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [ticketForm, setTicketForm] = useState({
        asunto: '',
        categoria: 'tecnico',
        prioridad: 'media',
        mensaje: ''
    });

    useEffect(() => {
        fetchTickets();
    }, []);

    const fetchTickets = async () => {
        try {
            const res = await fetch('/api/saas/support');
            const data = await res.json();
            if (res.ok) setTickets(data.tickets || []);
        } catch (_error) {
            toast.error('Error al cargar tickets de soporte');
        } finally {
            setLoading(false);
        }
    };

    const fetchMessages = async (ticketId: string) => {
        try {
            const res = await fetch(`/api/saas/support/${ticketId}/messages`);
            const data = await res.json();
            if (res.ok) setMessages(data.messages || []);
        } catch (_error) {
            toast.error('Error al cargar mensajes');
        }
    };

    const handleSelectTicket = (ticket: SupportTicket) => {
        setSelectedTicket(ticket);
        fetchMessages(ticket.id);
    };

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim() || !selectedTicket) return;

        setSending(true);
        try {
            const res = await fetch(`/api/saas/support/${selectedTicket.id}/messages`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ mensaje: newMessage })
            });
            if (res.ok) {
                setNewMessage('');
                fetchMessages(selectedTicket.id);
            }
        } catch (_error) {
            toast.error('Error al enviar mensaje');
        } finally {
            setSending(false);
        }
    };

    const handleCreateTicket = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!ticketForm.asunto.trim() || !ticketForm.mensaje.trim()) {
            toast.error('Por favor, completa el asunto y el mensaje.');
            return;
        }

        setSending(true);
        try {
            const res = await fetch('/api/saas/support', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(ticketForm)
            });

            if (res.ok) {
                toast.success('Incidencia reportada con éxito');
                setShowCreateModal(false);
                setTicketForm({
                    asunto: '',
                    categoria: 'tecnico',
                    prioridad: 'media',
                    mensaje: ''
                });
                fetchTickets();
            } else {
                const data = await res.json();
                toast.error(data.error || 'Error al reportar la incidencia');
            }
        } catch (_err) {
            toast.error('Error de conexión al reportar incidencia');
        } finally {
            setSending(false);
        }
    };

    const filteredTickets = tickets.filter(t => {
        if (filterStatus === 'all') return true;
        if (filterStatus === 'abiertos') return t.estado === 'abierto' || t.estado === 'en_progreso';
        if (filterStatus === 'resueltos') return t.estado === 'resuelto' || t.estado === 'cerrado';
        return true;
    });

    return (
        <div className="flex flex-col h-[calc(100vh-120px)] gap-6 p-4 md:p-8 font-rajdhani relative overflow-hidden">
            {/* Background cyber decorations */}
            <div className="absolute top-0 right-0 w-80 h-80 bg-tactical-cyan/5 rounded-full blur-3xl -mr-40 -mt-40 z-0 pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-80 h-80 bg-tactical-magenta/5 rounded-full blur-3xl -ml-40 -mb-40 z-0 pointer-events-none" />

            {/* Header section */}
            <div className="relative z-10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-4xl font-black text-transparent bg-clip-text bg-linear-to-r from-white via-white to-tactical-cyan italic uppercase tracking-tighter leading-none flex items-center gap-3">
                        🎫 Centro de Soporte B2B
                    </h1>
                    <p className="text-zinc-400 mt-2 font-medium tracking-wide">
                        Reporta incidencias técnicas, consultas de facturación y sugerencias directamente con el staff de soporte de VIRTUD.
                    </p>
                </div>

                <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setShowCreateModal(true)}
                    className="px-6 py-3.5 bg-tactical-cyan text-black text-xs font-black uppercase tracking-widest rounded-2xl shadow-lg shadow-tactical-cyan/20 hover:shadow-tactical-cyan/35 transition-all flex items-center gap-2"
                >
                    <Plus size={16} /> Reportar Incidencia
                </motion.button>
            </div>

            {/* Interface Container */}
            <div className="relative z-10 flex-1 flex gap-6 overflow-hidden">
                
                {/* Panel Izquierdo: Lista de Tickets */}
                <div className={`w-full lg:w-96 bg-zinc-950 rounded-[2.5rem] border border-white/5 flex flex-col overflow-hidden ${selectedTicket ? 'hidden lg:flex' : 'flex'}`}>
                    
                    {/* Filtros de estado */}
                    <div className="p-6 border-b border-white/5 space-y-4">
                        <div className="flex justify-between items-center">
                            <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Tus Reportes</span>
                            <LifeBuoy size={16} className="text-zinc-600 animate-pulse" />
                        </div>
                        
                        <div className="flex bg-zinc-900/60 p-1 rounded-xl border border-white/5">
                            {[
                                { id: 'all', label: 'Todos' },
                                { id: 'abiertos', label: 'Abiertos' },
                                { id: 'resueltos', label: 'Cerrados' }
                            ].map(tab => (
                                <button
                                    key={tab.id}
                                    onClick={() => setFilterStatus(tab.id)}
                                    className={`flex-1 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${
                                        filterStatus === tab.id
                                            ? 'bg-white/5 border border-white/5 text-tactical-cyan shadow-sm'
                                            : 'text-zinc-500 hover:text-white'
                                    }`}
                                >
                                    {tab.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Contenido de la lista */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-3">
                        {loading ? (
                            <div className="animate-pulse space-y-4">
                                {[1, 2, 3].map(i => <div key={i} className="h-24 bg-white/2 rounded-3xl" />)}
                            </div>
                        ) : filteredTickets.length === 0 ? (
                            <div className="py-20 text-center space-y-3">
                                <span className="text-3xl filter drop-shadow-[0_0_8px_rgba(255,255,255,0.2)]">🎉</span>
                                <p className="text-zinc-500 font-bold uppercase tracking-widest text-[10px]">Todo en orden por aquí</p>
                                <p className="text-[9px] text-zinc-600 max-w-xs mx-auto px-4">No tienes incidencias registradas en esta categoría.</p>
                            </div>
                        ) : filteredTickets.map((ticket) => {
                            const isAbierto = ticket.estado === 'abierto' || ticket.estado === 'en_progreso';
                            return (
                                <button
                                    key={ticket.id}
                                    onClick={() => handleSelectTicket(ticket)}
                                    className={`w-full text-left p-5 rounded-3xl border transition-all relative overflow-hidden group ${
                                        selectedTicket?.id === ticket.id
                                            ? 'bg-tactical-cyan/10 border-tactical-cyan/35 shadow-lg shadow-tactical-cyan/5'
                                            : 'bg-white/2 border-white/5 hover:bg-white/5'
                                    }`}
                                >
                                    {selectedTicket?.id === ticket.id && (
                                        <div className="absolute top-0 left-0 w-[2px] h-full bg-tactical-cyan" />
                                    )}
                                    <div className="flex justify-between items-start mb-2">
                                        <span className={`text-xs font-black uppercase italic tracking-tight truncate flex-1 ${
                                            selectedTicket?.id === ticket.id ? 'text-tactical-cyan' : 'text-white'
                                        }`}>
                                            {ticket.asunto}
                                        </span>
                                        <span className={`px-2 py-0.5 rounded text-[7px] font-black uppercase tracking-widest shrink-0 ml-2 ${
                                            ticket.prioridad === 'critica' ? 'bg-red-500/10 text-red-500 border border-red-500/20' :
                                            ticket.prioridad === 'alta' ? 'bg-orange-500/10 text-orange-400 border border-orange-500/20' :
                                            ticket.prioridad === 'media' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' :
                                            'bg-zinc-500/10 text-zinc-500 border border-zinc-500/25'
                                        }`}>
                                            {ticket.prioridad}
                                        </span>
                                    </div>
                                    <div className="flex justify-between text-[9px] items-center mt-3">
                                        <span className="text-zinc-500 font-bold uppercase tracking-wider flex items-center gap-1">
                                            {ticket.categoria === 'tecnico' && <Settings size={10} className="text-tactical-cyan" />}
                                            {ticket.categoria === 'facturacion' && <DollarSign size={10} className="text-tactical-magenta" />}
                                            {ticket.categoria === 'sugerencia' && <MessageSquare size={10} className="text-yellow-400" />}
                                            {ticket.categoria || 'tecnico'}
                                        </span>
                                        <div className="flex items-center gap-1.5">
                                            <div className={`w-1.5 h-1.5 rounded-full ${
                                                ticket.estado === 'abierto' ? 'bg-red-500 animate-pulse' :
                                                ticket.estado === 'en_progreso' ? 'bg-amber-500 animate-pulse' : 'bg-green-500'
                                            }`} />
                                            <span className={`font-black uppercase tracking-widest text-[8px] ${
                                                ticket.estado === 'abierto' ? 'text-red-500' :
                                                ticket.estado === 'en_progreso' ? 'text-amber-500' : 'text-green-500'
                                            }`}>
                                                {ticket.estado.replace('_', ' ')}
                                            </span>
                                        </div>
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Panel Derecho: Área de Chat e Incidencia */}
                <div className={`flex-1 bg-zinc-950 rounded-[2.5rem] border border-white/5 flex flex-col overflow-hidden ${!selectedTicket ? 'hidden lg:flex' : 'flex'}`}>
                    {selectedTicket ? (
                        <>
                            {/* Chat Header */}
                            <div className="p-6 bg-black/40 border-b border-white/5 flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <button onClick={() => setSelectedTicket(null)} className="lg:hidden p-2 hover:bg-white/10 rounded-full text-zinc-400">
                                        <ArrowLeft size={20} />
                                    </button>
                                    <div className="w-10 h-10 bg-tactical-cyan/15 rounded-2xl flex items-center justify-center text-tactical-cyan border border-tactical-cyan/10 shadow-inner">
                                        <LifeBuoy size={20} />
                                    </div>
                                    <div>
                                        <h4 className="text-sm font-black text-white italic uppercase tracking-tight">{selectedTicket.asunto}</h4>
                                        <p className="text-[9px] text-zinc-500 font-black uppercase tracking-widest mt-0.5">
                                            Categoría: {selectedTicket.categoria || 'Técnico'} • Prioridad: {selectedTicket.prioridad}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className={`px-3 py-1 bg-white/5 border border-white/10 rounded-full text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5 ${
                                        selectedTicket.estado === 'abierto' ? 'text-red-400' :
                                        selectedTicket.estado === 'en_progreso' ? 'text-amber-400' : 'text-green-400'
                                    }`}>
                                        <div className={`w-1.5 h-1.5 rounded-full ${
                                            selectedTicket.estado === 'abierto' ? 'bg-red-500 animate-pulse' :
                                            selectedTicket.estado === 'en_progreso' ? 'bg-amber-500 animate-pulse' : 'bg-green-500'
                                        }`} />
                                        Estado: {selectedTicket.estado.replace('_', ' ')}
                                    </span>
                                </div>
                            </div>

                            {/* Messages Container */}
                            <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6">
                                {messages.map((msg) => (
                                    <div key={msg.id} className={`flex ${msg.es_del_staff_saas ? 'justify-start' : 'justify-end'}`}>
                                        <div className={`max-w-[75%] rounded-[1.8rem] p-5 shadow-2xl relative border ${
                                            msg.es_del_staff_saas 
                                                ? 'bg-tactical-magenta/10 border-tactical-magenta/20 text-white rounded-l-3xl rounded-tr-3xl shadow-tactical-magenta/5' 
                                                : 'bg-tactical-cyan/10 border-tactical-cyan/20 text-white rounded-r-3xl rounded-tl-3xl shadow-tactical-cyan/5'
                                        }`}>
                                            <p className="text-xs font-semibold leading-relaxed whitespace-pre-wrap">{msg.mensaje}</p>
                                            
                                            <div className="flex justify-between items-center mt-3 pt-2 border-t border-white/5 opacity-60 text-[8px] font-black uppercase tracking-widest">
                                                <span className={msg.es_del_staff_saas ? 'text-tactical-magenta' : 'text-tactical-cyan'}>
                                                    {msg.es_del_staff_saas ? '🛠️ STAFF SOPORTE' : '👤 ADMINISTRADOR'}
                                                </span>
                                                <span className="text-zinc-500 font-bold ml-4">
                                                    {new Date(msg.creado_en).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                {messages.length === 0 && (
                                    <div className="h-full flex flex-col items-center justify-center text-center space-y-3">
                                        <Clock className="text-zinc-700 animate-pulse" size={32} />
                                        <p className="text-zinc-500 font-bold uppercase tracking-widest text-[10px]">Cargando mensajes del ticket...</p>
                                    </div>
                                )}
                            </div>

                            {/* Chat Input */}
                            <form onSubmit={handleSendMessage} className="p-6 bg-black/40 border-t border-white/5 flex gap-4">
                                <input
                                    type="text"
                                    placeholder="Escribe tu mensaje para el Staff de Soporte..."
                                    className="flex-1 bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-white focus:border-tactical-cyan outline-none transition-all text-xs font-bold tracking-wider placeholder:text-zinc-600"
                                    value={newMessage}
                                    onChange={(e) => setNewMessage(e.target.value)}
                                    disabled={sending}
                                />
                                <button
                                    type="submit"
                                    disabled={sending || !newMessage.trim()}
                                    className="bg-tactical-cyan hover:bg-cyan-400 text-black p-4 rounded-2xl transition-all shadow-lg active:scale-95 disabled:opacity-50 flex items-center justify-center shrink-0 shadow-tactical-cyan/20"
                                >
                                    <Send size={18} />
                                </button>
                            </form>
                        </>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center text-center p-10">
                            <div className="w-20 h-20 bg-white/2 border border-white/5 rounded-3xl flex items-center justify-center text-zinc-600 mb-6 shadow-inner filter drop-shadow-[0_0_15px_rgba(0,0,0,0.4)]">
                                <MessageSquare size={36} className="text-tactical-cyan" />
                            </div>
                            <h3 className="text-lg font-black text-white italic uppercase tracking-wider">Historial de Incidencias</h3>
                            <p className="text-zinc-500 text-xs mt-2 max-w-xs font-semibold leading-relaxed">
                                Selecciona un reporte del menú lateral para revisar las respuestas del equipo de soporte de VIRTUD o chatear con ellos.
                            </p>
                        </div>
                    )}
                </div>
            </div>

            {/* Modal para Crear Ticket de Incidencia */}
            <AnimatePresence>
                {showCreateModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            className="bg-zinc-950 border border-white/10 rounded-[2.5rem] w-full max-w-lg overflow-hidden shadow-2xl flex flex-col relative"
                        >
                            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-tactical-cyan to-tactical-magenta" />
                            
                            <div className="p-8 border-b border-white/5 flex justify-between items-center">
                                <div>
                                    <h3 className="text-2xl font-black text-white italic uppercase tracking-tighter flex items-center gap-3">
                                        <LifeBuoy className="text-tactical-cyan" /> Reportar Incidencia SaaS
                                    </h3>
                                    <p className="text-zinc-500 text-[10px] uppercase font-black tracking-widest mt-1">Apertura de Ticket Técnico de Soporte</p>
                                </div>
                                <button
                                    onClick={() => setShowCreateModal(false)}
                                    className="p-2 bg-white/5 hover:bg-white/10 rounded-xl transition-colors text-zinc-400 hover:text-white"
                                >
                                    <X size={16} />
                                </button>
                            </div>

                            <form onSubmit={handleCreateTicket} className="p-8 space-y-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Asunto de la Incidencia</label>
                                    <input
                                        type="text"
                                        value={ticketForm.asunto}
                                        onChange={e => setTicketForm({ ...ticketForm, asunto: e.target.value })}
                                        placeholder="Ej: Error crítico al procesar pagos en POS"
                                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-xs font-bold focus:outline-none focus:border-tactical-cyan transition-all placeholder:text-zinc-700"
                                        required
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Categoría</label>
                                        <select
                                            value={ticketForm.categoria}
                                            onChange={e => setTicketForm({ ...ticketForm, categoria: e.target.value })}
                                            className="w-full bg-zinc-900 border border-white/10 rounded-xl px-4 py-3 text-white text-xs font-bold focus:outline-none focus:border-tactical-cyan transition-all"
                                        >
                                            <option value="tecnico">🛠️ Soporte Técnico</option>
                                            <option value="facturacion">💳 Facturación SaaS</option>
                                            <option value="sugerencia">💡 Sugerencia / Feedback</option>
                                        </select>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Prioridad Operativa</label>
                                        <select
                                            value={ticketForm.prioridad}
                                            onChange={e => setTicketForm({ ...ticketForm, prioridad: e.target.value })}
                                            className="w-full bg-zinc-900 border border-white/10 rounded-xl px-4 py-3 text-white text-xs font-bold focus:outline-none focus:border-tactical-cyan transition-all"
                                        >
                                            <option value="baja">Baja - Consulta</option>
                                            <option value="media">Media - Intermitencia</option>
                                            <option value="alta">Alta - Módulo Inoperante</option>
                                            <option value="critica">🔥 Crítica - Caída de Servicio</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Descripción detallada del Incidente</label>
                                    <textarea
                                        rows={4}
                                        value={ticketForm.mensaje}
                                        onChange={e => setTicketForm({ ...ticketForm, mensaje: e.target.value })}
                                        placeholder="Por favor, explica en detalle el comportamiento esperado vs. el real, incluyendo cualquier código de error si está disponible."
                                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-xs font-bold focus:outline-none focus:border-tactical-cyan transition-all resize-none placeholder:text-zinc-700"
                                        required
                                    />
                                </div>

                                <div className="flex gap-4 pt-4">
                                    <button
                                        type="button"
                                        onClick={() => setShowCreateModal(false)}
                                        className="flex-1 px-6 py-4 bg-white/5 text-white text-[10px] font-black uppercase tracking-widest rounded-2xl hover:bg-white/10 transition-all border border-white/5"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={sending}
                                        className="flex-1 px-6 py-4 bg-tactical-cyan text-black text-[10px] font-black uppercase tracking-widest rounded-2xl shadow-lg shadow-tactical-cyan/20 hover:scale-105 transition-all"
                                    >
                                        Enviar Reporte
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
