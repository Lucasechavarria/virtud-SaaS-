'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useChat } from '@/hooks/useChat';
import { MessageBubble } from './MessageBubble';
import { Send } from 'lucide-react';

interface ChatWindowProps {
    conversationId: string;
    currentUserId: string;
    receiverId: string;
    receiverName: string;
    onClose?: () => void;
}

export function ChatWindow({ conversationId, currentUserId, receiverId, receiverName, onClose }: ChatWindowProps) {
    const { messages, loading, sendMessage, markAsRead } = useChat(conversationId);
    const [newMessage, setNewMessage] = useState('');
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    // Marcar como leídos los mensajes recibidos al abrir/cambiar de conversación
    useEffect(() => {
        if (conversationId && currentUserId && !loading) {
            markAsRead(currentUserId);
        }
    }, [conversationId, currentUserId, loading, messages.length]);

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim()) return;

        const success = await sendMessage(newMessage, currentUserId, receiverId);
        if (success) {
            setNewMessage('');
        }
    };

    return (
        <div className="flex flex-col h-[500px] w-full max-w-md bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            {/* Header */}
            <div className="bg-blue-600 p-4 text-white flex justify-between items-center">
                <h3 className="font-semibold">{receiverName}</h3>
                {onClose && (
                    <button onClick={onClose} className="hover:text-blue-200">
                        ✕
                    </button>
                )}
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 bg-gray-50 dark:bg-gray-900">
                {loading ? (
                    <div className="flex justify-center items-center h-full">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    </div>
                ) : messages.length === 0 ? (
                    <div className="text-center text-gray-400 mt-10">
                        No hay mensajes. ¡Di hola!
                    </div>
                ) : (
                    messages.map((msg) => (
                        <MessageBubble
                            key={msg.id}
                            content={msg.contenido}
                            isOwn={msg.remitente_id === currentUserId}
                            timestamp={msg.creado_en}
                        />
                    ))
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <form onSubmit={handleSend} className="p-4 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 flex gap-2">
                <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Escribe un mensaje..."
                    className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-full bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                    type="submit"
                    disabled={!newMessage.trim()}
                    className="p-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                    <Send size={20} />
                </button>
            </form>
        </div>
    );
}
