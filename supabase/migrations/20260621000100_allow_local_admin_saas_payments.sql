-- =========================================================================
-- 🛡️ MIGRACIÓN RLS: PERMITIR LECTURA DE PAGOS SAAS A ADMINS LOCALES
-- Fecha: 21 de Junio de 2026
-- Objetivo: Agregar política RLS sobre la tabla 'saas_pagos_historial'
--           para permitir que administradores y recepcionistas consulten
--           los pagos correspondientes a su propio gimnasio, corrigiendo
--           el bloqueo que causaba pantallas financieras vacías.
-- =========================================================================

DROP POLICY IF EXISTS "Admins can read own gym payments" ON public.saas_pagos_historial;

CREATE POLICY "Admins can read own gym payments" ON public.saas_pagos_historial
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.perfiles requester
            WHERE requester.id = auth.uid()
              AND requester.rol IN ('admin', 'recepcion')
              AND requester.gimnasio_id = saas_pagos_historial.gimnasio_id
        )
    );
