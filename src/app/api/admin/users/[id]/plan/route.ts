import { NextResponse } from 'next/server';
import { authenticateAndRequireRole } from '@/lib/auth/api-auth';
import { createAdminClient } from '@/lib/supabase/admin';

/**
 * PUT /api/admin/users/[id]/plan
 * 
 * Migra un usuario a un plan de membresía local del gimnasio.
 */
export async function PUT(
    request: Request,
    { params }: { params: Promise<{ id: string }> | { id: string } }
) {
    try {
        const { error: authError, profile } = await authenticateAndRequireRole(request, ['admin', 'superadmin', 'recepcion']);
        if (authError) return authError;

        const resolvedParams = params instanceof Promise ? await params : params;
        const userId = resolvedParams.id;
        const body = await request.json();
        const { planId, activate } = body;

        const adminClient = createAdminClient();

        // 1. Obtener perfil del que realiza la acción
        const { data: requester } = await adminClient
            .from('perfiles')
            .select('rol, permisos, gimnasio_id')
            .eq('id', profile.id)
            .single();

        if (requester?.rol === 'recepcion' && requester.permisos?.acceso_usuarios !== true) {
            return NextResponse.json({ error: 'Forbidden: Requiere permiso de acceso a usuarios' }, { status: 403 });
        }

        // 2. Obtener estado actual del alumno a migrar
        const { data: targetProfile, error: targetError } = await adminClient
            .from('perfiles')
            .select('rol, gimnasio_id, plan_id, estado_membresia')
            .eq('id', userId)
            .single();

        if (targetError || !targetProfile) {
            return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
        }

        // Validar multitenant: asegurar que pertenecen al mismo gimnasio
        if (requester?.rol !== 'superadmin' && requester?.gimnasio_id !== targetProfile.gimnasio_id) {
            return NextResponse.json({ error: 'Forbidden: No tienes acceso a este usuario' }, { status: 403 });
        }

        let planDetails = null;
        if (planId) {
            // Validar que el plan exista y pertenezca al mismo gimnasio
            const { data: plan, error: planError } = await adminClient
                .from('planes_gimnasio')
                .select('*')
                .eq('id', planId)
                .eq('gimnasio_id', targetProfile.gimnasio_id)
                .single();

            if (planError || !plan) {
                return NextResponse.json({ error: 'Plan no encontrado o no pertenece a tu gimnasio' }, { status: 400 });
            }
            planDetails = plan;
        }

        // 3. Preparar campos de actualización
        const updatePayload: any = {
            plan_id: planId || null
        };

        let activationMessage = '';
        if (planDetails && (activate || targetProfile.estado_membresia !== 'active')) {
            const months = Number(planDetails.duracion_meses) || 1;
            const endDate = new Date();
            endDate.setMonth(endDate.getMonth() + months);
            
            updatePayload.estado_membresia = 'active';
            updatePayload.fecha_inicio_membresia = new Date().toISOString();
            updatePayload.fecha_fin_membresia = endDate.toISOString();
            activationMessage = ` y membresía activada hasta el ${endDate.toLocaleDateString()}`;
        }

        // 4. Actualizar perfil del alumno
        const { error: updateError } = await adminClient
            .from('perfiles')
            .update(updatePayload)
            .eq('id', userId);

        if (updateError) throw updateError;

        // 5. Registrar en historial de cambios
        await adminClient
            .from('historial_cambios_perfil')
            .insert({
                profile_id: userId,
                changed_by: profile.id,
                field_changed: 'plan_id',
                old_value: targetProfile.plan_id || 'ninguno',
                new_value: planId || 'ninguno',
                reason: `Migración de plan local por el administrador/recepción${activationMessage}`
            });

        return NextResponse.json({
            success: true,
            message: `Plan actualizado con éxito${activationMessage}`,
            planId: planId || null,
            membershipStatus: updatePayload.estado_membresia || targetProfile.estado_membresia,
            membershipEnds: updatePayload.fecha_fin_membresia || null
        });

    } catch (error) {
        console.error('❌ Error migrating plan:', error);
        const message = error instanceof Error ? error.message : 'Unknown error';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
