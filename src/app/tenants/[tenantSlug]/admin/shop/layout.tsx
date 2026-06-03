import React from 'react';
import { checkModuleAccess } from '@/lib/gating';

export default async function ShopLayout({
    children,
    params,
}: {
    children: React.ReactNode;
    params: Promise<{ tenantSlug: string }> | { tenantSlug: string };
}) {
    const resolvedParams = await params;
    // Validar acceso asíncrono al módulo de POS en el servidor (RSC)
    await checkModuleAccess('Pos', resolvedParams.tenantSlug);

    return <>{children}</>;
}
