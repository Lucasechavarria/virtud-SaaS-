'use client';

import { useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';

/**
 * Hook global para gestionar la sincronización y refresco silencioso 
 * de la sesión y claims del JWT en el lado del cliente.
 */
export function useAuthSync() {
    useEffect(() => {
        // Escuchar eventos de cambio de estado de Supabase Auth
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, _session) => {
            if (event === 'USER_UPDATED' || event === 'TOKEN_REFRESHED') {
                console.warn('[AuthSync] Token o metadatos de usuario actualizados silenciosamente en el cliente.');
            }
        });

        return () => {
            subscription.unsubscribe();
        };
    }, []);

    /**
     * Fuerza la actualización silenciosa de la sesión de Supabase local.
     * Esto refresca el token de acceso JWT y recupera los últimos claims (rol, gymSlug, módulos).
     */
    const triggerSilentRefresh = async () => {
        try {
            console.warn('[AuthSync] Forzando refresco de sesión silencioso (refreshSession)...');
            const { data, error } = await supabase.auth.refreshSession();
            if (error) throw error;
            console.warn('[AuthSync] Sesión y Claims JWT actualizados con éxito.');
            return data.session;
        } catch (err) {
            console.error('[AuthSync] Error al forzar refreshSession:', err);
            return null;
        }
    };

    return { triggerSilentRefresh };
}
export default useAuthSync;
