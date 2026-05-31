import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';
import { NotificationService } from '@/services/notification.service';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
    try {
        const supabase = await createClient();
        const { studentId, reportData } = await req.json();

        if (!studentId || !reportData) {
            return NextResponse.json({ error: 'Faltan datos' }, { status: 400 });
        }

        const { riesgo_lesion, puntaje_adherencia_estimado, alertas_criticas } = reportData;

        // 1. Determinar si es necesario notificar
        const lowAdherence = puntaje_adherencia_estimado < 70;
        const highRisk = ['alto', 'critico'].includes(riesgo_lesion?.nivel);
        const hasCriticalAlerts = alertas_criticas && alertas_criticas.length > 0;

        if (!lowAdherence && !highRisk && !hasCriticalAlerts) {
            return NextResponse.json({ success: true, message: 'No se requiere notificación proactiva' });
        }

        // 2. Obtener los coaches primarios del alumno
        const { data: assignments, error: coachError } = await (supabase
            .from('relacion_alumno_coach')
            .select('entrenador_id, perfiles:entrenador_id(nombre_completo)')
            .eq('usuario_id', studentId)
            .eq('es_principal', true)
            .eq('esta_activo', true) as any);

        if (coachError || !assignments || assignments.length === 0) {
            logger.info('Sin coach primario para notificación proactiva', { studentId });
            return NextResponse.json({ success: true, message: 'No se requiere notificación (sin coach asignado)' });
        }

        const studentProfile = await supabase.from('perfiles').select('nombre_completo').eq('id', studentId).single();
        const studentName = studentProfile.data?.nombre_completo || 'Un alumno';

        const notifService = new NotificationService(supabase);

        const notificationPromises = assignments.map(async (rel: any) => {
            let title = '⚠️ Alerta de Rendimiento';
            let message = '';

            if (highRisk) {
                title = '🚨 ALERTA: Riesgo de Lesión';
                message = `${studentName} tiene un nivel de riesgo ${riesgo_lesion?.nivel?.toUpperCase() || 'ALTO'}.`;
            } else if (hasCriticalAlerts) {
                title = '⚠️ Alerta Crítica IA';
                message = `${studentName}: ${alertas_criticas[0]}`;
            } else if (lowAdherence) {
                title = '📉 Baja Adherencia Detectada';
                message = `${studentName} ha caído por debajo del 70% de adherencia técnica/nutricional.`;
            }

            // Llamar directamente al servicio de notificaciones sin HTTP Fetch local redundante
            return notifService.sendToUser(rel.entrenador_id, {
                tipo: 'sistema',
                titulo: title,
                cuerpo: message,
                datos: { url: `/coach/students/${studentId}/bio-logs` }
            });
        });

        await Promise.all(notificationPromises);

        return NextResponse.json({ success: true, message: 'Notificaciones proactivas enviadas' });
    } catch (error: any) {
        logger.error('Error en notificación proactiva', { error: error.message });
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
