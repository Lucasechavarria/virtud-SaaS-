import { NextResponse } from 'next/server';
import { authenticateAndRequireRole } from '@/lib/auth/api-auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { calculateGymMonthlyBill } from '@/lib/saas/billing-calculator';
import { logger } from '@/lib/logger';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function GET(request: Request) {
    try {
        // 1. Autenticar y requerir rol de 'admin' o 'superadmin'
        const { error: authError, user } = await authenticateAndRequireRole(request, ['admin', 'superadmin']);
        if (authError || !user) return authError || NextResponse.json({ error: 'No autorizado' }, { status: 401 });

        const adminClient = createAdminClient();

        // 2. Obtener el gimnasio asociado a este perfil de usuario y su rol
        const { data: profile, error: profileError } = await adminClient
            .from('perfiles')
            .select('rol, gimnasio_id')
            .eq('id', user.id)
            .single();

        if (profileError || !profile) {
            return NextResponse.json({ error: 'Perfil no encontrado.' }, { status: 404 });
        }

        const { searchParams } = new URL(request.url);
        const urlGym = searchParams.get('gymId');
        let targetGymId = profile.gimnasio_id;

        if (profile.rol === 'superadmin' && urlGym) {
            if (UUID_REGEX.test(urlGym)) {
                targetGymId = urlGym;
            } else {
                // Resolver slug a UUID
                const { data: gym } = await adminClient
                    .from('gimnasios')
                    .select('id')
                    .eq('slug', urlGym)
                    .single();
                if (gym) targetGymId = gym.id;
            }
        }

        if (!targetGymId) {
            return NextResponse.json({ error: 'Usuario sin gimnasio asignado.' }, { status: 400 });
        }


        // 3. Calcular la factura mensual en tiempo real
        const bill = await calculateGymMonthlyBill(targetGymId);

        // Obtener configuracion completa para el historial de transacciones de Wallet
        const { data: gym } = await adminClient
            .from('gimnasios')
            .select('configuracion')
            .eq('id', targetGymId)
            .single();

        return NextResponse.json({
            success: true,
            bill: {
                ...bill,
                configuracion: gym?.configuracion || {}
            }
        });

    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        logger.error('Gym Billing Info Error:', { error: message });
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
