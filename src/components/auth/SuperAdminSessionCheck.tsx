'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import toast from 'react-hot-toast';

export default function SuperAdminSessionCheck() {
    const router = useRouter();

    useEffect(() => {
        const checkSession = async () => {
            try {
                // 1. Obtener el usuario autenticado actualmente
                const { data: { user }, error: authError } = await supabase.auth.getUser();
                if (authError || !user) {
                    router.push('/login');
                    return;
                }

                // 2. Consultar el perfil en Supabase para obtener el rol real en tiempo de ejecución
                const { data: profile, error: profileError } = await supabase
                    .from('perfiles')
                    .select('rol')
                    .eq('id', user.id)
                    .single();

                if (profileError || !profile) {
                    console.error('Error fetching profile during session check:', profileError);
                    return; // No bloqueamos por un error temporal de red
                }

                // 3. Validar si el rol es SUPERADMIN
                if (profile.rol !== 'superadmin') {
                    toast.error('Acceso Revocado: Tu cuenta ya no dispone de permisos de Super Admin.');
                    
                    // Cerrar sesión en Supabase y limpiar cookies locales
                    await supabase.auth.signOut();
                    
                    // Redirigir a login
                    router.push('/login');
                }
            } catch (error) {
                console.error('Session check error:', error);
            }
        };

        // Ejecutar inmediatamente al montar
        checkSession();

        // Ejecutar periódicamente cada 60 segundos
        const intervalId = setInterval(checkSession, 60000);

        return () => clearInterval(intervalId);
    }, [router]);

    return null; // Componente de comportamiento, no renderiza nada
}
