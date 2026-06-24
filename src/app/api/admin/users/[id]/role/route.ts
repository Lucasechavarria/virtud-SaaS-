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
        const { user, profile, supabase, error } = await authenticateAndRequireRole(
            request,
            ['admin']
        );

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

        // Obtener perfil actual del usuario y verificar pertenencia al mismo gimnasio
        const { data: targetProfile, error: targetError } = await supabase
            .from('perfiles')
            .select('rol, gimnasio_id')
            .eq('id', userId)
            .single();

        if (targetError || !targetProfile) {
            return NextResponse.json({
                error: 'User not found',
                message: 'Usuario no encontrado'
            }, { status: 404 });
        }

        if (profile?.role !== 'superadmin' && targetProfile.gimnasio_id !== profile?.gimnasio_id) {
            return NextResponse.json({
                error: 'Forbidden',
                message: 'El usuario pertenece a otra sucursal'
            }, { status: 403 });
        }

        // Obtener límites y plan del gimnasio
        const { data: gymPlan, error: planError } = await supabase
            .from('gimnasios')
            .select(`
                plan_id,
                planes_suscripcion (
                    limite_usuarios,
                    limite_coaches
                )
            `)
            .eq('id', targetProfile.gimnasio_id)
            .is('deleted_at', null)
            .single();

        if (planError || !gymPlan) {
            return NextResponse.json({
                error: 'Internal Error',
                message: 'No se pudo verificar el plan del gimnasio'
            }, { status: 500 });
        }

        const plan = gymPlan.planes_suscripcion;

        // Validar límite si se cambia a coach
        if (role === 'coach') {
            const limitCoaches = plan?.limite_coaches || 0;
            const { count: currentCoaches } = await supabase
                .from('perfiles')
                .select('*', { count: 'exact', head: true })
                .eq('gimnasio_id', targetProfile.gimnasio_id)
                .eq('rol', 'coach');

            if (currentCoaches !== null && currentCoaches >= limitCoaches) {
                return NextResponse.json({
                    error: 'LimitExceeded',
                    message: `Límite operativo de profesores alcanzado para este plan (${limitCoaches}). Solicite un upgrade.`
                }, { status: 400 });
            }
        }

        // Validar límite si se cambia a member (alumno)
        if (role === 'member') {
            const limitUsers = plan?.limite_usuarios || 0;
            const { count: currentUsers } = await supabase
                .from('perfiles')
                .select('*', { count: 'exact', head: true })
                .eq('gimnasio_id', targetProfile.gimnasio_id)
                .eq('rol', 'member');

            if (currentUsers !== null && currentUsers >= limitUsers) {
                return NextResponse.json({
                    error: 'LimitExceeded',
                    message: `Límite operativo de alumnos alcanzado para este plan (${limitUsers}). Solicite un upgrade.`
                }, { status: 400 });
            }
        }

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
