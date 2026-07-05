import { NextResponse } from 'next/server';
import { authenticateAndRequireRole } from '@/lib/auth/api-auth';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    try {
        const { error: authError, profile } = await authenticateAndRequireRole(
            request, 
            ['admin', 'recepcion', 'superadmin']
        );
        if (authError) return authError;

        if (profile?.role !== 'superadmin' && !profile?.gimnasio_id) {
            return NextResponse.json({ error: 'Forbidden: Administrador sin gimnasio asignado' }, { status: 403 });
        }

        const adminClient = createAdminClient();
        let targetGymId = profile?.gimnasio_id;

        const { searchParams } = new URL(request.url);
        const urlGym = searchParams.get('gymId');

        if (profile?.role === 'superadmin' && urlGym) {
            const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(urlGym);
            if (isUUID) {
                targetGymId = urlGym;
            } else {
                const { data: gym } = await adminClient
                    .from('gimnasios')
                    .select('id')
                    .eq('slug', urlGym)
                    .single();
                if (gym) targetGymId = gym.id;
            }
        }

        if (!targetGymId) {
            return NextResponse.json({ error: 'Gimnasio no especificado' }, { status: 400 });
        }

        // Query Leads
        const { data: leads } = await (adminClient as any)
            .from('crm_prospectos')
            .select('*')
            .eq('gimnasio_id', targetGymId);

        const totalLeads = leads?.length || 0;
        const convertedLeads = leads?.filter((l: any) => l.estado === 'convertido').length || 0;
        const conversionRate = totalLeads > 0 ? Math.round((convertedLeads / totalLeads) * 100) : 0;

        // Query Churn de la RPC
        const { data: rawChurn } = await (adminClient as any)
            .rpc('calcular_churn_riesgo', {
                p_gimnasio_id: targetGymId,
                p_limit: 1000,
                p_offset: 0
            });
        
        const churnRiskCount = rawChurn?.filter((c: any) => c.nivel_riesgo === 'alto').length || 0;

        // Query Onboarding
        const { data: onboardingUsers } = await (adminClient as any)
            .from('perfiles')
            .select('creado_en, onboarding_completado_en')
            .eq('gimnasio_id', targetGymId)
            .eq('onboarding_completado', true)
            .not('onboarding_completado_en', 'is', null);

        let totalOnboardingDays = 0;
        let onboardingCount = 0;
        onboardingUsers?.forEach((u: any) => {
            if (u.creado_en && u.onboarding_completado_en) {
                const diff = Date.parse(u.onboarding_completado_en) - Date.parse(u.creado_en);
                const days = diff / (1000 * 60 * 60 * 24);
                totalOnboardingDays += Math.max(0, days);
                onboardingCount++;
            }
        });
        const averageOnboardingDays = onboardingCount > 0 ? Number((totalOnboardingDays / onboardingCount).toFixed(1)) : 0;

        // Origins segmentation
        const origins: Record<string, number> = {};
        leads?.forEach((l: any) => {
            const o = l.origen || 'Otros';
            origins[o] = (origins[o] || 0) + 1;
        });
        const leadOrigins = Object.entries(origins).map(([name, value]) => ({ name, value }));

        // Onboarding status summary
        const { data: membersOnboarding } = await (adminClient as any)
            .from('perfiles')
            .select('onboarding_completado')
            .eq('gimnasio_id', targetGymId)
            .eq('rol', 'member');

        const onboardingStatus = {
            completado: membersOnboarding?.filter((m: any) => m.onboarding_completado).length || 0,
            pendiente: membersOnboarding?.filter((m: any) => !m.onboarding_completado).length || 0
        };

        return NextResponse.json({
            success: true,
            kpis: {
                totalLeads,
                conversionRate,
                churnRiskCount,
                averageOnboardingDays,
                leadOrigins,
                onboardingStatus
            }
        });

    } catch (error: any) {
        console.error('❌ CRM Overview API error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
