import { createAdminClient } from '@/lib/supabase/admin';

export type SaaSFeature = 'vision_lab' | 'multi_branch' | 'ai_routines' | 'advanced_reports';

const PLAN_FEATURES: Record<string, SaaSFeature[]> = {
    'Básico': [],
    'Pro': ['vision_lab', 'ai_routines', 'multi_branch'],
    'Elite': ['vision_lab', 'ai_routines', 'multi_branch', 'advanced_reports']
};

/**
 * Verifica si un gimnasio tiene acceso a una funcionalidad específica.
 */
export async function checkFeatureAccess(gymId: string, feature: SaaSFeature): Promise<boolean> {
    const adminClient = createAdminClient();

    const { data: gym, error } = await adminClient
        .from('gimnasios')
        .select(`
            id,
            planes_suscripcion (nombre)
        `)
        .eq('id', gymId)
        .is('deleted_at', null)
        .single();

    if (error || !gym || !gym.planes_suscripcion) return false;

    // We assume planes_suscripcion is an object (from .single()) 
    // but standard Supabase types might see it as an array if relationship is 1:N.
    // However, here we cast or handle accordingly.
    const planData = gym.planes_suscripcion as unknown as { nombre: string };
    const planName = planData.nombre;
    const allowedFeatures = PLAN_FEATURES[planName] || [];

    return allowedFeatures.includes(feature);
}

/**
 * Obtiene los límites de capacidad de un gimnasio.
 */
export async function getGymLimits(gymId: string) {
    const adminClient = createAdminClient();

    const { data, error } = await adminClient
        .from('gimnasios')
        .select(`
            planes_suscripcion (limite_sucursales, limite_usuarios)
        `)
        .eq('id', gymId)
        .is('deleted_at', null)
        .single();

    if (error || !data || !data.planes_suscripcion) return { branches: 1, users: 50 };

    const planData = data.planes_suscripcion as unknown as { limite_sucursales: number, limite_usuarios: number };

    return {
        branches: planData.limite_sucursales,
        users: planData.limite_usuarios
    };
}
