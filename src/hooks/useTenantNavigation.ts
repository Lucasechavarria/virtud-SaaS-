'use client';

import { useParams, useRouter } from 'next/navigation';
import { useIsSubdomain } from './useIsSubdomain';

/**
 * Hook para resolver rutas relativas dentro de los entornos de cada tenant,
 * adaptándose automáticamente a esquemas de subdominio o subruta.
 */
export function useTenantNavigation() {
    const params = useParams();
    const router = useRouter();
    const tenantSlug = (params?.tenantSlug as string) || '';
    const { isSubdomain } = useIsSubdomain();

    const tenantHref = (path: string) => {
        const cleanPath = path.startsWith('/') ? path : `/${path}`;
        
        // Si la aplicación corre en subdominio, omitimos el slug de la ruta
        if (isSubdomain) {
            return cleanPath;
        }
        
        // Si corre en subruta y hay slug asignado, lo inyectamos de prefijo
        if (tenantSlug) {
            return `/${tenantSlug}${cleanPath}`;
        }
        
        return cleanPath;
    };

    const tenantPush = (path: string) => {
        const targetUrl = tenantHref(path);
        router.push(targetUrl);
    };

    const tenantLogin = () => {
        if (tenantSlug) {
            router.push(`/login?tenant=${tenantSlug}`);
        } else {
            router.push('/login');
        }
    };

    return {
        tenantSlug,
        isSubdomain,
        tenantHref,
        tenantPush,
        tenantLogin
    };
}
