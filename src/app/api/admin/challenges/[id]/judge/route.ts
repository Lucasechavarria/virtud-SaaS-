import { NextResponse } from 'next/server';
import { authenticateAndRequireRole } from '@/lib/auth/api-auth';
import { NotificationService } from '@/services/notification.service';

/**
 * PUT /api/admin/challenges/[id]/judge
 * Decide el ganador o finaliza el desafío
 */
export async function PUT(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { profile, supabase, error } = await authenticateAndRequireRole(request, ['admin', 'superadmin', 'coach']);
        if (error) return error;

        const { id: challengeId } = await params;
        const { winnerId, status, endDate } = await request.json();

        // Validar pertenencia del desafío al gimnasio del solicitante (aislamiento multi-tenant)
        if (profile?.role !== 'superadmin') {
            const { data: challengeCheck, error: checkError } = await supabase!
                .from('desafios')
                .select('gimnasio_id')
                .eq('id', challengeId)
                .single();

            if (checkError || !challengeCheck) {
                return NextResponse.json({ error: 'Desafío no encontrado o no autorizado' }, { status: 404 });
            }

            if (challengeCheck.gimnasio_id !== profile?.gimnasio_id) {
                return NextResponse.json({ error: 'Acceso denegado: El desafío pertenece a otra sucursal' }, { status: 403 });
            }
        }

        // 1. Actualizar estado del desafío (columnas en español)
        const updateData: any = { estado: status || 'finished' };

        // Si estamos reiniciando, limpiamos el ganador y actualizamos fecha si viene
        if (status === 'active') {
            updateData.ganador_id = null;
            if (endDate) {
                updateData.fecha_fin = new Date(endDate).toISOString();
            }
        }

        const { error: challengeError } = await supabase!
            .from('desafios')          // antes: challenges
            .update(updateData)
            .eq('id', challengeId);

        if (challengeError) throw challengeError;

        if (status === 'active') {
            // Si reiniciamos, reseteamos a todos los participantes a 'inscrito'
            await supabase!
                .from('participantes_desafio')   // antes: challenge_participants
                .update({ estado: 'enrolled' })
                .eq('desafio_id', challengeId);  // antes: challenge_id

            return NextResponse.json({ success: true, message: 'Desafío reiniciado' });
        }

        if (winnerId) {
            // 2. Marcar al ganador en los participantes
            const { error: participantError } = await supabase!
                .from('participantes_desafio')   // antes: challenge_participants
                .update({ estado: 'winner' })
                .eq('desafio_id', challengeId)   // antes: challenge_id
                .eq('usuario_id', winnerId);      // antes: user_id

            if (participantError) throw participantError;

            // 3. Obtener puntos de recompensa del desafío
            const { data: challenge } = await supabase!
                .from('desafios')                // antes: challenges
                .select('puntos_recompensa')     // antes: points_reward
                .eq('id', challengeId)
                .single();

            // 4. Otorgar puntos al ganador via RPC
            await supabase!.rpc('incrementar_puntos', {
                usuario_id_param: winnerId,
                puntos_param: challenge?.puntos_recompensa || 100
            });

            // 5. Guardar el ganador_id en la tabla principal si es un duelo o queremos cerrarlo
            await supabase!
                .from('desafios')
                .update({ ganador_id: winnerId })
                .eq('id', challengeId);

            // 6. Notificar al alumno
            try {
                const { data: challengeData } = await supabase!
                    .from('desafios')
                    .select('titulo')
                    .eq('id', challengeId)
                    .single();

                const notifService = new NotificationService(supabase!);
                await notifService.sendToUser(winnerId, {
                    tipo: 'logro',
                    titulo: '🏆 ¡Objetivo cumplido!',
                    cuerpo: `El profesor ha validado tu cumplimiento en el desafío "${challengeData?.titulo || 'Desafío'}". ¡Has sumado puntos!`,
                    datos: { 
                        challengeId, 
                        type: 'challenge_approved',
                        url: `/dashboard`
                    }
                });
            } catch (notifError) {
                console.error('Error notifying student of approval:', notifError);
            }
        }

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('Error judging challenge:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
