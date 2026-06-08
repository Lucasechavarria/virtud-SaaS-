-- Migración para corregir filtraciones de aislamiento multi-tenant en políticas RLS
-- Previene que administradores de un gimnasio consulten mensajes, rutinas o pagos de otros gimnasios.

BEGIN;

-- 1. Corregir RLS de MENSAJES
DROP POLICY IF EXISTS mensajes_participantes ON public.mensajes;
CREATE POLICY mensajes_participantes ON public.mensajes
  FOR SELECT
  USING (
    remitente_id = auth.uid() OR 
    receptor_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.perfiles requester
      JOIN public.perfiles participant ON participant.id IN (remitente_id, receptor_id)
      WHERE requester.id = auth.uid() 
        AND requester.rol IN ('admin', 'recepcion')
        AND requester.gimnasio_id = participant.gimnasio_id
    )
  );

-- 2. Corregir RLS de RUTINAS
DROP POLICY IF EXISTS rutinas_usuario_propias ON public.rutinas;
CREATE POLICY rutinas_usuario_propias ON public.rutinas
  FOR SELECT
  USING (
    usuario_id = auth.uid() OR
    entrenador_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.perfiles requester
      JOIN public.perfiles student ON student.id = usuario_id
      WHERE requester.id = auth.uid() 
        AND requester.rol IN ('admin', 'recepcion')
        AND requester.gimnasio_id = student.gimnasio_id
    )
  );

-- 3. Corregir RLS de PAGOS
DROP POLICY IF EXISTS pagos_usuario_admin ON public.pagos;
CREATE POLICY pagos_usuario_admin ON public.pagos
  FOR SELECT
  USING (
    usuario_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.perfiles requester
      WHERE requester.id = auth.uid()
        AND requester.rol IN ('admin', 'recepcion')
        AND requester.gimnasio_id = pagos.gimnasio_id
    )
  );

COMMIT;
