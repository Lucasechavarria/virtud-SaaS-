import { NextResponse } from 'next/server';
import { authenticateAndRequireRole } from '@/lib/auth/api-auth';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    try {
        const { error: authError } = await authenticateAndRequireRole(request, ['admin', 'superadmin']);
        if (authError) return authError;

        const { searchParams } = new URL(request.url);
        const gymId = searchParams.get('gymId');

        if (!gymId) {
            return NextResponse.json({ error: 'Gym ID is required' }, { status: 400 });
        }

        const adminClient = createAdminClient();

        // Fetch gym-specific stats
        const [
            { count: activeMembers },
            { count: totalUsers },
            { count: classesToday },
            { data: recentProfiles },
            { data: expiringMemberships }
        ] = await Promise.all([
            adminClient.from('perfiles').select('*', { count: 'exact', head: true }).eq('gimnasio_id', gymId).eq('estado_membresia', 'active'),
            adminClient.from('perfiles').select('*', { count: 'exact', head: true }).eq('gimnasio_id', gymId).not('rol', 'in', '("admin","superadmin")'),
            adminClient.from('horarios_de_clase').select('*', { count: 'exact', head: true }).eq('esta_activa', true).eq('gimnasio_id', gymId).eq('dia_de_la_semana', new Date().getDay()),
            adminClient.from('perfiles').select('nombre_completo, creado_en').eq('gimnasio_id', gymId).order('creado_en', { ascending: false }).limit(5),
            adminClient.from('perfiles')
                .select('nombre_completo, fecha_fin_membresia')
                .eq('gimnasio_id', gymId)
                .eq('estado_membresia', 'active')
                .lte('fecha_fin_membresia', new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString())
                .order('fecha_fin_membresia', { ascending: true })
                .limit(5)
        ]);

        // Note: Revenue is tricky because payments are linked to users. 
        // We'd need a join or a subquery if we don't have gimnasio_id in payments.
        // For now, let's assume we filter payments by users of this gym.
        const { data: usersInGym } = await adminClient.from('perfiles').select('id').eq('gimnasio_id', gymId);
        const gymUserIds = usersInGym?.map(u => u.id) || [];

        const { data: gymRevenueData } = await adminClient
            .from('pagos')
            .select('monto')
            .eq('estado', 'aprobado')
            .in('usuario_id', gymUserIds);

        const totalRevenue = (gymRevenueData as { monto: number }[] | null)?.reduce((acc, curr) => acc + Number(curr.monto), 0) || 0;

        return NextResponse.json({
            activeMembers: activeMembers || 0,
            totalUsers: totalUsers || 0,
            classesToday: classesToday || 0,
            revenue: totalRevenue,
            recentActivity: (recentProfiles || []).map(p => ({
                description: 'Nuevo registro de socio',
                user: { nombre_completo: p.nombre_completo },
                date: p.creado_en
            })),
            membershipExpiring: expiringMemberships || []
        });

    } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        console.error('❌ Error in gym-stats API:', error);
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
