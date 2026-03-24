
import { NextResponse } from 'next/server';
import { authenticateAndRequireRole } from '@/lib/auth/api-auth';
import { SessionsService } from '@/services/sessions.service';

import { createAdminClient } from '@/lib/supabase/admin';

export async function GET(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { user, profile, error } = await authenticateAndRequireRole(req, ['coach', 'admin', 'superadmin']);
    if (error) return error;

    try {
        const { id } = await params;
        const studentId = id;
        const { searchParams } = new URL(req.url);
        const limit = parseInt(searchParams.get('limit') || '5');

        const supabaseAdmin = createAdminClient();
        const { sessions, error: sessionsError } = await SessionsService.getUserSessionHistory(studentId, limit, supabaseAdmin);

        if (sessionsError) {
            return NextResponse.json({ error: sessionsError.message }, { status: 500 });
        }

        return NextResponse.json({ sessions });
    } catch (_err) {
        return NextResponse.json({ error: 'Failed to fetch student sessions' }, { status: 500 });
    }
}
