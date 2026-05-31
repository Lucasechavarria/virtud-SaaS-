import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { NotificationService } from '@/services/notification.service';

/**
 * POST /api/challenges/complete
 * Permite a un alumno marcar un desafío como completado (pendiente de validación)
 */
export async function POST(req: Request) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { challengeId } = await req.json();

        if (!challengeId) {
            return NextResponse.json({ error: 'ID de desafío es requerido' }, { status: 400 });
        }

        // 1. Verificar que el usuario participa y que el desafío está activo
        const { data: participant, error: pError } = await (supabase as any)
            .from('participantes_desafio')
            .select('*, desafios(estado, titulo, creado_por)')
            .eq('desafio_id', challengeId)
            .eq('usuario_id', user.id)
            .single();

        if (pError || !participant) {
            return NextResponse.json({ error: 'No estás participando en este desafío' }, { status: 400 });
        }

        if (participant.estado === 'pending_validation') {
            return NextResponse.json({ error: 'Ya has solicitado validación para este desafío' }, { status: 400 });
        }

        if (participant.desafios.estado !== 'active') {
            return NextResponse.json({ error: 'El desafío ya no está activo' }, { status: 400 });
        }

        // 2. Actualizar estado a pendiente de validación
        const { error: updateError } = await (supabase as any)
            .from('participantes_desafio')
            .update({
                estado: 'pending_validation',
                actualizado_en: new Date().toISOString()
            })
            .eq('desafio_id', challengeId)
            .eq('usuario_id', user.id);

        if (updateError) throw updateError;

        // 3. Notificar al coach/juez
        try {
            const judgeId = participant.desafios.creado_por;
            if (judgeId) {
                const notifService = new NotificationService(supabase);
                await notifService.sendToUser(judgeId, {
                    tipo: 'sistema',
                    titulo: '🏆 Objetivo completado (Pendiente)',
                    cuerpo: `${user.user_metadata?.nombre_completo || user.user_metadata?.full_name || 'Un alumno'} marcó como completado el desafío: ${participant.desafios.titulo}. Validalo ahora.`,
                    datos: { 
                        challengeId, 
                        studentId: user.id, 
                        type: 'challenge_complete_request',
                        url: `/admin/challenges`
                    }
                });
            }
        } catch (notifError) {
            console.error('Error creating notification for challenge completion:', notifError);
        }

        return NextResponse.json({ success: true, message: 'Solicitud de validación enviada' });
    } catch (error: any) {
        console.error('Error completing challenge:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
