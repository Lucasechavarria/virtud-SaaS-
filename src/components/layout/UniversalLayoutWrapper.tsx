'use client';

import React from 'react';
import { UniversalSidebar } from '@/components/layout/UniversalSidebar';
import { UniversalHeader } from '@/components/layout/UniversalHeader';

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

        return () => window.removeEventListener('resize', checkMobile);
    }, []);

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
