import { NextResponse } from 'next/server';
import { authenticateAndRequireRole } from '@/lib/auth/api-auth';
import { createClient } from '@/lib/supabase/server';
import { NotificationService } from '@/services/notification.service';

export async function POST(req: Request) {
    try {
        const { user, profile, supabase, error } = await authenticateAndRequireRole(
            req,
            ['coach', 'admin']
        );

        if (error) return error;
        if (!supabase || !profile) throw new Error('Supabase client not initialized');

        const { videoId, studentId } = await req.json();

        if (!videoId || !studentId) {
            return NextResponse.json({ error: 'Video ID and Student ID are required' }, { status: 400 });
        }

        // 1. Obtener detalles del video
        const { data: video, error: videoError } = await (supabase as any)
            .from('videos_ejercicio')
            .select(`
                id,
                usuario_id,
                ejercicio:ejercicio_id (nombre)
            `)
            .eq('id', videoId)
            .single();

        if (videoError || !video) {
            return NextResponse.json({ error: 'Video not found' }, { status: 404 });
        }

        // 2. Marcar como compartido en DB
        const { error: updateError } = await (supabase as any)
            .from('videos_ejercicio')
            .update({
                compartido_con_alumno: true,
                compartido_en: new Date().toISOString()
            })
            .eq('id', videoId);

        if (updateError) {
            console.error('Error updating video sharing status:', updateError);
            return NextResponse.json({ error: updateError.message }, { status: 500 });
        }

        // 3. Enviar notificación push al alumno
        try {
            const notificationService = await NotificationService.create();
            const exerciseName = video.ejercicio?.nombre || 'Ejercicio';
            
            await notificationService.sendToUser(studentId, {
                tipo: 'rutina',
                titulo: '🎥 Análisis de técnica compartido',
                cuerpo: `Tu coach compartió un análisis de técnica para ${exerciseName}. ¡Míralo ahora!`,
                datos: {
                    url: `/member/dashboard/vision`,
                    videoId: videoId
                }
            });
        } catch (notifErr) {
            console.error('Error dispatching share notification:', notifErr);
            // No fallamos la petición si falla el push, pero lo registramos
        }

        return NextResponse.json({ success: true });

    } catch (err: any) {
        console.error('Error in POST /api/coach/videos/share:', err);
        return NextResponse.json({ error: 'Internal Server Error', message: err.message }, { status: 500 });
    }
}
