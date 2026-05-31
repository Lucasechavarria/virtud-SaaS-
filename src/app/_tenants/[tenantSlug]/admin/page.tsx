import React from 'react';
import { createClient } from '@/lib/supabase/server';
import SuperAdminTabs from '@/features/admin/components/SuperAdminTabs';
import GymAdminDashboard from '@/features/admin/components/GymAdminDashboard';
import { redirect } from 'next/navigation';

export default async function AdminDashboard({
    params,
    searchParams,
}: {
    params: { gymId: string };
    searchParams?: Promise<{ [key: string]: string | string[] | undefined }> | { [key: string]: string | string[] | undefined };
}) {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    // Si no hay sesión, redirigir al login
    if (authError || !user) {
        redirect('/login');
    }

    // Leer el perfil de forma segura con el cliente autenticado y RLS activo
    const { data: profile } = await supabase
        .from('perfiles')
        .select('rol, gimnasio_id, nombre_completo, onboarding_completado')
        .eq('id', user.id)
        .single();

    // Resolver searchParams compatible con Next.js 14/15
    const resolvedSearchParams = searchParams instanceof Promise ? await searchParams : searchParams;
    const isImpersonating = resolvedSearchParams?.impersonate === 'true';

    if (profile?.rol === 'superadmin') {
        if (isImpersonating) {
            return <GymAdminDashboard gymId={params.gymId} isImpersonating={true} />;
        }
        return <SuperAdminTabs />;
    }

    if (profile?.rol === 'admin') {
        return <GymAdminDashboard gymId={params.gymId} />;
    }

    // Roles que no deben estar aquí → redirigir
    if (profile?.rol === 'coach') {
        redirect('/coach');
    }

    if (profile?.rol === 'member') {
        redirect('/dashboard');
    }

    // Fallback: Sin perfil o rol desconocido
    return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center gap-4">
            <h2 className="text-2xl font-black text-white italic uppercase tracking-tighter">Acceso Restringido</h2>
            <p className="text-gray-500 mt-2">No tienes permisos para acceder a esta sección.</p>
            <div className="mt-4 p-4 bg-white/5 rounded-xl border border-white/10 text-left text-xs text-gray-400 font-mono">
                <p>User ID: {user.id}</p>
                <p>Rol detectado: {profile?.rol || 'null (sin perfil)'}</p>
            </div>
        </div>
    );
}
