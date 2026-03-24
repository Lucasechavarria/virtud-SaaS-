import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(_request: NextRequest) {
    try {
        const supabase = await createClient();

        // Verificar autenticación
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError || !user) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
        }

        // Verificar rol de admin
        const { data: profile } = await supabase
            .from('perfiles')
            .select('rol')
            .eq('id', user.id)
            .single();

        if (profile?.rol !== 'admin') {
            return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });
        }

        // Obtener métricas de seguridad
        const now = new Date();
        const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);

        // Total de accesos
        const { count: totalAccess } = await supabase
            .from('registros_acceso_rutina')
            .select('*', { count: 'exact', head: true })
            .gte('creado_en', last24h.toISOString());

        // Accesos sospechosos (múltiples intentos fallidos desde misma IP)
        const { data: suspiciousIPs } = await supabase
            .from('registros_acceso_rutina')
            .select('ip_address')
            .eq('action', 'failed_login')
            .gte('creado_en', last24h.toISOString());

        const ipCounts = suspiciousIPs?.reduce((acc: any, log: any) => {
            acc[log.ip_address] = (acc[log.ip_address] || 0) + 1;
            return acc;
        }, {});

        const suspiciousAccess = Object.values(ipCounts || {}).filter((count: any) => count >= 3).length;

        // Intentos fallidos
        const { count: failedLogins } = await supabase
            .from('registros_acceso_rutina')
            .select('*', { count: 'exact', head: true })
            .eq('action', 'failed_login')
            .gte('creado_en', last24h.toISOString());

        // Usuarios activos (últimas 24h)
        const { data: activeUsersData } = await supabase
            .from('registros_acceso_rutina')
            .select('usuario_id')
            .gte('creado_en', last24h.toISOString());

        const uniqueUsers = new Set(activeUsersData?.map(log => (log as any).usuario_id));
        const activeUsers = uniqueUsers.size;

        // Obtener logs recientes con información de usuario
        const { data: logs, error } = await supabase
            .from('registros_acceso_rutina')
            .select(`
                *,
                perfiles!usuario_id (
                    nombre_completo,
                    email,
                    rol
                )
            `)
            .order('creado_en', { ascending: false })
            .limit(50);

        if (error) throw error;

        // Formatear logs
        const formattedLogs = logs.map((log: any) => ({
            id: log.id,
            action: log.action,
            details: log.details,
            ip_address: log.ip_address,
            user_name: (log.perfiles as any)?.nombre_completo || 'Usuario desconocido',
            created_at: log.creado_en,
            status: log.action === 'failed_login' ? 'failed' :
                (ipCounts?.[log.ip_address || ''] >= 3 ? 'suspicious' : 'success')
        }));

        return NextResponse.json({
            metrics: {
                totalAccess: totalAccess || 0,
                suspiciousAccess,
                failedLogins: failedLogins || 0,
                activeUsers
            },
            logs: formattedLogs || []
        });

    } catch (error) {
        console.error('Error fetching security dashboard:', error);
        return NextResponse.json(
            { error: 'Error al cargar datos de seguridad' },
            { status: 500 }
        );
    }
}
