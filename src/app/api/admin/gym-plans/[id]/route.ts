import { NextResponse } from 'next/server';
import { authenticateAndRequireRole } from '@/lib/auth/api-auth';
import { createAdminClient } from '@/lib/supabase/admin';

/**
 * PUT /api/admin/gym-plans/[id]
 * Modifica un plan de membresía del gimnasio.
 */
export async function PUT(
    request: Request,
    { params }: { params: Promise<{ id: string }> | { id: string } }
) {
    try {
        const { error: authError, profile } = await authenticateAndRequireRole(request, ['admin', 'superadmin']);
        if (authError) return authError;

        const resolvedParams = params instanceof Promise ? await params : params;
        const planId = resolvedParams.id;
        const body = await request.json();

        const adminClient = createAdminClient();

        // 1. Obtener perfil
        const { data: requester } = await adminClient
            .from('perfiles')
            .select('rol, gimnasio_id')
            .eq('id', profile.id)
            .single();

        // 2. Verificar que el plan pertenezca al mismo gimnasio
        const { data: plan, error: fetchError } = await adminClient
            .from('planes_gimnasio')
            .select('gimnasio_id')
            .eq('id', planId)
            .single();

        if (fetchError || !plan) {
            return NextResponse.json({ error: 'Plan no encontrado' }, { status: 404 });
        }

        const isAuthorized = requester?.rol === 'superadmin' || requester?.gimnasio_id === plan.gimnasio_id;
        if (!isAuthorized) {
            return NextResponse.json({ error: 'Forbidden: No tienes acceso a este plan' }, { status: 403 });
        }

        // 3. Ejecutar Update
        const { data: updatedPlan, error: updateError } = await adminClient
            .from('planes_gimnasio')
            .update({
                nombre: body.nombre,
                descripcion: body.descripcion || '',
                precio: Number(body.precio),
                duracion_meses: Number(body.duracion_meses),
                esta_activo: body.esta_activo !== false,
                beneficios: body.beneficios || []
            })
            .eq('id', planId)
            .select()
            .single();

        if (updateError) throw updateError;

        return NextResponse.json({ success: true, plan: updatedPlan });

    } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}

/**
 * DELETE /api/admin/gym-plans/[id]
 * Elimina o desactiva un plan de membresía local.
 */
export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> | { id: string } }
) {
    try {
        const { error: authError, profile } = await authenticateAndRequireRole(request, ['admin', 'superadmin']);
        if (authError) return authError;

        const resolvedParams = params instanceof Promise ? await params : params;
        const planId = resolvedParams.id;

        const adminClient = createAdminClient();

        // 1. Obtener perfil
        const { data: requester } = await adminClient
            .from('perfiles')
            .select('rol, gimnasio_id')
            .eq('id', profile.id)
            .single();

        // 2. Verificar pertenencia
        const { data: plan, error: fetchError } = await adminClient
            .from('planes_gimnasio')
            .select('gimnasio_id')
            .eq('id', planId)
            .single();

        if (fetchError || !plan) {
            return NextResponse.json({ error: 'Plan no encontrado' }, { status: 404 });
        }

        const isAuthorized = requester?.rol === 'superadmin' || requester?.gimnasio_id === plan.gimnasio_id;
        if (!isAuthorized) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        // 3. Eliminar físicamente o marcar como inactivo
        // Para evitar errores si hay alumnos asignados a este plan, se puede intentar borrar
        // y si la base de datos lanza restricción de integridad referencial, se marca como inactivo (esta_activo = false).
        const { error: deleteError } = await adminClient
            .from('planes_gimnasio')
            .delete()
            .eq('id', planId);

        if (deleteError) {
            // Si falla por llave foránea, marcar como inactivo
            console.log('Fallo borrar plan por integridad referencial, desactivando en su lugar...');
            const { error: deactivateError } = await adminClient
                .from('planes_gimnasio')
                .update({ esta_activo: false })
                .eq('id', planId);

            if (deactivateError) throw deactivateError;
            return NextResponse.json({ success: true, message: 'El plan tiene alumnos asignados. Se ha marcado como INACTIVO.' });
        }

        return NextResponse.json({ success: true, message: 'Plan eliminado con éxito' });

    } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
