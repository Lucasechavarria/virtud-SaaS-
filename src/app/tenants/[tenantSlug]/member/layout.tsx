import React from 'react';
import { redirect } from 'next/navigation';
import { UniversalLayoutWrapper } from '@/components/layout/UniversalLayoutWrapper';
import { Toaster } from 'react-hot-toast';
import SaaSGuard from '@/components/auth/SaaSGuard';
import { createClient } from '@/lib/supabase/server';

export default async function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const supabase = await createClient();
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error || !user) {
        redirect('/login');
    }

    const { data: profile } = await supabase
        .from('perfiles')
        .select('rol, nombre_completo')
        .eq('id', user.id)
        .single();

    // Students can access /dashboard. Admin and Coach too (as student view).
    // So we don't strictly block here, but we pass the correct role to the wrapper.

    return (
        <div className="min-h-screen bg-[#0a0a0a] text-white flex relative overflow-hidden">
            <div className="aurora-bg" />

            <UniversalLayoutWrapper profileName={profile?.nombre_completo || 'Usuario'} profileRole={profile?.rol || 'member'}>
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
