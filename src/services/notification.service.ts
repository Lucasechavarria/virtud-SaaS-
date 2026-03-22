import { createClient } from '@/lib/supabase/server';
import webpush from 'web-push';
import { Database } from '../types/supabase';
import { logger } from '@/lib/logger';

interface NotificationPayload {
    tipo: 'pago' | 'clase' | 'logro' | 'mensaje' | 'rutina' | 'sistema';
    titulo: string;
    cuerpo: string;
    datos?: Record<string, unknown>;
}

interface SendResult {
    sent?: boolean;
    skipped?: boolean;
    reason?: string;
    results?: PromiseSettledResult<webpush.SendResult>[];
}

export class NotificationService {
    private supabase: Awaited<ReturnType<typeof createClient>>;

    constructor(supabase: Awaited<ReturnType<typeof createClient>>) {
        this.supabase = supabase;
    }

    static async create() {
        const supabase = await createClient();
        return new NotificationService(supabase);
    }

    /**
     * Envía una notificación push a un usuario específico
     * Respeta las preferencias del usuario y registra en historial
     */
    async sendToUser(userId: string, notification: NotificationPayload): Promise<SendResult> {
        try {
            // 1. Verificar preferencias del usuario
            const { data: prefs } = await this.supabase
                .from('notificaciones_preferencias')
                .select('*')
                .eq('usuario_id', userId)
                .single();

            if (!this.shouldSend(notification.tipo, prefs)) {
                logger.info(`[NotificationService] Notificación omitida por preferencias del usuario: ${userId}`);
                return { skipped: true, reason: 'user_preferences' };
            }

            // 2. Obtener suscripciones activas del usuario
            const { data: subscriptions } = await this.supabase
                .from('push_subscriptions')
                .select('*')
                .eq('usuario_id', userId);

            if (!subscriptions || subscriptions.length === 0) {
                logger.info(`[NotificationService] Usuario sin suscripciones: ${userId}`);
                return { skipped: true, reason: 'no_subscriptions' };
            }

            // 3. Preparar payload de notificación
            const payload = JSON.stringify({
                title: notification.titulo,
                body: notification.cuerpo,
                icon: '/icon-192x192.png',
                badge: '/badge-72x72.png',
                data: notification.datos,
            });

            // 4. Enviar a todas las suscripciones del usuario
            const results = await Promise.allSettled(
                subscriptions.map(sub =>
                    webpush.sendNotification(
                        {
                            endpoint: sub.endpoint,
                            keys: {
                                p256dh: sub.p256dh,
                                auth: sub.auth,
                            },
                        },
                        payload
                    )
                )
            );

            // 5. Verificar si al menos una notificación se envió exitosamente
            const successCount = results.filter(r => r.status === 'fulfilled').length;
            const enviada = successCount > 0;

            // 6. Registrar en historial
            await this.supabase.from('historial_notificaciones').insert({
                usuario_id: userId,
                tipo: notification.tipo,
                titulo: notification.titulo,
                cuerpo: notification.cuerpo,
                datos: notification.datos,
                enviada,
                enviada_en: enviada ? new Date().toISOString() : null,
                error: enviada ? null : 'No se pudo enviar a ninguna suscripción',
            });

            logger.info(`[NotificationService] Notificación enviada a ${successCount}/${subscriptions.length} suscripciones`);

            return { sent: true, results };
        } catch (error) {
            logger.error('[NotificationService] Error al enviar notificación:', { error: error instanceof Error ? error.message : error });

            // Registrar error en historial
            await this.supabase.from('historial_notificaciones').insert({
                usuario_id: userId,
                tipo: notification.tipo,
                titulo: notification.titulo,
                cuerpo: notification.cuerpo,
                datos: notification.datos,
                enviada: false,
                error: error instanceof Error ? error.message : 'Error desconocido',
            });

            throw error;
        }
    }

    /**
     * Procesa la cola de notificaciones pendientes
     * Debe ejecutarse periódicamente (ej: cada minuto)
     */
    async processPendingNotifications(): Promise<void> {
        const { data: pending } = await this.supabase
            .from('historial_notificaciones')
            .select('*')
            .eq('enviada', false)
            .is('error', null)
            .limit(50);

        if (!pending || pending.length === 0) {
            return;
        }

        logger.info(`[NotificationService] Procesando ${pending.length} notificaciones pendientes`);

        for (const notif of pending) {
            try {
                await this.sendToUser(notif.usuario_id, {
                    tipo: notif.tipo,
                    titulo: notif.titulo,
                    cuerpo: notif.cuerpo,
                    datos: notif.datos,
                });

                // Marcar como enviada
                await this.supabase
                    .from('historial_notificaciones')
                    .update({ enviada: true, enviada_en: new Date().toISOString() })
                    .eq('id', notif.id);
            } catch (error) {
                logger.error(`[NotificationService] Error procesando notificación ${notif.id}:`, { error: error instanceof Error ? error.message : error });

                // Registrar error
                await this.supabase
                    .from('historial_notificaciones')
                    .update({ error: error instanceof Error ? error.message : 'Error desconocido' })
                    .eq('id', notif.id);
            }
        }
    }

    /**
     * Determina si se debe enviar una notificación según las preferencias del usuario
     */
    private shouldSend(tipo: string, prefs: Database['public']['Tables']['notificaciones_preferencias']['Row'] | null): boolean {
        if (!prefs) return true; // Default: enviar todo si no hay preferencias configuradas

        const prefMap: Record<string, string> = {
            pago: 'pagos_confirmacion',
            clase: 'clases_recordatorio',
            logro: 'logros_nuevos',
            mensaje: 'mensajes_nuevos',
            rutina: 'rutinas_nuevas',
            sistema: 'sistema', // Siempre enviar notificaciones del sistema
        };

        const prefKey = prefMap[tipo] as keyof Database['public']['Tables']['notificaciones_preferencias']['Row'];

        // Notificaciones del sistema siempre se envían
        if (tipo === 'sistema') return true;

        // Si no hay preferencia específica, enviar por defecto
        if (!prefKey || prefs[prefKey] === undefined) return true;

        return prefs[prefKey] === true;
    }

    /**
     * Envía una notificación a múltiples usuarios
     */
    async sendToMultipleUsers(userIds: string[], notification: NotificationPayload): Promise<SendResult[]> {
        return Promise.all(
            userIds.map(userId => this.sendToUser(userId, notification))
        );
    }
}
