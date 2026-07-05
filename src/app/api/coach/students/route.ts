import { NextResponse } from 'next/server';
import { authenticateAndRequireRole } from '@/lib/auth/api-auth';

/**
 * GET /api/coach/students
 */
export async function GET(request: Request) {
    try {
        const { user, profile, supabase, error } = await authenticateAndRequireRole(
            request,
            ['coach', 'admin']
        );

        if (error) return error;
        if (!supabase || !profile) throw new Error('Supabase client not initialized');

        // 1. Obtener perfiles
        let query = supabase
            .from('perfiles')
            .select('id, email:correo, nombre_completo, url_avatar, onboarding_completado, informacion_medica, contacto_emergencia, rol, gimnasio_id')
            .order('nombre_completo', { ascending: true });

        const targetGymId = profile.gimnasio_id;
        if (profile.role !== 'superadmin' && targetGymId) {
            query = query.eq('gimnasio_id', targetGymId);
        }

        const { data: profiles, error: profilesError } = await query;

        if (profilesError) throw profilesError;

        if (!profiles || profiles.length === 0) {
            return NextResponse.json({ success: true, students: [] });
        }

        const studentIds = profiles.map(p => p.id);

        // 2. Obtener objetivos activos
        const { data: allGoals, error: goalsError } = await supabase
            .from('objetivos_del_usuario')
            .select('id, usuario_id, objetivo_principal, fecha_objetivo, esta_activo')
            .in('usuario_id', studentIds);

        if (goalsError) console.error('Error fetching goals:', goalsError);

        // 3. Obtener rutinas activas
        const { data: allRoutines, error: routinesError } = await supabase
            .from('rutinas')
            .select('id, usuario_id, nombre, esta_activa')
            .in('usuario_id', studentIds);

        if (routinesError) console.error('Error fetching routines:', routinesError);

        // 4. Obtener últimas asistencias
        const { data: allAttendances, error: attendanceError } = await supabase
            .from('reservas_de_clase')
            .select('usuario_id, fecha, estado')
            .eq('estado', 'asistida')
            .in('usuario_id', studentIds)
            .order('fecha', { ascending: false });

        if (attendanceError) console.error('Error fetching attendances:', attendanceError);

        // 5. Obtener próximas reservas
        const todayStr = new Date().toISOString().split('T')[0];
        const { data: allUpcomingReservations, error: upcomingError } = await supabase
            .from('reservas_de_clase')
            .select('usuario_id, fecha, estado')
            .eq('estado', 'reservada')
            .gte('fecha', todayStr)
            .in('usuario_id', studentIds)
            .order('fecha', { ascending: true });

        if (upcomingError) console.error('Error fetching upcoming classes:', upcomingError);

        // 6. Mapear resultados
        const studentsWithDetails = profiles.map(p => {
            const activeGoal = allGoals?.find(g => g.usuario_id === p.id && g.esta_activo) || null;
            const activeRoutine = allRoutines?.find(r => r.usuario_id === p.id && r.esta_activa) || null;
            const lastAtt = allAttendances?.find(a => a.usuario_id === p.id) || null;
            const nextCl = allUpcomingReservations?.find(a => a.usuario_id === p.id) || null;

            return {
                ...p,
                active_goal: activeGoal,
                active_routine: activeRoutine,
                ultima_asistencia: lastAtt ? lastAtt.fecha : null,
                proxima_clase: nextCl ? nextCl.fecha : null
            };
        });

        return NextResponse.json({
            success: true,
            students: studentsWithDetails,
        });

    } catch (error) {
        console.error('❌ Error fatal loading students:', error);
        return NextResponse.json({
            error: error instanceof Error ? error.message : 'Error interno al cargar alumnos'
        }, { status: 500 });
    }
}
