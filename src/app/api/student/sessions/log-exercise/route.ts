
import { NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/auth/api-auth';
import { SessionsService, ExercisePerformance } from '@/services/sessions.service';

export async function POST(req: Request) {
    const { user, error } = await authenticateRequest(req);
    if (error) return error;

    try {
        const body = await req.json();
        const { sessionId, ...performance } = body;

        if (!sessionId || !performance.ejercicio_id) {
            return NextResponse.json({ error: 'Session ID and Exercise ID are required' }, { status: 400 });
        }

        const { log, error: logError } = await SessionsService.logExercisePerformance(
            sessionId,
            performance as ExercisePerformance
        );

        if (logError) {
            return NextResponse.json({ error: logError.message }, { status: 500 });
        }

        return NextResponse.json({ log });
    } catch (_err) {
        return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }
}
