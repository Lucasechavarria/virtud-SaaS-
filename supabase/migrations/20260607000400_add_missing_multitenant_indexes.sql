-- Migración para añadir índices de rendimiento en columnas multi-tenant y habilitar RLS en particiones.
-- Fecha: 07 de Junio de 2026
-- Objetivo: Evitar Full Table Scans y corregir advertencias de RLS en particiones por defecto.

BEGIN;

-- 1. Índices para CRM Prospectos
CREATE INDEX IF NOT EXISTS crm_prospectos_gimnasio_id_idx ON public.crm_prospectos(gimnasio_id, estado);

-- 2. Índices para Equipamiento
CREATE INDEX IF NOT EXISTS equipamiento_gimnasio_id_idx ON public.equipamiento(gimnasio_id);

-- 3. Índices para Planes Nutricionales
CREATE INDEX IF NOT EXISTS planes_nutricionales_gimnasio_id_idx ON public.planes_nutricionales(gimnasio_id, usuario_id);

-- 4. Índices para Mediciones
CREATE INDEX IF NOT EXISTS mediciones_gimnasio_id_idx ON public.mediciones(gimnasio_id, registrado_en DESC);

-- 5. Índices para Sesiones de Entrenamiento
CREATE INDEX IF NOT EXISTS sesiones_de_entrenamiento_gimnasio_id_idx ON public.sesiones_de_entrenamiento(gimnasio_id, creado_en DESC);

-- 6. Habilitar RLS en particiones por defecto para corregir advertencias de Supabase Linter (Security DevSecOps)
ALTER TABLE IF EXISTS public.asistencias_default ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.pagos_default ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.audit_logs_default ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.historial_notificaciones_default ENABLE ROW LEVEL SECURITY;

COMMIT;
