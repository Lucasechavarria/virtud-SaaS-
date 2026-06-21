import { NextResponse } from 'next/server';
import { authenticateAndRequireRole } from '@/lib/auth/api-auth';
import { createAdminClient } from '@/lib/supabase/admin';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

async function resolveGymId(rawGymId: string | null): Promise<string | null> {
    if (!rawGymId) return null;
    if (UUID_REGEX.test(rawGymId)) return rawGymId;
    // Es un slug: resolver a UUID
    const adminClient = createAdminClient();
    const { data: gym } = await adminClient
        .from('gimnasios')
        .select('id')
        .eq('slug', rawGymId)
        .single();
    return gym?.id || null;
}

export async function GET(request: Request) {
    const { supabase, error, profile } = await authenticateAndRequireRole(request, ['superadmin', 'admin', 'recepcion']);
    if (error) return error;

    const { searchParams } = new URL(request.url);
    let gymId = searchParams.get('gymId');
    const status = searchParams.get('status');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const limit = parseInt(searchParams.get('limit') || '100');

    // Control de Aislamiento Multi-tenant
    if (profile?.role !== 'superadmin') {
        gymId = profile?.gimnasio_id || 'unauthorized';
    } else if (gymId) {
        // Superadmin: resolver slug a UUID si es necesario
        gymId = await resolveGymId(gymId);
    }

    try {
        let query = supabase!
            .from('pagos')
            .select(`
                *,
                usuario:usuario_id (nombre_completo, correo, gimnasio_id),
                gimnasio:gimnasio_id (nombre)
            `)
            .order('creado_en', { ascending: false })
            .range(0, limit - 1);

        if (gymId) query = query.eq('gimnasio_id', gymId);
        if (status) query = query.eq('estado', status);
        if (startDate) query = query.gte('creado_en', startDate);
        if (endDate) query = query.lte('creado_en', endDate);

        const { data: payments, error: payError } = await query;
        if (payError) throw payError;

        // También obtener pagos de subscripción (SaaS) si queremos ver todo, filtrando por gimnasio si es admin local
        let saasQuery = supabase!
            .from('saas_pagos_historial')
            .select('*, gimnasio:gimnasio_id(nombre)')
            .order('fecha_pago', { ascending: false })
            .limit(50);

        if (gymId) {
            saasQuery = saasQuery.eq('gimnasio_id', gymId);
        }

        const { data: saasPayments, error: saasError } = await saasQuery;

        if (saasError) console.error('Error fetching SaaS payments:', saasError);

        return NextResponse.json({
            memberPayments: payments || [],
            saasPayments: saasPayments || []
        });

    } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        console.error('Finance API Error:', err);
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
