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

        // Verificar si ya participa
        const { data: existing } = await supabase
            .from('participantes_desafio')
            .select('*')
            .eq('desafio_id', challengeId)
            .eq('usuario_id', user.id)
            .single();

        if (existing) {
            return NextResponse.json({ error: 'Ya estás participando en este desafío' }, { status: 400 });
        }

        const { data, error } = await supabase
            .from('participantes_desafio')
            .insert({
                desafio_id: challengeId,
                usuario_id: user.id,
                estado: 'enrolled'
            })
            .select()
            .single();

        if (error) throw error;

        // 3. Notificar al creador/juez del desafío
        try {
            const { data: challenge } = await supabase
                .from('desafios')
                .select('titulo, creado_por, perfiles:creado_por(nombre_completo)')
                .eq('id', challengeId)
                .single();

            if (challenge && challenge.creado_por) {
                // Registrar notificación en historial
                await supabase.from('historial_notificaciones').insert({
                    usuario_id: challenge.creado_por,
                    tipo: 'sistema',
                    titulo: '⚔️ Nuevo participante en desafío',
                    cuerpo: `${user.user_metadata.full_name || 'Un alumno'} se ha unido a "${challenge.titulo}"`,
                    datos: { challengeId, type: 'challenge_join' },
                    enviada: false
                });

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
