import { NextResponse } from 'next/server';
import { authenticateAndRequireRole } from '@/lib/auth/api-auth';

/**
 * POST /api/admin/users/[id]/deactivate
 * 
 * Desactiva o revierte la membresía de un usuario.
 */
export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { user, profile, supabase, error } = await authenticateAndRequireRole(request, ['admin', 'superadmin']);
        if (error) return error;

        // Blindaje contra gimnasio_id NULL para admin
        if (profile?.role !== 'superadmin' && !profile?.gimnasio_id) {
            return NextResponse.json({
                error: 'Forbidden',
                message: 'Administrador sin gimnasio asignado'
            }, { status: 403 });
        }

        const { id } = await params;
        const userId = id;

        // 1. Obtener perfil del socio objetivo para validar tenant
        const { data: targetProfile, error: targetError } = await supabase!
            .from('perfiles')
            .select('gimnasio_id, estado_membresia')
            .eq('id', userId)
            .single();

        if (targetError || !targetProfile) {
            return NextResponse.json({
                error: 'User not found',
                message: 'Socio no encontrado'
            }, { status: 404 });
        }

        if (profile?.role !== 'superadmin' && targetProfile.gimnasio_id !== profile?.gimnasio_id) {
            return NextResponse.json({
                error: 'Forbidden',
                message: 'El socio especificado pertenece a otra sucursal'
            }, { status: 403 });
        }

        // 2. Actualizar perfil a inactivo
        const { error: updateError } = await supabase!
            .from('perfiles')
            .update({
                estado_membresia: 'inactive',
                fecha_fin_membresia: null
            })
            .eq('id', userId);

        if (updateError) throw updateError;

        // 3. Registrar en historial
        await supabase!
            .from('historial_cambios_perfil')
            .insert({
                profile_id: userId,
                changed_by: user.id,
                field_changed: 'estado_membresia',
                old_value: targetProfile?.estado_membresia || 'unknown',
                new_value: 'inactive',
                reason: 'Desactivación/Reversión manual por administrador'
            });

        return NextResponse.json({
            success: true,
            message: 'Membresía desactivada/revertida correctamente'
        });

    } catch (error) {
        console.error('❌ Error deactivating user:', error);
        const errorMessage = error instanceof Error ? error.message : 'Error deactivating user';
        return NextResponse.json({
            error: errorMessage
        }, { status: 500 });
    }
}
