import { NextResponse } from 'next/server';
import { authenticateAndRequireRole } from '@/lib/auth/api-auth';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    try {
        const { error: authError, profile } = await authenticateAndRequireRole(request, ['admin', 'recepcion', 'superadmin']);
        if (authError) return authError;

        // Blindaje contra gimnasio_id NULL para admin locales / recepcion
        if (profile?.role !== 'superadmin' && !profile?.gimnasio_id) {
            return NextResponse.json({ error: 'Forbidden: Administrador sin gimnasio asignado' }, { status: 403 });
        }

        const adminClient = createAdminClient();
        let targetGymId = profile?.gimnasio_id;

        const { searchParams } = new URL(request.url);
        const urlGym = searchParams.get('gymId');
        
        // Parámetros de paginación
        const page = Math.max(0, parseInt(searchParams.get('page') || '0', 10));
        const limit = Math.max(1, Math.min(1000, parseInt(searchParams.get('limit') || '200', 10)));
        const offset = page * limit;

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

        // Invocar la RPC de cálculo optimizado de Churn en PostgreSQL
        const { data: rawChurnData, error: rpcError } = await adminClient
            .rpc('calcular_churn_riesgo', {
                p_gimnasio_id: targetGymId,
                p_limit: limit,
                p_offset: offset
            });

        if (rpcError) {
            console.error('❌ Error llamando calcular_churn_riesgo RPC:', rpcError);
            throw rpcError;
        }

        if (!rawChurnData || rawChurnData.length === 0) {
            return NextResponse.json([]);
        }

        // Mapear el formato de base de datos al formato esperado por el frontend
        const churnRisks = rawChurnData.map((row: any) => {
            const dias = row.dias_ausente;
            const avgWeekly = Number((row.actividades_30d / 4.0).toFixed(1));
            
            return {
                id: row.usuario_id,
                nombre: row.nombre || row.correo || 'Alumno sin nombre',
                correo: row.correo,
                telefono: row.telefono,
                ultima_asistencia: dias === 1 ? 'hace 1 día' : `hace ${dias} días`,
                dias_ausente: dias,
                promedio_mensual: avgWeekly,
                nivel_riesgo: row.nivel_riesgo
            };
        });

        return NextResponse.json(churnRisks);
    } catch (error: any) {
        console.error('❌ CRM Churn GET Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
