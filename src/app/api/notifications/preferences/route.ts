import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * GET /api/notifications/preferences
 * Obtiene las preferencias de notificaciones del usuario actual
 */
export async function GET(_req: NextRequest) {
    try {
        const supabase = await createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
        }

        const { data, error } = await supabase
            .from('notificaciones_preferencias')
            .select('*')
            .eq('usuario_id', user.id)
            .single();

        // Si no hay preferencias, devolver valores por defecto
        if (error && error.code === 'PGRST116') {
            return NextResponse.json({
                pagos_vencimiento: true,
                pagos_confirmacion: true,
                clases_recordatorio: true,
                clases_cancelacion: true,
                logros_nuevos: true,
                mensajes_nuevos: true,
                rutinas_nuevas: true,
                recordatorio_clases_horas: 2,
            });
        }

        if (error) {
            console.error('[API] Error obteniendo preferencias:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json(data);
    } catch (error) {
        console.error('[API] Error en GET /api/notifications/preferences:', error);
        return NextResponse.json(
            { error: 'Error interno del servidor' },
            { status: 500 }
        );
    }
}

/**
 * PUT /api/notifications/preferences
 * Actualiza las preferencias de notificaciones del usuario actual
 */
export async function PUT(req: NextRequest) {
    try {
        const supabase = await createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
        }

        const body = await req.json();

        // Validar campos permitidos
        const allowedFields = [
            'pagos_vencimiento',
            'pagos_confirmacion',
            'clases_recordatorio',
            'clases_cancelacion',
            'logros_nuevos',
            'mensajes_nuevos',
            'rutinas_nuevas',
            'recordatorio_clases_horas',
        ];

        const updates: any = {};
        for (const field of allowedFields) {
            if (body[field] !== undefined) {
                updates[field] = body[field];
            }
        }

        // Agregar timestamp de actualización
        updates.actualizado_en = new Date().toISOString();

        const { data, error } = await supabase
            .from('notificaciones_preferencias')
            .upsert({
                usuario_id: user.id,
                ...updates,
            })
            .select()
            .single();

        if (error) {
            console.error('[API] Error actualizando preferencias:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json(data);
    } catch (error) {
        console.error('[API] Error en PUT /api/notifications/preferences:', error);
        return NextResponse.json(
            { error: 'Error interno del servidor' },
            { status: 500 }
        );
    }
}
