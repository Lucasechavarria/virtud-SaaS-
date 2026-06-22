import React from 'react';
import { redirect } from 'next/navigation';
import { ROLES } from '@/lib/constants/app';
import { UniversalLayoutWrapper } from '@/components/layout/UniversalLayoutWrapper';
import { Toaster } from 'react-hot-toast';
import Link from 'next/link';
import SuperAdminSessionCheck from '../../../components/auth/SuperAdminSessionCheck'; // Client-side session verification
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';

export default async function SaaSAdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const supabase = await createClient();

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

    if (!profile || profile.rol !== ROLES.SUPERADMIN) {
        return (
            <div className="min-h-screen bg-black text-white p-10 flex flex-col items-center justify-center">
                <h1 className="text-3xl font-bold text-red-500 mb-4">Acceso Denegado</h1>
                <p className="mb-4 text-gray-300">No tienes permisos para ver el Panel de Super Admin.</p>
                <Link href="/login" className="px-6 py-3 bg-white text-black font-bold rounded-full hover:scale-105 transition-transform">
                    Volver al Inicio
                </Link>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#0a0a0a] text-white flex relative overflow-hidden">
            <div className="aurora-bg" />

            <UniversalLayoutWrapper profileName={profile.nombre_completo} profileRole={profile.rol}>
                <SuperAdminSessionCheck />
                {children}
            </UniversalLayoutWrapper>

            <Toaster position="top-center" toastOptions={{
                style: { background: '#333', color: '#fff' },
            }} />
        </div>
    );
}
