import { NextResponse } from 'next/server';
import { authenticateAndRequireRole } from '@/lib/auth/api-auth';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/reception/cash-history
 * Retorna el historial de cierres de caja (arqueos) realizados en el gimnasio del usuario.
 */
export async function GET(request: Request) {
    try {
        const { error: authError, profile } = await authenticateAndRequireRole(request, ['admin', 'superadmin', 'recepcion']);
        if (authError) return authError;

        // Si no es superadmin, requiere gimnasio asignado
        if (profile?.role !== 'superadmin' && !profile?.gimnasio_id) {
            return NextResponse.json({ error: 'No tienes un gimnasio asignado' }, { status: 403 });
        }

        const { searchParams } = new URL(request.url);
        const gymId = searchParams.get('gymId');

        let targetGymId = profile?.gimnasio_id;
        const adminClient = createAdminClient();

        if (profile?.role === 'superadmin' && gymId) {
            targetGymId = gymId;
        }

        if (!targetGymId) {
            return NextResponse.json({ error: 'Gimnasio no especificado' }, { status: 400 });
        }

        // Consultar cierres de caja en la tabla de auditoría global
        const { data: history, error: historyError } = await adminClient
            .from('auditoria_global' as any)
            .select(`
                id,
                accion,
                detalles,
                creado_en,
                usuario_id,
                perfiles:usuario_id (
                    nombre,
                    apellido,
                    nombre_completo
                )
            `)
            .eq('gimnasio_id', targetGymId)
            .eq('accion', 'cierre_caja_recepcion')
            .order('creado_en', { ascending: false })
            .limit(20);

        if (historyError) {
            console.error('Error al consultar historial de caja:', historyError);
            return NextResponse.json({ error: 'Error al consultar historial de caja en la base de datos' }, { status: 500 });
        }

        // Formatear la respuesta
        const formattedHistory = (history || []).map((h: any) => {
            const userName = h.perfiles 
                ? h.perfiles.nombre_completo || `${h.perfiles.nombre || ''} ${h.perfiles.apellido || ''}`.trim()
                : 'Usuario Desconocido';
            return {
                id: h.id,
                fecha: h.creado_en,
                usuario: userName,
                usuarioId: h.usuario_id,
                ...h.detalles
            };
        });

        return NextResponse.json({
            success: true,
            history: formattedHistory
        });

    } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        console.error('Unexpected error in GET cash-history:', error);
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
