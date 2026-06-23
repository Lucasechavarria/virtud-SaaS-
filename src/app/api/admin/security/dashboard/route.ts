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
        const dateRange = searchParams.get('dateRange') || '24h';
        const status = searchParams.get('status') || 'all';
        const search = searchParams.get('search') || '';

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

        // Obtener métricas de seguridad en base al rango de fecha seleccionado
        const now = new Date();
        let startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000); // 24h por defecto
        if (dateRange === '1h') {
            startDate = new Date(now.getTime() - 60 * 60 * 1000);
        } else if (dateRange === '7d') {
            startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        } else if (dateRange === '30d') {
            startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        }

        // Construir query base con filtro de tenant
        const buildQuery = (from: any) => {
            let q = (adminClient.from(from) as any)
                .gte('creado_en', startDate.toISOString());
            if (targetGymId) {
                q = q.eq('gimnasio_id', targetGymId);
            }
            return q;
        };

        // Total de accesos (en el rango seleccionado)
        const { count: totalAccess } = await buildQuery('registros_acceso_rutina')
            .select('*', { count: 'exact', head: true });

        // Intentos fallidos (en el rango seleccionado)
        const { count: failedLogins } = await buildQuery('registros_acceso_rutina')
            .select('*', { count: 'exact', head: true })
            .eq('accion', 'failed_login');

        // Determinar IPs sospechosas (3 o más intentos fallidos en el rango)
        const { data: allFailedLogins } = await buildQuery('registros_acceso_rutina')
            .select('direccion_ip')
            .eq('accion', 'failed_login');

        const ipCounts = (allFailedLogins || []).reduce((acc: any, log: any) => {
            if (log.direccion_ip) {
                acc[log.direccion_ip] = (acc[log.direccion_ip] || 0) + 1;
            }
            return acc;
        }, {});

        const suspiciousAccess = Object.values(ipCounts).filter((count: any) => count >= 3).length;
        const suspiciousIPs = Object.keys(ipCounts).filter(ip => ipCounts[ip] >= 3);

        // Usuarios activos (en el rango seleccionado)
        const { data: activeUsersData } = await buildQuery('registros_acceso_rutina')
            .select('usuario_id');

        const uniqueUsers = new Set((activeUsersData || []).map((log: any) => log.usuario_id));
        const activeUsers = uniqueUsers.size;

        // --- FILTRADO DE LOGS ---
        let logsQuery = (adminClient.from('registros_acceso_rutina') as any)
            .select(`
                *,
                perfiles!usuario_id (
                    nombre_completo,
                    correo,
                    rol
                )
            `)
            .gte('creado_en', startDate.toISOString())
            .order('creado_en', { ascending: false });

        if (targetGymId) {
            logsQuery = logsQuery.eq('gimnasio_id', targetGymId);
        }

        // Filtro por Estado
        if (status === 'failed') {
            logsQuery = logsQuery.eq('accion', 'failed_login');
        } else if (status === 'suspicious') {
            if (suspiciousIPs.length > 0) {
                logsQuery = logsQuery.in('direccion_ip', suspiciousIPs);
            } else {
                logsQuery = logsQuery.in('direccion_ip', ['0.0.0.0']); // Evita retornar resultados
            }
        } else if (status === 'success') {
            logsQuery = logsQuery.neq('accion', 'failed_login');
        }

        // Filtro por Búsqueda (Buscamos coincidencias en perfiles por nombre o correo)
        if (search.trim().length > 0) {
            const { data: matchingUsers } = await adminClient
                .from('perfiles')
                .select('id')
                .or(`nombre_completo.ilike.%${search.trim()}%,correo.ilike.%${search.trim()}%`);
            
            const matchingUserIds = (matchingUsers || []).map((u: any) => u.id);

            if (matchingUserIds.length > 0) {
                logsQuery = logsQuery.or(`direccion_ip.ilike.%${search.trim()}%,usuario_id.in.(${matchingUserIds.join(',')})`);
            } else {
                logsQuery = logsQuery.ilike('direccion_ip', `%${search.trim()}%`);
            }
        }

        // Limitar logs recientes
        logsQuery = logsQuery.limit(50);
        const { data: logs, error: logsError } = await logsQuery;
        if (logsError) throw logsError;

        // Formatear logs
        const formattedLogs = (logs || []).map((log: any) => ({
            id: log.id,
            action: log.accion,
            details: log.details || '',
            ip_address: log.direccion_ip,
            device: log.info_dispositivo || 'Dispositivo desconocido',
            user_name: log.perfiles?.nombre_completo || 'Usuario desconocido',
            timestamp: log.creado_en,
            status: log.accion === 'failed_login' ? 'failed' :
                (ipCounts?.[log.direccion_ip || ''] >= 3 ? 'suspicious' : 'success')
        }));

        // --- CÁLCULO DE GRÁFICOS REALES ---
        
        // 1. Gráfico por Horas (Últimas 24 horas, agrupado en tramos de 4h)
        const start24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        let hourQuery = adminClient
            .from('registros_acceso_rutina')
            .select('creado_en')
            .gte('creado_en', start24h.toISOString());
        if (targetGymId) {
            hourQuery = hourQuery.eq('gimnasio_id', targetGymId);
        }
        const { data: hourLogs } = await hourQuery;

        const tramos = ['00:00', '04:00', '08:00', '12:00', '16:00', '20:00'];
        const accessByHour = tramos.map(t => ({ time: t, Accesos: 0 }));

        if (hourLogs) {
            for (const log of hourLogs) {
                const date = new Date(log.creado_en);
                const hour = date.getHours();
                let tramoIdx = 0;
                if (hour >= 4 && hour < 8) tramoIdx = 1;
                else if (hour >= 8 && hour < 12) tramoIdx = 2;
                else if (hour >= 12 && hour < 16) tramoIdx = 3;
                else if (hour >= 16 && hour < 20) tramoIdx = 4;
                else if (hour >= 20 || hour < 4) tramoIdx = 5;
                else tramoIdx = 0;
                
                if (accessByHour[tramoIdx]) {
                    accessByHour[tramoIdx].Accesos += 1;
                }
            }
        }

        // 2. Gráfico por Días (Última Semana, agrupado por día de la semana)
        const start7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        let dayQuery = adminClient
            .from('registros_acceso_rutina')
            .select('creado_en, accion')
            .gte('creado_en', start7d.toISOString());
        if (targetGymId) {
            dayQuery = dayQuery.eq('gimnasio_id', targetGymId);
        }
        const { data: dayLogs } = await dayQuery;

        const diasSemana = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
        const accessByDay: any[] = [];
        for (let i = 6; i >= 0; i--) {
            const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
            const dayName = diasSemana[d.getDay()];
            accessByDay.push({ day: dayName, Exitosos: 0, Fallidos: 0 });
        }

        if (dayLogs) {
            for (const log of dayLogs) {
                const date = new Date(log.creado_en);
                const dayName = diasSemana[date.getDay()];
                const isFailed = log.accion === 'failed_login';
                
                const dayObj = accessByDay.find(d => d.day === dayName);
                if (dayObj) {
                    if (isFailed) {
                        dayObj.Fallidos += 1;
                    } else {
                        dayObj.Exitosos += 1;
                    }
                }
            }
        }

        return NextResponse.json({
            metrics: {
                totalAccess: totalAccess || 0,
                suspiciousAccess,
                failedLogins: failedLogins || 0,
                activeUsers
            },
            logs: formattedLogs,
            accessByHour,
            accessByDay
        });

    } catch (error) {
        console.error('Error fetching security dashboard:', error);
        return NextResponse.json(
            { error: 'Error al cargar datos de seguridad' },
            { status: 500 }
        );
    }
}
