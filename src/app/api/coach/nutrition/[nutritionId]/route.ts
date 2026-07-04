import { NextResponse } from 'next/server';
import { authenticateAndRequireRole } from '@/lib/auth/api-auth';

/**
 * PUT /api/coach/nutrition/[nutritionId]
 * 
 * Permite al coach modificar los objetivos calóricos, macronutrientes y lista de comidas
 * sugeridas para un plan nutricional específico antes o después de ser asignado.
 */
export async function PUT(
    request: Request,
    { params }: { params: { nutritionId: string } }
) {
    try {
        const { nutritionId } = params;

        const { user, profile, supabase, error } = await authenticateAndRequireRole(
            request,
            ['coach', 'admin']
        );

        if (error) return error;
        if (!supabase || !user || !profile) {
            throw new Error('No se pudo inicializar la sesión o el cliente de Supabase');
        }

        const targetGymId = profile.gimnasio_id;
        if (!targetGymId) {
            return NextResponse.json({ error: 'El usuario no tiene un gimnasio asignado.' }, { status: 400 });
        }

        const body = await request.json();
        const { calorias_diarias, gramos_proteina, gramos_carbohidratos, gramos_grasas, comidas, suplementos } = body;

        // 1. Validar existencia y pertenencia del plan nutricional (BOLA blindaje)
        const { data: dbPlan, error: dbError } = await supabase
            .from('planes_nutricionales')
            .select(`
                id,
                usuario_id,
                perfiles!usuario_id (
                    gimnasio_id
                )
            `)
            .eq('id', nutritionId)
            .single();

        if (dbError || !dbPlan) {
            return NextResponse.json({ error: 'Plan nutricional no encontrado o no autorizado.' }, { status: 404 });
        }

        const studentProfile = Array.isArray(dbPlan.perfiles) 
            ? dbPlan.perfiles[0] 
            : dbPlan.perfiles as any;

        if (!studentProfile || studentProfile.gimnasio_id !== targetGymId) {
            return NextResponse.json({ error: 'Acceso no autorizado: Aislamiento multi-tenant activo.' }, { status: 403 });
        }

        // 2. Realizar actualización
        const updateData: Record<string, any> = {};
        if (calorias_diarias !== undefined) updateData.calorias_diarias = Number(calorias_diarias);
        if (gramos_proteina !== undefined) updateData.gramos_proteina = Number(gramos_proteina);
        if (gramos_carbohidratos !== undefined) updateData.gramos_carbohidratos = Number(gramos_carbohidratos);
        if (gramos_grasas !== undefined) updateData.gramos_grasas = Number(gramos_grasas);
        if (comidas !== undefined) updateData.comidas = comidas;
        if (suplementos !== undefined) updateData.suplementos = suplementos;
        
        updateData.actualizado_en = new Date().toISOString();

        const { error: updateError } = await supabase
            .from('planes_nutricionales')
            .update(updateData)
            .eq('id', nutritionId);

        if (updateError) {
            throw updateError;
        }

        return NextResponse.json({
            success: true,
            message: 'Plan nutricional actualizado correctamente.'
        });

    } catch (error) {
        console.error(`❌ Error PUT /api/coach/nutrition/${params.nutritionId}:`, error);
        return NextResponse.json({
            error: error instanceof Error ? error.message : 'Error interno al actualizar el plan nutricional'
        }, { status: 500 });
    }
}
