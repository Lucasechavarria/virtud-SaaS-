import { NextResponse } from 'next/server';
import { authenticateAndRequireRole } from '@/lib/auth/api-auth';

export async function GET(request: Request) {
    const { supabase, error } = await authenticateAndRequireRole(request, ['superadmin']);
    if (error) return error;

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '100');
    const offset = parseInt(searchParams.get('offset') || '0');
    const type = searchParams.get('type') || 'all';
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    try {
        const results: { systemLogs?: any[]; impersonationLogs?: any[] } = {};

        if (type === 'all' || type === 'system') {
            let query = supabase
                .from('audit_logs')
                .select(`
                    *,
                    perfiles:usuario_id (nombre_completo, email)
                `)
                .order('creado_en', { ascending: false })
                .range(offset, offset + limit - 1);

            if (startDate) query = query.gte('creado_en', startDate);
            if (endDate) query = query.lte('creado_en', endDate);

            const { data: systemLogs, error: sysError } = await query;
            if (sysError) throw sysError;
            results.systemLogs = systemLogs;
        }

        if (type === 'all' || type === 'impersonation') {
            let query = supabase
                .from('logs_acceso_remoto')
                .select(`
                    *,
                    admin_profile:superadmin_id (id, nombre_completo, email),
                    gimnasio:gimnasio_id (nombre)
                `)
                .order('fecha', { ascending: false })
                .range(offset, offset + limit - 1);

            if (startDate) query = query.gte('fecha', startDate);
            if (endDate) query = query.lte('fecha', endDate);

            const { data: impersonationLogs } = await query;
            
            // Mapear fecha como creado_en y inyectar duracion_minutos por compatibilidad UI
            const formattedLogs = (impersonationLogs || []).map((log: any) => ({
                ...log,
                creado_en: log.fecha,
                duracion_minutos: log.duracion_minutos || 15
            }));
            
            results.impersonationLogs = formattedLogs;
        }

        return NextResponse.json(results);
    } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        console.error('Audit Log API Error:', err);
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
