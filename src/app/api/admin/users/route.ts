import { NextResponse } from 'next/server';
import { authenticateAndRequireRole } from '@/lib/auth/api-auth';

/**
 * GET /api/admin/users
 * 
 * Obtiene lista de todos los usuarios (solo admin/superadmin)
 */
export async function GET(request: Request) {
    try {
        const { supabase, error, profile } = await authenticateAndRequireRole(
            request,
            ['admin', 'superadmin']
        );

        if (error) return error;

        // Blindaje contra gimnasio_id NULL para admin locales
        if (profile?.role !== 'superadmin' && !profile?.gimnasio_id) {
            return NextResponse.json({ error: 'Forbidden: Administrador sin gimnasio asignado' }, { status: 403 });
        }

        // Obtener usuarios filtrados por gimnasio
        let query = supabase
            .from('perfiles')
            .select('*');

        if (profile?.role !== 'superadmin') {
            query = query.eq('gimnasio_id', profile.gimnasio_id);
        }

        const { data: users, error: usersError } = await query
            .order('creado_en', { ascending: false });

        if (usersError) throw usersError;

        return NextResponse.json({
            success: true,
            users
        });

    } catch (_error) {
        const err = _error as Error;
        console.error('❌ Error getting users:', err);
        return NextResponse.json({
            error: err.message || 'Error getting users'
        }, { status: 500 });
    }
}
