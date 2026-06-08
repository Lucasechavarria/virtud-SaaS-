import { NextResponse } from 'next/server';
import { authenticateAndRequireRole } from '@/lib/auth/api-auth';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    try {
        const { error: authError, profile } = await authenticateAndRequireRole(request, ['admin', 'recepcion', 'superadmin']);
        if (authError) return authError;

        const adminClient = createAdminClient();
        let targetGymId = profile?.gimnasio_id;

        const { searchParams } = new URL(request.url);
        const urlGym = searchParams.get('gymId');

        if (profile?.role === 'superadmin' && urlGym) {
            const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(urlGym);
            if (isUUID) {
                targetGymId = urlGym;
            } else {
                const { data: gym } = await adminClient
                    .from('gimnasios')
                    .select('id')
                    .eq('slug', urlGym)
                    .single();
                if (gym) targetGymId = gym.id;
            }
        }

        if (!targetGymId) {
            return NextResponse.json({ error: 'Gimnasio no especificado' }, { status: 400 });
        }

        // 1. Obtener perfiles de socios activos del gimnasio
        const { data: activeStudents, error: studentsError } = await adminClient
            .from('perfiles')
            .select('id, nombre_completo, correo, creado_en, telefono')
            .eq('gimnasio_id', targetGymId)
            .eq('estado_membresia', 'active')
            .not('rol', 'in', '("admin","superadmin","coach","recepcion")');

        if (studentsError) throw studentsError;
        if (!activeStudents || activeStudents.length === 0) {
            return NextResponse.json([]);
        }

        const studentIds = activeStudents.map(s => s.id);

        // 2. Obtener últimas asistencias de clases (reservas de clase con estado 'asistida')
        const { data: attendances, error: attendancesError } = await adminClient
            .from('reservas_de_clase')
            .select('usuario_id, fecha')
            .in('usuario_id', studentIds)
            .eq('estado', 'asistida')
            .order('fecha', { ascending: false });

        if (attendancesError) throw attendancesError;

        // 3. Obtener últimos entrenamientos (sesiones de entrenamiento)
        const { data: workouts, error: workoutsError } = await adminClient
            .from('sesiones_de_entrenamiento')
            .select('usuario_id, hora_inicio')
            .in('usuario_id', studentIds)
            .order('hora_inicio', { ascending: false });

        if (workoutsError) throw workoutsError;

        // Mapear últimas fechas de actividad
        const lastActivityMap: Record<string, Date> = {};

        // Procesar asistencias
        attendances?.forEach(att => {
            const userId = att.usuario_id;
            const date = new Date(att.fecha);
            if (!lastActivityMap[userId] || date > lastActivityMap[userId]) {
                lastActivityMap[userId] = date;
            }
        });

        // Procesar entrenamientos
        workouts?.forEach(work => {
            const userId = work.usuario_id;
            if (work.hora_inicio) {
                const date = new Date(work.hora_inicio);
                if (!lastActivityMap[userId] || date > lastActivityMap[userId]) {
                    lastActivityMap[userId] = date;
                }
            }
        });

        // Calcular días de ausencia y catalogar riesgo
        const churnRisks = activeStudents.map(student => {
            const lastDate = lastActivityMap[student.id] || new Date(student.creado_en || Date.now());
            const diffTime = Math.abs(Date.now() - lastDate.getTime());
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            return {
                id: student.id,
                nombre: student.nombre_completo || student.correo || 'Alumno sin nombre',
                correo: student.correo,
                telefono: student.telefono,
                ultima_asistencia: diffDays === 1 ? 'hace 1 día' : `hace ${diffDays} días`,
                dias_ausente: diffDays,
                promedio_mensual: 3.2, // Promedio estático o mockeado para UI
                nivel_riesgo: diffDays >= 14 ? 'alto' : 'medio'
            };
        })
        .filter(student => student.dias_ausente >= 7) // Solo alumnos ausentes por 7 o más días
        .sort((a, b) => b.dias_ausente - a.dias_ausente); // Ordenar de mayor a menor riesgo

        return NextResponse.json(churnRisks);
    } catch (error: any) {
        console.error('❌ CRM Churn GET Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
