'use client';

import React from 'react';
import { UniversalSidebar } from '@/components/layout/UniversalSidebar';
import { UniversalHeader } from '@/components/layout/UniversalHeader';
import { usePathname, useRouter } from 'next/navigation';

export function UniversalLayoutWrapper({
    children,
    profileName,
    profileRole
}: {
    children: React.ReactNode;
    profileName: string;
    profileRole: string;
}) {
    const [isOpen, setIsOpen] = React.useState(false);
    const [isMobile, setIsMobile] = React.useState(false);
    const [maintenance, setMaintenance] = React.useState<{ active: boolean; message: string }>({ active: false, message: '' });
    const [walletAlert, setWalletAlert] = React.useState<{ active: boolean; message: string }>({ active: false, message: '' });

    const pathname = usePathname();
    const router = useRouter();
    const gymIdMatch = pathname.match(/^\/([^/]+)/);
    const gymId = gymIdMatch ? gymIdMatch[1] : null;

    React.useEffect(() => {
        const checkMobile = () => {
            const mobile = window.innerWidth < 1024; // Changed to 1024 for better tablet support
            setIsMobile(mobile);
            if (!mobile) setIsOpen(true);
        };

        checkMobile();
        window.addEventListener('resize', checkMobile);
        
        // Fetch public maintenance settings
        fetch('/api/saas-admin/settings/public')
            .then(res => res.json())
            .then(data => {
                if (data && data.modo_mantenimiento) {
                    setMaintenance({ active: true, message: data.mantenimiento_mensaje });
                }
            })
            .catch(err => console.error('Error fetching maintenance state:', err));

        // Fetch pro-active wallet alert for local gym admin
        if (gymId && gymId !== 'admin' && gymId !== 'saas-admin' && profileRole === 'admin') {
            fetch('/api/admin/gym/billing')
                .then(res => res.json())
                .then(data => {
                    if (data && data.bill) {
                        const threshold = data.bill.limiteAlertaSaldo ?? 10;
                        if (data.bill.saldoCreditos < threshold && data.bill.metodoCobroExcedentes === 'prepago') {
                            setWalletAlert({
                                active: true,
                                message: `¡Alerta de AI Wallet! Tu saldo de créditos de IA ($${data.bill.saldoCreditos.toFixed(2)} USD) está por debajo de tu límite de $${threshold}.00 USD. Por favor realiza una recarga.`
                            });
                        }
                    }
                })
                .catch(err => console.error('Error checking wallet proactive limits:', err));
        }

        return () => window.removeEventListener('resize', checkMobile);
    }, [gymId, profileRole]);

    // btnColor is no longer used for dynamic classes that Tailwind might not catch

    return (
        <div className="flex w-full min-h-screen">
            {/* Hamburger Button - Only mobile */}
            {isMobile && (
                <button
                    onClick={() => setIsOpen(!isOpen)}
                    className="fixed top-4 left-4 z-50 p-3 bg-primary hover:opacity-90 text-primary-foreground rounded-xl shadow-lg transition-all lg:hidden"
                    aria-label="Toggle menu"
                >
                    <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        {isOpen ? (
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        ) : (
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                        )}
                    </svg>
                </button>
            )}

            {/* Overlay - Only mobile when open */}
            {isMobile && isOpen && (
                <div
                    className="fixed inset-0 bg-black/60 backdrop-blur-sm z-30"
                    onClick={() => setIsOpen(false)}
                />
            )}

            {/* Sidebar */}
            <UniversalSidebar
                role={profileRole}
                profileName={profileName}
                isOpen={isOpen}
                setIsOpen={setIsOpen}
                isMobile={isMobile}
            />

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col min-w-0 min-h-screen">
                {/* Tactical Maintenance Banner */}
                {maintenance.active && (
                    <div className="bg-amber-500 text-black px-6 py-2.5 text-[10px] font-black text-center uppercase tracking-widest flex items-center justify-center gap-2 relative z-20 shadow-md">
                        <span className="animate-pulse text-sm">⚠️</span> {maintenance.message}
                    </div>
                )}

                {/* Wallet Low Balance Proactive Alert */}
                {walletAlert.active && !maintenance.active && (
                    <div className="bg-gradient-to-r from-amber-500/20 via-red-500/10 to-amber-500/20 text-amber-400 border-b border-amber-500/20 px-6 py-2.5 text-[9px] font-black text-center uppercase tracking-wider flex items-center justify-center gap-2 relative z-20 shadow-lg backdrop-blur-md">
                        <span className="relative flex h-2 w-2 shrink-0">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                        </span>
                        <span className="shrink-0">🚨</span>
                        <span>{walletAlert.message}</span>
                        <button 
                            onClick={() => router.push(`/${gymId}/admin/finance`)}
                            className="ml-4 px-3 py-1 bg-amber-500 hover:bg-amber-400 text-black rounded-lg transition-all uppercase font-black tracking-widest text-[8px] hover:shadow-[0_0_10px_rgba(245,158,11,0.4)]"
                        >
                            Cargar Créditos
                        </button>
                    </div>
                )}

                {/* Header */}
                <UniversalHeader currentRole={profileRole} profileRole={profileRole} />

                {/* Page Content */}
                <main className="flex-1 overflow-y-auto">
                    <div className="p-4 md:p-6 lg:p-8 max-w-[1920px] mx-auto">
                        {children}
                    </div>
                </main>
            </div>
        </div>
    );
}
