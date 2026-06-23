import { NextResponse } from 'next/server';
import { authenticateAndRequireRole } from '@/lib/auth/api-auth';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/gyms/list
 * Devuelve todos los gimnasios y sus sucursales. Solo Superadmin.
 */
export async function GET(request: Request) {
    try {
        // Solo superadmin puede ver la lista global de gimnasios
        const { error: authError } = await authenticateAndRequireRole(request, ['superadmin']);
        if (authError) return authError;

        const { searchParams } = new URL(request.url);
        const limitStr = searchParams.get('limit');
        const offsetStr = searchParams.get('offset');
        const search = searchParams.get('search') || '';

        let limit = limitStr ? parseInt(limitStr, 10) : 50;
        let offset = offsetStr ? parseInt(offsetStr, 10) : 0;
        if (isNaN(limit) || limit < 1) limit = 50;
        if (isNaN(offset) || offset < 0) offset = 0;

        const adminClient = createAdminClient();

        let query = adminClient
            .from('gimnasios')
            .select(`
                *,
                sucursales (*)
            `, { count: 'exact' })
            .is('deleted_at', null);

        if (search.trim()) {
            query = query.or(`nombre.ilike.%${search.trim()}%,slug.ilike.%${search.trim()}%`);
        }

        const { data: gyms, error: dbError, count } = await query
            .order('creado_en', { ascending: false })
            .range(offset, offset + limit - 1);

        if (dbError) throw dbError;

        return NextResponse.json({
            gyms: gyms || [],
            total: count || 0,
            limit,
            offset
        });
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        console.error('❌ Error fetching gyms:', error);
        return NextResponse.json({ error: message }, { status: 500 });
    }
}

