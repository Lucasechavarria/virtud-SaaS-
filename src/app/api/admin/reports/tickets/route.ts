import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { authenticateAndRequireRole } from '@/lib/auth/api-auth';
import { ROLES } from '@/lib/constants/app';

// GET /api/admin/reports/tickets - List all tickets
export async function GET(req: Request) {
    try {
        const { error: authError } = await authenticateAndRequireRole(req, [ROLES.ADMIN]);
        if (authError) return authError;

        const supabase = await createClient();

        const { data, error } = await supabase
            .from('reportes_de_alumnos')
            .select(`
                *,
                perfiles:user_id (
                    full_name,
                    email
                )
            `)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Database Error:', error);
            throw error;
        }

        return NextResponse.json(data);

    } catch (error) {
        console.error('Tickets API Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

// PATCH /api/admin/reports/tickets - Update ticket status/response
export async function PATCH(req: Request) {
    try {
        const { error: authError } = await authenticateAndRequireRole(req, [ROLES.ADMIN]);
        if (authError) return authError;

        const body = await req.json();
        const { id, estado, admin_response } = body;

        if (!id || !estado) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const supabase = await createClient();

        const { data, error } = await supabase
            .from('reportes_de_alumnos')
            .update({
                estado,
                admin_response,
                actualizado_en: new Date().toISOString()
            })
            .eq('id', id)
            .select()
            .single();

        if (error) {
            console.error('Update Error:', error);
            throw error;
        }

        return NextResponse.json({ success: true, ticket: data });

    } catch (error) {
        console.error('Tickets API Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
