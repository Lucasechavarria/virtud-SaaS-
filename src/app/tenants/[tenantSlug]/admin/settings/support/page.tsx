'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Plus,
    Ticket,
    MessageCircle,
    Send,
    ArrowLeft,
    Clock
} from 'lucide-react';
import toast from 'react-hot-toast';

interface SupportTicket {
    id: string;
    asunto: string;
    prioridad: string;
    estado: string;
    creado_en: string;
    actualizado_en: string;
}

interface Message {
    id: string;
    mensaje: string;
    es_del_staff_saas: boolean;
    creado_en: string;
    perfiles: { nombre_completo: string };
}

export default function GymAdminSupportPage() {
    const [tickets, setTickets] = useState<SupportTicket[]>([]);
    const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [loading, setLoading] = useState(true);

    // New Ticket Form
    const [newTicket, setNewTicket] = useState({ asunto: '', prioridad: 'media', mensaje: '' });
    const [creating, setCreating] = useState(false);
    const [reply, setReply] = useState('');
    const [sending, setSending] = useState(false);

    useEffect(() => {
        fetchTickets();
    }, []);

    const fetchTickets = async () => {
        try {
            const res = await fetch('/api/saas/support');
            const data = await res.json();
            if (res.ok) setTickets(data.tickets || []);
        } catch (_err) {
            toast.error('Error al cargar tickets');
        } finally {
            setLoading(false);
        }
    };

    const fetchMessages = async (ticketId: string) => {
        try {
            const res = await fetch(`/api/saas/support/${ticketId}/messages`);
            const data = await res.json();
            if (res.ok) setMessages(data.messages || []);
        } catch (_err) {
            toast.error('Error al cargar mensajes');
        }
    };

    const handleSelectTicket = (ticket: SupportTicket) => {
        setSelectedTicket(ticket);
        fetchMessages(ticket.id);
    };

    const handleCreateTicket = async (e: React.FormEvent) => {
        e.preventDefault();
        setCreating(true);
        try {
            const res = await fetch('/api/saas/support', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newTicket)
            });
            if (res.ok) {
                toast.success('Ticket creado. Te responderemos pronto.');
                setShowCreateModal(false);
                setNewTicket({ asunto: '', prioridad: 'media', mensaje: '' });
                fetchTickets();
            }
        } catch (_err) {
            toast.error('Error al crear ticket');
        } finally {
            setCreating(false);
        }
    };

    const handleSendReply = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!reply.trim() || !selectedTicket) return;

        setSending(true);
        try {
            const res = await fetch(`/api/saas/support/${selectedTicket.id}/messages`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ mensaje: reply })
            });
            if (res.ok) {
                setReply('');
                fetchMessages(selectedTicket.id);
            }
        } catch (_err) {
            toast.error('Error al enviar respuesta');
        } finally {
            setSending(false);
        }
    };

    return (
        <div className="space-y-8 p-4 md:p-8 max-w-6xl mx-auto">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                    <h1 className="text-4xl font-black text-white italic uppercase tracking-tighter">
                        🎧 Soporte al Cliente Virtud
                    </h1>
                    <p className="text-gray-400 mt-2 font-medium">
                        ¿Tienes dudas técnicas o problemas con la facturación? Estamos para ayudarte.
                    </p>
                </div>

                <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setShowCreateModal(true)}
                    className="px-8 py-4 bg-red-600 hover:bg-red-700 text-white rounded-2xl font-black text-xs uppercase tracking-widest flex items-center gap-2 shadow-xl shadow-red-900/20"
                >
                    <Plus size={18} />
                    Abrir Nuevo Ticket
                </motion.button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 h-[600px]">
                {/* Tickets History List */}
                <div className="lg:col-span-1 bg-[#1c1c1e] rounded-[2.5rem] border border-white/5 flex flex-col overflow-hidden">
                    <div className="p-6 border-b border-white/5 font-black text-[10px] text-gray-500 uppercase tracking-widest flex items-center gap-2">
                        <Ticket size={14} className="text-red-500" />
                        Historial de Consultas
                    </div>
                    <div className="flex-1 overflow-y-auto p-4 space-y-3">
                        {loading ? (
                            <div className="animate-pulse space-y-3">
                                {[1, 2, 3].map(i => <div key={i} className="h-20 bg-white/5 rounded-2xl" />)}
                            </div>
                        ) : tickets.length === 0 ? (
                            <div className="text-center py-12 px-6">
                                <p className="text-gray-600 text-sm italic">No has abierto ningún ticket de soporte aún.</p>
                            </div>
                        ) : tickets.map((ticket) => (
                            <button
                                key={ticket.id}
                                onClick={() => handleSelectTicket(ticket)}
                                className={`w-full text-left p-5 rounded-2xl border transition-all ${selectedTicket?.id === ticket.id
                                    ? 'bg-red-600 border-red-500 shadow-xl'
                                    : 'bg-white/2 border-white/10 hover:bg-white/5'
                                    }`}
                            >
                                <div className="flex justify-between items-start mb-2">
                                    <h4 className="text-xs font-black uppercase text-white truncate flex-1">{ticket.asunto}</h4>
                                    <div className={`w-2 h-2 rounded-full ${ticket.estado === 'abierto' ? 'bg-green-500' : 'bg-gray-500'} mt-1 ml-2`} />
                                </div>
                                <div className="flex justify-between text-[10px]">
                                    <span className={selectedTicket?.id === ticket.id ? 'text-red-100' : 'text-gray-500 uppercase font-black'}>{ticket.prioridad}</span>
                                    <span className={selectedTicket?.id === ticket.id ? 'text-red-200' : 'text-gray-600'}>{new Date(ticket.creado_en).toLocaleDateString()}</span>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Private Chat View */}
                <div className="lg:col-span-2 bg-[#1c1c1e] rounded-[2.5rem] border border-white/5 flex flex-col overflow-hidden relative">
                    <AnimatePresence mode="wait">
                        {selectedTicket ? (
                            <motion.div
                                key="active-chat"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                className="flex flex-col h-full"
                            >
                                <div className="p-6 border-b border-white/5 bg-black/20 flex justify-between items-center">
                                    <div className="flex items-center gap-4">
                                        <button onClick={() => setSelectedTicket(null)} className="lg:hidden text-gray-400">
                                            <ArrowLeft size={20} />
                                        </button>
                                        <h3 className="text-sm font-black text-white italic uppercase tracking-tight">{selectedTicket.asunto}</h3>
                                    </div>
                                    <div className="flex items-center gap-2 text-[10px] font-black uppercase text-gray-500 tracking-widest">
                                        <Clock size={12} />
                                        Abierto el {new Date(selectedTicket.creado_en).toLocaleDateString()}
                                    </div>
                                </div>

                                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                                    {messages.map((msg) => (
                                        <div key={msg.id} className={`flex ${msg.es_del_staff_saas ? 'justify-start' : 'justify-end'}`}>
                                            <div className={`max-w-[80%] p-5 shadow-2xl ${msg.es_del_staff_saas
                                                ? 'bg-white text-black rounded-r-3xl rounded-tl-3xl border border-white/10'
                                                : 'bg-red-600 text-white rounded-l-3xl rounded-tr-3xl shadow-red-900/10'
                                                }`}>
                                                <p className="text-sm font-medium leading-relaxed">{msg.mensaje}</p>
                                                <div className={`flex justify-between items-center mt-3 opacity-60 text-[9px] font-black uppercase tracking-widest`}>
                                                    <span>{msg.es_del_staff_saas ? 'Staff Virtud' : 'Tú'}</span>
                                                    <span>{new Date(msg.creado_en).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                <form onSubmit={handleSendReply} className="p-6 bg-black/20 border-t border-white/5 flex gap-4">
                                    <input
                                        type="text"
                                        placeholder="Escribe tu mensaje..."
                                        className="flex-1 bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white focus:border-red-500 outline-none text-sm"
                                        value={reply}
                                        onChange={(e) => setReply(e.target.value)}
                                    />
                                    <button
                                        type="submit"
                                        disabled={sending || !reply.trim()}
                                        className="bg-red-600 hover:bg-red-700 text-white p-4 rounded-2xl transition-all shadow-xl active:scale-95 disabled:opacity-50"
                                    >
                                        <Send size={24} />
                                    </button>
                                </form>
                            </motion.div>
                        ) : (
                            <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
                                <div className="w-24 h-24 bg-white/5 rounded-3xl flex items-center justify-center text-gray-700 mb-8 border border-white/5">
                                    <MessageCircle size={48} />
                                </div>
                                <h3 className="text-2xl font-black text-gray-500 italic uppercase">Centro de Mensajes</h3>
                                <p className="text-gray-600 text-sm mt-3 max-w-sm leading-relaxed">
                                    Selecciona una conversación del historial o abre un nuevo ticket para contactar con el equipo técnico de Virtud.
                                </p>
                            </div>
                        )
                        }
                    </AnimatePresence>
                </div>
            </div>

            {/* Modal de Creación */}
            <AnimatePresence>
                {showCreateModal && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowCreateModal(false)} className="absolute inset-0 bg-black/90 backdrop-blur-md" />
                        <motion.div initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }} className="bg-[#1c1c1e] w-full max-w-lg rounded-[2.5rem] border border-white/10 p-10 relative z-10 shadow-[0_35px_60px_-15px_rgba(0,0,0,0.5)]">
                            <h2 className="text-3xl font-black text-white italic mb-2 uppercase tracking-tight">Nueva Consulta</h2>
                            <p className="text-gray-500 text-sm mb-8">Nuestros ingenieros revisarán tu caso en menos de 24hs.</p>

                            <form onSubmit={handleCreateTicket} className="space-y-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Asunto del Ticket</label>
                                    <input required type="text" placeholder="Ej: Error al procesar pago mensual" className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white focus:border-red-500 outline-none transition-all" value={newTicket.asunto} onChange={e => setNewTicket({ ...newTicket, asunto: e.target.value })} />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Prioridad</label>
                                    <select className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white focus:border-red-500 outline-none" value={newTicket.prioridad} onChange={e => setNewTicket({ ...newTicket, prioridad: e.target.value })}>
                                        <option value="baja">Baja (General)</option>
                                        <option value="media">Media (Funcionalidad)</option>
                                        <option value="alta">Alta (Bloqueo)</option>
                                        <option value="critica">Crítica (Seguridad/Pagos)</option>
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Mensaje Detallado</label>
                                    <textarea required rows={4} placeholder="Describe el problema..." className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white focus:border-red-500 outline-none transition-all resize-none" value={newTicket.mensaje} onChange={e => setNewTicket({ ...newTicket, mensaje: e.target.value })} />
                                </div>
                                <div className="flex gap-4 pt-4">
                                    <button type="button" onClick={() => setShowCreateModal(false)} className="flex-1 px-8 py-5 bg-white/5 hover:bg-white/10 text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all">Cancelar</button>
                                    <button type="submit" disabled={creating} className="flex-1 px-8 py-5 bg-red-600 hover:bg-red-700 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-red-900/40 disabled:opacity-50 transition-all border border-red-500/20">{creating ? 'Enviando...' : 'Enviar Ticket'}</button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
