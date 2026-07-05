import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET() {
    try {
        const supabase = await createClient();

        // 1. Get Current User & Verify Coach Role
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { data: profile } = await (supabase as any)
            .from('perfiles')
            .select('rol, gimnasio_id')
            .eq('id', user.id)
            .single();

        if (!profile || (profile.rol !== 'coach' && profile.rol !== 'admin')) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const targetGymId = profile.gimnasio_id;

        // 2. Fetch Active Students Count
        let activeStudentsQuery = (supabase as any)
            .from('perfiles')
            .select('*', { count: 'exact', head: true })
            .eq('rol', 'member')
            .eq('estado_membresia', 'active');

        if (profile.rol !== 'superadmin' && targetGymId) {
            activeStudentsQuery = activeStudentsQuery.eq('gimnasio_id', targetGymId);
        }
        const { count: activeStudentsCount } = await activeStudentsQuery;


        // 3. Fetch Upcoming Classes (Next 24h)
        const now = new Date();
        const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

        let classesQuery = (supabase as any)
            .from('horarios_de_clase')
            .select(`
                *,
                actividades (nombre, url_imagen),
                reservas_de_clase (count)
            `)
            .gte('hora_inicio', now.toISOString())
            .lte('hora_inicio', tomorrow.toISOString())
            .order('hora_inicio', { ascending: true })
            .limit(3);

        if (profile.rol !== 'superadmin' && targetGymId) {
            classesQuery = classesQuery.eq('gimnasio_id', targetGymId);
        }
        const { data: upcomingClasses } = await classesQuery;


        // 4. Fetch "Active Units" (Students training now - Last 2h)
        const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);
        let activeUnitsQuery = (supabase as any)
            .from('sesiones_de_entrenamiento')
            .select(`
                id,
                usuario_id,
                creado_en,
                perfiles!usuario_id (nombre_completo, url_avatar)
            `)
            .gte('creado_en', twoHoursAgo.toISOString())
            .order('creado_en', { ascending: false });

        if (profile.rol !== 'superadmin' && targetGymId) {
            activeUnitsQuery = activeUnitsQuery.eq('gimnasio_id', targetGymId);
        }
        const { data: activeUnits } = await activeUnitsQuery;

        // 5. Fetch "Students with Doubts" (Reports)
        let reportsQuery = (supabase as any)
            .from('reportes_alumnos')
            .select(`
                *,
                perfiles!usuario_id (nombre_completo, url_avatar)
            `)
            .eq('estado', 'pending')
            .order('creado_en', { ascending: false })
            .limit(5);

        if (profile.rol !== 'superadmin' && targetGymId) {
            reportsQuery = reportsQuery.eq('gimnasio_id', targetGymId);
        }
        const { data: recentReports } = await reportsQuery;

        return NextResponse.json({
            stats: {
                activeStudents: activeStudentsCount || 0,
                activeUnits: activeUnits || []
            },
            upcomingClasses: upcomingClasses || [],
            recentReports: recentReports || []
        });

    } catch (error) {
        console.error('Coach Dashboard API Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
