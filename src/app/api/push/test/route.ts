import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import webpush from 'web-push';

// Función para inicializar webpush de forma segura
function setupWebPush() {
    const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    const privateKey = process.env.VAPID_PRIVATE_KEY;

    if (!publicKey || !privateKey) {
        return false;
    }

    try {
        webpush.setVapidDetails(
            process.env.VAPID_SUBJECT || 'mailto:admin@virtud-gym.com',
            publicKey,
            privateKey
        );
        return true;
    } catch (error) {
        console.error('Error setting VAPID details:', error);
        return false;
    }
}

export async function POST() {
    const supabase = await createClient();

    try {
        if (!setupWebPush()) {
            return NextResponse.json({ error: 'Push notifications not configured' }, { status: 500 });
        }
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
        }

        // Obtener la suscripción más reciente del usuario
        const { data: subscriptions, error: subError } = await (supabase
            .from('push_subscriptions')
            .select('endpoint, auth, p256dh')
            .eq('usuario_id', user.id)
            .order('creado_en', { ascending: false })
            .limit(1) as any);

        if (subError || !subscriptions || subscriptions.length === 0) {
            return NextResponse.json({
                error: 'No se encontró suscripción push. Asegúrate de haber otorgado permisos y estar suscrito.'
            }, { status: 404 });
        }

        const sub = subscriptions[0];
        const pushSubscription = {
            endpoint: sub.endpoint,
            keys: {
                auth: sub.auth,
                p256dh: sub.p256dh
            }
        };

        const payload = JSON.stringify({
            title: '🔱 Virtud Gym - Prueba',
            body: '¡Sistema de Notificaciones Elite Activo! Esta es una señal de prueba táctica.',
            url: '/coach'
        });

        await webpush.sendNotification(pushSubscription, payload);

        return NextResponse.json({ success: true, message: 'Notificación de prueba enviada' });

    } catch (error: any) {
        console.error('Error enviando notificación push de prueba:', error);
        return NextResponse.json({
            error: 'Error interno al enviar notificación',
            details: error.message
        }, { status: 500 });
    }
}
