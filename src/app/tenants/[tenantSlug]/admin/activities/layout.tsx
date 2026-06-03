import React from 'react';
import { checkModuleAccess } from '@/lib/gating';

export default async function ActivitiesLayout({
    children,
    params,
}: {
    children: React.ReactNode;
    params: Promise<{ tenantSlug: string }> | { tenantSlug: string };
}) {
    const resolvedParams = await params;
    // Validar acceso asíncrono al módulo de Clases en el servidor (RSC)
    await checkModuleAccess('Clases', resolvedParams.tenantSlug);

    return <>{children}</>;
}
