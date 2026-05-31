'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import { supabase } from '@/lib/supabase/client';
import { hasModuleAccess } from '@/lib/saas/modules';

/**
 * Hook to check if a specific module is active for the current gym.
 * Can optionally redirect if access is denied.
 */
export function useModuleAccess(moduleName: string, redirectIfDenied = false) {
    const params = useParams();
    const gymId = params.gymId as string;
    const router = useRouter();

    const [isAllowed, setIsAllowed] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const checkAccess = async () => {
            if (!gymId) {
                setIsLoading(false);
                return;
            }

            try {
                const { data } = await supabase
                    .from('gimnasios')
                    .select('modulos_activos')
                    .eq('id', gymId)
                    .single();

                const hasModule = hasModuleAccess(data?.modulos_activos, moduleName);
                setIsAllowed(hasModule);

                if (!hasModule && redirectIfDenied) {
                    router.push('/modulo-bloqueado');
                }
            } catch (err) {
                console.error("Error verifying module access", err);
            } finally {
                setIsLoading(false);
            }
        };

        checkAccess();
    }, [gymId, moduleName, redirectIfDenied, router]);

    return { isAllowed, isLoading };
}
