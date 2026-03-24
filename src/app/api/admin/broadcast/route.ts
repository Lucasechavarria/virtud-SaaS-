import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { authenticateAndRequireRole } from '@/lib/auth/api-auth';
import { createAdminClient } from '@/lib/supabase/admin';

export async function POST(request: Request) {
    try {
        const { error: authError, user: adminUser } = await authenticateAndRequireRole(request, ['superadmin']);
        if (authError || !adminUser) return authError || NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { titulo, contenido, tipo, destino } = await request.json();

        if (!titulo || !contenido) {
            return NextResponse.json({ error: 'Título y contenido son obligatorios' }, { status: 400 });
        }

        const adminClient = createAdminClient();

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

        // Aquí se podría integrar con un servicio de Push Notifications o Email si fuera necesario

        return NextResponse.json({ success: true, data });

    } catch (error: any) {
        console.error('❌ Broadcast Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
