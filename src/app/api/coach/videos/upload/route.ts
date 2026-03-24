import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { aiService } from '@/services/ai.service';

export const maxDuration = 60;export async function POST(req: Request) {
    try {
        const supabase = await createClient();

        // Verificar sesión y rol
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
        }

        const { data: profile } = await supabase
            .from('perfiles')
            .select('rol')
            .eq('id', session.user.id)
            .single();

        if (profile?.rol !== 'coach' && profile?.rol !== 'admin') {
            return NextResponse.json({ error: 'Solo entrenadores pueden subir videos' }, { status: 403 });
        }

        const formData = await req.formData();
        const videoFile = formData.get('video') as File;
        const usuarioId = formData.get('usuarioId') as string;
        const ejercicioId = formData.get('ejercicioId') as string;
        const exerciseName = formData.get('exerciseName') as string;

        if (!videoFile || !usuarioId) {
            return NextResponse.json({ error: 'Faltan campos obligatorios' }, { status: 400 });
        }

        // Validar tipo de archivo (solo video)
        if (!videoFile.type.startsWith('video/')) {
            return NextResponse.json({ error: 'El archivo debe ser un video' }, { status: 400 });
        }

        // 1. Subir a Supabase Storage
        const fileName = `${Date.now()}_${videoFile.name} `;
        const filePath = `${usuarioId}/${fileName}`;

        const { data: storageData, error: storageError } = await supabase.storage
            .from('videos_ejercicio')
            .upload(filePath, videoFile);

        if (storageError) {
            throw storageError;
        }

        // Obtener URL pública (o firmada si es privado)
        const { data: { publicUrl } } = supabase.storage
            .from('videos_ejercicio')
            .getPublicUrl(filePath);

        // 2. Registrar en la tabla videos_ejercicio
        const { data: videoRecord, error: dbError } = await supabase
            .from('videos_ejercicio')
            .insert({
                usuario_id: usuarioId,
                subido_por: session.user.id,
                ejercicio_id: ejercicioId || null,
                nombre_ejercicio_custom: exerciseName || null,
                url_video: publicUrl,
                estado: 'subido'
            })
            .select()
            .single();

        if (dbError) {
            throw dbError;
        }

        // 3. Analizar video en tiempo real (Edge) sin requerir BullMQ local
        try {
            const { data: blob, error: downloadError } = await supabase.storage
                .from('videos_ejercicio')
                .download(filePath);
            
            if (!downloadError && blob) {
                const buffer = Buffer.from(await blob.arrayBuffer());
                const base64Video = buffer.toString('base64');

                const analysisJson = await aiService.analyzeMovement(
                    base64Video, 
                    blob.type, 
                    exerciseName || ejercicioId || 'Ejercicio desconocido'
                );
                
                await supabase
                    .from('videos_ejercicio')
                    .update({
                        estado: 'analizado',
                        correcciones_ia: analysisJson as any,
                        procesado_en: new Date().toISOString()
                    })
                    .eq('id', videoRecord.id);
            } else {
                 throw new Error('No se pudo decodificar el video.');
            }
        } catch (e) {
            console.error('Error sincronizando video IA:', e);
            await supabase.from('videos_ejercicio').update({ estado: 'error' }).eq('id', videoRecord.id);
        }

        return NextResponse.json({
            success: true,
            videoId: videoRecord.id,
            message: 'Video subido y analizado biomecánicamente por la IA'
        });

    } catch (error: any) {
        console.error('Error in upload route:', error);
        return NextResponse.json({ error: error.message || 'Error interno del servidor' }, { status: 500 });
    }
}
