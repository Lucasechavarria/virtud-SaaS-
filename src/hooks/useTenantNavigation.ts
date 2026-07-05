'use client';

import { useParams } from 'next/navigation';
import { useIsSubdomain } from './useIsSubdomain';

/**
 * Hook para resolver rutas relativas dentro de los entornos de cada tenant,
 * adaptándose automáticamente a esquemas de subdominio o subruta.
 */
export function useTenantNavigation() {
    const params = useParams();
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

    return {
        tenantSlug,
        isSubdomain,
        tenantHref
    };
}
