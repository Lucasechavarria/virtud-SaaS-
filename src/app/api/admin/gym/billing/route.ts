import { NextResponse } from 'next/server';
import { authenticateAndRequireRole } from '@/lib/auth/api-auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { calculateGymMonthlyBill } from '@/lib/saas/billing-calculator';
import { logger } from '@/lib/logger';

export async function GET(request: Request) {
    try {
        // 1. Autenticar y requerir rol de 'admin' o 'superadmin'
        const { error: authError, user } = await authenticateAndRequireRole(request, ['admin', 'superadmin']);
        if (authError || !user) return authError || NextResponse.json({ error: 'No autorizado' }, { status: 401 });

        const adminClient = createAdminClient();

        // 2. Obtener el gimnasio asociado a este perfil de usuario
        const { data: profile, error: profileError } = await adminClient
            .from('perfiles')
            .select('gimnasio_id')
            .eq('id', user.id)
            .single();

        if (profileError || !profile?.gimnasio_id) {
            return NextResponse.json({ error: 'El usuario no pertenece a ningún gimnasio activo.' }, { status: 400 });
        }

        const gymId = profile.gimnasio_id;

        // 3. Calcular la factura mensual en tiempo real
        const bill = await calculateGymMonthlyBill(gymId);

        return NextResponse.json({
            success: true,
            bill
        });

    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        logger.error('Gym Billing Info Error:', { error: message });
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
