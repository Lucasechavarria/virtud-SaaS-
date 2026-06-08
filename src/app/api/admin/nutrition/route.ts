
import { NextResponse } from 'next/server';
import { authenticateAndRequireRole } from '@/lib/auth/api-auth';

export async function GET(request: Request) {
    try {
        const { user, profile, supabase, error } = await authenticateAndRequireRole(
            request,
            ['admin', 'coach']
        );

        if (error) return error;

        let query = supabase!
            .from('planes_nutricionales')
            .select(`
                *,
                user:perfiles!usuario_id (
                    *
                ),
                coach:perfiles!entrenador_id (
                    *
                )
            `);

        // Tenant Isolation: Force filter by admin/coach's gimnasio_id
        if (profile?.role !== 'superadmin' && profile?.gimnasio_id) {
            query = query.eq('gimnasio_id', profile.gimnasio_id);
        }

        const { data, error: dbError } = await query.order('creado_en' as any, { ascending: false });

        if (dbError) {
            console.error('❌ Error fetching nutrition plans:', dbError);
            let fallbackQuery = supabase!.from('planes_nutricionales').select('*');

            if (profile?.role !== 'superadmin' && profile?.gimnasio_id) {
                fallbackQuery = fallbackQuery.eq('gimnasio_id', profile.gimnasio_id);
            }

            const fallback = await fallbackQuery.order('id' as any, { ascending: false });

            if (fallback.error) throw fallback.error;
            return NextResponse.json(normalizeNutritionPlans(fallback.data));
        }

        return NextResponse.json(normalizeNutritionPlans(data));
    } catch (error: any) {
        console.error('❌ Error in nutrition API:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

function normalizeNutritionPlans(data: any[]) {
    return (data || []).map(plan => {
        const user = plan.user || {};
        const coach = plan.coach || {};

        return {
            ...plan,
            user_name: user.nombre_completo || `${user.nombre || ''} ${user.apellido || ''}`.trim() || user.correo || user.email || 'Sin nombre',
            coach_name: coach.nombre_completo || coach.nombre || 'Sin nombre',
            created_at: plan.creado_en || plan.created_at
        };
    });
}
