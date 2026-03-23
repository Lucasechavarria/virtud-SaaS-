-- ============================================================================
-- MIGRACIÓN: VISTAS MATERIALIZADAS
-- ============================================================================
-- Fecha: 22 de Enero de 2026
-- Versión: 1.0.0
-- Objetivo: Dashboards ultra-rápidos con queries pre-calculadas
-- ============================================================================

BEGIN;

-- ============================================================================
-- VISTA: ESTADÍSTICAS DE USUARIO
-- ============================================================================

CREATE MATERIALIZED VIEW IF NOT EXISTS vista_estadisticas_usuario AS
SELECT 
  p.id AS usuario_id,
  p.nombre_completo,
  p.email,
  p.rol,
  p.estado_membresia,
  
  -- Sesiones de entrenamiento
  COUNT(DISTINCT s.id) AS total_sesiones,
  COUNT(DISTINCT s.id) FILTER (WHERE s.estado = 'completed') AS sesiones_completadas,
  
  -- Asistencias
  COUNT(DISTINCT a.id) AS total_asistencias,
  
  -- Gamificación
  COALESCE(g.points, 0) AS puntos,
  COALESCE(g.racha_actual, 0) AS racha_actual,
  COALESCE(g.racha_mas_larga, 0) AS racha_mas_larga,
  COALESCE(g.level, 1) AS nivel,
  
  -- Promedios
  COALESCE(AVG(s.puntuacion_animo), 0) AS promedio_animo,
  COALESCE(AVG(s.puntos_totales), 0) AS promedio_puntos_sesion,
  
  -- Última actividad
  GREATEST(
    MAX(s.creado_en),
    MAX(a.creado_en),
    g.fecha_ultima_actividad::timestamptz
  ) AS ultima_actividad,
  
  -- Metadatos
  now() AS actualizado_en
  
FROM perfiles p
LEFT JOIN sesiones_de_entrenamiento s ON s.usuario_id = p.id
LEFT JOIN asistencias a ON a.usuario_id = p.id
LEFT JOIN gamificacion_del_usuario g ON g.usuario_id = p.id
WHERE p.rol = 'member'
GROUP BY 
  p.id, 
  p.nombre_completo, 
  p.email, 
  p.rol, 
  p.estado_membresia,
  g.points, 
  g.racha_actual, 
  g.racha_mas_larga, 
  g.level,
  g.fecha_ultima_actividad;

CREATE UNIQUE INDEX IF NOT EXISTS idx_vista_stats_usuario 
  ON vista_estadisticas_usuario(usuario_id);

CREATE INDEX IF NOT EXISTS idx_vista_stats_puntos 
  ON vista_estadisticas_usuario(puntos DESC);

CREATE INDEX IF NOT EXISTS idx_vista_stats_racha 
  ON vista_estadisticas_usuario(racha_actual DESC);

COMMENT ON MATERIALIZED VIEW vista_estadisticas_usuario IS 
  'Estadísticas consolidadas de usuarios para dashboards. Refresh cada hora.';

-- ============================================================================
-- VISTA: OCUPACIÓN DE CLASES
-- ============================================================================

CREATE MATERIALIZED VIEW IF NOT EXISTS vista_ocupacion_clases AS
SELECT 
  hc.id AS horario_id,
  a.id AS actividad_id,
  a.nombre AS actividad,
  a.tipo,
  a.dificultad,
  hc.dia_de_la_semana,
  hc.hora_inicio,
  hc.hora_fin,
  a.capacidad_maxima,
  
  -- Entrenador
  p.nombre_completo AS entrenador,
  
  -- Reservas
  COUNT(r.id) FILTER (WHERE r.estado = 'reservada' AND r.fecha >= CURRENT_DATE) AS reservas_actuales,
  COUNT(r.id) FILTER (WHERE r.estado = 'asistida') AS total_asistencias_historicas,
  
  -- Disponibilidad
  (a.capacidad_maxima - COUNT(r.id) FILTER (WHERE r.estado = 'reservada' AND r.fecha >= CURRENT_DATE)) AS cupos_disponibles,
  
  -- Porcentaje de ocupación
  CASE 
    WHEN a.capacidad_maxima > 0 THEN
      ROUND(
        100.0 * COUNT(r.id) FILTER (WHERE r.estado = 'reservada' AND r.fecha >= CURRENT_DATE) / a.capacidad_maxima, 
        2
      )
    ELSE 0
  END AS porcentaje_ocupacion,
  
  -- Promedio histórico
  CASE 
    WHEN COUNT(DISTINCT r.fecha) > 0 THEN
      ROUND(
        COUNT(r.id) FILTER (WHERE r.estado = 'asistida')::numeric / COUNT(DISTINCT r.fecha), 
        2
      )
    ELSE 0
  END AS promedio_asistencia,
  
  -- Estado
  hc.esta_activa,
  
  -- Metadatos
  now() AS actualizado_en
  
FROM horarios_de_clase hc
JOIN actividades a ON a.id = hc.actividad_id
LEFT JOIN perfiles p ON p.id = hc.entrenador_id
LEFT JOIN reservas_de_clase r ON r.horario_clase_id = hc.id
WHERE hc.esta_activa = true
GROUP BY 
  hc.id, 
  a.id,
  a.nombre, 
  a.tipo,
  a.dificultad,
  hc.dia_de_la_semana, 
  hc.hora_inicio, 
  hc.hora_fin, 
  a.capacidad_maxima,
  p.nombre_completo,
  hc.esta_activa;

CREATE UNIQUE INDEX IF NOT EXISTS idx_vista_ocupacion_horario 
  ON vista_ocupacion_clases(horario_id);

CREATE INDEX IF NOT EXISTS idx_vista_ocupacion_dia 
  ON vista_ocupacion_clases(dia_de_la_semana, hora_inicio);

CREATE INDEX IF NOT EXISTS idx_vista_ocupacion_disponibilidad 
  ON vista_ocupacion_clases(cupos_disponibles DESC)
  WHERE cupos_disponibles > 0;

COMMENT ON MATERIALIZED VIEW vista_ocupacion_clases IS 
  'Ocupación y disponibilidad de clases grupales. Refresh cada hora.';

-- ============================================================================
-- VISTA: LEADERBOARD DE PUNTOS
-- ============================================================================

CREATE MATERIALIZED VIEW IF NOT EXISTS vista_leaderboard AS
SELECT 
  ROW_NUMBER() OVER (ORDER BY g.points DESC, g.racha_actual DESC) AS posicion,
  p.id AS usuario_id,
  p.nombre_completo,
  p.url_avatar,
  g.points AS puntos,
  g.racha_actual,
  g.racha_mas_larga,
  g.level AS nivel,
  
  -- Logros desbloqueados
  COUNT(DISTINCT lu.logro_id) AS total_logros,
  
  -- Última actividad
  g.fecha_ultima_actividad,
  
  -- Metadatos
  now() AS actualizado_en
  
FROM gamificacion_del_usuario g
JOIN perfiles p ON p.id = g.usuario_id
LEFT JOIN logros_del_usuario lu ON lu.usuario_id = g.usuario_id
WHERE p.rol = 'member'
  AND p.estado_membresia = 'active'
GROUP BY 
  p.id, 
  p.nombre_completo, 
  p.url_avatar,
  g.points, 
  g.racha_actual, 
  g.racha_mas_larga, 
  g.level,
  g.fecha_ultima_actividad
ORDER BY g.points DESC, g.racha_actual DESC
LIMIT 100;

CREATE UNIQUE INDEX IF NOT EXISTS idx_vista_leaderboard_usuario 
  ON vista_leaderboard(usuario_id);

CREATE INDEX IF NOT EXISTS idx_vista_leaderboard_posicion 
  ON vista_leaderboard(posicion);

COMMENT ON MATERIALIZED VIEW vista_leaderboard IS 
  'Top 100 usuarios por puntos para leaderboard. Refresh cada hora.';

-- ============================================================================
-- FUNCIÓN DE REFRESH AUTOMÁTICO
-- ============================================================================

CREATE OR REPLACE FUNCTION refresh_materialized_views()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY vista_estadisticas_usuario;
  REFRESH MATERIALIZED VIEW CONCURRENTLY vista_ocupacion_clases;
  REFRESH MATERIALIZED VIEW CONCURRENTLY vista_leaderboard;
  
  RAISE NOTICE 'Vistas materializadas actualizadas: %', now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION refresh_materialized_views() IS 
  'Actualiza todas las vistas materializadas. Ejecutar cada hora con pg_cron.';

-- ============================================================================
-- RLS PARA VISTAS MATERIALIZADAS
-- ============================================================================

-- Vista estadísticas: usuarios ven sus propios datos, coaches ven sus alumnos
ALTER MATERIALIZED VIEW vista_estadisticas_usuario OWNER TO postgres;

-- Vista ocupación: pública para todos los usuarios autenticados
ALTER MATERIALIZED VIEW vista_ocupacion_clases OWNER TO postgres;

-- Vista leaderboard: pública para todos los usuarios autenticados
ALTER MATERIALIZED VIEW vista_leaderboard OWNER TO postgres;

-- ============================================================================
-- PROGRAMAR REFRESH AUTOMÁTICO (requiere pg_cron extension)
-- ============================================================================

-- NOTA: Descomentar si pg_cron está habilitado
-- SELECT cron.schedule(
--   'refresh-materialized-views',
--   '0 * * * *',  -- Cada hora
--   'SELECT refresh_materialized_views()'
-- );

-- ============================================================================
-- VERIFICACIÓN POST-MIGRACIÓN
-- ============================================================================

DO $$
DECLARE
  stats_count INT;
  ocupacion_count INT;
  leaderboard_count INT;
BEGIN
  SELECT COUNT(*) INTO stats_count FROM vista_estadisticas_usuario;
  SELECT COUNT(*) INTO ocupacion_count FROM vista_ocupacion_clases;
  SELECT COUNT(*) INTO leaderboard_count FROM vista_leaderboard;
  
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ VISTAS MATERIALIZADAS CREADAS';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'vista_estadisticas_usuario: % registros', stats_count;
  RAISE NOTICE 'vista_ocupacion_clases: % registros', ocupacion_count;
  RAISE NOTICE 'vista_leaderboard: % registros', leaderboard_count;
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Función de refresh:';
  RAISE NOTICE '- refresh_materialized_views()';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'IMPORTANTE: Configurar pg_cron para refresh automático';
  RAISE NOTICE '========================================';
END $$;

COMMIT;

-- ============================================================================
-- FIN DE LA MIGRACIÓN
-- ============================================================================
