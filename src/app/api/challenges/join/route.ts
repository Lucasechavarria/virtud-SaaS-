import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * POST /api/challenges/[id]/join
 * Permite a un alumno unirse a un desafío
 */
export async function POST(
    request: Request,
    { _params }: { _params: Promise<{ id: string }> }
) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const body = await request.json();
        const { challengeId } = body;

        if (!challengeId) {
            return NextResponse.json({ error: 'ID de desafío es requerido' }, { status: 400 });
        }

        // 1. Obtener datos del desafío y verificar si ya está unido
        const { data: challenge, error: challengeError } = await (supabase as any)
            .from('desafios')
            .select(`
                *,
                user_challenge_participation:desafio_participaciones!challenge_id(status, user_id)
            `)
            .eq('id', challengeId)
            .single();

        if (challengeError || !challenge) {
            return NextResponse.json({ error: 'Desafío no encontrado' }, { status: 404 });
        }

        const existingParticipation = challenge.user_challenge_participation.find(
            (p: any) => p.user_id === user.id
        );

        if (existingParticipation) {
            return NextResponse.json({ error: 'Ya estás participando en este desafío' }, { status: 400 });
        }

        // 2. Unirse al desafío
        const { data, error: joinError } = await (supabase as any)
            .from('desafio_participaciones')
            .insert({
                user_id: user.id,
                challenge_id: challengeId,
                status: 'active',
            })
            .select()
            .single();

        if (joinError) {
            console.error('Error joining challenge:', joinError);
            throw joinError;
        }

        // 3. Notificar al creador/juez del desafío
        try {
            if (challenge && challenge.creado_por) {
                // Registrar notificación en historial
                await supabase.from('historial_notificaciones').insert({
                    usuario_id: challenge.creado_por,
                    tipo: 'mensaje',
                    titulo: 'Nuevo participante',
                    cuerpo: `${user.email} se ha unido a tu desafío: ${challenge.titulo}`,
                    datos: { challengeId },
                    enviada: false
                } as any);

                // Intentar enviar push (opcional)
                const pushBaseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
                fetch(`${pushBaseUrl}/api/push/send`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        recipientId: challenge.creado_por,
                        title: '⚔️ Nuevo participante',
                        body: `${user.user_metadata.full_name || 'Un alumno'} aceptó tu desafío: ${challenge.titulo}`,
                        url: `/admin/challenges`
                    })
                }).catch(e => console.error('Error sending push:', e));
            }
        } catch (notifError) {
            console.error('Error creating notification for challenge join:', notifError);
        }

        return NextResponse.json(data);
    } catch (error: any) {
        console.error('Error joining challenge:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
