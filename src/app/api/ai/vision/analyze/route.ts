import { NextResponse } from 'next/server';
import { aiService } from '@/services/ai.service';
import { authenticateAndRequireRole } from '@/lib/auth/api-auth';

export const maxDuration = 60; // 1 minuto para dar tiempo a Gemini Vision a decodificar hasta 10MB de Video y evitar Timeout Serverless (Código 504).

export async function POST(req: Request) {
    try {
        const { user, error } = await authenticateAndRequireRole(req, ['student', 'coach', 'admin']);
        if (error) return error;

        // Validación de Seguridad de Infraestructura: Rechazar payloads gigantes antes de parsear JSON
        const contentLength = req.headers.get('content-length');
        if (contentLength && parseInt(contentLength) > 15 * 1024 * 1024) { // 15MB limite de seguridad
            return NextResponse.json({ error: 'El video es demasiado grande para procesamiento seguro (Max payload 15MB)' }, { status: 413 });
        }

        const { filePart, mimeType, exerciseName } = await req.json();

        if (!filePart || !mimeType) {
            return NextResponse.json({ error: 'Faltan datos del video' }, { status: 400 });
        }

        console.log(`Analyzing movement for: ${exerciseName || 'Unknown exercise'}`);

        const analysis = await aiService.analyzeMovement(filePart, mimeType, exerciseName);

        return NextResponse.json({
            success: true,
            analysis
        });

    } catch (_error) {
        const err = _error as Error;
        console.error('API Vision Error:', err);
        return NextResponse.json({
            success: false,
            error: err.message || 'Error interno en el servidor'
        }, { status: 500 });
    }
}
