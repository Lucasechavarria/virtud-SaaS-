'use client';

import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase/client';
import Image from 'next/image';

import { ChatParticipant, ChatMessage } from '@/types/chat';

interface ChatInterfaceProps {
    currentUser: ChatParticipant;
    initialRecipientId?: string;
}

export default function ChatInterface({ currentUser, initialRecipientId }: ChatInterfaceProps) {
    // const [supabase] = useState(() => createClientComponentClient()); // Removed
    const [conversations, setConversations] = useState<ChatParticipant[]>([]);
    const [selectedRecipient, setSelectedRecipient] = useState<string | null>(initialRecipientId || null);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // 1. Fetch Conversations (Users you have chattered with or potential contacts)
    useEffect(() => {
        const fetchContacts = async () => {
            try {
                // Determine contacts based on role
                // If student -> can chat with assigned coach(es) or admins
                // If coach -> can chat with all students
                // For simplicity, we fetch all relevant profiles.
                // In production, optimize this query.

                let query = supabase.from('perfiles').select('id, nombre_completo, url_avatar, rol');

                if (currentUser.rol === 'member') {
                    query = query.in('rol', ['coach', 'admin']);
                } else if (currentUser.rol === 'coach') {
                    query = query.in('rol', ['member' as any]);
                }

                const { data, error } = await query;
                if (!error && data) {
                    setConversations(data);
                }
            } catch (_error) {
                // Silently catch contact fetching errors in UI
            }
        };

        if (currentUser) fetchContacts();
    }, [currentUser]);


    // 2. Fetch Messages for Selected Recipient & Subscribe
    useEffect(() => {
        if (!selectedRecipient || !currentUser) return;

        const fetchMessages = async () => {
            const { data, error } = await supabase
                .from('mensajes')
                .select('*')
                .or(`and(remitente_id.eq.${currentUser.id},receptor_id.eq.${selectedRecipient}),and(remitente_id.eq.${selectedRecipient},receptor_id.eq.${currentUser.id})`)
                .order('creado_en', { ascending: true });

            if (!error && data) {
                setMessages(data);
            }
        };

        fetchMessages();

        // Subscribe to real-time changes
        const channel = supabase
            .channel('chat_messages')
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'mensajes',
                    filter: `receptor_id=eq.${currentUser.id}`, // Listen for incoming
                },
                (payload) => {
                    const newMessage = payload.new as ChatMessage;
                    if (newMessage.remitente_id === selectedRecipient) {
                        setMessages((current) => [...current, newMessage]);
                    } else {
                        // Optional: Show notification dot for other conversations
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [selectedRecipient, currentUser]);

    // Scroll to bottom
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim() || !selectedRecipient) return;

        const msgContent = newMessage.trim();
        setNewMessage('');

        // Optimistic update
        const tempId = Math.random().toString();
        const optimisticMsg = {
            id: tempId,
            remitente_id: currentUser.id,
            receptor_id: selectedRecipient,
            contenido: msgContent,
            creado_en: new Date().toISOString(),
            is_pending: true
        };
        setMessages((prev) => [...prev, optimisticMsg]);

        const { data, error } = await supabase
            .from('mensajes')
            .insert({
                remitente_id: currentUser.id,
                receptor_id: selectedRecipient,
                contenido: msgContent
            } as any)
            .select()
            .single();

        if (error) {
            // Rollback optimistic update on error
            setMessages((prev) => prev.filter(m => m.id !== tempId));
        } else {
            // Replace optimistic with real
            setMessages((prev) => prev.map(m => m.id === tempId ? (data as ChatMessage) : m));
        }
    };

    return (
        <div className="flex h-[calc(100vh-8rem)] bg-[#1c1c1e]/60 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden">
            {/* Sidebar (Contacts) */}
            <div className={`w-80 border-r border-white/10 flex flex-col ${selectedRecipient ? 'hidden md:flex' : 'flex'}`}>
                <div className="p-4 border-b border-white/10">
                    <h2 className="text-xl font-bold text-white">Mensajes</h2>
                </div>
                <div className="flex-1 overflow-y-auto p-2 space-y-2">
                    {conversations.map((contact) => (
                        <button
                            key={contact.id}
                            onClick={() => setSelectedRecipient(contact.id)}
                            className={`w-full p-3 rounded-xl flex items-center gap-3 transition-all ${selectedRecipient === contact.id ? 'bg-orange-500/20 border border-orange-500/50' : 'hover:bg-white/5 border border-transparent'
                                }`}
                        >
                            <div className="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center text-white font-bold relative overflow-hidden shrink-0">
                                {contact.url_avatar ? (
                                    <Image
                                        src={contact.url_avatar}
                                        alt=""
                                        fill
                                        className="object-cover"
                                        sizes="40px"
                                    />
                                ) : (
                                    contact.nombre_completo?.charAt(0)
                                )}
                            </div>
                            <div className="text-left">
                                <p className="font-bold text-white text-sm">{contact.nombre_completo}</p>
                                <p className="text-xs text-gray-400 capitalize">{contact.rol}</p>
                            </div>
                        </button>
                    ))}
                </div>
            </div>

            {/* Chat Area */}
            <div className={`flex-1 flex flex-col ${!selectedRecipient ? 'hidden md:flex' : 'flex'}`}>
                {selectedRecipient ? (
                    <>
                        {/* Header */}
                        <div className="p-4 border-b border-white/10 flex items-center gap-3 bg-black/20">
                            <button onClick={() => setSelectedRecipient(null)} className="md:hidden text-gray-400 mr-2">←</button>
                            <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center text-white font-bold text-sm">
                                {conversations.find(c => c.id === selectedRecipient)?.nombre_completo?.charAt(0)}
                            </div>
                            <h3 className="font-bold text-white">
                                {conversations.find(c => c.id === selectedRecipient)?.nombre_completo}
                            </h3>
                        </div>

                        {/* Messages */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-black/10">
                            {messages.map((msg) => {
                                const isMe = msg.remitente_id === currentUser.id;
                                return (
                                    <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                                        <div className={`max-w-[70%] p-3 rounded-2xl text-sm ${isMe
                                            ? 'bg-orange-500 text-white rounded-tr-none'
                                            : 'bg-white/10 text-gray-200 rounded-tl-none'
                                            } ${msg.is_pending ? 'opacity-70' : ''}`}>
                                            {msg.contenido}
                                        </div>
                                    </div>
                                );
                            })}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Input */}
                        <form onSubmit={handleSendMessage} className="p-4 border-t border-white/10 bg-black/20 flex gap-2">
                            <input
                                type="text"
                                value={newMessage}
                                onChange={(e) => setNewMessage(e.target.value)}
                                placeholder="Escribe un mensaje..."
                                className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-orange-500 transition-colors"
                            />
                            <button
                                type="submit"
                                disabled={!newMessage.trim()}
                                className="bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white p-2 rounded-xl transition-colors"
                            >
                                ➤
                            </button>
                        </form>
                    </>
                ) : (
                    <div className="flex-1 flex items-center justify-center text-gray-500">
                        <p>Selecciona un contacto para chatear</p>
                    </div>
                )}
            </div>
        </div>
    );
}
