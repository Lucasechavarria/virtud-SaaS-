import { NextResponse } from 'next/server';
import { authenticateAndRequireRole } from '@/lib/auth/api-auth';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

/**
 * GET /api/saas-admin/tickets
 * Lista todos los tickets de soporte SaaS globales enviados por los gimnasios.
 */
export async function GET(request: Request) {
    try {
        const { error: authError } = await authenticateAndRequireRole(request, ['superadmin']);
        if (authError) return authError;

        const supabase = createAdminClient();

        const { data: tickets, error: dbError } = await supabase
            .from('tickets_soporte_saas' as any)
            .select(`
                id,
                asunto,
                descripcion,
                prioridad,
                estado,
                categoria,
                creado_en,
                actualizado_en,
                perfil:perfiles!usuario_id (nombre_completo, email:correo),
                gimnasio:gimnasios!gimnasio_id (nombre)
            `)
            .order('creado_en', { ascending: false });

        if (dbError) throw dbError;

        const formattedTickets = (tickets || []).map((t: any) => ({
            id: t.id,
            asunto: t.asunto,
            descripcion: t.descripcion,
            prioridad: t.prioridad || 'media',
            estado: t.estado || 'abierto',
            categoria: t.categoria || 'tecnico',
            creado_en: t.creado_en,
            actualizado_en: t.actualizado_en,
            usuario_nombre: t.perfil?.nombre_completo || 'Administrador',
            usuario_email: t.perfil?.email || 'soporte@virtud.com',
            gimnasio_nombre: t.gimnasio?.nombre || 'Gimnasio Red'
        }));

        return NextResponse.json({ tickets: formattedTickets });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        console.error('❌ Get Tickets Error:', error);
        return NextResponse.json({ error: message }, { status: 500 });
    }
}

/**
 * POST /api/saas-admin/tickets
 * Actualiza el estado de un ticket de soporte SaaS.
 */
export async function POST(request: Request) {
    try {
        const { error: authError } = await authenticateAndRequireRole(request, ['superadmin']);
        if (authError) return authError;

        const { ticketId, status } = await request.json();

        if (!ticketId || !status) {
            return NextResponse.json({ error: 'Missing ticketId or status' }, { status: 400 });
        }

        const supabase = createAdminClient();

        const { data: data, error: updateError } = await supabase
            .from('tickets_soporte_saas' as any)
            .update({
                estado: status,
                actualizado_en: new Date().toISOString()
            })
            .eq('id', ticketId)
            .select()
            .single();

        if (updateError) throw updateError;

        return NextResponse.json({ success: true, ticket: data });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        console.error('❌ Update Ticket Error:', error);
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
