import { NextResponse } from 'next/server';
import { authenticateAndRequireRole } from '@/lib/auth/api-auth';

export async function PUT(
    request: Request,
    { params }: { params: { id: string } }
) {
    const { supabase, error } = await authenticateAndRequireRole(request, ['superadmin']);
    if (error) return error;

    try {
        const body = await request.json();
        const { data, error: updateError } = await supabase
            .from('planes_suscripcion')
            .update({
                nombre: body.nombre,
                precio_mensual: body.precio_mensual,
                limite_sucursales: body.limite_sucursales,
                limite_usuarios: body.limite_usuarios,
                caracteristicas: body.caracteristicas
            })
            .eq('id', params.id)
            .select()
            .single();

        if (updateError) throw updateError;

        // Sincronizar módulos activos en los gimnasios que tienen este plan asignado
        const caracts = body.caracteristicas || [];
        const newModules = {
            rutinas_ia: caracts.includes('Módulo: Rutinas IA'),
            nutricion_ia: caracts.includes('Módulo: Nutrición IA'),
            vision_ia: caracts.includes('Módulo: Visión Lab'),
            pagos_online: caracts.includes('Módulo: Pagos Online'),
            crm: caracts.includes('Módulo: CRM Ventas'),
            tienda_pos: caracts.includes('Módulo: Tienda & POS'),
            equipamiento_ia: caracts.includes('Módulo: Equipamiento (IA)'),
            gamificacion: caracts.includes('Módulo: Gamificación'),
            clases_reserva: caracts.includes('Módulo: Clases & Reservas')
        };

        const { error: syncError } = await supabase
            .from('gimnasios')
            .update({ modulos_activos: newModules })
            .eq('plan_id', params.id);

        if (syncError) {
            console.error('Error syncing modules to gyms:', syncError);
        }

        return NextResponse.json({ plan: data });
    } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}

export async function DELETE(
    request: Request,
    { params }: { params: { id: string } }
) {
    const { supabase, error } = await authenticateAndRequireRole(request, ['superadmin']);
    if (error) return error;

    try {
        const { error: deleteError } = await supabase
            .from('planes_suscripcion')
            .delete()
            .eq('id', params.id);

        if (deleteError) throw deleteError;

        return NextResponse.json({ success: true });
    } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
