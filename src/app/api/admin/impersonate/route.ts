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

        // Obtener el slug del gimnasio en Supabase para una redirección correcta basada en slug
        const supabase = await createClient();
        const { data: gym, error: gymError } = await supabase
            .from('gimnasios')
            .select('slug')
            .eq('id', gymId)
            .single();

        if (gymError || !gym) {
            return NextResponse.json({ error: 'Gimnasio no encontrado o sin slug válido' }, { status: 404 });
        }

        const gymSlug = gym.slug;

        // 1. Registrar el evento de acceso remoto (Auditoría) - Fail Closed
        const adminClient = createAdminClient();
        const { error: logError } = await adminClient
            .from('logs_acceso_remoto')
            .insert({
                superadmin_id: adminUser.id,
                gimnasio_id: gymId,
                motivo: reason || 'Soporte Técnico / Verificación'
            });

        if (logError) {
            console.error('❌ Error al registrar log de auditoría de impersonación:', logError);
            return NextResponse.json({
                error: 'Auditoria Fallida',
                message: 'No se pudo registrar el acceso en el log de auditoría obligatorio.'
            }, { status: 500 });
        }

        // 2. Generar cookie de impersonación segura y de corta duración
        const response = NextResponse.json({
            success: true,
            message: 'Acceso concedido al entorno del gimnasio',
            redirectUrl: `/${gymSlug}/admin?impersonate=true`
        });

        response.cookies.set('vtd_impersonation', JSON.stringify({
            superadminId: adminUser.id,
            targetGymId: gymId,
            targetGymSlug: gymSlug,
            expires: Date.now() + 15 * 60 * 1000 // 15 minutos
        }), {
            maxAge: 900, // 15 minutos
            path: '/',
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax'
        });

        return response;

    } catch (error) {
        const message = error instanceof Error ? error.message : 'Error interno del servidor';
        console.error('❌ Error en Impersonation:', error);
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
