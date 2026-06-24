import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * GET /api/saas/context
 * Obtiene los gimnasios y sucursales disponibles para el usuario actual.
 */
export async function GET() {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { data: profile } = await supabase
            .from('perfiles')
            .select('rol, gimnasio_id, sucursal_id')
            .eq('id', user.id)
            .single();

        if (!profile) {
            return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
        }

        let gyms = [];

        if (profile.rol === 'superadmin') {
            // Superadmin ve todo
            const { data: allGyms } = await supabase
                .from('gimnasios')
                .select('*, sucursales(*)')
                .is('deleted_at', null);
            gyms = allGyms || [];
        } else {
            // Otros ven solo su gimnasio y sus sucursales
            if (profile.gimnasio_id) {
                const { data: myGym } = await supabase
                    .from('gimnasios')
                    .select('*, sucursales(*)')
                    .eq('id', profile.gimnasio_id)
                    .is('deleted_at', null)
                    .single();
                gyms = myGym ? [myGym] : [];
            }
        }

        return NextResponse.json({
            gyms,
            current: {
                gymId: profile.gimnasio_id,
                branchId: profile.sucursal_id
            }
        });

    } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        console.error('SaaS Context Error:', error);
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
