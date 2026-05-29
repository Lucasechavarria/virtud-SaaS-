import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import { authenticateAndRequireRole } from '@/lib/auth/api-auth';
import { emails } from '@/lib/email';
import { createAdminClient } from '@/lib/supabase/admin';

export async function POST(
    request: Request,
    { params }: { params: { id: string } }
) {
    const { error: authError } = await authenticateAndRequireRole(request, ['superadmin']);
    if (authError) return authError;

    const adminSupabase = createAdminClient();

    try {
        // 1. Obtener el anuncio
        const { data: announcement, error: announceError } = await adminSupabase
            .from('anuncios_globales')
            .select('*')
            .eq('id', params.id)
            .single();

        if (announceError || !announcement) throw new Error('Anuncio no encontrado');

        // 2. Obtener los destinatarios (Solo directores de gimnasios si el destino es admin_gym, o todos)
        let query = adminSupabase.from('perfiles').select('correo');

        if (announcement.destino === 'admin_gym') {
            query = query.eq('rol', 'admin');
        } else if (announcement.destino === 'alumnos') {
            query = query.eq('rol', 'member');
        } else if (announcement.destino === 'coaches') {
            query = query.eq('rol', 'coach');
        } else if (announcement.destino === 'todos') {
            // No filter, but avoid superadmins for clutter
            query = query.neq('rol', 'superadmin');
        } else {
            query = query.eq('rol', announcement.destino as any);
        }

        const { data: users, error: usersError } = await query;
        if (usersError) throw usersError;

        const emailList = users.map(u => u.correo).filter(Boolean);

        if (emailList.length === 0) {
            return NextResponse.json({ message: 'No hay destinatarios para este email' });
        }

        // 3. Enviar vía Resend (En bloques de 50 para evitar límites de headers si fuera necesario, 
        // aunque Resend maneja bien listas grandes en bcc)
        // Por ahora lo enviamos en un solo dispatch masivo
        await emails.newsletter(
            emailList,
            announcement.titulo,
            announcement.contenido,
            'https://vitudgym.vercel.app',
            'Ir a la Plataforma'
        );

        // 4. Marcar como enviado
        await adminSupabase
            .from('anuncios_globales')
            .update({
                enviado_newsletter: true,
                fecha_envio_newsletter: new Date().toISOString()
            })
            .eq('id', params.id);

        return NextResponse.json({
            success: true,
            recipients: emailList.length
        });

    } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        console.error('Newsletter Error:', err);
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
