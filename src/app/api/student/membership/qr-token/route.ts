import { NextResponse } from 'next/server';
import { authenticateAndRequireRole } from '@/lib/auth/api-auth';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
    try {
        const { user, profile, error } = await authenticateAndRequireRole(
            request,
            ['member', 'admin', 'coach', 'recepcion']
        );

        if (error) return error;

        if (!profile?.gimnasio_id) {
            return NextResponse.json({ error: 'Gimnasio no asociado al perfil' }, { status: 400 });
        }

        // Generar un token único y dinámico
        const tokenDinamico = `VIRTUD-${Date.now().toString(36)}-${Math.random().toString(36).substring(7)}`.toUpperCase();

        const adminClient = createAdminClient();

        // Expira en 30 segundos
        const expiraEn = new Date(Date.now() + 30 * 1000).toISOString();

        // Guardar token en base de datos
        const { data: insertedToken, error: insertError } = await adminClient
            .from('accesos_qr')
            .insert({
                alumno_id: user.id,
                gimnasio_id: profile.gimnasio_id,
                token_dinamico: tokenDinamico,
                expira_en: expiraEn,
                usado: false
            })
            .select()
            .single();

        if (insertError) throw insertError;

        return NextResponse.json({
            success: true,
            token: tokenDinamico,
            expira_en: expiraEn
        });

    } catch (error: any) {
        console.error('❌ Error generating QR token:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
