'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { authService } from '@/services/auth.service';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';

export default function DashboardRedirector() {
    const router = useRouter();

    useEffect(() => {
        const checkRedirect = async () => {
            try {
                const user = await authService.getCurrentUser();
                if (!user) {
                    router.replace('/login');
                    return;
                }

                const profile = await authService.getUserProfile(user.id);
                if (!profile) {
                    router.replace('/login');
                    return;
                }

                const { rol, gimnasio_id } = profile;

                if (rol === 'superadmin') {
                    router.replace('/saas-admin');
                } else if (rol === 'admin') {
                    if (gimnasio_id) {
                        router.replace(`/${gimnasio_id}/admin`);
                    } else {
                        router.replace('/saas-admin'); // fallback
                    }
                } else if (rol === 'coach') {
                    if (gimnasio_id) {
                        router.replace(`/${gimnasio_id}/coach`);
                    } else {
                        router.replace('/'); // fallback
                    }
                } else {
                    // miembro u otro
                    if (gimnasio_id) {
                        router.replace(`/${gimnasio_id}/member/dashboard`);
                    } else {
                        router.replace('/'); // fallback
                    }
                }
            } catch (error) {
                console.error('Error redirecting from dashboard:', error);
                router.replace('/login');
            }
        };

        checkRedirect();
    }, [router]);

    return (
        <div className="min-h-screen bg-black flex flex-col items-center justify-center gap-6 font-sans">
            <div className="relative">
                <div className="absolute -inset-1 rounded-full bg-linear-to-r from-tactical-cyan to-tactical-magenta opacity-40 blur-lg animate-pulse" />
                <div className="relative bg-zinc-950 p-6 rounded-full border border-white/5">
                    <LoadingSpinner />
                </div>
            </div>
            <div className="space-y-2 text-center relative z-10">
                <p className="text-xs font-black uppercase tracking-[0.3em] text-transparent bg-clip-text bg-linear-to-r from-white via-white to-tactical-cyan">
                    Sincronizando Accesos
                </p>
                <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest animate-pulse">
                    Cargando tu panel de control...
                </p>
            </div>
        </div>
    );
}
