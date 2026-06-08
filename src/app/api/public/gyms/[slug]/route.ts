import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

/**
 * GET /api/public/gyms/[slug]
 * Retorna datos públicos de un gimnasio para su landing page.
 */
export async function GET(
    request: Request,
    { params }: { params: { slug: string } }
) {
    try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const adminClient = createAdminClient() as any;

        const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(params.slug);
        const queryField = isUUID ? 'id' : 'slug';

        const { data: gym, error } = await adminClient
            .from('gimnasios')
            .select(`
                nombre,
                slug,
                logo_url,
                color_primario,
                color_secundario,
                config_visual,
                config_landing,
                planes: planes_gimnasio(
                  id,
                  nombre,
                  descripcion,
                  precio,
                  duracion_meses,
                  beneficios
                )
            `)
            .eq(queryField, params.slug)
            .eq('planes_gimnasio.esta_activo', true)
            .single();

        if (error || !gym) {
            return NextResponse.json({ error: 'Gimnasio no encontrado' }, { status: 404 });
        }

        return NextResponse.json({ gym });
    } catch (error: unknown) {
        return NextResponse.json({ error: (error as Error).message }, { status: 500 });
    }
}
