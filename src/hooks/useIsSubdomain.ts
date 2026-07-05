import { useState, useEffect } from 'react';

/**
 * Hook unificado para detectar si la aplicación corre sobre un subdominio (multi-tenant)
 * y extraer el slug de la sede actual de forma dinámica.
 */
export function useIsSubdomain() {
    const [isSubdomain, setIsSubdomain] = useState(false);
    const [subdomain, setSubdomain] = useState<string | null>(null);

    useEffect(() => {
        if (typeof window !== 'undefined') {
            const host = window.location.host.split(':')[0];
            const parts = host.split('.');
            
            // Si posee 3 o más componentes de dominio y no es una IP directa,
            // el primer fragmento se interpreta como el subdominio/tenant slug.
            if (parts.length >= 3 && !/^[0-9.]+$/.test(host)) {
                setIsSubdomain(true);
                setSubdomain(parts[0]);
            } else {
                setIsSubdomain(false);
                setSubdomain(null);
            }
        }
    }, []);

    return { isSubdomain, subdomain };
}
