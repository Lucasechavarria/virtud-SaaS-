-- Migración para añadir índices de rendimiento en el módulo de recepción y reportes de asistencia/caja.
-- Fecha: 24 de Junio de 2026
-- Objetivo: Optimizar la velocidad de carga de los reportes consolidados y de auditoría de caja.

BEGIN;

-- 1. Índices para Asistencias (Filtro por gimnasio, fecha de entrada y canal de origen)
CREATE INDEX IF NOT EXISTS asistencias_gym_fecha_source_idx ON public.asistencias(gimnasio_id, entrada, source);

-- 2. Índices para Auditoría Global (Cierres de caja y bypasses de acceso)
CREATE INDEX IF NOT EXISTS auditoria_global_gym_accion_fecha_idx ON public.auditoria_global(gimnasio_id, accion, creado_en);

COMMIT;
