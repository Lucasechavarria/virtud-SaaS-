import React from 'react';
import { checkModuleAccess } from '@/lib/gating';

export default async function CrmLayout({
    children,
    params,
}: {
    children: React.ReactNode;
    params: Promise<{ tenantSlug: string }> | { tenantSlug: string };
}) {
    const resolvedParams = await params;
    // Validar acceso asíncrono al módulo de CRM en el servidor (RSC)
    await checkModuleAccess('Crm', resolvedParams.tenantSlug);

    return <>{children}</>;
}
