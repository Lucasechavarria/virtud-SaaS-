import { NextResponse } from 'next/server';
import { authenticateAndRequireRole, resolveGymIdForAdmin } from '@/lib/auth/api-auth';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET(request: Request) {
    const { profile, error } = await authenticateAndRequireRole(request, ['admin', 'superadmin']);
    if (error) return error;

    const { searchParams } = new URL(request.url);
    let limit = parseInt(searchParams.get('limit') || '100');
    let offset = parseInt(searchParams.get('offset') || '0');
    if (isNaN(limit) || limit < 1) limit = 100;
    if (isNaN(offset) || offset < 0) offset = 0;

    // Límite adaptativo de seguridad para prevenir sobrecarga (1000 para admins, 100 para consultas generales)
    const maxLimit = (profile?.role === 'admin' || profile?.role === 'superadmin') ? 1000 : 100;
    limit = Math.min(limit, maxLimit);
    const type = searchParams.get('type') || 'all';

    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const gymIdParam = searchParams.get('gymId');
    const operation = searchParams.get('operation');

    // Resolver endDate para hacerlo inclusivo (abarcar todo el día seleccionado)
    let formattedEndDate = endDate;
    if (endDate && endDate.length === 10) {
        formattedEndDate = `${endDate}T23:59:59.999Z`;
    }

    // Validar intento de bypass de seguridad si un admin local intenta consultar otro gimnasio
    if (profile?.role !== 'superadmin' && gymIdParam && gymIdParam !== profile?.gimnasio_id) {
        const adminClient = createAdminClient();
        await adminClient.from('logs_seguridad_global').insert({
            usuario_id: profile?.id,
            gimnasio_origen_id: profile?.gimnasio_id,
            gimnasio_destino_intentado_id: gymIdParam,
            tipo_evento: 'SECURITY_VIOLATION',
            detalles: {
                error: 'Intento de acceso no autorizado a logs de otro gimnasio',
                path: request.url,
                rol: profile?.role
            }
        });

        return NextResponse.json({
            error: 'Forbidden',
            message: 'No tiene permisos para acceder a los datos de este gimnasio'
        }, { status: 403 });
    }

    // Resolver el gimnasio objetivo para el admin/superadmin
    const { targetGymId, errorResponse } = await resolveGymIdForAdmin(profile, gymIdParam);

    if (errorResponse) return errorResponse;

    const adminClient = createAdminClient();

    try {
        const results: { systemLogs?: any[]; impersonationLogs?: any[] } = {};

        // 1. Logs del sistema (audit_logs). Los admins locales solo ven los logs de su propio gimnasio.
        if (type === 'all' || type === 'system') {
            let query = adminClient
                .from('audit_logs')
                .select(`
                    *,
                    perfiles:usuario_id (nombre_completo, email)
                `)
                .order('creado_en', { ascending: false })
                .range(offset, offset + limit - 1);


            if (targetGymId) {
                query = query.eq('gimnasio_id', targetGymId);
            }
            if (operation && operation !== 'all') {
                query = query.eq('operacion', operation);
            }
            if (startDate) query = query.gte('creado_en', startDate);
            if (formattedEndDate) query = query.lte('creado_en', formattedEndDate);

            const { data: systemLogs, error: sysError } = await query;
            if (sysError) throw sysError;
            results.systemLogs = systemLogs;
        }

        // 2. Logs de impersonación (remotos). Solo permitidos para el rol de superadmin global.
        if (profile?.role === 'superadmin' && (type === 'all' || type === 'impersonation')) {
            let query = adminClient
                .from('logs_acceso_remoto')

                .select(`
                    *,
                    admin_profile:superadmin_id (id, nombre_completo, email),
                    gimnasio:gimnasio_id (nombre)
                `)
                .order('fecha', { ascending: false })
                .range(offset, offset + limit - 1);

            if (targetGymId) {
                query = query.eq('gimnasio_id', targetGymId);
            }
            if (startDate) query = query.gte('fecha', startDate);
            if (formattedEndDate) query = query.lte('fecha', formattedEndDate);

            const { data: impersonationLogs } = await query;
            
            // Mapear fecha como creado_en y inyectar duracion_minutos por compatibilidad UI
            const formattedLogs = (impersonationLogs || []).map((log: any) => ({
                ...log,
                creado_en: log.fecha,
                duracion_minutos: log.duracion_minutos || 15
            }));
            
            results.impersonationLogs = formattedLogs;
        } else if (type === 'impersonation' || type === 'all') {
            // Los admins locales no tienen acceso a logs de impersonación
            results.impersonationLogs = [];
        }

        return NextResponse.json(results);
    } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        console.error('Audit Log API Error:', err);
        return NextResponse.json({ error: message }, { status: 500 });
    }
}

