import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { authenticateAndRequireRole } from '@/lib/auth/api-auth';
import { createAdminClient } from '@/lib/supabase/admin';

export async function POST(request: Request) {
    try {
        // 1. Validar que el usuario sea Superadmin
        const { error: authError, user: adminUser } = await authenticateAndRequireRole(request, ['superadmin']);
        if (authError || !adminUser) return authError || NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        // 2. Obtener el cliente de administración para actualizar logs_acceso_remoto (ya que son inmutables para RLS común)
        const adminClient = createAdminClient();

        // 3. Buscar el último acceso activo de este superadmin (sin fecha de salida)
        const { data: lastLog, error: fetchError } = await adminClient
            .from('logs_acceso_remoto')
            .select('id, gimnasio_id')
            .eq('superadmin_id', adminUser.id)
            .is('fecha_salida', null)
            .order('fecha', { ascending: false })
            .limit(1)
            .maybeSingle();

        if (fetchError) {
            console.error('❌ Error al buscar log de impersonación activo:', fetchError);
        }

        // 4. Si se encontró, registrar la salida estableciendo la fecha actual
        if (lastLog) {
            const { error: updateError } = await adminClient
                .from('logs_acceso_remoto')
                .update({ fecha_salida: new Date().toISOString() })
                .eq('id', lastLog.id);

            if (updateError) {
                console.error('❌ Error al actualizar la fecha de salida en la auditoría:', updateError);
            }

            // Registrar en auditoria_global
            await adminClient
                .from('auditoria_global' as any)
                .insert({
                    accion: 'impersonate_end',
                    entidad_tipo: 'gimnasio',
                    entidad_id: lastLog.gimnasio_id,
                    usuario_id: adminUser.id,
                    gimnasio_id: lastLog.gimnasio_id,
                    detalles: {
                        superadmin_email: adminUser.email
                    }
                });
        }

        // 5. Crear la respuesta y eliminar la cookie vtd_impersonation
        const response = NextResponse.json({
            success: true,
            message: 'Sesión de soporte finalizada y registrada correctamente.'
        });

        response.cookies.set('vtd_impersonation', '', {
            maxAge: 0,
            path: '/',
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax'
        });

        return response;

    } catch (error) {
        const message = error instanceof Error ? error.message : 'Error interno del servidor';
        console.error('❌ Error al salir de Impersonation:', error);
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
