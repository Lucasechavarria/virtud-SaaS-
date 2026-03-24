import { createClient } from '@/lib/supabase/server';

interface RoutineAccessLog {
    id?: string;
    rutina_id: string;
    usuario_id: string;
    action: string;
    ip_address?: string;
    user_agent?: string;
    info_dispositivo?: Record<string, unknown>;
    creado_en?: string;
}

type RoutineAccessLogInsert = Omit<RoutineAccessLog, 'id' | 'creado_en'>;

/**
 * Service for logging and monitoring routine access (security)
 */
export const routineAccessLogsService = {
    /**
     * Log a routine access event
     */
    async logAccess(log: RoutineAccessLogInsert) {
        const supabase = await createClient();
        const { data, error } = await supabase
            .from('registros_acceso_rutina')
            .insert(log)
            .select()
            .single();

        if (error) throw error;
        return data as unknown as RoutineAccessLog;
    },

    /**
     * Log a view event
     */
    async logView(routineId: string, userId: string, metadata?: {
        ip_address?: string;
        user_agent?: string;
        device_info?: Record<string, unknown>;
    }) {
        return this.logAccess({
            rutina_id: routineId,
            usuario_id: userId,
            action: 'view',
            ...metadata,
        });
    },

    /**
     * Log a screenshot attempt
     */
    async logScreenshotAttempt(routineId: string, userId: string, metadata?: {
        ip_address?: string;
        user_agent?: string;
        device_info?: Record<string, unknown>;
    }) {
        return this.logAccess({
            rutina_id: routineId,
            usuario_id: userId,
            action: 'screenshot_attempt',
            ...metadata,
        });
    },

    /**
     * Log a download attempt
     */
    async logDownloadAttempt(routineId: string, userId: string, metadata?: {
        ip_address?: string;
        user_agent?: string;
    }) {
        return this.logAccess({
            rutina_id: routineId,
            usuario_id: userId,
            action: 'download_attempt',
            ...metadata,
        });
    },

    /**
     * Log a share attempt
     */
    async logShareAttempt(routineId: string, userId: string, metadata?: {
        ip_address?: string;
        user_agent?: string;
    }) {
        return this.logAccess({
            rutina_id: routineId,
            usuario_id: userId,
            action: 'share_attempt',
            ...metadata,
        });
    },

    /**
     * Log DevTools detection
     */
    async logDevToolsDetected(routineId: string, userId: string) {
        return this.logAccess({
            rutina_id: routineId,
            usuario_id: userId,
            action: 'devtools_detected',
        });
    },

    /**
     * Log view interruption (tab change)
     */
    async logViewInterrupted(routineId: string, userId: string) {
        return this.logAccess({
            rutina_id: routineId,
            usuario_id: userId,
            action: 'view_interrupted',
        });
    },

    /**
     * Get logs for a routine
     */
    async getRoutineLogs(routineId: string, filters?: {
        action?: string;
        userId?: string;
        startDate?: Date;
        endDate?: Date;
    }) {
        const supabase = await createClient();
        let query: any = (supabase as any)
            .from('registros_acceso_rutina')
            .select(`
                *,
                user:perfiles!usuario_id(id, nombre_completo, email)
            `)
            .eq('rutina_id', routineId)
            .order('creado_en', { ascending: false });

        if (filters?.action) {
            query = query.eq('action', filters.action);
        }

        if (filters?.userId) {
            query = query.eq('usuario_id', filters.userId);
        }

        if (filters?.startDate) {
            query = query.gte('creado_en', filters.startDate.toISOString());
        }

        if (filters?.endDate) {
            query = query.lte('creado_en', filters.endDate.toISOString());
        }

        const { data, error } = await query;

        if (error) throw error;
        return data;
    },

    /**
     * Get logs for a user
     */
    async getUserLogs(userId: string, filters?: {
        action?: string;
        startDate?: Date;
        endDate?: Date;
    }) {
        const supabase = await createClient();
        let query: any = (supabase as any)
            .from('registros_acceso_rutina')
            .select(`
                *,
                routine:rutinas!rutina_id(id, nombre)
            `)
            .eq('usuario_id', userId)
            .order('creado_en', { ascending: false });

        if (filters?.action) {
            query = query.eq('action', filters.action);
        }

        if (filters?.startDate) {
            query = query.gte('creado_en', filters.startDate.toISOString());
        }

        if (filters?.endDate) {
            query = query.lte('creado_en', filters.endDate.toISOString());
        }

        const { data, error } = await query;

        if (error) throw error;
        return data;
    },

    /**
     * Get security alerts (screenshot/download/share attempts)
     */
    async getSecurityAlerts(filters?: {
        routineId?: string;
        userId?: string;
        startDate?: Date;
        endDate?: Date;
    }) {
        const supabase = await createClient();
        let query: any = (supabase as any)
            .from('registros_acceso_rutina')
            .select(`
                *,
                user:perfiles!usuario_id(id, nombre_completo, email),
                routine:rutinas!rutina_id(id, nombre)
            `)
            .in('action', ['screenshot_attempt', 'download_attempt', 'share_attempt', 'devtools_detected'])
            .order('creado_en', { ascending: false });

        if (filters?.routineId) {
            query = query.eq('rutina_id', filters.routineId);
        }

        if (filters?.userId) {
            query = query.eq('usuario_id', filters.userId);
        }

        if (filters?.startDate) {
            query = query.gte('creado_en', filters.startDate.toISOString());
        }

        if (filters?.endDate) {
            query = query.lte('creado_en', filters.endDate.toISOString());
        }

        const { data, error } = await query;

        if (error) throw error;
        return data;
    },

    /**
     * Get access statistics for a routine
     */
    async getRoutineStats(routineId: string) {
        const supabase = await createClient();
        const { data, error } = await (supabase as any)
            .from('registros_acceso_rutina')
            .select('action, usuario_id')
            .eq('rutina_id', routineId);

        if (error) throw error;

        const stats = {
            totalAccesses: data.length,
            uniqueUsers: new Set(data.map((log: any) => log.usuario_id)).size,
            views: data.filter((log: any) => log.action === 'view').length,
            securityAlerts: data.filter((log: any) =>
                ['screenshot_attempt', 'download_attempt', 'share_attempt', 'devtools_detected'].includes(log.action)
            ).length,
            byAction: {} as Record<string, number>,
        };

        data.forEach(log => {
            stats.byAction[log.action] = (stats.byAction[log.action] || 0) + 1;
        });

        return stats;
    },

    /**
     * Get recent security alerts (last 24 hours)
     */
    async getRecentSecurityAlerts() {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);

        return this.getSecurityAlerts({
            startDate: yesterday,
        });
    },
};
