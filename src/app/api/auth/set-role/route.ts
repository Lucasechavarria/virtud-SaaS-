import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
    try {
        const supabase = await createClient();

        // 1. Verify User is Authenticated
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // 2. Verify Requester is Admin/SuperAdmin
        const { data: requesterProfile } = await supabase
            .from('perfiles')
            .select('rol')
            .eq('id', user.id)
            .single();

        const isAuthorized = requesterProfile &&
            ['admin', 'superadmin'].includes(requesterProfile.rol);

        if (!isAuthorized) {
            return NextResponse.json({ error: 'Forbidden: Requires Admin privileges' }, { status: 403 });
        }

        // 3. Parse Body
        let body;
        try {
            body = await request.json();
        } catch (e) {
            return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
        }

        const { uid, role, permisos } = body;

        if (!uid || !role) {
            return NextResponse.json({ error: 'Missing uid or role' }, { status: 400 });
        }

        const isSuperAdmin = requesterProfile.rol === 'superadmin';
        const validRoles = isSuperAdmin 
            ? ['member', 'coach', 'admin', 'superadmin', 'recepcion'] 
            : ['member', 'coach', 'admin', 'recepcion'];

        if (!validRoles.includes(role)) {
            return NextResponse.json({ error: 'Invalid role or insufficient permissions' }, { status: 400 });
        }

        // 4. Obtener estado actual para el log
        const { data: currentProfile } = await (supabase
            .from('perfiles') as any)
            .select('rol, permisos')
            .eq('id', uid)
            .single();

        // 5. Update Target User Profile
        const updatePayload: any = { rol: role };
        if (permisos !== undefined) {
            updatePayload.permisos = permisos;
        }

        const { error: updateError } = await supabase
            .from('perfiles')
            .update(updatePayload)
            .eq('id', uid);

        if (updateError) {
            console.error('Error updating profile:', updateError);
            return NextResponse.json({ error: 'Failed to update user role' }, { status: 500 });
        }

        // 6. Registrar en historial
        await (supabase
            .from('historial_cambios_perfil') as any)
            .insert({
                perfil_id: uid,
                cambiado_por: user.id, // ID del administrador autenticado
                campo_cambiado: 'rol',
                valor_anterior: `${currentProfile?.rol || 'unknown'} (Permisos: ${JSON.stringify(currentProfile?.permisos || {})})`,
                valor_nuevo: `${role} (Permisos: ${JSON.stringify(permisos || {})})`,
                razon: 'Cambio de rol y permisos manual por administrador'
            });

        return NextResponse.json({ success: true, message: `Role ${role} assigned to ${uid}` });

    } catch (_error) {
        const err = _error as Error;
        console.error('Error in set-role:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

