-- ============================================
-- 🎯 VIRTUD GYM - MIGRACIÓN VERSIÓN 0.2.0
-- Fecha: 23 de Enero de 2026
-- Descripción: Implementación de arquitectura robustecida, performance y lógica de negocio.
-- ============================================

BEGIN;

--------------------------------------------------------------------------------
-- 1. SEGURIDAD REFORZADA: GESTIÓN DE ROLES Y RLS
--------------------------------------------------------------------------------

-- Asegurar RLS en tablas críticas nuevas
ALTER TABLE videos_ejercicio ENABLE ROW LEVEL SECURITY;
ALTER TABLE ejercicios_equipamiento ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Políticas para videos_ejercicio
DROP POLICY IF EXISTS "Coach ve sus videos y de alumnos" ON videos_ejercicio;
CREATE POLICY "Coach ve sus videos y de alumnos" ON videos_ejercicio
  FOR SELECT
  USING (
    subido_por = auth.uid()
    OR (compartido_con_alumno = true AND usuario_id = auth.uid())
    OR EXISTS (SELECT 1 FROM perfiles WHERE id = auth.uid() AND rol IN ('admin', 'coach'))
  );

DROP POLICY IF EXISTS "Coach sube videos" ON videos_ejercicio;
CREATE POLICY "Coach sube videos" ON videos_ejercicio
  FOR INSERT
  WITH CHECK (
    auth.uid() = subido_por 
    AND EXISTS (SELECT 1 FROM perfiles WHERE id = auth.uid() AND rol IN ('admin', 'coach'))
  );

-- Políticas para ejercicios_equipamiento
DROP POLICY IF EXISTS "Lectura pública autenticada" ON ejercicios_equipamiento;
CREATE POLICY "Lectura pública autenticada" ON ejercicios_equipamiento
  FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Solo staff modifica equipamiento" ON ejercicios_equipamiento;
CREATE POLICY "Solo staff modifica equipamiento" ON ejercicios_equipamiento
  FOR ALL
  USING (EXISTS (SELECT 1 FROM perfiles WHERE id = auth.uid() AND rol IN ('admin', 'coach')));

--------------------------------------------------------------------------------
-- 2. PERFORMANCE: ÍNDICES CRÍTICOS (Sección 8 RPD)
--------------------------------------------------------------------------------

-- Rutinas
CREATE INDEX IF NOT EXISTS idx_rutinas_usuario_activa 
  ON rutinas(usuario_id, esta_activa) 
  WHERE esta_activa = true;

-- Sesiones
CREATE INDEX IF NOT EXISTS idx_sesiones_usuario_fecha 
  ON sesiones_de_entrenamiento(usuario_id, hora_inicio DESC);

-- Asistencias
CREATE INDEX IF NOT EXISTS idx_asistencias_fecha 
  ON asistencias(entrada DESC);

-- Reservas (Corregido: Eliminado WHERE mutable)
CREATE INDEX IF NOT EXISTS idx_reservas_fecha_estado 
  ON reservas_de_clase(fecha, estado);

-- Mensajería
CREATE INDEX IF NOT EXISTS idx_mensajes_receptor_no_leidos 
  ON mensajes(receptor_id, esta_leido) 
  WHERE esta_leido = false;

-- Gamificación
CREATE INDEX IF NOT EXISTS idx_gamificacion_puntos 
  ON gamificacion_del_usuario(points DESC, level DESC);

-- Cola de videos IA
CREATE INDEX IF NOT EXISTS idx_videos_pendientes 
  ON videos_ejercicio(estado, creado_en)
  WHERE estado IN ('subido', 'procesando');

-- Búsqueda de ejercicios (Full Text Search)
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX IF NOT EXISTS idx_ejercicios_nombre_trgm 
  ON ejercicios USING gin(nombre gin_trgm_ops);

-- Auditoría
CREATE INDEX IF NOT EXISTS idx_audit_tabla_fecha 
  ON audit_logs(tabla, creado_en DESC);

--------------------------------------------------------------------------------
-- 3. LÓGICA DE NEGOCIO: TRIGGERS (Sección 9 RPD)
--------------------------------------------------------------------------------

-- 3.1 Validación de Capacidad de Reservas
CREATE OR REPLACE FUNCTION validar_capacidad_reserva()
RETURNS TRIGGER AS $$
DECLARE
  capacidad_max INT;
  reservas_count INT;
BEGIN
  -- Obtener capacidad
  SELECT a.capacidad_maxima INTO capacidad_max
  FROM horarios_de_clase hc
  JOIN actividades a ON hc.actividad_id = a.id
  WHERE hc.id = NEW.horario_clase_id;
  
  -- Contar reservas activas
  SELECT COUNT(*) INTO reservas_count
  FROM reservas_de_clase
  WHERE horario_clase_id = NEW.horario_clase_id
    AND fecha = NEW.fecha
    AND estado = 'reservada';
  
  IF reservas_count >= capacidad_max THEN
    RAISE EXCEPTION 'Capacidad máxima alcanzada para esta clase (% / %)', 
      reservas_count, capacidad_max;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_validar_capacidad ON reservas_de_clase;
CREATE TRIGGER trigger_validar_capacidad
  BEFORE INSERT ON reservas_de_clase
  FOR EACH ROW
  EXECUTE FUNCTION validar_capacidad_reserva();

-- 3.2 Actualización Automática de Gamificación por Asistencia
CREATE OR REPLACE FUNCTION actualizar_gamificacion_asistencia()
RETURNS TRIGGER AS $$
DECLARE
  ultima_asistencia DATE;
  nueva_racha INT;
BEGIN
  -- Obtener fecha de última asistencia previa
  SELECT MAX(DATE(entrada)) INTO ultima_asistencia
  FROM asistencias
  WHERE usuario_id = NEW.usuario_id
    AND DATE(entrada) < DATE(NEW.entrada);
  
  -- Calcular racha
  IF ultima_asistencia = DATE(NEW.entrada) - INTERVAL '1 day' THEN
    nueva_racha := (
      SELECT COALESCE(racha_actual, 0) + 1 
      FROM gamificacion_del_usuario 
      WHERE usuario_id = NEW.usuario_id
    );
  ELSIF ultima_asistencia = DATE(NEW.entrada) THEN
     -- Misma fecha, no rompe ni sumar racha
     nueva_racha := (
      SELECT COALESCE(racha_actual, 1)
      FROM gamificacion_del_usuario 
      WHERE usuario_id = NEW.usuario_id
    );
  ELSE
    nueva_racha := 1; -- Reset
  END IF;
  
  -- Upsert en gamificación
  INSERT INTO gamificacion_del_usuario (
    usuario_id, 
    points, 
    racha_actual, 
    racha_mas_larga,
    fecha_ultima_actividad
  ) VALUES (
    NEW.usuario_id,
    10, -- Base points
    nueva_racha,
    nueva_racha,
    DATE(NEW.entrada)
  )
  ON CONFLICT (usuario_id) DO UPDATE SET
    points = gamificacion_del_usuario.points + 10,
    racha_actual = EXCLUDED.racha_actual,
    racha_mas_larga = GREATEST(gamificacion_del_usuario.racha_mas_larga, EXCLUDED.racha_actual),
    fecha_ultima_actividad = EXCLUDED.fecha_ultima_actividad,
    actualizado_en = NOW();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_gamificacion_asistencia ON asistencias;
CREATE TRIGGER trigger_gamificacion_asistencia
  AFTER INSERT ON asistencias
  FOR EACH ROW
  EXECUTE FUNCTION actualizar_gamificacion_asistencia();

-- 3.3 Auditoría Automática (Ejemplo para Rutinas y Pagos)
CREATE OR REPLACE FUNCTION registrar_auditoria()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO audit_logs (
    tabla,
    operacion,
    registro_id,
    usuario_id,
    datos_anteriores,
    datos_nuevos
  ) VALUES (
    TG_TABLE_NAME,
    TG_OP,
    COALESCE(NEW.id, OLD.id),
    auth.uid(), -- Usuario actual de la sesión
    CASE WHEN TG_OP = 'DELETE' THEN row_to_json(OLD) ELSE NULL END,
    CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN row_to_json(NEW) ELSE NULL END
  );
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_audit_rutinas ON rutinas;
CREATE TRIGGER trigger_audit_rutinas
  AFTER INSERT OR UPDATE OR DELETE ON rutinas
  FOR EACH ROW EXECUTE FUNCTION registrar_auditoria();

DROP TRIGGER IF EXISTS trigger_audit_pagos ON pagos;
CREATE TRIGGER trigger_audit_pagos
  AFTER INSERT OR UPDATE OR DELETE ON pagos
  FOR EACH ROW EXECUTE FUNCTION registrar_auditoria();

--------------------------------------------------------------------------------
-- 4. ANALÍTICA: VISTAS MATERIALIZADAS (Sección 10 RPD)
--------------------------------------------------------------------------------

DROP MATERIALIZED VIEW IF EXISTS stats_actividades_mensuales;

CREATE MATERIALIZED VIEW stats_actividades_mensuales AS
SELECT 
  a.nombre AS actividad,
  DATE_TRUNC('month', r.fecha) AS mes,
  COUNT(*) AS total_reservas,
  COUNT(*) FILTER (WHERE r.estado = 'asistida'::estado_clase) AS asistencias_reales,
  ROUND(
    100.0 * COUNT(*) FILTER (WHERE r.estado = 'asistida'::estado_clase) / GREATEST(COUNT(*), 1),
    2
  ) AS tasa_asistencia,
  COUNT(DISTINCT r.usuario_id) AS usuarios_unicos
FROM reservas_de_clase r
JOIN horarios_de_clase hc ON r.horario_clase_id = hc.id
JOIN actividades a ON hc.actividad_id = a.id
GROUP BY a.nombre, mes
ORDER BY mes DESC, actividad;

DROP INDEX IF EXISTS idx_stats_actividades_mes;
CREATE INDEX idx_stats_actividades_mes 
  ON stats_actividades_mensuales(mes DESC);

COMMIT;

-- Fin de migración v0.2.0
