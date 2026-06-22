import { NextResponse } from 'next/server';
import { authenticateAndRequireRole } from '@/lib/auth/api-auth';

/**
 * POST /api/admin/challenges/process-expired
 * Busca desafíos que han pasado su fecha_fin y los finaliza automáticamente,
 * notificando a los participantes.
 */
export async function POST(request: Request) {
    try {
        const { profile, supabase, error } = await authenticateAndRequireRole(request, ['admin', 'superadmin', 'coach']);
        if (error) return error;

        const now = new Date().toISOString();

        // 1. Obtener desafíos activos expirados del gimnasio del solicitante (aislamiento multi-tenant)
        let query = supabase!
            .from('desafios')
            .select('*, participantes:participantes_desafio(*)')
            .eq('estado', 'active')
            .lt('fecha_fin', now);

        if (profile?.role !== 'superadmin' && profile?.gimnasio_id) {
            query = query.eq('gimnasio_id', profile.gimnasio_id);
        }

        const { data: expiredChallenges, error: challengesError } = await query;

        if (challengesError) throw challengesError;

        if (!expiredChallenges || expiredChallenges.length === 0) {
            return NextResponse.json({ message: 'No hay desafíos expirados para procesar' });
        }

        const results = [];

        for (const challenge of expiredChallenges) {
            // Finalizar el desafío
            await supabase!
                .from('desafios')
                .update({ estado: 'finished' })
                .eq('id', challenge.id);

            // Notificar a todos los participantes
            if (challenge.participantes && challenge.participantes.length > 0) {
                const notifications = challenge.participantes.map(async (p: any) => {
                    const isWinner = p.estado === 'winner';
                    const title = isWinner ? '🏆 ¡Ganaste el desafío!' : '🏁 Desafío finalizado';
                    const body = isWinner
                        ? `¡Felicidades! Fuiste el ganador de "${challenge.titulo}".`
                        : `El desafío "${challenge.titulo}" ha terminado. ¡Buen esfuerzo!`;

                    return supabase!.from('historial_notificaciones').insert({
                        usuario_id: p.usuario_id,
                        tipo: 'logro',
                        titulo: title,
                        cuerpo: body,
                        datos: { challengeId: challenge.id, isWinner },
                        enviada: false
                    });
                });
                await Promise.all(notifications);
            }
            results.push(challenge.id);
        }

        return NextResponse.json({
            success: true,
            processedCount: results.length,
            processedIds: results
        });
    } catch (error: any) {
        console.error('Error processing expired challenges:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
