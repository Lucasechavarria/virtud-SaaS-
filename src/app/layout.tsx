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
const GTM_ID = process.env.NEXT_PUBLIC_GTM_ID;

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
import { getCachedGymBranding } from '@/lib/services/gym-branding';
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

// Función utilitaria server-side para convertir HEX a componentes RGB
function hexToRgb(hex: string): string {
  const cleaned = hex.replace('#', '');
  const num = parseInt(cleaned, 16);
  const r = (num >> 16) & 255;
  const g = (num >> 8) & 255;
  const b = num & 255;
  return isNaN(r) ? '59, 130, 246' : `${r}, ${g}, ${b}`; // Fallback a azul si falla
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const headersList = await headers();
  const slug = headersList.get('x-gym-slug');

  let primaryColor = '#3b82f6';
  let secondaryColor = '#1e3a8a';
  let logoUrl = '/logos/logo.webp';
  let radius = '0.625rem';
  let customFont = '';

  if (slug) {
    const branding = await getCachedGymBranding(slug);
    primaryColor = branding.primaryColor;
    secondaryColor = branding.secondaryColor;
    logoUrl = branding.logoUrl;
    radius = branding.radius;
    customFont = branding.customFont;
  }

  const primaryRgb = hexToRgb(primaryColor);
  const secondaryRgb = hexToRgb(secondaryColor);

  return (
    <html lang="es" className={`${inter.variable} ${rajdhani.variable}`} suppressHydrationWarning>
      <head>
        {/* Google Tag Manager */}
        {GTM_ID && (
          <Script
            id="google-tag-manager"
            strategy="afterInteractive"
            dangerouslySetInnerHTML={{
              __html: `
                (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
                new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
                j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
                'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
                })(window,document,'script','dataLayer','${GTM_ID}');
              `,
            }}
          />
        )}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="icon" href={logoUrl} />

        {/* Inyección dinámica de Google Fonts si el gimnasio tiene configurada una fuente de marca */}
        {customFont && (
          <link
            href={`https://fonts.googleapis.com/css2?family=${encodeURIComponent(customFont)}:wght@300;400;500;600;700;800;900&display=swap`}
            rel="stylesheet"
          />
        )}

        {/* Inyección de marca blanca desde el servidor para erradicar el parpadeo visual */}
        <style dangerouslySetInnerHTML={{ __html: `
          :root {
            --primary: ${primaryColor};
            --primary-rgb: ${primaryRgb};
            --primary-foreground: #ffffff;
            --secondary: ${secondaryColor};
            --secondary-rgb: ${secondaryRgb};
            --radius: ${radius};
            --font-tenant: ${customFont ? `'${customFont}', var(--font-inter)` : 'var(--font-inter)'};
          }
          
          /* Aplicar dinámicamente la tipografía del gimnasio a toda la estructura de la aplicación */
          body {
            font-family: var(--font-tenant) !important;
          }
        `}} />

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
        {/* Google Tag Manager (noscript) */}
        {GTM_ID && (
          <noscript>
            <iframe
              src={`https://www.googletagmanager.com/ns.html?id=${GTM_ID}`}
              height="0"
              width="0"
              style={{ display: 'none', visibility: 'hidden' }}
            />
          </noscript>
        )}
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