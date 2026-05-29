import { createAdminClient } from '@/lib/supabase/admin';

interface BillingSummary {
    basePrice: number;
    discountPercent: number;
    extraStudents: number;
    extraStudentsCost: number;
    totalAmount: number;
    limitReached: boolean;
}

/**
 * Calcula el monto total a pagar por un gimnasio, incluyendo cargos por uso excedente (overages).
 */
export async function calculateGymMonthlyBill(gymId: string): Promise<BillingSummary> {
    const supabase = createAdminClient();

    // 1. Obtener datos del gimnasio y su plan
    const { data: gym, error } = await supabase
        .from('gimnasios')
        .select(`
            id,
            descuento_saas,
            planes_suscripcion (
                precio_mensual,
                limite_usuarios,
                precio_alumno_extra
            )
        `)
        .eq('id', gymId)
        .single();

    if (error || !gym || !gym.planes_suscripcion) {
        throw new Error('Gym or plan not found');
    }

    interface PlanData {
        precio_mensual: number;
        limite_usuarios: number;
        precio_alumno_extra: number;
    }

    const plan = gym.planes_suscripcion as unknown as PlanData;

    // 2. Contar alumnos actuales
    const { count: studentCount } = await supabase
        .from('perfiles')
        .select('id', { count: 'exact', head: true })
        .eq('gimnasio_id', gymId)
        .eq('rol', 'member');

    const students = studentCount || 0;
    const limit = plan.limite_usuarios;

    // 3. Calcular excesos
    const extraStudents = Math.max(0, students - limit);
    const extraStudentsCost = extraStudents * (plan.precio_alumno_extra || 0);

    // 4. Calcular precio base con descuento
    const basePrice = plan.precio_mensual;
    const discount = gym.descuento_saas || 0;
    const discountedBase = basePrice * (1 - (discount / 100));

    return {
        basePrice,
        discountPercent: discount,
        extraStudents,
        extraStudentsCost,
        totalAmount: discountedBase + extraStudentsCost,
        limitReached: students >= limit
    };
}
