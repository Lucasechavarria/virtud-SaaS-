import React from 'react';
import { checkModuleAccess } from '@/lib/gating';

export default async function FinanceLayout({
    children,
    params,
}: {
    children: React.ReactNode;
    params: Promise<{ tenantSlug: string }> | { tenantSlug: string };
}) {
    const resolvedParams = await params;
    // Validar acceso asíncrono al módulo de Finanzas en el servidor (RSC)
    await checkModuleAccess('Finanzas', resolvedParams.tenantSlug);

    return <>{children}</>;
}
