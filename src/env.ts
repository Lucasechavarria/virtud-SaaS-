import { z } from "zod";

// Detectar si estamos en fase de compilación (Next.js build o CI/Vercel)
const isBuildTime = 
  process.env.NEXT_PHASE === 'phase-production-build' || 
  process.env.CI === 'true' || 
  process.env.VERCEL === '1';

const envSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url("Debe ser una URL válida de Supabase"),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1, "Clave anónima de Supabase es obligatoria"),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),
  GEMINI_API_KEY: z.string().optional(),
  RESEND_API_KEY: z.string().optional(),
  NEXT_PUBLIC_SITE_URL: z.string().optional(),
  MERCADOPAGO_ACCESS_TOKEN: z.string().optional(),
  MERCADOPAGO_WEBHOOK_SECRET: z.string().optional(),
});

// Durante la compilación en Vercel/CI, si faltan las variables críticas de Supabase,
// proveemos valores temporales (fallback compatibles con Cypress/Testing) para evitar que falle la compilación estática.
const rawSupabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || (isBuildTime ? "http://localhost:54321" : undefined);
const rawSupabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || (isBuildTime ? "mock-anon-key-for-testing-purposes-only-12345" : undefined);

if (isBuildTime && (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)) {
  console.warn("⚠️ [Build Time Warning] Las variables críticas de Supabase no están presentes. Se usarán valores temporales para permitir la compilación.");
}

// Parseo estricto: Si faltan variables clave, la aplicación crashea en runtime.
export const env = envSchema.parse({
  NEXT_PUBLIC_SUPABASE_URL: rawSupabaseUrl,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: rawSupabaseAnonKey,
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  GEMINI_API_KEY: process.env.GEMINI_API_KEY,
  RESEND_API_KEY: process.env.RESEND_API_KEY,
  NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
  MERCADOPAGO_ACCESS_TOKEN: process.env.MERCADOPAGO_ACCESS_TOKEN,
  MERCADOPAGO_WEBHOOK_SECRET: process.env.MERCADOPAGO_WEBHOOK_SECRET,
});

