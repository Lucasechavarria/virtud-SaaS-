import React from 'react';
import { createClient } from '@/lib/supabase/server';
import SuperAdminTabs from '@/features/admin/components/SuperAdminTabs';
import GymAdminDashboard from '@/features/admin/components/GymAdminDashboard';
import { redirect } from 'next/navigation';
import { headers } from 'next/headers';

export default async function AdminDashboard({
    params,
    searchParams,
}: {
    params: Promise<{ tenantSlug: string }> | { tenantSlug: string };
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

    // Resolver params y searchParams compatibles con Next.js 14/15/16
    const resolvedParams = params instanceof Promise ? await params : params;
    const resolvedSearchParams = searchParams instanceof Promise ? await searchParams : searchParams;
    const tenantSlug = resolvedParams?.tenantSlug;
    const isImpersonating = resolvedSearchParams?.impersonate === 'true';

    if (profile?.rol === 'superadmin') {
        if (isImpersonating) {
            let gymId = '';
            if (tenantSlug) {
                const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(tenantSlug);
                if (isUUID) {
                    const { data: gym } = await supabase
                        .from('gimnasios')
                        .select('id')
                        .eq('id', tenantSlug)
                        .is('deleted_at', null)
                        .single();
                    if (gym) gymId = gym.id;
                } else {
                    // Resolver el UUID del gimnasio mediante el slug
                    const { data: gym } = await supabase
                        .from('gimnasios')
                        .select('id')
                        .eq('slug', tenantSlug)
                        .is('deleted_at', null)
                        .single();
                    if (gym) gymId = gym.id;
                }
            }

            if (!gymId) {
                redirect('/saas-admin?error=gym_not_found');
            }
            
            return <GymAdminDashboard gymId={gymId} isImpersonating={true} />;
        }
        return <SuperAdminTabs />;
    }

    if (profile?.rol === 'admin') {
        return <GymAdminDashboard gymId={profile?.gimnasio_id || ''} />;
    }

    // Detectar si estamos bajo un subdominio o desarrollo local (modo subruta)
    const reqHeaders = await headers();
    const host = reqHeaders.get('host') || '';
    const hostWithoutPort = host.split(':')[0];
    const isLocalhost = hostWithoutPort.endsWith('localhost') || hostWithoutPort === '127.0.0.1';
    
    let baseDomainWithoutPort = process.env.NEXT_PUBLIC_APP_DOMAIN;
    if (!baseDomainWithoutPort) {
        baseDomainWithoutPort = isLocalhost ? 'localhost' : (hostWithoutPort.endsWith('vercel.app') ? hostWithoutPort : 'virtud.fit');
    }
    const isSubdomain = hostWithoutPort !== baseDomainWithoutPort && hostWithoutPort !== `www.${baseDomainWithoutPort}`;

    // Roles que no deben estar aquí → redirigir inteligentemente
    if (profile?.rol === 'coach') {
        const dest = isSubdomain ? '/coach' : `/${tenantSlug}/coach`;
        redirect(dest);
    }

    if (profile?.rol === 'member') {
        const dest = isSubdomain ? '/member/dashboard' : `/${tenantSlug}/member/dashboard`;
        redirect(dest);
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
