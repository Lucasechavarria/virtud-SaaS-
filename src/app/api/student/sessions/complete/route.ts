
import { NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/auth/api-auth';
import { SessionsService } from '@/services/sessions.service';

export async function POST(req: Request) {
    const { user, error } = await authenticateRequest(req);
    if (error) return error;

    try {
        const { sessionId, totalPoints, moodRating, notes } = await req.json();

        if (!sessionId) {
            return NextResponse.json({ error: 'Session ID is required' }, { status: 400 });
        }

        const { session, error: sessionError } = await SessionsService.completeSession(
            sessionId,
            totalPoints || 0,
            moodRating,
            notes
        );

        if (sessionError) {
            return NextResponse.json({ error: sessionError.message }, { status: 500 });
        }

        return NextResponse.json({ session });
    } catch (_err) {
        return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }
}
