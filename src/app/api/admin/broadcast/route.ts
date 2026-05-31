import { NextResponse } from 'next/server';
import { authenticateAndRequireRole } from '@/lib/auth/api-auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { emails } from '@/lib/email';
import { logger } from '@/lib/logger';

export async function POST(request: Request) {
    try {
        const { error: authError, user: adminUser } = await authenticateAndRequireRole(request, ['superadmin']);
        if (authError || !adminUser) return authError || NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { titulo, contenido, tipo, destino, sendEmail } = await request.json();

        if (!titulo || !contenido) {
            return NextResponse.json({ error: 'Título y contenido son obligatorios' }, { status: 400 });
        }

        const adminClient = createAdminClient();

        // 1. Insertar el anuncio en la base de datos
        const { data, error } = await adminClient
            .from('anuncios_globales')
            .insert({
                titulo,
                contenido,
                tipo: tipo || 'info',
                destino: destino || 'todos',
                creado_por: adminUser.id,
                activo: true
            })
            .select()
            .single();

        if (error) throw error;

        // 2. Si sendEmail es true, despachar el boletín de forma automatizada por Resend
        if (sendEmail) {
            try {
                // Segmentar destinatarios según el destino del anuncio
                let query = adminClient.from('perfiles').select('correo');

                if (destino === 'admin_gym') {
                    query = query.eq('rol', 'admin');
                } else if (destino === 'alumnos') {
                    query = query.eq('rol', 'member');
                } else if (destino === 'coaches') {
                    query = query.eq('rol', 'coach');
                } else if (destino === 'todos') {
                    query = query.neq('rol', 'superadmin');
                } else {
                    query = query.eq('rol', destino as any);
                }

                const { data: users, error: usersError } = await query;
                
                if (usersError) throw usersError;

                const emailList = (users || []).map(u => u.correo).filter(Boolean);

                if (emailList.length > 0) {
                    logger.info(`📢 Despachando broadcast por email a ${emailList.length} destinatarios...`);
                    
                    await emails.newsletter(
                        emailList,
                        titulo,
                        contenido,
                        'https://vitudgym.vercel.app',
                        'Ir a la Plataforma'
                    );

                    // 3. Marcar en la base de datos que el boletín fue enviado exitosamente
                    await adminClient
                        .from('anuncios_globales')
                        .update({
                            enviado_newsletter: true,
                            fecha_envio_newsletter: new Date().toISOString()
                        })
                        .eq('id', data.id);
                }
            } catch (emailErr) {
                // Registramos el error de correo pero no rompemos la respuesta principal del anuncio guardado
                logger.error('❌ Error enviando newsletter de broadcast:', { error: emailErr });
            }
        }

        return NextResponse.json({ success: true, data });

    } catch (error: any) {
        logger.error('❌ Broadcast Error:', { error });
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
