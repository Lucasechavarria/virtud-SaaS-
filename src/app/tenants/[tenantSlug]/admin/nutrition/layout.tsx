import React from 'react';
import { checkModuleAccess } from '@/lib/gating';

export default async function NutritionLayout({
    children,
    params,
}: {
    children: React.ReactNode;
    params: { tenantSlug: string };
}) {
    // Validar acceso asíncrono al módulo de Nutrición en el servidor (RSC)
    await checkModuleAccess('Nutricion', params.tenantSlug);

    return <>{children}</>;
}
