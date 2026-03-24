import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { authenticateAndRequireRole } from '@/lib/auth/api-auth';
import { createAdminClient } from '@/lib/supabase/admin';

export async function POST(request: Request) {
    try {
        const { error: authError, user: adminUser } = await authenticateAndRequireRole(request, ['superadmin']);
        if (authError || !adminUser) return authError || NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { gymId, reason } = await request.json();

        if (!gymId) {
            return NextResponse.json({ error: 'Missing gymId' }, { status: 400 });
        }

        // 1. Intentar registrar el evento de acceso remoto (Auditoría)
        // Lo envolvemos para que si la tabla no existe no bloquee el acceso
        try {
            const adminClient = createAdminClient();
            await adminClient
                .from('logs_acceso_remoto')
                .insert({
                    superadmin_id: adminUser.id,
                    gimnasio_id: gymId,
                    motivo: reason || 'Soporte Técnico / Verificación'
                });
        } catch (logError) {
            console.warn('⚠️ No se pudo registrar el log de auditoría (posiblemente falta la tabla):', logError);
        }

        // 2. Retornar éxito y la URL de destino
        return NextResponse.json({
            success: true,
            message: 'Acceso concedido al entorno del gimnasio',
            redirectUrl: `/admin/gyms/${gymId}/dashboard`
        });

    } catch (error) {
        const message = error instanceof Error ? error.message : 'Error interno del servidor';
        console.error('❌ Error en Impersonation:', error);
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
