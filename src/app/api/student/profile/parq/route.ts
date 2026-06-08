import { NextResponse } from 'next/server';
import { authenticateAndRequireRole } from '@/lib/auth/api-auth';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
    try {
        const { user, error } = await authenticateAndRequireRole(
            request,
            ['member', 'admin', 'coach', 'recepcion']
        );

        if (error) return error;

        const adminClient = createAdminClient();

        // Actualizar el apto médico en el perfil del usuario autenticado
        const { error: updateError } = await adminClient
            .from('perfiles')
            .update({
                parq_firmado: true,
                fecha_firma_parq: new Date().toISOString()
            })
            .eq('id', user.id);

        if (updateError) throw updateError;

        return NextResponse.json({
            success: true,
            message: 'Apto médico PAR-Q firmado correctamente'
        });

    } catch (error: any) {
        console.error('❌ Error signing PAR-Q:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
