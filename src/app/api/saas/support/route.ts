import { NextResponse } from 'next/server';
import { authenticateAndRequireRole } from '@/lib/auth/api-auth';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

/**
 * GET: Listar tickets
 * POST: Crear nuevo ticket
 */
export async function GET(request: Request) {
    try {
        const { error: authError, user } = await authenticateAndRequireRole(request, ['admin', 'superadmin']);
        if (authError || !user) return authError || NextResponse.json({ error: 'No user authenticated' }, { status: 401 });

        const adminClient = createAdminClient();

        // Obtener perfil del solicitante
        const { data: profile } = await adminClient
            .from('perfiles')
            .select('rol, gimnasio_id')
            .eq('id', user.id)
            .single();

        if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 });

        let query = adminClient.from('tickets_soporte_saas' as any).select(`
            *,
            perfiles!usuario_id (nombre_completo),
            gimnasios (nombre)
        `);

        // Si tiene gimnasio_id asignado, filtra estrictamente por su gimnasio (aislamiento multi-tenant)
        if (profile.gimnasio_id) {
            query = query.eq('gimnasio_id', profile.gimnasio_id);
        }

        const { data: tickets, error } = await query.order('creado_en', { ascending: false });

        if (error) throw error;
        return NextResponse.json({ tickets });
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const { error: authError, user } = await authenticateAndRequireRole(request, ['superadmin', 'admin']);
        if (authError || !user) return authError || NextResponse.json({ error: 'No user authenticated' }, { status: 401 });

        const { asunto, prioridad, categoria, mensaje } = await request.json();

        if (!asunto || !mensaje) {
            return NextResponse.json({ error: 'Asunto y mensaje son obligatorios' }, { status: 400 });
        }

        const adminClient = createAdminClient();

        // Obtener perfil del solicitante
        const { data: profile } = await adminClient
            .from('perfiles')
            .select('id, gimnasio_id')
            .eq('id', user.id)
            .single();

        if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 });

        // 1. Crear el Ticket
        const { data: ticket, error: ticketError } = await adminClient
            .from('tickets_soporte_saas' as any)
            .insert({
                gimnasio_id: profile.gimnasio_id,
                usuario_id: profile.id,
                asunto,
                descripcion: mensaje,
                prioridad: prioridad || 'media',
                categoria: categoria || 'tecnico'
            })
            .select()
            .single();

        if (ticketError) throw ticketError;

        // 2. Crear primer mensaje
        const { error: msgError } = await adminClient
            .from('mensajes_soporte' as any)
            .insert({
                ticket_id: (ticket as any).id,
                remitente_id: profile.id,
                mensaje,
                es_del_staff_saas: false
            });

        if (msgError) throw msgError;

        return NextResponse.json({ success: true, ticketId: (ticket as any).id });
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
