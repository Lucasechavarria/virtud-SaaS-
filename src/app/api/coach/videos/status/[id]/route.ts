import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(
    req: Request,
    { params }: { params: { id: string } }
) {
    try {
        const supabase = await createClient();
        const { id } = params;

        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
        }

        const { data: videoRecord, error } = await supabase
            .from('videos_ejercicio')
            .select('*')
            .eq('id', id)
            .single();

        if (error || !videoRecord) {
            return NextResponse.json({ error: 'Video no encontrado' }, { status: 404 });
        }

        // Solo el coach que lo subió o el admin pueden ver el status detallado
        // (O el alumno si ya fue analizado y compartido)
        const isOwner = videoRecord.subido_por === session.user.id;
        const isStudent = videoRecord.usuario_id === session.user.id;

        if (!isOwner && !isStudent) {
            return NextResponse.json({ error: 'No tienes permiso para ver este video' }, { status: 403 });
        }

        const record = videoRecord as any;

        return NextResponse.json({
            id: record.id,
            estado: record.estado,
            procesado_en: record.procesado_en,
            correcciones_ia: record.correcciones_ia,
            compartido: record.compartido_con_alumno,
            telemetria: record.telemetria,
            url_video: record.url_video,
            usuario_id: record.usuario_id
        });

    } catch (error: any) {
        return NextResponse.json({ error: error.message || 'Error interno' }, { status: 500 });
    }
}
