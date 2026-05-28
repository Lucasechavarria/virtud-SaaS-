// src/components/ClientProviders.tsx
"use client";
import { Toaster } from "react-hot-toast";
import { useEffect } from "react";

export default function ClientProviders() {
  useEffect(() => {
    if (process.env.NODE_ENV === 'production') {
      import("@/services/analytics").then(({ initAnalytics, analytics }) => {
        initAnalytics();
        analytics.trackPageView(window.location.pathname);
      });
    }
  }, []);

  return (
    <>
      <Toaster
        position="top-right"
        toastOptions={{
          className: 'font-sans text-sm',
          success: {
            duration: 3000,
            iconTheme: { primary: '#3b82f6', secondary: '#fff' }
          },
          error: {
            duration: 5000,
            iconTheme: { primary: '#ef4444', secondary: '#fff' }
          }
        }}
      />
    </>
  );
}