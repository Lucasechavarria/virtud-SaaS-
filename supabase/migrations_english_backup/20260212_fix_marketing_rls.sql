-- ============================================================================
-- MIGRACIÓN: Fix RLS Policies for Marketing Automation
-- ============================================================================
-- Fecha: 12 de Febrero de 2026
-- Objetivo: Agregar política DELETE faltante y permitir acceso al Service Role
-- ============================================================================

BEGIN;

-- Agregar política DELETE que faltaba
DROP POLICY IF EXISTS "Solo admins pueden eliminar campañas" ON public.campanas_marketing;
CREATE POLICY "Solo admins pueden eliminar campañas"
    ON public.campanas_marketing FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.perfiles
            WHERE id = auth.uid()
            AND rol = 'admin'
        )
    );

-- Verificar que las políticas existentes funcionen correctamente
-- Las políticas actuales ya permiten al Service Role Key bypasear RLS automáticamente
-- pero vamos a agregar un comentario para documentar esto

COMMENT ON TABLE public.campanas_marketing IS 
'Campañas de marketing automatizadas. 
IMPORTANTE: El Service Role Key bypasea RLS automáticamente para cron jobs.
Las políticas RLS solo aplican a usuarios autenticados vía JWT.';

COMMIT;

-- ============================================================================
-- VERIFICACIÓN
-- ============================================================================
DO $$
BEGIN
    RAISE NOTICE '✅ Política DELETE agregada a campanas_marketing';
    RAISE NOTICE 'ℹ️ El Service Role Key puede acceder a todas las tablas sin restricciones RLS';
END $$;
