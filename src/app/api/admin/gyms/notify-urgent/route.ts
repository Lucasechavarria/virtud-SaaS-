import { NextResponse } from 'next/server';
import { authenticateAndRequireRole } from '@/lib/auth/api-auth';
import { createAdminClient } from '@/lib/supabase/admin';

export async function POST(request: Request) {
    try {
        const { error: authError, user } = await authenticateAndRequireRole(request, ['superadmin']);
        if (authError) return authError;

        const { gymId, titulo, mensaje, prioridad = 'alta' } = await request.json();

        if (!gymId || !mensaje) {
            return NextResponse.json({ error: 'Faltan datos requeridos' }, { status: 400 });
        }

        const supabase = createAdminClient();

        // Creamos una auditoría de la notificación
        await supabase.from('auditoria_global' as any).insert({
            accion: 'envio_notificacion_urgente',
            entidad_tipo: 'gimnasio',
            entidad_id: gymId,
            detalles: { titulo, mensaje, prioridad },
            gimnasio_id: gymId,
            usuario_id: user?.id
        });

        // Intentamos insertar en una tabla de avisos (si existe) o enviamos por "soporte"
        // Como fallback, creamos un ticket de soporte "Automático" para que el admin lo vea
        const { data: ticket, error: ticketError } = await supabase.from('tickets_soporte' as any).insert({
            gimnasio_id: gymId,
            asunto: `⚠️ NOTIFICACIÓN URGENTE: ${titulo}`,
            prioridad: 'critica',
            estado: 'abierto',
            usuario_id: user?.id
        }).select().single();

        if (ticketError) throw ticketError;

        // Insertar el cuerpo del mensaje en mensajes_soporte
        if (ticket) {
            const { error: msgError } = await supabase.from('mensajes_soporte' as any).insert({
                ticket_id: ticket.id,
                remitente_id: user?.id,
                mensaje,
                es_del_staff_saas: true
            });
            if (msgError) throw msgError;
        }

        return NextResponse.json({ success: true, message: 'Notificación enviada con éxito' });

    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
