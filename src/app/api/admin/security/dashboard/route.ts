import { NextResponse } from 'next/server';
import { authenticateAndRequireRole } from '@/lib/auth/api-auth';
import { createAdminClient } from '@/lib/supabase/admin';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function GET(request: Request) {
    try {
        const { error: authError, user, profile } = await authenticateAndRequireRole(request, ['admin', 'superadmin']);
        if (authError) return authError;

        const adminClient = createAdminClient();

        // Obtener rol y gimnasio del solicitante
        const { data: requester } = await adminClient
            .from('perfiles')
            .select('rol, gimnasio_id')
            .eq('id', user.id)
            .single();

        if (!requester) {
            return NextResponse.json({ error: 'Perfil no encontrado' }, { status: 404 });
        }

        const { searchParams } = new URL(request.url);
        const urlGym = searchParams.get('gymId');

        // Resolver gymId para superadmin (slug o UUID)
        let targetGymId = requester.gimnasio_id;
        if (requester.rol === 'superadmin' && urlGym) {
            if (UUID_REGEX.test(urlGym)) {
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

        // Si admin local sin gymId asignado: error
        if (requester.rol !== 'superadmin' && !targetGymId) {
            return NextResponse.json({ error: 'Administrador sin gimnasio asignado' }, { status: 403 });
        }

        // Obtener métricas de seguridad
        const now = new Date();
        const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);

        // Construir query base con filtro de tenant
        const buildQuery = (from: any) => {
            let q = (adminClient.from(from) as any)
                .gte('creado_en', last24h.toISOString());
            if (targetGymId) {
                q = q.eq('gimnasio_id', targetGymId);
            }
            return q;
        };

        // Total de accesos (últimas 24h para este gimnasio)
        const { count: totalAccess } = await buildQuery('registros_acceso_rutina')
            .select('*', { count: 'exact', head: true });

        // Accesos sospechosos (múltiples intentos fallidos desde misma IP)
        const { data: suspiciousIPs } = await buildQuery('registros_acceso_rutina')
            .select('direccion_ip')
            .eq('accion', 'failed_login');

        const ipCounts = (suspiciousIPs || []).reduce((acc: any, log: any) => {
            if (log.direccion_ip) {
                acc[log.direccion_ip] = (acc[log.direccion_ip] || 0) + 1;
            }
            return acc;
        }, {});

        const suspiciousAccess = Object.values(ipCounts).filter((count: any) => count >= 3).length;

        // Intentos fallidos
        const { count: failedLogins } = await buildQuery('registros_acceso_rutina')
            .select('*', { count: 'exact', head: true })
            .eq('accion', 'failed_login');

        // Usuarios activos (últimas 24h)
        const { data: activeUsersData } = await buildQuery('registros_acceso_rutina')
            .select('usuario_id');

        const uniqueUsers = new Set((activeUsersData || []).map((log: any) => log.usuario_id));
        const activeUsers = uniqueUsers.size;

        // Obtener logs recientes con información de usuario
        let logsQuery = (adminClient.from('registros_acceso_rutina') as any)
            .select(`
                *,
                perfiles!usuario_id (
                    nombre_completo,
                    correo,
                    rol
                )
            `)
            .order('creado_en', { ascending: false })
            .limit(50);

        if (targetGymId) {
            logsQuery = logsQuery.eq('gimnasio_id', targetGymId);
        }

        const { data: logs, error } = await logsQuery;

        if (error) throw error;

        // Formatear logs
        const formattedLogs = (logs || []).map((log: any) => ({
            id: log.id,
            action: log.accion,
            details: log.details || '',
            ip_address: log.direccion_ip,
            user_name: log.perfiles?.nombre_completo || 'Usuario desconocido',
            created_at: log.creado_en,
            status: log.accion === 'failed_login' ? 'failed' :
                (ipCounts?.[log.direccion_ip || ''] >= 3 ? 'suspicious' : 'success')
        }));

        return NextResponse.json({
            metrics: {
                totalAccess: totalAccess || 0,
                suspiciousAccess,
                failedLogins: failedLogins || 0,
                activeUsers
            },
            logs: formattedLogs
        });

    } catch (error) {
        console.error('Error fetching security dashboard:', error);
        return NextResponse.json(
            { error: 'Error al cargar datos de seguridad' },
            { status: 500 }
        );
    }
}
