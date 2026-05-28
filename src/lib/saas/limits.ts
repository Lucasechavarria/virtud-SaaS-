import { createAdminClient } from '../supabase/admin';

export async function checkGymLimits(gymId: string) {
    const supabase = createAdminClient();

    // 1. Obtener el gimnasio y su plan
    const { data: gym, error: gymError } = await supabase
        .from('gimnasios')
        .select(`
            id,
            plan_id,
            estado_pago_saas,
            planes_suscripcion (
                limite_usuarios,
                limite_sucursales
            )
        `)
        .eq('id', gymId)
        .single();

    if (gymError || !gym) {
        throw new Error('No se pudo verificar el gimnasio');
    }

    const plan = gym.planes_suscripcion;
    const estadoPago = gym.estado_pago_saas;

    // Si el pago está impago, bloqueamos todo
    if (estadoPago === 'unpaid') {
        return {
            canAddUser: false,
            canAddBranch: false,
            reason: 'Suscripción suspendida por falta de pago'
        };
    }

    // 2. Contar usuarios actuales (excluyendo admins/superadmins si se desea, pero usualmente son todos los miembros)
    const { count: userCount } = await supabase
        .from('perfiles')
        .select('*', { count: 'exact', head: true })
        .eq('gimnasio_id', gymId);

    // 3. Contar sucursales actuales
    const { count: branchCount } = await supabase
        .from('sucursales')
        .select('*', { count: 'exact', head: true })
        .eq('gimnasio_id', gymId);

    const currentUsers = userCount || 0;
    const currentBranches = branchCount || 0;

    const canAddUser = plan ? (currentUsers < (plan.limite_usuarios || 999999)) : true;
    const canAddBranch = plan ? (currentBranches < (plan.limite_sucursales || 999999)) : true;

    return {
        canAddUser,
        canAddBranch,
        currentUsers,
        currentBranches,
        limitUsers: plan?.limite_usuarios || '∞',
        limitBranches: plan?.limite_sucursales || '∞',
        reason: (!canAddUser || !canAddBranch) ? 'Límite de plan alcanzado' : null
    };
}
