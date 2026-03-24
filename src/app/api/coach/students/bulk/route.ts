import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { NotificationService } from '@/services/notification.service';
import { Database } from '@/types/supabase';
import { SupabaseClient } from '@supabase/supabase-js';

type AssignmentRecord = { usuario_id: string };

/**
 * POST /api/coach/students/bulk
 * Realiza acciones en lote sobre múltiples alumnos
 */
export async function POST(req: NextRequest) {
    try {
        const supabase = await createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
        }

        const body = await req.json();
        const { action, studentIds, ...params } = body;

        if (!action || !studentIds || !Array.isArray(studentIds)) {
            return NextResponse.json({ error: 'Parámetros inválidos' }, { status: 400 });
        }

        // Validar que el coach tiene acceso a estos alumnos
        const assignmentsResponse = await (supabase.from('relacion_alumno_coach') as any)
            .select('usuario_id')
            .eq('entrenador_id', user.id)
            .in('usuario_id', studentIds)
            .eq('esta_activo', true) as { data: AssignmentRecord[] | null; error: any };

        const { data: assignments, error: coachError } = assignmentsResponse;
        const validStudentIds = assignments?.map((r: AssignmentRecord) => r.usuario_id) || [];

        if (validStudentIds.length === 0) {
            return NextResponse.json({ error: 'Sin permisos para estos alumnos' }, { status: 403 });
        }

        let result;

        switch (action) {
            case 'send_notification':
                result = await sendBulkNotification(validStudentIds, params.title, params.message);
                break;

            case 'export_data':
                result = await exportStudentsData(supabase as unknown as SupabaseClient<Database>, validStudentIds);
                break;

            case 'assign_routine':
                result = await assignRoutineToMultiple(supabase as unknown as SupabaseClient<Database>, validStudentIds, params.routineId);
                break;

            default:
                return NextResponse.json({ error: 'Acción no válida' }, { status: 400 });
        }

        return NextResponse.json(result);
    } catch (_error) {
        console.error('[API] Error en acción masiva:', _error);
        return NextResponse.json(
            { error: 'Error interno del servidor' },
            { status: 500 }
        );
    }
}

async function sendBulkNotification(studentIds: string[], title: string, message: string) {
    if (!title || !message) {
        throw new Error('Título y mensaje son requeridos');
    }

    const notificationService = await NotificationService.create();

    const results = await notificationService.sendToMultipleUsers(
        studentIds,
        {
            tipo: 'sistema',
            titulo: title,
            cuerpo: message,
        }
    );

    const successCount = results.filter(r => r.sent).length;

    return {
        success: true,
        sent: successCount,
        total: studentIds.length,
        message: `Notificación enviada a ${successCount} de ${studentIds.length} alumnos`,
    };
}

async function exportStudentsData(supabase: SupabaseClient<Database>, studentIds: string[]) {
    const { data: students } = await supabase
        .from('perfiles')
        .select('id, nombre_completo, email, telefono, fecha_nacimiento')
        .in('id', studentIds);

    return {
        success: true,
        exported: students?.length || 0,
        data: students || [],
    };
}

async function assignRoutineToMultiple(supabase: SupabaseClient<Database>, studentIds: string[], routineId: string) {
    if (!routineId) {
        throw new Error('ID de rutina es requerido');
    }

    // Verificar que la rutina existe
    const { data: routine } = await supabase
        .from('rutinas')
        .select('id')
        .eq('id', routineId)
        .single();

    if (!routine) {
        throw new Error('Rutina no encontrada');
    }

    // Asignar rutina a cada alumno
    const assignments = studentIds.map(studentId => ({
        usuario_id: studentId,
        rutina_id: routineId,
        fecha_asignacion: new Date().toISOString(),
        esta_activa: true,
    }));

    const { data, error } = await (supabase as any)
        .from('rutinas_asignadas')
        .upsert(assignments);

    if (error) {
        throw error;
    }

    return {
        success: true,
        assigned: studentIds.length,
        message: `Rutina asignada a ${studentIds.length} alumnos`,
    };
}
