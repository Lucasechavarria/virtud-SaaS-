import React from 'react';
import { checkModuleAccess } from '@/lib/gating';

export default async function RecepcionLayout({
    children,
    params,
}: {
    children: React.ReactNode;
    params: { tenantSlug: string };
}) {
    // Validar acceso asíncrono al módulo de POS en el servidor (RSC)
    await checkModuleAccess('Pos', params.tenantSlug);

    return <>{children}</>;
}
