'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Send,
    MessageSquare,
    User,
    MoreVertical,
    Smartphone,
    Shield,
    Circle,
    Search,
    ChevronLeft
} from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import Image from 'next/image';
import { ChatParticipant, ChatMessage } from '@/types/chat';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface ChatTacticalProps {
    currentUser: ChatParticipant;
    initialRecipientId?: string;
}

export default function ChatTactical({ currentUser, initialRecipientId }: ChatTacticalProps) {
    const [contacts, setContacts] = useState<ChatParticipant[]>([]);
    const [selectedRecipient, setSelectedRecipient] = useState<ChatParticipant | null>(null);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Fetch Contacts
    useEffect(() => {
        const fetchContacts = async () => {
            let query = supabase.from('perfiles').select('id, nombre_completo, url_avatar, rol');

            if (currentUser.rol === 'member') {
                query = query.in('rol', ['coach', 'admin']);
            } else if (currentUser.rol === 'coach') {
                query = query.in('rol', ['member' as any]);
            }

            const { data, error } = await query;
            if (!error && data) {
                setContacts(data);
                if (initialRecipientId) {
                    const recipient = data.find(c => c.id === initialRecipientId);
                    if (recipient) setSelectedRecipient(recipient);
                }
            }
        };

        if (currentUser) fetchContacts();
    }, [currentUser, initialRecipientId]);

    // Fetch Messages & Subscribe
    useEffect(() => {
        if (!selectedRecipient || !currentUser) return;

        const fetchMessages = async () => {
            const { data, error } = await supabase
                .from('mensajes')
                .select('*')
                .or(`and(remitente_id.eq.${currentUser.id},receptor_id.eq.${selectedRecipient.id}),and(remitente_id.eq.${selectedRecipient.id},receptor_id.eq.${currentUser.id})`)
                .order('creado_en', { ascending: true });

            if (!error && data) setMessages(data);
        };

        fetchMessages();

        const channel = supabase
            .channel(`chat_${selectedRecipient.id}`)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'mensajes',
                },
                (payload) => {
                    const msg = payload.new as ChatMessage;
                    if (
                        (msg.remitente_id === selectedRecipient.id && msg.receptor_id === currentUser.id) ||
                        (msg.remitente_id === currentUser.id && msg.receptor_id === selectedRecipient.id)
                    ) {
                        setMessages((current) => {
                            if (current.find(m => m.id === msg.id)) return current;
                            return [...current, msg];
                        });
                    }
                }
            )
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [selectedRecipient, currentUser]);

    // Scroll to bottom
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim() || !selectedRecipient) return;

        const content = newMessage.trim();
        setNewMessage('');

        const { data, error } = await supabase
            .from('mensajes')
            .insert({
                remitente_id: currentUser.id,
                receptor_id: selectedRecipient.id,
                contenido: content
            } as any)
            .select()
            .single();

        if (!error && data) {
            // Enviar Notificación Push al receptor de forma asíncrona (no bloqueante)
            fetch('/api/push/send', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    recipientId: selectedRecipient.id,
                    title: `💬 Mensaje de ${currentUser.nombre_completo || 'Coach'}`,
                    body: content,
                    url: currentUser.rol === 'member' ? '/coach/students' : '/dashboard/messages'
                })
            }).catch(err => console.error('Error enviando push tras mensaje:', err));
        } else if (error) {
            console.error('Error:', error);
        }
    };

    const filteredContacts = contacts.filter(c =>
        c.nombre_completo?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="flex h-[calc(100vh-12rem)] bg-zinc-950 border border-white/5 rounded-[2.5rem] overflow-hidden shadow-2xl relative">
            {/* Sidebar Táctica */}
            <AnimatePresence>
                {isSidebarOpen && (
                    <motion.div
                        initial={{ width: 0, opacity: 0 }}
                        animate={{ width: 320, opacity: 1 }}
                        exit={{ width: 0, opacity: 0 }}
                        className="border-r border-white/5 flex flex-col bg-zinc-900/50 backdrop-blur-md relative z-20"
                    >
                        <div className="p-8 border-b border-white/5 bg-black/20">
                            <div className="flex items-center gap-2 mb-6">
                                <Smartphone size={14} className="text-orange-500" />
                                <span className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.4em]">Secure Comm v2.0</span>
                            </div>
                            <h2 className="text-2xl font-black text-white italic tracking-tighter uppercase mb-4">
                                Briefing <span className="text-orange-500">Center</span>
                            </h2>
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600" size={14} />
                                <input
                                    type="text"
                                    placeholder="BUSCAR OPERATIVO..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full bg-black/40 border border-white/5 rounded-xl py-2 pl-10 pr-4 text-[10px] font-black uppercase tracking-widest text-white focus:outline-none focus:border-orange-500/50"
                                />
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-4 space-y-2 scrollbar-hide">
                            {filteredContacts.map((contact) => (
                                <button
                                    key={contact.id}
                                    onClick={() => setSelectedRecipient(contact)}
                                    className={`w-full p-4 rounded-[1.5rem] flex items-center gap-4 transition-all group ${selectedRecipient?.id === contact.id
                                        ? 'bg-orange-500/10 border border-orange-500/20'
                                        : 'hover:bg-white/5 border border-transparent'
                                        }`}
                                >
                                    <div className="relative shrink-0">
                                        <div className={`p-0.5 rounded-full ${selectedRecipient?.id === contact.id ? 'bg-orange-500' : 'bg-zinc-800'}`}>
                                            <div className="w-12 h-12 rounded-full bg-zinc-900 flex items-center justify-center text-white font-black overflow-hidden relative">
                                                {contact.url_avatar ? (
                                                    <Image src={contact.url_avatar} alt="" fill className="object-cover" />
                                                ) : (
                                                    contact.nombre_completo?.charAt(0)
                                                )}
                                            </div>
                                        </div>
                                        <Circle className="absolute bottom-0 right-0 text-emerald-500 fill-emerald-500 bg-zinc-950 rounded-full p-0.5" size={12} />
                                    </div>
                                    <div className="text-left overflow-hidden">
                                        <p className={`font-black uppercase tracking-tighter text-sm truncate ${selectedRecipient?.id === contact.id ? 'text-orange-500' : 'text-zinc-300'}`}>
                                            {contact.nombre_completo}
                                        </p>
                                        <div className="flex items-center gap-1.5 opacity-50">
                                            <Shield size={10} className="text-zinc-400" />
                                            <span className="text-[9px] font-black uppercase tracking-widest text-zinc-500">{contact.rol}</span>
                                        </div>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Area de Chat */}
            <div className="flex-1 flex flex-col bg-zinc-950 relative overflow-hidden">
                {/* Background Decor */}
                <div className="absolute top-0 right-0 w-96 h-96 bg-orange-500/5 rounded-full blur-[120px] -mr-48 -mt-48 pointer-events-none" />
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-zinc-500/5 rounded-full blur-[100px] -ml-32 -mb-32 pointer-events-none" />

                {selectedRecipient ? (
                    <>
                        {/* Header Tactico */}
                        <div className="p-6 border-b border-white/5 flex items-center justify-between bg-black/40 backdrop-blur-md relative z-10">
                            <div className="flex items-center gap-4">
                                <button
                                    onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                                    className="p-2 hover:bg-white/5 rounded-lg text-zinc-500"
                                >
                                    <ChevronLeft size={20} className={isSidebarOpen ? '' : 'rotate-180 transition-transform'} />
                                </button>
                                <div className="w-10 h-10 rounded-full bg-zinc-900 border border-orange-500/20 flex items-center justify-center text-white font-black relative overflow-hidden">
                                    {selectedRecipient.url_avatar ? (
                                        <Image src={selectedRecipient.url_avatar} alt="" fill className="object-cover" />
                                    ) : (
                                        selectedRecipient.nombre_completo?.charAt(0)
                                    )}
                                </div>
                                <div>
                                    <h3 className="font-black text-white uppercase tracking-tight text-lg italic">
                                        {selectedRecipient.nombre_completo}
                                    </h3>
                                    <div className="flex items-center gap-2">
                                        <Circle className="text-emerald-500 fill-emerald-500" size={8} />
                                        <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">Enlace Establecido</span>
                                    </div>
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <button className="p-2 hover:bg-white/5 rounded-lg text-zinc-500 transition-colors"><MoreVertical size={18} /></button>
                            </div>
                        </div>

                        {/* Contenedor de Mensajes */}
                        <div className="flex-1 overflow-y-auto p-10 space-y-6 relative z-10 scrollbar-hide">
                            {messages.map((msg, index) => {
                                const isMe = msg.remitente_id === currentUser.id;
                                const showTime = index === 0 ||
                                    new Date(msg.creado_en).getTime() - new Date(messages[index - 1].creado_en).getTime() > 300000;

                                return (
                                    <React.Fragment key={msg.id}>
                                        {showTime && (
                                            <div className="flex justify-center my-8">
                                                <span className="px-4 py-1.5 rounded-full bg-zinc-900/80 border border-white/5 text-[9px] font-black text-zinc-600 uppercase tracking-[0.2em] italic">
                                                    {format(new Date(msg.creado_en), "HH:mm 'HRS' · d MMM", { locale: es })}
                                                </span>
                                            </div>
                                        )}
                                        <motion.div
                                            initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                            animate={{ opacity: 1, y: 0, scale: 1 }}
                                            className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
                                        >
                                            <div className={`max-w-[75%] p-5 rounded-[2rem] relative group ${isMe
                                                ? 'bg-zinc-800 border border-orange-500/20 text-white rounded-tr-sm shadow-xl'
                                                : 'bg-zinc-900 border border-white/5 text-zinc-300 rounded-tl-sm'
                                                }`}>
                                                <p className="text-[13px] leading-relaxed font-bold tracking-tight">
                                                    {msg.contenido}
                                                </p>
                                                {/* Meta info on hover */}
                                                <div className={`absolute -bottom-6 ${isMe ? 'right-2' : 'left-2'} opacity-0 group-hover:opacity-100 transition-opacity`}>
                                                    <span className="text-[8px] font-black text-zinc-600 uppercase tracking-widest whitespace-nowrap">
                                                        Recibido • {format(new Date(msg.creado_en), 'HH:mm')}
                                                    </span>
                                                </div>
                                            </div>
                                        </motion.div>
                                    </React.Fragment>
                                );
                            })}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Input Hub */}
                        <div className="p-8 border-t border-white/5 bg-black/40 backdrop-blur-xl relative z-10">
                            <form onSubmit={handleSendMessage} className="flex gap-4 items-center">
                                <div className="flex-1 relative group">
                                    <div className="absolute inset-0 bg-orange-500/5 rounded-2xl blur-lg opacity-0 group-focus-within:opacity-100 transition-opacity" />
                                    <input
                                        type="text"
                                        value={newMessage}
                                        onChange={(e) => setNewMessage(e.target.value)}
                                        placeholder="TRANSMITIR MENSAJE..."
                                        className="w-full bg-zinc-900 border border-white/5 rounded-2xl px-6 py-4 text-xs font-black uppercase tracking-widest text-white focus:outline-none focus:border-orange-500/50 transition-all placeholder:text-zinc-700 relative z-10"
                                    />
                                </div>
                                <button
                                    type="submit"
                                    disabled={!newMessage.trim()}
                                    className="bg-orange-500 hover:bg-orange-600 disabled:opacity-30 disabled:grayscale text-black p-4 rounded-2xl transition-all shadow-lg hover:shadow-orange-500/20 active:scale-95 group relative overflow-hidden"
                                >
                                    <div className="absolute inset-0 bg-gradient-to-tr from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                    <Send size={18} className="relative z-10" />
                                </button>
                            </form>
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center p-20 text-center relative z-10">
                        <div className="w-24 h-24 rounded-full bg-zinc-900 border border-white/5 flex items-center justify-center mb-8 animate-pulse shadow-inner">
                            <MessageSquare size={40} className="text-zinc-800" />
                        </div>
                        <h3 className="text-xl font-black text-zinc-500 uppercase tracking-[0.3em] mb-4 italic">Seleccionar Enlace</h3>
                        <p className="text-[10px] font-black text-zinc-700 uppercase tracking-widest max-w-[280px] leading-relaxed italic">
                            Inicia una comunicación encriptada con tu personal operativo asignado.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
