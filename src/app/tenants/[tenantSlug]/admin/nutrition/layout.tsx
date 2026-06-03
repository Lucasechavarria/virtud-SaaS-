import React from 'react';
import { checkModuleAccess } from '@/lib/gating';

export default async function NutritionLayout({
    children,
    params,
}: {
    children: React.ReactNode;
    params: Promise<{ tenantSlug: string }> | { tenantSlug: string };
}) {
    const resolvedParams = await params;
    // Validar acceso asíncrono al módulo de Nutrición en el servidor (RSC)
    await checkModuleAccess('Nutricion', resolvedParams.tenantSlug);

    return <>{children}</>;
}
