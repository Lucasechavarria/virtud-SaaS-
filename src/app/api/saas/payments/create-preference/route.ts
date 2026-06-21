import { NextResponse } from 'next/server';
import { authenticateAndRequireRole } from '@/lib/auth/api-auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { preference } from '@/lib/config/mercadopago';

/**
 * POST /api/saas/payments/create-preference
 * Crea una preferencia de MercadoPago para cobrar la mensualidad al gimnasio (SaaS)
 */
export async function POST(request: Request) {
    try {
        const { supabase, error: authError, user } = await authenticateAndRequireRole(request, ['admin', 'superadmin']);
        if (authError) return authError;

        let planId: string | undefined;
        try {
            const body = await request.json();
            planId = body.planId;
        } catch (_) {
            // No body or invalid json
        }

        const adminClient = createAdminClient();

        // 1. Obtener el gimnasio y su plan actual
        const { data: profile } = await adminClient
            .from('perfiles')
            .select('gimnasio_id')
            .eq('id', user.id)
            .single();

        if (!profile?.gimnasio_id) {
            return NextResponse.json({ error: 'Gimnasio no encontrado' }, { status: 400 });
        }

        let planNombre = '';
        let precio = 0;
        let selectedPlanId = planId;

        if (selectedPlanId) {
            const { data: planData } = await adminClient
                .from('planes_suscripcion')
                .select('nombre, precio_mensual')
                .eq('id', selectedPlanId)
                .single();
            
            if (planData) {
                planNombre = planData.nombre;
                precio = planData.precio_mensual;
            }
        }

        // Si no se especificó plan o no se encontró, usamos el plan actual del gimnasio
        if (!precio) {
            const { data: gym, error: gymError } = await adminClient
                .from('gimnasios')
                .select(`
                    id,
                    nombre,
                    plan_id,
                    planes_suscripcion (
                        id,
                        nombre,
                        precio_mensual
                    )
                `)
                .eq('id', profile.gimnasio_id)
                .single();

            if (gymError || !gym) throw new Error('Error al obtener datos del gimnasio');

            const plan = (gym.planes_suscripcion as any);
            planNombre = plan?.nombre || 'Básico';
            precio = plan?.precio_mensual || 0;
            selectedPlanId = plan?.id || gym.plan_id;
        }

        if (precio <= 0) {
            return NextResponse.json({ error: 'El plan seleccionado no tiene un costo asociado' }, { status: 400 });
        }

        const { data: gymBase, error: gymBaseError } = await adminClient
            .from('gimnasios')
            .select('id, nombre, slug')
            .eq('id', profile.gimnasio_id)
            .single();

        if (gymBaseError || !gymBase) throw new Error('Error al obtener información base del gimnasio');

        const gymSlug = gymBase.slug || gymBase.id;

        // 2. Crear preferencia en MercadoPago
        // Usamos external_reference para guardar el gymId y procesarlo en el webhook
        const result = await preference.create({
            body: {
                items: [
                    {
                        id: `saas-monthly-${gymBase.id}`,
                        title: `Suscripción Mensual Virtud Gym (${planNombre}) - ${gymBase.nombre}`,
                        quantity: 1,
                        unit_price: precio,
                        currency_id: 'USD',
                    },
                ],
                external_reference: gymBase.id,
                notification_url: `${process.env.NEXT_PUBLIC_BASE_URL}/api/saas/webhooks/mercadopago`,
                back_urls: {
                    success: `${process.env.NEXT_PUBLIC_BASE_URL}/${gymSlug}/admin/finance?payment=success`,
                    failure: `${process.env.NEXT_PUBLIC_BASE_URL}/${gymSlug}/admin/finance?payment=failure`,
                    pending: `${process.env.NEXT_PUBLIC_BASE_URL}/${gymSlug}/admin/finance?payment=pending`
                },
                auto_return: 'approved',
                metadata: {
                    gym_id: gymBase.id,
                    type: 'saas_subscription',
                    plan_id: selectedPlanId
                }
            }
        });

        return NextResponse.json({ id: result.id, init_point: result.init_point });

    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        console.error('SaaS Preference Error:', error);
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
