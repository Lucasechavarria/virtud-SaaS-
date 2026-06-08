import { MetadataRoute } from 'next';
import { createAdminClient } from '@/lib/supabase/admin';
import { headers } from 'next/headers';

/**
 * Dynamic PWA Manifest
 * Generates a gym-specific manifest.json based on the requesting gym's slug.
 * Gyms can be identified by their custom domain or slug cookie.
 */
export default async function manifest(): Promise<MetadataRoute.Manifest> {
    // Defaults (fallback para el gym principal)
    let gymName = 'Virtud Gym';
    let gymShortName = 'Virtud';
    let themeColor = '#6d28d9';
    let backgroundColor = '#000000';
    let gymLogoUrl: string | null = null;

    try {
        const headersList = await headers();
        const host = headersList.get('host') || '';
        const slugCookie = headersList.get('x-gym-slug') || '';

        // Intentar resolver el gym por host o por slug
        const supabase = createAdminClient();
        let query = supabase
            .from('gimnasios')
            .select('nombre, slug, color_primario, logo_url, es_activo')
            .eq('es_activo', true);

        if (slugCookie) {
            const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(slugCookie);
            const queryField = isUUID ? 'id' : 'slug';
            query = query.eq(queryField, slugCookie);
        } else if (host && !host.includes('localhost') && !host.includes('vercel')) {
            // En producción, intentar resolver por host custom
            query = query.or(`slug.eq.${host.split('.')[0]}`);
        }

        const { data: gym } = await query.single() as any;

        if (gym) {
            gymName = gym.nombre;
            gymShortName = gym.nombre.split(' ')[0]; // Primera palabra como short name
            themeColor = gym.color_primario || themeColor;
            gymLogoUrl = gym.logo_url;
        }
    } catch {
        // Si falla, usar defaults — no bloquear la app
    }

    return {
        name: gymName,
        short_name: gymShortName,
        description: `${gymName} — Gestión integral de tu entrenamiento con inteligencia artificial.`,
        start_url: '/',
        display: 'standalone',
        background_color: backgroundColor,
        theme_color: themeColor,
        orientation: 'portrait',
        scope: '/',
        lang: 'es',
        icons: [
            {
                src: gymLogoUrl || '/icons/icon-192x192.png',
                sizes: '192x192',
                type: 'image/png',
                // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                // @ts-ignore
                purpose: 'any maskable',
            },
            {
                src: gymLogoUrl || '/icons/icon-512x512.png',
                sizes: '512x512',
                type: 'image/png',
                // @ts-ignore
                purpose: 'any maskable',
            },
        ],
        shortcuts: [
            {
                name: 'Mi Dashboard',
                url: '/dashboard',
                description: 'Ver mi progreso',
                icons: [{ src: '/icons/icon-192x192.png', sizes: '192x192' }],
            },
            {
                name: 'Mi Rutina',
                url: '/dashboard/routine',
                description: 'Ver mi rutina de hoy',
                icons: [{ src: '/icons/icon-192x192.png', sizes: '192x192' }],
            },
        ],
        categories: ['fitness', 'health', 'sports'],
    };
}
