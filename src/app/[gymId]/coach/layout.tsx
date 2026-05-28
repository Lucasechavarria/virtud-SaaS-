import React from 'react';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { redirect } from 'next/navigation';
import { ROLES } from '@/lib/constants/app';
import { UniversalLayoutWrapper } from '@/components/layout/UniversalLayoutWrapper';
import { Toaster } from 'react-hot-toast';
import Link from 'next/link';
import SaaSGuard from '@/components/auth/SaaSGuard';
import { createAdminClient } from '@/lib/supabase/admin';

export default async function CoachLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const cookieStore = await cookies();

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                get(name: string) {
                    return cookieStore.get(name)?.value;
                },
            },
        }
    );

    const { data: { user }, error } = await supabase.auth.getUser();

    if (error || !user) {
        redirect('/login');
    }

    const adminSupabase = createAdminClient();
    const { data: profile } = await adminSupabase
        .from('perfiles')
        .select('*')
        .eq('id', user.id)
        .single();

    const allowedRoles = [ROLES.COACH, ROLES.ADMIN, ROLES.SUPERADMIN];
    if (!profile || !allowedRoles.includes(profile.rol as any)) {
        return (
            <div className="min-h-screen bg-black text-white p-10 flex flex-col items-center justify-center">
                <h1 className="text-3xl font-bold text-red-500 mb-4">Acceso Denegado</h1>
                <p className="mb-4 text-gray-300">No tienes permisos para ver el Panel de Profesor.</p>
                <div className="bg-red-900/20 p-4 rounded text-xs font-mono mb-4 text-red-200">
                    DEBUG INFO:<br />
                    Role: {profile?.rol || 'null'}<br />
                    ID: {user.id}
                </div>
                <Link href="/login" className="px-6 py-3 bg-white text-black font-bold rounded-full hover:scale-105 transition-transform">
                    Volver al Dashboard
                </Link>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#0a0a0a] text-white flex relative overflow-hidden">
            <div className="aurora-bg" />

            <UniversalLayoutWrapper profileName={profile.nombre_completo} profileRole={profile.rol}>
                <SaaSGuard>
                    {children}
                </SaaSGuard>
            </UniversalLayoutWrapper>

            <Toaster position="top-center" toastOptions={{
                style: { background: '#333', color: '#fff' },
            }} />
        </div>
    );
}
