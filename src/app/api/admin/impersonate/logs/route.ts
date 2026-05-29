import { NextResponse } from 'next/server';
import { authenticateAndRequireRole } from '@/lib/auth/api-auth';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/impersonate/logs
 * Retorna el historial de logs de accesos remotos para auditoría del Superadmin.
 */
export async function GET(request: Request) {
    try {
        const { error: authError } = await authenticateAndRequireRole(request, ['superadmin']);
        if (authError) return authError;

        const supabase = createAdminClient();

        const { data: logs, error: dbError } = await supabase
            .from('logs_acceso_remoto')
            .select(`
                id,
                motivo,
                fecha,
                superadmin:perfiles!superadmin_id (nombre_completo),
                gimnasio:gimnasios!gimnasio_id (nombre)
            `)
            .order('fecha', { ascending: false })
            .limit(100);

        if (dbError) throw dbError;

        // Formatear para simplificar el mapeo en el frontend
        const formattedLogs = (logs || []).map((log: any) => ({
            id: log.id,
            motivo: log.motivo || 'Verificación General',
            fecha: log.fecha,
            superadmin: log.superadmin?.nombre_completo || 'Super Admin',
            gimnasio: log.gimnasio?.nombre || 'Gimnasio Red'
        }));

        return NextResponse.json({ logs: formattedLogs });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        console.error('❌ Impersonate Logs Error:', error);
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
