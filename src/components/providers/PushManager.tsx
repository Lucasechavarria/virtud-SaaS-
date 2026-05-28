'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';

interface PushContextType {
    isSubscribed: boolean;
    permission: 'default' | 'denied' | 'granted';
    subscribe: () => Promise<void>;
    unsubscribe: () => Promise<void>;
}

const PushContext = createContext<PushContextType | undefined>(undefined);

export function PushProvider({ children }: { children: React.ReactNode }) {
    const [isSubscribed, setIsSubscribed] = useState(false);
    const [permission, setPermission] = useState<'default' | 'denied' | 'granted'>('default');

    useEffect(() => {
        if ('Notification' in window) {
            setPermission(Notification.permission);
            checkSubscription();
        }
    }, []);

    const checkSubscription = async () => {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();
        setIsSubscribed(!!subscription);
    };

    const subscribe = async () => {
        if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
            console.warn('Push messaging is not supported');
            return;
        }

        try {
            const result = await Notification.requestPermission();
            setPermission(result);

            if (result === 'granted') {
                const registration = await navigator.serviceWorker.ready;

                // Estos valores deben venir de .env
                const publicVapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

                if (!publicVapidKey) {
                    console.error('VAPID public key is missing');
                    return;
                }

                const subscription = await registration.pushManager.subscribe({
                    userVisibleOnly: true,
                    applicationServerKey: urlBase64ToUint8Array(publicVapidKey)
                });

                // Guardar en Supabase
                const { data: { user } } = await supabase.auth.getUser();
                if (user) {
                    await supabase.from('push_subscriptions' as any).upsert({
                        usuario_id: user.id,
                        subscription: subscription.toJSON(),
                        pwa_platform: getPlatform()
                    }, { onConflict: 'usuario_id,subscription' });
                }

                setIsSubscribed(true);
            }
        } catch (error) {
            console.error('Error al suscribirse a notificaciones:', error);
        }
    };

    const unsubscribe = async () => {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();
        if (subscription) {
            await subscription.unsubscribe();

            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                await supabase.from('push_subscriptions')
                    .delete()
                    .match({ usuario_id: user.id });
            }

            setIsSubscribed(false);
        }
    };

    return (
        <PushContext.Provider value={{ isSubscribed, permission, subscribe, unsubscribe }}>
            {children}
        </PushContext.Provider>
    );
}

export const usePush = () => {
    const context = useContext(PushContext);
    if (!context) throw new Error('usePush must be used within PushProvider');
    return context;
};

// Utils
function urlBase64ToUint8Array(base64String: string) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
        .replace(/-/g, '+')
        .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
}

function getPlatform() {
    const ua = navigator.userAgent;
    if (/android/i.test(ua)) return 'android';
    if (/iPad|iPhone|iPod/.test(ua)) return 'ios';
    return 'desktop';
}

