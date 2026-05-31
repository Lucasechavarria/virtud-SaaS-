import { checkModuleAccess } from '@/lib/gating';

export default async function FinanceLayout({
    children,
    params,
}: {
    children: React.ReactNode;
    params: { tenantSlug: string };
}) {
    // Validar acceso asíncrono al módulo de Finanzas en el servidor (RSC)
    await checkModuleAccess('Finanzas', params.tenantSlug);

    return <>{children}</>;
}
