import { NextResponse } from 'next/server';
import { authenticateAndRequireRole } from '@/lib/auth/api-auth';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    try {
        const { error: authError, profile } = await authenticateAndRequireRole(request, ['admin', 'superadmin']);
        if (authError) return authError;

        const { searchParams } = new URL(request.url);
        let gymId = searchParams.get('gymId');

        if (!gymId) {
            return NextResponse.json({ error: 'Gym ID is required' }, { status: 400 });
        }

        const adminClient = createAdminClient();

        // Resolver slug → UUID si el gymId recibido no es un UUID, y validar soft-delete en ambos casos
        const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
        if (UUID_REGEX.test(gymId)) {
            const { data: gym } = await adminClient
                .from('gimnasios')
                .select('id')
                .eq('id', gymId)
                .is('deleted_at', null)
                .single();
            if (!gym) {
                return NextResponse.json({ error: 'Gimnasio no encontrado o inactivo en la red' }, { status: 404 });
            }
        } else {
            const { data: gym } = await adminClient
                .from('gimnasios')
                .select('id')
                .eq('slug', gymId)
                .is('deleted_at', null)
                .single();
            if (!gym) {
                return NextResponse.json({ error: 'Gimnasio no encontrado o inactivo en la red' }, { status: 404 });
            }
            gymId = gym.id;
        }

        // Blindaje contra BOLA / Control de Aislamiento Multi-tenant (acordado en /grill-me)
        if (profile?.role !== 'superadmin') {
            const requesterGymId = profile?.gimnasio_id;
            if (!requesterGymId) {
                return NextResponse.json({ error: 'Forbidden: Administrador sin gimnasio asignado' }, { status: 403 });
            }
            if (requesterGymId !== gymId) {
                return NextResponse.json({ error: 'Forbidden: No tienes acceso a las estadísticas de este gimnasio' }, { status: 403 });
            }
        }

        const clientDayOfWeek = searchParams.get('dayOfWeek');
        let targetDayOfWeek = new Date().getDay();
        if (clientDayOfWeek !== null) {
            const parsedDay = parseInt(clientDayOfWeek);
            if (!isNaN(parsedDay) && parsedDay >= 0 && parsedDay <= 6) {
                targetDayOfWeek = parsedDay;
            }
        }

        // Calcular el primer día del mes actual en UTC (acordado en /grill-me)
        const firstDayOfMonth = new Date();
        firstDayOfMonth.setUTCDate(1);
        firstDayOfMonth.setUTCHours(0, 0, 0, 0);
        const firstDayOfMonthISO = firstDayOfMonth.toISOString();

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
            adminClient.from('horarios_de_clase').select('*', { count: 'exact', head: true }).eq('esta_activa', true).eq('gimnasio_id', gymId).eq('dia_de_la_semana', targetDayOfWeek),
            adminClient.from('perfiles').select('nombre_completo, creado_en').eq('gimnasio_id', gymId).order('creado_en', { ascending: false }).limit(5),
            adminClient.from('perfiles')
                .select('nombre_completo, fecha_fin_membresia')
                .eq('gimnasio_id', gymId)
                .eq('estado_membresia', 'active')
                .lte('fecha_fin_membresia', new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString())
                .order('fecha_fin_membresia', { ascending: true })
                .limit(5)
        ]);

        // Optimización de recaudación mensual (acordado en /grill-me)
        // Consultamos directamente por gimnasio_id en la tabla pagos y por la fecha del mes actual
        const { data: gymRevenueData, error: revenueError } = await adminClient
            .from('pagos')
            .select('monto')
            .eq('gimnasio_id', gymId)
            .eq('estado', 'approved')
            .gte('creado_en', firstDayOfMonthISO);

        if (revenueError) {
            console.error('Error fetching revenue stats:', revenueError);
        }

        const totalRevenue = gymRevenueData?.reduce((acc, curr) => acc + Number(curr.monto), 0) || 0;

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
