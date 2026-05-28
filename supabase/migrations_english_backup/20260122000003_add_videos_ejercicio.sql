-- ============================================================================
-- MIGRACIÓN: TABLA VIDEOS_EJERCICIO
-- ============================================================================
-- Fecha: 22 de Enero de 2026
-- Versión: 1.0.0
-- Objetivo: Soporte para análisis de video con IA y feedback visual
-- ============================================================================

BEGIN;

-- ============================================================================
-- TABLA VIDEOS_EJERCICIO
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.videos_ejercicio (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id uuid NOT NULL REFERENCES perfiles(id) ON DELETE CASCADE,
  subido_por uuid NOT NULL REFERENCES perfiles(id),
  ejercicio_id uuid REFERENCES ejercicios(id),
  
  -- Archivo
  url_video text NOT NULL,
  url_thumbnail text,
  duracion_segundos integer,
  
  -- IA Processing
  estado text DEFAULT 'subido' 
    CHECK (estado IN ('subido', 'procesando', 'analizado', 'error')),
  procesado_en timestamptz,
  
  -- Análisis IA (JSONB)
  correcciones_ia jsonb DEFAULT '{}',
  puntaje_confianza numeric(3,2),
  
  -- Compartir
  compartido_con_alumno boolean DEFAULT false,
  compartido_en timestamptz,
  
  -- Feedback
  feedback_alumno text,
  calificacion_alumno integer CHECK (calificacion_alumno BETWEEN 1 AND 5),
  
  creado_en timestamptz DEFAULT now(),
  actualizado_en timestamptz DEFAULT now()
);

COMMENT ON TABLE videos_ejercicio IS 
  'Videos de ejercicios para análisis con IA y feedback visual a alumnos';

COMMENT ON COLUMN videos_ejercicio.estado IS 
  'Estado del procesamiento: subido, procesando, analizado, error';

COMMENT ON COLUMN videos_ejercicio.correcciones_ia IS 
  'Análisis de IA con correcciones de postura, técnica y recomendaciones';

COMMENT ON COLUMN videos_ejercicio.compartido_con_alumno IS 
  'Indica si el video fue compartido con el alumno para su revisión';

-- ============================================================================
-- ÍNDICES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_videos_usuario 
  ON videos_ejercicio(usuario_id);

CREATE INDEX IF NOT EXISTS idx_videos_subido_por 
  ON videos_ejercicio(subido_por);

CREATE INDEX IF NOT EXISTS idx_videos_estado 
  ON videos_ejercicio(estado);

CREATE INDEX IF NOT EXISTS idx_videos_ejercicio 
  ON videos_ejercicio(ejercicio_id)
  WHERE ejercicio_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_videos_compartido 
  ON videos_ejercicio(compartido_con_alumno, usuario_id)
  WHERE compartido_con_alumno = true;

CREATE INDEX IF NOT EXISTS idx_videos_fecha 
  ON videos_ejercicio(creado_en DESC);

-- ============================================================================
-- TRIGGER UPDATED_AT
-- ============================================================================

CREATE TRIGGER update_videos_ejercicio_updated_at
  BEFORE UPDATE ON videos_ejercicio
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- RLS POLICIES
-- ============================================================================

ALTER TABLE videos_ejercicio ENABLE ROW LEVEL SECURITY;

-- Policy: Alumnos ven sus propios videos
DROP POLICY IF EXISTS videos_alumno_propios ON videos_ejercicio;
CREATE POLICY videos_alumno_propios ON videos_ejercicio
  FOR SELECT
  USING (usuario_id = auth.uid());

-- Policy: Coaches ven videos de sus alumnos
DROP POLICY IF EXISTS videos_coach_alumnos ON videos_ejercicio;
CREATE POLICY videos_coach_alumnos ON videos_ejercicio
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM relacion_alumno_coach
      WHERE usuario_id = videos_ejercicio.usuario_id
        AND entrenador_id = auth.uid()
        AND esta_activo = true
    ) OR
    EXISTS (SELECT 1 FROM perfiles WHERE id = auth.uid() AND rol = 'admin')
  );

-- Policy: Solo coaches pueden subir videos
DROP POLICY IF EXISTS videos_coach_upload ON videos_ejercicio;
CREATE POLICY videos_coach_upload ON videos_ejercicio
  FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM perfiles WHERE id = auth.uid() AND rol IN ('coach', 'admin'))
  );

-- Policy: Coach o admin pueden actualizar
DROP POLICY IF EXISTS videos_coach_actualizar ON videos_ejercicio;
CREATE POLICY videos_coach_actualizar ON videos_ejercicio
  FOR UPDATE
  USING (
    subido_por = auth.uid() OR
    EXISTS (SELECT 1 FROM perfiles WHERE id = auth.uid() AND rol = 'admin')
  );

-- Policy: Alumno puede dar feedback
DROP POLICY IF EXISTS videos_alumno_feedback ON videos_ejercicio;
CREATE POLICY videos_alumno_feedback ON videos_ejercicio
  FOR UPDATE
  USING (usuario_id = auth.uid())
  WITH CHECK (usuario_id = auth.uid());

-- ============================================================================
-- FUNCIONES HELPER
-- ============================================================================

-- Función para compartir video con alumno
CREATE OR REPLACE FUNCTION compartir_video_con_alumno(
  p_video_id uuid,
  p_coach_id uuid
)
RETURNS boolean AS $$
DECLARE
  v_usuario_id uuid;
BEGIN
  -- Verificar que el coach tiene permiso
  SELECT usuario_id INTO v_usuario_id
  FROM videos_ejercicio
  WHERE id = p_video_id
    AND subido_por = p_coach_id;
  
  IF v_usuario_id IS NULL THEN
    RAISE EXCEPTION 'No tienes permiso para compartir este video';
  END IF;
  
  -- Compartir video
  UPDATE videos_ejercicio
  SET 
    compartido_con_alumno = true,
    compartido_en = now()
  WHERE id = p_video_id;
  
  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION compartir_video_con_alumno(uuid, uuid) IS 
  'Comparte un video analizado con el alumno para su revisión';

-- Función para obtener videos pendientes de análisis
CREATE OR REPLACE FUNCTION get_videos_pendientes_analisis(p_limit int DEFAULT 10)
RETURNS TABLE (
  video_id uuid,
  usuario_email text,
  ejercicio_nombre text,
  url_video text,
  creado_en timestamptz
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    v.id,
    p.email,
    e.nombre,
    v.url_video,
    v.creado_en
  FROM videos_ejercicio v
  JOIN perfiles p ON p.id = v.usuario_id
  LEFT JOIN ejercicios e ON e.id = v.ejercicio_id
  WHERE v.estado = 'subido'
  ORDER BY v.creado_en ASC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_videos_pendientes_analisis(int) IS 
  'Obtiene videos pendientes de análisis con IA, ordenados por antigüedad';

-- ============================================================================
-- TRIGGER DE AUDITORÍA
-- ============================================================================

CREATE TRIGGER audit_videos_ejercicio
  AFTER INSERT OR UPDATE OR DELETE ON videos_ejercicio
  FOR EACH ROW
  EXECUTE FUNCTION audit_trigger_function();

-- ============================================================================
-- VERIFICACIÓN POST-MIGRACIÓN
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ TABLA VIDEOS_EJERCICIO CREADA';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Estados disponibles:';
  RAISE NOTICE '- subido: Video cargado, pendiente de análisis';
  RAISE NOTICE '- procesando: IA analizando el video';
  RAISE NOTICE '- analizado: Análisis completado';
  RAISE NOTICE '- error: Error en el procesamiento';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Funciones disponibles:';
  RAISE NOTICE '- compartir_video_con_alumno(video_id, coach_id)';
  RAISE NOTICE '- get_videos_pendientes_analisis(limit)';
  RAISE NOTICE '========================================';
END $$;

COMMIT;

-- ============================================================================
-- FIN DE LA MIGRACIÓN
-- ============================================================================
