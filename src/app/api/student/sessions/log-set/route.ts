import { NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/auth/api-auth';
import { SessionsService } from '@/services/sessions.service';

export async function POST(req: Request) {
    // 1. Validar autenticación de Supabase
    const { user, error: authError } = await authenticateRequest(req);
    if (authError) return authError;

    try {
        const body = await req.json();
        const { sessionId, exerciseId, sets } = body;

        // 2. Validaciones básicas de esquema
        if (!sessionId || !exerciseId || !Array.isArray(sets)) {
            return NextResponse.json({
                error: 'Missing required fields',
                message: 'sessionId, exerciseId, and sets (array) are required.'
            }, { status: 400 });
        }

        // 3. Procesar las series para la persistencia consolidada en registros_de_ejercicio
        const seriesReales = sets.length;
        
        // Unir las repeticiones por coma para guardar la secuencia
        const repeticionesReales = sets.map(s => s.reps_realizadas).join(',');
        
        // Obtener el peso máximo utilizado en este ejercicio durante la sesión
        const pesoReal = sets.length > 0 ? Math.max(...sets.map(s => Number(s.peso_kg || 0))) : 0;

        // 4. Invocar el servicio de sesiones
        const { log, error: logError } = await SessionsService.logExercisePerformance(
            sessionId,
            {
                ejercicio_id: exerciseId,
                series_reales: seriesReales,
                repeticiones_reales: repeticionesReales,
                peso_real: pesoReal,
                fue_completado: seriesReales > 0
            }
        );

        if (logError) {
            console.error('❌ [log-set API] Error in SessionsService:', logError);
            return NextResponse.json({
                error: 'Database insert failed',
                message: logError.message
            }, { status: 500 });
        }

        return NextResponse.json({
            success: true,
            log
        });

    } catch (err) {
        console.error('❌ [log-set API] Unexpected error parsing body:', err);
        return NextResponse.json({
            error: 'Invalid request body',
            message: err instanceof Error ? err.message : 'Unknown parsing error'
        }, { status: 400 });
    }
}
