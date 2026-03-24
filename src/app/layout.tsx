import '@/env'; // Falla en el Root si las variables Críticas están ausentes
import React from "react";
import type { Metadata } from "next";
import { Inter, Rajdhani } from "next/font/google";
import "./globals.css";
import ClientProviders from "@/components/ClientProviders";
import { ErrorBoundary } from "@/components/shared/ErrorBoundary";
import { Viewport } from 'next';
import Script from 'next/script';
import { InstallPrompt } from "@/components/pwa/InstallPrompt";

const GA_TRACKING_ID = process.env.NEXT_PUBLIC_GA_ID;

export const viewport: Viewport = {
  themeColor: '#000000',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
}

const inter = Inter({
  subsets: ["latin"],
  variable: '--font-inter',
  display: 'swap'
});

const rajdhani = Rajdhani({
  weight: ['300', '400', '500', '600', '700'],
  subsets: ["latin"],
  variable: '--font-rajdhani',
  display: 'swap'
});

import { createAdminClient } from '@/lib/supabase/admin';
import { headers } from 'next/headers';

export async function generateMetadata(): Promise<Metadata> {
  const headersList = await headers();
  const slug = headersList.get('x-gym-slug');

  let gymName = 'VIRTUD';
  let gymDescription = "Centro de transformación integral: Fitness, Artes Marciales y Medicina China.";

  if (slug) {
    const supabase = createAdminClient();
    const { data: gym } = await supabase
      .from('gimnasios')
      .select('nombre')
      .eq('slug', slug)
      .single();

    if (gym) {
      gymName = gym.nombre;
      gymDescription = `App oficial de ${gym.nombre} - Gestionado por Virtud Gym`;
    }
  }

  return {
    title: {
      default: `${gymName} | Entrenamiento Inteligente`,
      template: `%s | ${gymName}`
    },
    description: gymDescription,
    metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://virtud-gym.com'),
    appleWebApp: {
      capable: true,
      statusBarStyle: 'black-translucent',
      title: gymName,
    },
    formatDetection: {
      telephone: false,
    },
  };
}

import { PushProvider } from "@/components/providers/PushManager";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es" className={`${inter.variable} ${rajdhani.variable}`} suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="icon" href="/logos/logo.webp" />

        {/* Google Analytics */}
        {GA_TRACKING_ID && (
          <>
            <Script
              strategy="afterInteractive"
              src={`https://www.googletagmanager.com/gtag/js?id=${GA_TRACKING_ID}`}
            />
            <Script
              id="google-analytics"
              strategy="afterInteractive"
              dangerouslySetInnerHTML={{
                __html: `
                  window.dataLayer = window.dataLayer || [];
                  function gtag(){dataLayer.push(arguments);}
                  gtag('js', new Date());
                  gtag('config', '${GA_TRACKING_ID}', {
                    page_path: window.location.pathname,
                  });
                `,
              }}
            />
          </>
        )}
      </head>

      <body className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-300">
        <ErrorBoundary>
          <PushProvider>
            <ClientProviders />
            {children}
            <InstallPrompt />
          </PushProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}