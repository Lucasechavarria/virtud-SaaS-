import React from 'react';
import { checkModuleAccess } from '@/lib/gating';

export default async function CrmLayout({
    children,
    params,
}: {
    children: React.ReactNode;
    params: { tenantSlug: string };
}) {
    // Validar acceso asíncrono al módulo de CRM en el servidor (RSC)
    await checkModuleAccess('Crm', params.tenantSlug);

    return <>{children}</>;
}
