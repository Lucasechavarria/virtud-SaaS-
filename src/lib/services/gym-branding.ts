import { unstable_cache } from 'next/cache';
import { createAdminClient } from '../supabase/admin';

export interface GymBranding {
    primaryColor: string;
    secondaryColor: string;
    logoUrl: string;
    radius: string;
    customFont: string;
}

// Valores estéticos por defecto de marca (Fail-Safe Fallback)
export const DEFAULT_BRANDING: GymBranding = {
    primaryColor: '#3b82f6',
    secondaryColor: '#1e3a8a',
    logoUrl: '/logos/logo.webp',
    radius: '0.625rem',
    customFont: ''
};

/**
 * Recupera de forma asíncrona la identidad visual de un gimnasio por su slug.
 * Lógica pura sin caché para ser envuelta por unstable_cache.
 */
async function fetchGymBranding(slug: string): Promise<GymBranding> {
    try {
        const supabase = createAdminClient();
        const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(slug);
        const queryField = isUUID ? 'id' : 'slug';

        const { data: gym, error } = await supabase
            .from('gimnasios')
            .select('color_primario, color_secundario, logo_url, config_visual')
            .eq(queryField, slug)
            .single();

        if (error || !gym) {
            console.warn(`[Branding Service] No se encontró el gimnasio con slug "${slug}" o hubo un error. Usando fallback.`);
            return DEFAULT_BRANDING;
        }

        const configBranding = (gym.config_visual as Record<string, any>) || {};

        return {
            primaryColor: gym.color_primario || DEFAULT_BRANDING.primaryColor,
            secondaryColor: gym.color_secundario || DEFAULT_BRANDING.secondaryColor,
            logoUrl: gym.logo_url || DEFAULT_BRANDING.logoUrl,
            radius: configBranding.radius || DEFAULT_BRANDING.radius,
            customFont: configBranding.font || DEFAULT_BRANDING.customFont
        };
    } catch (err) {
        console.error(`[Branding Service] Error crítico consultando base de datos para slug "${slug}":`, err);
        return DEFAULT_BRANDING;
    }
}

/**
 * Obtiene la identidad visual de un gimnasio con caché de Next.js (unstable_cache).
 * Soporta revalidación en tiempo real bajo demanda usando revalidateTag('gym-brand-[slug]').
 */
export const getCachedGymBranding = (slug: string) => {
    return unstable_cache(
        async () => fetchGymBranding(slug),
        [`gym-brand-data-${slug}`],
        {
            revalidate: 86400, // Respaldado por revalidación automática de 24 horas
            tags: [`gym-brand-${slug}`] // Tag único para invalidación activa por revalidateTag
        }
    )();
};
