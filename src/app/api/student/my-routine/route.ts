import { NextResponse } from 'next/server';
import { authenticateAndRequireRole } from '@/lib/auth/api-auth';

/**
 * GET /api/student/my-routine
 * 
 * Obtiene la rutina activa del alumno
 */
export async function GET(request: Request) {
    try {
        const { user, supabase, error } = await authenticateAndRequireRole(
            request,
            ['member', 'coach', 'admin']
        );

        if (error) return error;

        // Obtener rutina activa
        const { data: routine, error: routineError } = await supabase
            .from('rutinas')
            .select(`
                *,
                coach:perfiles(nombre_completo, email:correo)
            `)
            .eq('usuario_id', user.id)
            .eq('esta_activa', true)
            .maybeSingle();

        if (routineError || !routine) {
            return NextResponse.json({
                success: false,
                error: 'No active routine'
            }, { status: 404 });
        }

        // Obtener ejercicios de la rutina
        const { data: exercises, error: exercisesError } = await supabase
            .from('ejercicios')
            .select('*')
            .eq('rutina_id', routine.id)
            .order('dia_numero', { ascending: true })
            .order('orden_en_dia', { ascending: true });

        if (exercisesError) throw exercisesError;

        // Incrementar contador de vistas
        await supabase
            .from('rutinas')
            .update({
                contador_vistas: (routine.contador_vistas || 0) + 1,
                ultima_vista_en: new Date().toISOString()
            } as any)
            .eq('id', routine.id);

        return NextResponse.json({
            success: true,
            routine,
            exercises,
            userId: user.id
        });

    } catch (error) {
        console.error('❌ Error loading routine:', error);
        const errorMessage = error instanceof Error ? error.message : 'Error al cargar rutina';
        return NextResponse.json({
            error: errorMessage
        }, { status: 500 });
    }
}
