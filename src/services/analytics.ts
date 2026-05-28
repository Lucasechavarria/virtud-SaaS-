import { logger } from '@/lib/logger';

export const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_ID;

export const initAnalytics = () => {
    // Initialize GA if needed, usually handled by a Script component in layout
    // This function can be used for custom initialization logic
    logger.info('Analytics initialized');
};

export const analytics = {
    trackEvent: (eventName: string, properties: Record<string, unknown> = {}) => {
        if (typeof window !== 'undefined' && (window as unknown as { gtag: unknown }).gtag) {
            (window as unknown as { gtag: Function }).gtag('event', eventName, properties);
        }
    },

    trackPageView: (url: string) => {
        if (typeof window !== 'undefined' && (window as unknown as { gtag: unknown }).gtag) {
            (window as unknown as { gtag: Function }).gtag('config', process.env.NEXT_PUBLIC_GA_ID, {
                page_path: url,
            });
        }
    },
};
