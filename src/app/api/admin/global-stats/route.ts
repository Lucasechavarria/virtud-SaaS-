import { NextResponse } from 'next/server';
import { authenticateAndRequireRole } from '@/lib/auth/api-auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

// ==========================================
// DEFINICIONES DE INTERFACES (TypeScript Fuerte)
// ==========================================

interface MonthlyRevenueRecord {
    monto: number;
}

interface GymPlanRecord {
    plan_id: string;
    planes_suscripcion: {
        nombre: string;
        precio_mensual: number;
    } | null;
}

interface AuditRecord {
    id: string;
    accion: string;
    entidad_tipo: string;
    creado_en: string;
    perfiles: {
        nombre_completo: string | null;
        gimnasio: {
            nombre: string;
        } | null;
    } | null;
}

interface TicketRecord {
    id: string;
    asunto: string;
    prioridad: 'critica' | 'alta' | 'media' | 'baja';
    gimnasios: {
        nombre: string;
    } | null;
}

interface GymIssueRecord {
    nombre: string;
    estado_pago_saas: string;
}

interface ChurnRecord {
    fecha: string;
    churn_gyms_mes: number | null;
    mrr: number | null;
}

interface GymHealthRecord {
    id: string;
    nombre: string;
    scoring_salud: number | null;
    fase_onboarding: string | null;
    modulos_activos: unknown;
}

interface GlobalAnnouncement {
    id: string;
    titulo: string;
    contenido: string;
    activo: boolean;
    creado_en: string;
}

// ==========================================
// ENDPOINT PRINCIPAL (GET Request)
// ==========================================

export async function GET(request: Request) {
    try {
        // 1. Fase Síncrona Obligada: Autenticación y Verificación de Rol
        const { error: authError } = await authenticateAndRequireRole(request, ['superadmin']);
        if (authError) return authError;

        const adminClient = createAdminClient();

        // 2. Definir límites temporales de forma estática
        const today = new Date();
        const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        const startOfMonthISO = startOfMonth.toISOString();

        // 3. PARALELIZACIÓN CONCURRENTE MASIVA (12 Consultas en un único Promise.all - Latencia Mínima)
        const [
            totalGymsResult,
            totalUsersResult,
            totalBranchesResult,
            activeGymsResult,
            mrrResult,
            revenueResult,
            gymsByPlanResult,
            auditResult,
            criticalTicketsResult,
            gymsWithIssuesResult,
            churnResult,
            gymsHealthResult,
            announcementsResult
        ] = await Promise.all([
            // Conteos Generales
            adminClient.from('gimnasios').select('*', { count: 'exact', head: true }),
            adminClient.from('perfiles').select('*', { count: 'exact', head: true }),
            adminClient.from('sucursales').select('*', { count: 'exact', head: true }),
            adminClient.from('gimnasios').select('*', { count: 'exact', head: true }).eq('es_activo', true),

            // MRR actual de la vista calculada
            adminClient.from('saas_mrr_actual' as any).select('*').maybeSingle(),

            // Pagos aprobados de este mes
            adminClient.from('pagos')
                .select('monto')
                .eq('estado', 'aprobado')
                .gte('creado_en', startOfMonthISO),

            // Distribución de planes de gimnasios activos
            adminClient.from('gimnasios')
                .select('plan_id, planes_suscripcion!plan_id(nombre, precio_mensual)')
                .eq('es_activo', true)
                .limit(100),

            // Auditoría Global (Paso 2 Original)
            adminClient.from('auditoria_global' as any)
                .select('id, accion, entidad_tipo, creado_en, perfiles:usuario_id(nombre_completo, gimnasio:gimnasio_id(nombre))')
                .order('creado_en', { ascending: false })
                .limit(10),

            // Alertas Críticas (Paso 3 Original)
            adminClient.from('tickets_soporte' as any)
                .select('id, asunto, prioridad, gimnasios:gimnasio_id(nombre)')
                .eq('estado', 'open')
                .in('prioridad', ['critica', 'alta'])
                .limit(3),

            // Inquilinos con Deuda o Problemas de Suscripción (Paso 3 Original)
            adminClient.from('gimnasios')
                .select('nombre, estado_pago_saas')
                .not('estado_pago_saas', 'in', '("active","trial")')
                .eq('es_activo', true)
                .limit(3),

            // Historial de MRR y Churn (Paso 4 Original)
            adminClient.from('saas_metrics')
                .select('fecha, churn_gyms_mes, mrr')
                .order('fecha', { ascending: true })
                .limit(6),

            // Scoring de Salud de los Gimnasios (Paso 5 Original)
            adminClient.from('gimnasios')
                .select('id, nombre, scoring_salud, fase_onboarding, modulos_activos')
                .eq('es_activo', true)
                .order('scoring_salud', { ascending: false })
                .limit(10),

            // Anuncios Activos (Paso 6 Original)
            adminClient.from('anuncios_globales')
                .select('*')
                .eq('activo', true)
                .order('creado_en', { ascending: false })
                .limit(5)
        ]);

        // 4. PROCESAMIENTO OPTIMIZADO EN CPU (O(N) lineal y Tipado Fuerte)
        const totalGyms = totalGymsResult.count || 0;
        const totalUsers = totalUsersResult.count || 0;
        const totalBranches = totalBranchesResult.count || 0;
        const activeGyms = activeGymsResult.count || 0;

        const payments = (revenueResult.data as MonthlyRevenueRecord[] | null) || [];
        const monthlyRevenue = payments.reduce((acc, curr) => acc + Number(curr.monto), 0);

        const estimatedMRR = (mrrResult.data as any)?.mrr_estimado || monthlyRevenue;

        // Distribución de Planes
        const gymsByPlan = (gymsByPlanResult.data as unknown as GymPlanRecord[] | null) || [];
        const planBreakdown = gymsByPlan.reduce((acc: Record<string, number>, gym) => {
            const planName = gym.planes_suscripcion?.nombre || 'Sin Plan';
            acc[planName] = (acc[planName] || 0) + 1;
            return acc;
        }, {});

        // Actividad Reciente
        const auditData = (auditResult.data as unknown as AuditRecord[] | null) || [];
        const recentActivity = auditData.map(log => ({
            id: log.id,
            accion: log.accion,
            entidad_tipo: log.entidad_tipo,
            creado_en: log.creado_en,
            perfiles: { nombre_completo: log.perfiles?.nombre_completo || 'Sistema' },
            gimnasios: { nombre: log.perfiles?.gimnasio?.nombre || 'SaaS Core' }
        }));

        // Alertas combinadas (Tickets + Problemas de Pago)
        const criticalTickets = (criticalTicketsResult.data as unknown as TicketRecord[] | null) || [];
        const gymsWithIssues = (gymsWithIssuesResult.data as unknown as GymIssueRecord[] | null) || [];

        const alerts = [
            ...criticalTickets.map(t => ({
                id: t.id,
                type: 'ticket' as const,
                priority: t.prioridad,
                message: `${t.asunto} (${t.gimnasios?.nombre || 'General'})`,
                link: `/admin/reports/tickets`
            })),
            ...gymsWithIssues.map(g => ({
                id: `gym-${g.nombre}`,
                type: 'payment' as const,
                priority: 'alta',
                message: `Gimnasio "${g.nombre}" tiene estado: ${g.estado_pago_saas}`,
                link: `/admin/gyms`
            }))
        ].slice(0, 5);

        const churnData = (churnResult.data as ChurnRecord[] | null) || [];
        const gymsHealth = (gymsHealthResult.data as GymHealthRecord[] | null) || [];
        const announcements = (announcementsResult.data as GlobalAnnouncement[] | null) || [];

        logger.info('Global stats fetched', { totalGyms, activeGyms, estimatedMRR });

        return NextResponse.json({
            stats: {
                gyms: totalGyms,
                gyms_activos: activeGyms,
                users: totalUsers,
                branches: totalBranches,
                revenue: Number(estimatedMRR.toFixed(2)),
                mrr: Number(estimatedMRR.toFixed(2)),
                monthly_real_revenue: Number(monthlyRevenue.toFixed(2)),
                plan_breakdown: planBreakdown
            },
            recentActivity,
            alerts,
            churnHistory: churnData,
            gymsHealth,
            announcements
        });

    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        logger.error('Error in global-stats API', { error: message });
        return NextResponse.json({ error: message }, { status: 500 });
    }
}

