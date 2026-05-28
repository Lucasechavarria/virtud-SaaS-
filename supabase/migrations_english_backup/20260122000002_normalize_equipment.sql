-- ============================================================================
-- MIGRACIÓN: NORMALIZACIÓN DE EQUIPAMIENTO
-- ============================================================================
-- Fecha: 22 de Enero de 2026
-- Versión: 1.0.0
-- Objetivo: Migrar de ARRAY a tabla intermedia para analytics y disponibilidad
-- ============================================================================

BEGIN;

-- ============================================================================
-- TABLA INTERMEDIA EJERCICIOS-EQUIPAMIENTO
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.ejercicios_equipamiento (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ejercicio_id uuid NOT NULL REFERENCES public.ejercicios(id) ON DELETE CASCADE,
  equipamiento_id uuid NOT NULL REFERENCES public.equipamiento(id) ON DELETE CASCADE,
  es_opcional boolean DEFAULT false,
  alternativa_id uuid REFERENCES public.equipamiento(id),
  creado_en timestamptz DEFAULT now(),
  UNIQUE(ejercicio_id, equipamiento_id)
);

COMMENT ON TABLE ejercicios_equipamiento IS 
  'Relación N:N entre ejercicios y equipamiento. Permite analytics de uso y disponibilidad.';

COMMENT ON COLUMN ejercicios_equipamiento.es_opcional IS 
  'Indica si el equipamiento es opcional para el ejercicio';

COMMENT ON COLUMN ejercicios_equipamiento.alternativa_id IS 
  'ID de equipamiento alternativo si el principal no está disponible';

-- ============================================================================
-- ÍNDICES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_ejercicios_equipamiento_ejercicio 
  ON ejercicios_equipamiento(ejercicio_id);

CREATE INDEX IF NOT EXISTS idx_ejercicios_equipamiento_equipo 
  ON ejercicios_equipamiento(equipamiento_id);

CREATE INDEX IF NOT EXISTS idx_ejercicios_equipamiento_alternativa 
  ON ejercicios_equipamiento(alternativa_id)
  WHERE alternativa_id IS NOT NULL;

-- ============================================================================
-- MIGRAR DATOS EXISTENTES
-- ============================================================================

DO $$
DECLARE
  rows_migrated INT := 0;
BEGIN
  -- Migrar datos de ARRAY a tabla intermedia
  INSERT INTO ejercicios_equipamiento (ejercicio_id, equipamiento_id)
  SELECT DISTINCT
    e.id,
    eq.id
  FROM ejercicios e
  CROSS JOIN LATERAL unnest(e.equipamiento) AS equip_nombre
  JOIN equipamiento eq ON LOWER(TRIM(eq.nombre)) = LOWER(TRIM(equip_nombre))
  WHERE e.equipamiento IS NOT NULL 
    AND array_length(e.equipamiento, 1) > 0
  ON CONFLICT (ejercicio_id, equipamiento_id) DO NOTHING;
  
  GET DIAGNOSTICS rows_migrated = ROW_COUNT;
  
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ MIGRACIÓN DE EQUIPAMIENTO COMPLETADA';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Relaciones migradas: %', rows_migrated;
  RAISE NOTICE '========================================';
END $$;

-- ============================================================================
-- DEPRECAR COLUMNA ARRAY (mantener por compatibilidad)
-- ============================================================================

COMMENT ON COLUMN ejercicios.equipamiento IS 
  'DEPRECATED: Usar tabla ejercicios_equipamiento. Se eliminará en v2.0. Migración completada.';

COMMENT ON COLUMN rutinas.equipamiento_usado IS 
  'DEPRECATED: Calcular desde ejercicios_equipamiento. Se eliminará en v2.0.';

-- ============================================================================
-- RLS POLICIES
-- ============================================================================

ALTER TABLE ejercicios_equipamiento ENABLE ROW LEVEL SECURITY;

-- Policy: Ver equipamiento de ejercicios accesibles
DROP POLICY IF EXISTS ejercicios_equipamiento_via_ejercicio ON ejercicios_equipamiento;
CREATE POLICY ejercicios_equipamiento_via_ejercicio ON ejercicios_equipamiento
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM ejercicios ej
      JOIN rutinas r ON r.id = ej.rutina_id
      WHERE ej.id = ejercicios_equipamiento.ejercicio_id
        AND (r.usuario_id = auth.uid() OR r.entrenador_id = auth.uid() OR
             EXISTS (SELECT 1 FROM perfiles WHERE id = auth.uid() AND rol = 'admin'))
    )
  );

-- Policy: Solo coaches y admins pueden modificar
DROP POLICY IF EXISTS ejercicios_equipamiento_modificar ON ejercicios_equipamiento;
CREATE POLICY ejercicios_equipamiento_modificar ON ejercicios_equipamiento
  FOR ALL
  USING (
    EXISTS (SELECT 1 FROM perfiles WHERE id = auth.uid() AND rol IN ('coach', 'admin'))
  );

-- ============================================================================
-- FUNCIONES HELPER
-- ============================================================================

-- Función para obtener equipamiento de un ejercicio
CREATE OR REPLACE FUNCTION get_equipamiento_ejercicio(p_ejercicio_id uuid)
RETURNS TABLE (
  equipamiento_id uuid,
  nombre text,
  es_opcional boolean,
  alternativa_nombre text
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ee.equipamiento_id,
    eq.nombre,
    ee.es_opcional,
    alt.nombre as alternativa_nombre
  FROM ejercicios_equipamiento ee
  JOIN equipamiento eq ON eq.id = ee.equipamiento_id
  LEFT JOIN equipamiento alt ON alt.id = ee.alternativa_id
  WHERE ee.ejercicio_id = p_ejercicio_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_equipamiento_ejercicio(uuid) IS 
  'Obtiene todo el equipamiento necesario para un ejercicio con sus alternativas';

-- Función para verificar disponibilidad de equipamiento
CREATE OR REPLACE FUNCTION check_equipamiento_disponible(p_ejercicio_id uuid)
RETURNS boolean AS $$
DECLARE
  equipamiento_faltante INT;
BEGIN
  SELECT COUNT(*) INTO equipamiento_faltante
  FROM ejercicios_equipamiento ee
  JOIN equipamiento eq ON eq.id = ee.equipamiento_id
  WHERE ee.ejercicio_id = p_ejercicio_id
    AND ee.es_opcional = false
    AND (eq.esta_disponible = false OR eq.cantidad < 1);
  
  RETURN equipamiento_faltante = 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION check_equipamiento_disponible(uuid) IS 
  'Verifica si todo el equipamiento requerido está disponible para un ejercicio';

-- ============================================================================
-- VERIFICACIÓN POST-MIGRACIÓN
-- ============================================================================

DO $$
DECLARE
  total_relaciones INT;
  total_equipamiento INT;
BEGIN
  SELECT COUNT(*) INTO total_relaciones FROM ejercicios_equipamiento;
  SELECT COUNT(DISTINCT equipamiento_id) INTO total_equipamiento FROM ejercicios_equipamiento;
  
  RAISE NOTICE '========================================';
  RAISE NOTICE '📊 ESTADÍSTICAS DE NORMALIZACIÓN';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Total relaciones: %', total_relaciones;
  RAISE NOTICE 'Equipamiento único usado: %', total_equipamiento;
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Funciones disponibles:';
  RAISE NOTICE '- get_equipamiento_ejercicio(ejercicio_id)';
  RAISE NOTICE '- check_equipamiento_disponible(ejercicio_id)';
  RAISE NOTICE '========================================';
END $$;

COMMIT;

-- ============================================================================
-- FIN DE LA MIGRACIÓN
-- ============================================================================
