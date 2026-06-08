'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import ChatInterface from '@/features/chat/components/ChatInterface';
import { toast } from 'react-hot-toast';

export default function GymAdminInternalMessagingPage() {
    const supabase = createClient();
    const [currentUser, setCurrentUser] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchProfile() {
            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (user) {
                    const { data: profile, error } = await supabase
                        .from('perfiles')
                        .select('id, nombre_completo, url_avatar, rol')
                        .eq('id', user.id)
                        .single();

                    if (!error && profile) {
                        setCurrentUser({
                            id: profile.id,
                            nombre_completo: profile.nombre_completo || 'Administrador',
                            url_avatar: profile.url_avatar || null,
                            rol: profile.rol
                        });
                    }
                }
            } catch (error) {
                console.error('Error fetching user profile for chat:', error);
                toast.error('Error al cargar perfil de mensajería');
            } finally {
                setLoading(false);
            }
        }
        fetchProfile();
    }, []);

    if (loading) {
        return (
            <div className="min-h-[60vh] flex items-center justify-center bg-[#0a0a0a]">
                <div className="w-10 h-10 border-4 border-t-purple-500 border-purple-500/20 rounded-full animate-spin" />
            </div>
        );
    }

    if (!currentUser) {
        return (
            <div className="p-8 text-center text-gray-500 bg-[#1c1c1e]/40 border border-white/5 rounded-3xl">
                No se pudo verificar la sesión actual.
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-white to-purple-400">
                    💬 Mensajería Interna
                </h1>
                <p className="text-gray-400 mt-1">Chat directo en tiempo real con entrenadores, alumnos y recepcionistas.</p>
            </div>

            <ChatInterface currentUser={currentUser} />
        </div>
    );
}
