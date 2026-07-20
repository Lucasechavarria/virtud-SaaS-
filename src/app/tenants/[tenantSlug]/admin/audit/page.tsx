import React from 'react';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import AuditDashboard from './AuditDashboard';

export default async function AdminAuditLogsPage() {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    // Redirigir al login si no está autenticado
    if (authError || !user) {
        redirect('/login');
    }

    // Consultar perfil de forma segura
    const { data: profile } = await supabase
        .from('perfiles')
        .select('rol')
        .eq('id', user.id)
        .single();

    // Validar rol de administrador
    if (profile?.rol !== 'admin' && profile?.rol !== 'superadmin') {
        redirect('/login');
    }

    return <AuditDashboard />;
}
