import { NextResponse } from 'next/server';
import { authenticateAndRequireRole, resolveGymIdForAdmin } from '@/lib/auth/api-auth';
import { createAdminClient } from '@/lib/supabase/admin';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function PUT(request: Request) {
    try {
        const { error: authError, user } = await authenticateAndRequireRole(request, ['admin', 'superadmin', 'recepcion']);
        if (authError) return authError;

        const adminClient = createAdminClient();

        // Obtener rol y gimnasio del solicitante
        const { data: requester } = await adminClient
            .from('perfiles')
            .select('rol, gimnasio_id, permisos')
            .eq('id', user.id)
            .single();

        if (!requester) {
            return NextResponse.json({ error: 'Perfil no encontrado' }, { status: 404 });
        }

        // Si es recepcionista, verificar permiso explícito
        if (requester.rol === 'recepcion' && !(requester.permisos as any)?.acceso_settings) {
            return NextResponse.json({ error: 'Forbidden: No tienes permisos para modificar la configuración de este gimnasio' }, { status: 403 });
        }

        const body = await request.json();
        const { name, address, phone, email, openingHours, timezone, gymId } = body;

        const { targetGymId, errorResponse } = await resolveGymIdForAdmin(requester, gymId);
        if (errorResponse) return errorResponse;
 
        if (!targetGymId) {
            return NextResponse.json({ error: 'Gimnasio no especificado o usuario sin gimnasio asignado' }, { status: 400 });
        }

        // Construir el objeto de actualización (solo campos provistos)
        const updates: Record<string, string> = {};
        if (name !== undefined) updates.nombre = name;
        if (address !== undefined) updates.direccion = address;
        if (phone !== undefined) updates.telefono = phone;
        if (email !== undefined) updates.email = email;
        if (openingHours !== undefined) updates.horarios = openingHours;
        if (timezone !== undefined) updates.timezone = timezone;

        if (Object.keys(updates).length === 0) {
            return NextResponse.json({ error: 'No se proporcionaron campos para actualizar' }, { status: 400 });
        }

        const { data, error: updateError } = await adminClient
            .from('gimnasios')
            .update(updates)
            .eq('id', targetGymId)
            .is('deleted_at', null)
            .select('id, nombre, direccion, telefono, email, horarios, timezone')
            .single();

        if (updateError) throw updateError;

        return NextResponse.json({ success: true, gym: data });

    } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        console.error('❌ Error updating gym settings:', err);
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
