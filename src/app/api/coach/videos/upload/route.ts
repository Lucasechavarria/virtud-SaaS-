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

        const formData = await req.formData();
        const videoFile = formData.get('video') as File;
        const usuarioId = formData.get('usuarioId') as string;
        const ejercicioId = formData.get('ejercicioId') as string;
        const exerciseName = formData.get('exerciseName') as string;

        if (!videoFile || !usuarioId) {
            return NextResponse.json({ error: 'Faltan campos obligatorios' }, { status: 400 });
        }

        // Obtener en paralelo los perfiles del coach y del alumno para blindar contra BOLA (Multi-tenant check)
        const [coachProfileRes, studentProfileRes] = await Promise.all([
            supabase.from('perfiles').select('gimnasio_id, rol').eq('id', session.user.id).single(),
            supabase.from('perfiles').select('gimnasio_id').eq('id', usuarioId).single()
        ]);

        const coachProfile = coachProfileRes.data;
        const studentProfile = studentProfileRes.data;

        if (!coachProfile || (coachProfile.rol !== 'coach' && coachProfile.rol !== 'admin')) {
            return NextResponse.json({ error: 'Solo entrenadores pueden subir videos' }, { status: 403 });
        }

        if (!studentProfile || coachProfile.gimnasio_id !== studentProfile.gimnasio_id) {
            return NextResponse.json({ 
                error: 'No autorizado: El entrenador y el alumno deben pertenecer al mismo gimnasio.' 
            }, { status: 403 });
        }

        const gymId = coachProfile.gimnasio_id;

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
                gimnasio_id: gymId, // Almacenar el gimnasio_id de forma explícita para aislamiento multi-tenant
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

        // Retornar de inmediato para evitar timeouts serverless y reducir costos de computación.
        // El Database Webhook de Supabase disparará la Edge Function 'analyze-video' 
        // de forma puramente asíncrona en segundo plano.
        return NextResponse.json({
            success: true,
            videoId: videoRecord.id,
            estado: 'subido',
            message: 'Video subido con éxito. El análisis biomecánico se procesará en segundo plano.'
        });

    } catch (error: any) {
        console.error('Error in upload route:', error);
        return NextResponse.json({ error: error.message || 'Error interno del servidor' }, { status: 500 });
    }
}
