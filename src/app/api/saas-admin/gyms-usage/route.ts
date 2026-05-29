import { NextResponse } from 'next/server';
import { authenticateAndRequireRole } from '@/lib/auth/api-auth';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

/**
 * GET /api/saas-admin/gyms-usage
 * Consolida el uso operativo y consumos de IA de todos los gimnasios.
 */
export async function GET(request: Request) {
    try {
        const { error: authError } = await authenticateAndRequireRole(request, ['superadmin']);
        if (authError) return authError;

        const supabase = createAdminClient();

        // 1. Obtener todos los gimnasios con sus planes
        const { data: gyms, error: gymsError } = await supabase
            .from('gimnasios')
            .select(`
                id,
                nombre,
                slug,
                es_activo,
                estado_pago_saas,
                planes_suscripcion!plan_id (
                    id,
                    nombre,
                    limite_usuarios,
                    precio_mensual,
                    precio_alumno_extra
                )
            `);

        if (gymsError) throw gymsError;

        // 2. Obtener perfiles de alumnos para mapear gimnasios
        const { data: profiles, error: profError } = await supabase
            .from('perfiles')
            .select('id, gimnasio_id')
            .eq('rol', 'alumno');

        if (profError) throw profError;

        // Crear mapa de usuario -> gimnasio
        const userGymMap = new Map<string, string>();
        const gymStudentCountMap = new Map<string, number>();

        (profiles || []).forEach(p => {
            if (p.gimnasio_id) {
                userGymMap.set(p.id, p.gimnasio_id);
                gymStudentCountMap.set(p.gimnasio_id, (gymStudentCountMap.get(p.gimnasio_id) || 0) + 1);
            }
        });

        // 3. Obtener videos analizados y contar por gimnasio
        const { data: videos, error: vidError } = await supabase
            .from('videos_ejercicio')
            .select('id, usuario_id')
            .eq('estado', 'analizado');

        const gymVideosMap = new Map<string, number>();
        if (!vidError && videos) {
            videos.forEach(v => {
                const gymId = userGymMap.get(v.usuario_id);
                if (gymId) {
                    gymVideosMap.set(gymId, (gymVideosMap.get(gymId) || 0) + 1);
                }
            });
        }

        // 4. Obtener rutinas de IA y contar por gimnasio
        const { data: routines, error: rutError } = await supabase
            .from('rutinas')
            .select('id, usuario_id');

        const gymRoutinesMap = new Map<string, number>();
        if (!rutError && routines) {
            routines.forEach(r => {
                const gymId = userGymMap.get(r.usuario_id);
                if (gymId) {
                    gymRoutinesMap.set(gymId, (gymRoutinesMap.get(gymId) || 0) + 1);
                }
            });
        }

        // 5. Consolidar métricas para cada gimnasio
        const usage = (gyms || []).map((gym: any) => {
            const plan = gym.planes_suscripcion || {
                nombre: 'Sin Plan',
                limite_usuarios: 50,
                precio_mensual: 0,
                precio_alumno_extra: 0
            };

            const activeStudents = gymStudentCountMap.get(gym.id) || 0;
            const limit = plan.limite_usuarios || 50;
            const extraStudents = Math.max(0, activeStudents - limit);
            const extraCost = extraStudents * (plan.precio_alumno_extra || 0.50);

            const videosCount = gymVideosMap.get(gym.id) || 0;
            const routinesCount = gymRoutinesMap.get(gym.id) || 0;

            // Costo estimado de IA consumido por este gimnasio para estimar overages/cuota
            const iaCost = (videosCount * 0.05) + (routinesCount * 0.01);

            return {
                id: gym.id,
                nombre: gym.nombre,
                slug: gym.slug,
                es_activo: gym.es_activo,
                estado_pago_saas: gym.estado_pago_saas,
                plan_nombre: plan.nombre,
                precio_mensual: plan.precio_mensual,
                alumnos_activos: activeStudents,
                alumnos_limite: limit,
                alumnos_excedentes: extraStudents,
                alumnos_excedentes_costo: extraCost,
                videos_procesados: videosCount,
                rutinas_ia: routinesCount,
                costo_ia_estimado: iaCost,
                cargo_total_mes: plan.precio_mensual + extraCost
            };
        });

        return NextResponse.json({ usage });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        console.error('❌ Gyms Usage API Error:', error);
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
