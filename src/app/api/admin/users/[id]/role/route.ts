import { NextResponse } from 'next/server';
import { authenticateAndRequireRole } from '@/lib/auth/api-auth';

/**
 * PUT /api/admin/users/[id]/role
 * 
 * Cambia el rol de un usuario (solo admin/superadmin)
 */
export async function PUT(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { user, supabase, error } = await authenticateAndRequireRole(
            request,
            ['admin']
        );

        if (error) return error;

        const { id } = await params;
        const userId = id;
        const body = await request.json();
        const { role } = body;

        // Validar rol
        const validRoles = ['member', 'coach', 'admin', 'recepcion'];
        if (!validRoles.includes(role)) {
            return NextResponse.json({
                error: 'Rol inválido'
            }, { status: 400 });
        }

        // Verificar que no se está cambiando su propio rol
        if (userId === user.id) {
            return NextResponse.json({
                error: 'No puedes cambiar tu propio rol'
            }, { status: 400 });
        }

        // Obtener perfil actual del usuario
        const { data: targetProfile } = await supabase
            .from('perfiles')
            .select('rol')
            .eq('id', userId)
            .single();

        // Actualizar rol
        const { error: updateError } = await supabase
            .from('perfiles')
            .update({ rol: role })
            .eq('id', userId);

        if (updateError) throw updateError;

        // Registrar cambio en historial
        await supabase
            .from('historial_cambios_perfil')
            .insert({
                perfil_id: userId,
                cambiado_por: user.id,
                campo_cambiado: 'rol',
                valor_anterior: targetProfile?.rol || 'unknown',
                valor_nuevo: role,
                razon: `Cambio de rol por admin: ${user.email}`
            });

        return NextResponse.json({
            success: true,
            message: 'Rol actualizado correctamente'
        });

    } catch (error) {
        console.error('❌ Error updating role:', error);
        const errorMessage = error instanceof Error ? error.message : 'Error updating role';
        return NextResponse.json({
            error: errorMessage
        }, { status: 500 });
    }
}
