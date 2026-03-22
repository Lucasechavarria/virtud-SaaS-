import { NextResponse } from 'next/server';
import { authenticateAndRequireRole } from '@/lib/auth/api-auth';

/**
 * POST /api/coach/routines/[id]/reject
 * 
 * Rechaza una rutina pendiente
 */
export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { supabase, error } = await authenticateAndRequireRole(
            request,
            ['coach', 'admin', 'superadmin']
        );

        if (error) return error;

        const { id } = await params;
        const routineId = id;

        // Actualizar estado a rejected
        const { error: updateError } = await supabase
            .from('rutinas')
            .update({ estado: 'rejected' })
            .eq('id', routineId);

        if (updateError) throw updateError;

        return NextResponse.json({
            success: true,
            message: 'Rutina rechazada correctamente'
        });

    } catch (error) {
        console.error('❌ Error rejecting routine:', error);
        const errorMessage = error instanceof Error ? error.message : 'Error al rechazar rutina';
        return NextResponse.json({
            error: errorMessage
        }, { status: 500 });
    }
}
