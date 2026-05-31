import React from 'react';
import { checkModuleAccess } from '@/lib/gating';

export default async function ActivitiesLayout({
    children,
    params,
}: {
    children: React.ReactNode;
    params: { tenantSlug: string };
}) {
    // Validar acceso asíncrono al módulo de Clases en el servidor (RSC)
    await checkModuleAccess('Clases', params.tenantSlug);

    return <>{children}</>;
}
