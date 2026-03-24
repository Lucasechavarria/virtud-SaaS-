
import { NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/auth/api-auth';
import { SessionsService } from '@/services/sessions.service';

export async function POST(req: Request) {
    const { user, error } = await authenticateRequest(req);
    if (error) return error;

    try {
        const { routineId } = await req.json();

        if (!routineId) {
            return NextResponse.json({ error: 'Routine ID is required' }, { status: 400 });
        }

        const { session, error: sessionError } = await SessionsService.startSession(user.id, routineId);

        if (sessionError) {
            return NextResponse.json({ error: sessionError.message }, { status: 500 });
        }

        return NextResponse.json({ session });
    } catch (_err) {
        return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }
}
