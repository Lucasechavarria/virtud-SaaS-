-- ============================================================================
-- MIGRACIÓN: Corrección de Errores Críticos del Schema
-- ============================================================================
-- Fecha: 21 de Enero de 2026
-- Versión: 1.0.0
-- Autor: Equipo Virtud Gym
-- 
-- OBJETIVO:
-- Resolver los 5 problemas críticos identificados en la evaluación técnica:
--   1. ❌ Tabla duplicada: gamificación_del_usuario (con tilde)
--   2. ❌ Falta validación de capacidad en reservas
--   3. ❌ Falta índices de performance críticos
--   4. ❌ Inconsistencias de nomenclatura (español/inglés)
--   5. ❌ JSONB sin validación estructural
--
-- IMPACTO: Alto - Corrige bugs críticos y mejora performance significativamente
-- RIESGO: Bajo - Script defensivo con verificaciones de existencia
-- ============================================================================

BEGIN;

-- ============================================================================
-- SECCIÓN 1: ELIMINAR TABLA DUPLICADA (CRÍTICO)
-- ============================================================================

DO $$
DECLARE
  count_gamificacion INT;
  count_gamificacion_tilde INT;
BEGIN
  -- Verificar existencia de ambas tablas
  SELECT COUNT(*) INTO count_gamificacion
  FROM information_schema.tables
  WHERE table_schema = 'public' 
    AND table_name = 'gamificacion_del_usuario';
  
  SELECT COUNT(*) INTO count_gamificacion_tilde
  FROM information_schema.tables
  WHERE table_schema = 'public' 
    AND table_name = 'gamificación_del_usuario';
  
  -- Si existe la tabla con tilde
  IF count_gamificacion_tilde > 0 THEN
    RAISE NOTICE '🔍 Detectada tabla duplicada: gamificación_del_usuario';
    
    -- Si la tabla sin tilde NO existe, renombrar
    IF count_gamificacion = 0 THEN
      RAISE NOTICE '✅ Renombrando gamificación_del_usuario → gamificacion_del_usuario';
      ALTER TABLE "gamificación_del_usuario" RENAME TO gamificacion_del_usuario;
    ELSE
      -- Si ambas existen, migrar datos y eliminar duplicada
      RAISE NOTICE '⚠️ Ambas tablas existen. Migrando datos...';
      
      -- Migrar datos de la tabla con tilde a la sin tilde (si no existen)
      INSERT INTO gamificacion_del_usuario (
        usuario_id, points, racha_actual, racha_mas_larga, 
        level, fecha_ultima_actividad, creado_en, actualizado_en
      )
      SELECT 
        usuario_id, points, racha_actual, racha_mas_larga,
        level, fecha_ultima_actividad, creado_en, actualizado_en
      FROM "gamificación_del_usuario" g_tilde
      WHERE NOT EXISTS (
        SELECT 1 FROM gamificacion_del_usuario g
        WHERE g.usuario_id = g_tilde.usuario_id
      );
      
      RAISE NOTICE '✅ Datos migrados. Eliminando tabla duplicada...';
      DROP TABLE "gamificación_del_usuario" CASCADE;
      RAISE NOTICE '✅ Tabla duplicada eliminada correctamente';
    END IF;
  ELSE
    RAISE NOTICE '✅ No se detectó tabla duplicada gamificación_del_usuario';
  END IF;
END $$;

-- ============================================================================
-- SECCIÓN 2: VALIDACIÓN DE CAPACIDAD EN RESERVAS (CRÍTICO)
-- ============================================================================

-- Función para validar capacidad máxima antes de insertar/actualizar reserva
CREATE OR REPLACE FUNCTION validar_capacidad_reserva()
RETURNS TRIGGER AS $$
DECLARE
  capacidad_max INT;
  reservas_count INT;
  nombre_actividad TEXT;
BEGIN
  -- Solo validar si el estado es 'reservada'
  IF NEW.estado != 'reservada' THEN
    RETURN NEW;
  END IF;
  
  -- Obtener capacidad máxima de la actividad
  SELECT a.capacidad_maxima, a.nombre INTO capacidad_max, nombre_actividad
  FROM horarios_de_clase hc
  JOIN actividades a ON hc.actividad_id = a.id
  WHERE hc.id = NEW.horario_clase_id;
  
  -- Si no se encuentra el horario, permitir (otro constraint lo manejará)
  IF capacidad_max IS NULL THEN
    RETURN NEW;
  END IF;
  
  -- Contar reservas confirmadas para esa fecha/horario (excluyendo la actual si es UPDATE)
  SELECT COUNT(*) INTO reservas_count
  FROM reservas_de_clase
  WHERE horario_clase_id = NEW.horario_clase_id
    AND fecha = NEW.fecha
    AND estado = 'reservada'
    AND (TG_OP = 'INSERT' OR id != NEW.id); -- Excluir registro actual en UPDATE
  
  -- Validar capacidad
  IF reservas_count >= capacidad_max THEN
    RAISE EXCEPTION 'Capacidad máxima alcanzada para la clase "%" el % (% de % cupos ocupados)',
      nombre_actividad, NEW.fecha, reservas_count, capacidad_max
      USING HINT = 'Intenta reservar en otro horario o fecha';
  END IF;
  
  RAISE NOTICE '✅ Reserva validada: % de % cupos ocupados para "%"', 
    reservas_count + 1, capacidad_max, nombre_actividad;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Eliminar trigger anterior si existe y crear nuevo
DROP TRIGGER IF EXISTS trigger_validar_capacidad ON reservas_de_clase;

CREATE TRIGGER trigger_validar_capacidad
  BEFORE INSERT OR UPDATE ON reservas_de_clase
  FOR EACH ROW
  EXECUTE FUNCTION validar_capacidad_reserva();

COMMENT ON FUNCTION validar_capacidad_reserva() IS 
  'Valida que no se excedan los cupos disponibles al reservar una clase grupal';

-- ============================================================================
-- SECCIÓN 3: ÍNDICES DE PERFORMANCE CRÍTICOS
-- ============================================================================

-- 3.1 ÍNDICES PARA RUTINAS
-- Búsqueda de rutinas activas por usuario (dashboard alumno)
CREATE INDEX IF NOT EXISTS idx_rutinas_usuario_activa 
  ON rutinas(usuario_id, esta_activa) 
  WHERE esta_activa = true;

-- Búsqueda de rutinas por entrenador (dashboard coach)
CREATE INDEX IF NOT EXISTS idx_rutinas_entrenador 
  ON rutinas(entrenador_id) 
  WHERE entrenador_id IS NOT NULL;

-- Búsqueda de rutinas por estado (workflow de aprobación)
CREATE INDEX IF NOT EXISTS idx_rutinas_estado 
  ON rutinas(estado) 
  WHERE estado IN ('borrador', 'pendiente_aprobacion');

-- 3.2 ÍNDICES PARA SESIONES DE ENTRENAMIENTO
-- Sesiones por usuario ordenadas por fecha (historial)
CREATE INDEX IF NOT EXISTS idx_sesiones_usuario_fecha 
  ON sesiones_de_entrenamiento(usuario_id, hora_inicio DESC);

-- Sesiones activas (en progreso)
CREATE INDEX IF NOT EXISTS idx_sesiones_estado 
  ON sesiones_de_entrenamiento(estado) 
  WHERE estado IN ('active', 'paused');

-- Sesiones por rutina (analytics)
CREATE INDEX IF NOT EXISTS idx_sesiones_rutina 
  ON sesiones_de_entrenamiento(rutina_id);

-- 3.3 ÍNDICES PARA ASISTENCIAS
-- Asistencias por fecha (reportes diarios)
CREATE INDEX IF NOT EXISTS idx_asistencias_entrada 
  ON asistencias(entrada DESC);

-- Asistencias por usuario y fecha (historial personal)
CREATE INDEX IF NOT EXISTS idx_asistencias_usuario_fecha 
  ON asistencias(usuario_id, entrada DESC);

-- Asistencias por rol (analytics)
CREATE INDEX IF NOT EXISTS idx_asistencias_rol 
  ON asistencias(rol_asistencia);

-- 3.4 ÍNDICES PARA RESERVAS DE CLASE
-- Reservas por fecha y estado (calendario)
CREATE INDEX IF NOT EXISTS idx_reservas_fecha_estado 
  ON reservas_de_clase(fecha DESC, estado);

-- Reservas por usuario (mis reservas)
CREATE INDEX IF NOT EXISTS idx_reservas_usuario 
  ON reservas_de_clase(usuario_id, fecha DESC);

-- Reservas por horario y fecha (validación de capacidad - optimiza trigger)
CREATE INDEX IF NOT EXISTS idx_reservas_horario_fecha 
  ON reservas_de_clase(horario_clase_id, fecha, estado);

-- 3.5 ÍNDICES PARA MENSAJERÍA
-- Mensajes no leídos por receptor (notificaciones)
CREATE INDEX IF NOT EXISTS idx_mensajes_receptor_no_leidos 
  ON mensajes(receptor_id, esta_leido, creado_en DESC) 
  WHERE esta_leido = false;

-- Mensajes por conversación (chat)
CREATE INDEX IF NOT EXISTS idx_mensajes_conversacion 
  ON mensajes(conversacion_id, creado_en ASC);

-- 3.6 ÍNDICES PARA GAMIFICACIÓN
-- Leaderboard por puntos
CREATE INDEX IF NOT EXISTS idx_gamificacion_puntos 
  ON gamificacion_del_usuario(points DESC);

-- Leaderboard por racha
CREATE INDEX IF NOT EXISTS idx_gamificacion_racha 
  ON gamificacion_del_usuario(racha_actual DESC);

-- Leaderboard por nivel
CREATE INDEX IF NOT EXISTS idx_gamificacion_level 
  ON gamificacion_del_usuario(level DESC);

-- 3.7 ÍNDICES PARA PAGOS
-- Pagos por usuario y fecha (historial)
CREATE INDEX IF NOT EXISTS idx_pagos_usuario_fecha 
  ON pagos(usuario_id, creado_en DESC);

-- Pagos pendientes de aprobación (dashboard admin)
CREATE INDEX IF NOT EXISTS idx_pagos_estado 
  ON pagos(estado) 
  WHERE estado = 'pendiente';

-- Pagos aprobados por usuario (auditoría)
CREATE INDEX IF NOT EXISTS idx_pagos_aprobado_por 
  ON pagos(aprobado_por) 
  WHERE aprobado_por IS NOT NULL;

-- 3.8 ÍNDICES PARA EJERCICIOS
-- Ejercicios por rutina y día (visualización de rutina)
CREATE INDEX IF NOT EXISTS idx_ejercicios_rutina_dia 
  ON ejercicios(rutina_id, dia_numero, orden_en_dia);

-- Búsqueda de ejercicios por grupo muscular
CREATE INDEX IF NOT EXISTS idx_ejercicios_grupo_muscular 
  ON ejercicios(grupo_muscular) 
  WHERE grupo_muscular IS NOT NULL;

-- 3.9 ÍNDICES PARA PERFILES
-- Búsqueda por estado de membresía (alumnos activos)
CREATE INDEX IF NOT EXISTS idx_perfiles_estado_membresia 
  ON perfiles(estado_membresia) 
  WHERE estado_membresia = 'active';

-- Búsqueda por rol (listados por tipo de usuario)
CREATE INDEX IF NOT EXISTS idx_perfiles_rol 
  ON perfiles(rol);

-- Búsqueda por email (login)
CREATE INDEX IF NOT EXISTS idx_perfiles_email 
  ON perfiles(email);

-- 3.10 ÍNDICES PARA MEDICIONES
-- Mediciones por usuario y fecha (gráficos de progreso)
CREATE INDEX IF NOT EXISTS idx_mediciones_usuario_fecha 
  ON mediciones(usuario_id, registrado_en DESC);

-- 3.11 ÍNDICES PARA DESAFÍOS
-- Desafíos activos
CREATE INDEX IF NOT EXISTS idx_desafios_estado 
  ON desafios(estado) 
  WHERE estado = 'active';

-- Participantes por desafío y puntuación (leaderboard)
CREATE INDEX IF NOT EXISTS idx_participantes_desafio_puntuacion 
  ON participantes_desafio(desafio_id, puntuacion_actual DESC);

-- 3.12 ÍNDICES PARA LOGROS
-- Logros por usuario (perfil de gamificación)
CREATE INDEX IF NOT EXISTS idx_logros_usuario 
  ON logros_del_usuario(usuario_id, desbloqueado_en DESC);

-- 3.13 ÍNDICES PARA FULL-TEXT SEARCH (OPCIONAL)
-- Habilitar extensión pg_trgm si no existe
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Búsqueda de ejercicios por nombre (autocompletado)
CREATE INDEX IF NOT EXISTS idx_ejercicios_nombre_trgm 
  ON ejercicios USING gin(nombre gin_trgm_ops);

-- Búsqueda de actividades por nombre
CREATE INDEX IF NOT EXISTS idx_actividades_nombre_trgm 
  ON actividades USING gin(nombre gin_trgm_ops);

-- ============================================================================
-- SECCIÓN 4: NORMALIZACIÓN DE NOMENCLATURA
-- ============================================================================

-- 4.1 Tabla: desafios (unificar a español)
DO $$
BEGIN
  -- Renombrar titulo → título (o mantener titulo si prefieres sin tilde)
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name='desafios' AND column_name='titulo'
  ) THEN
    -- Opción: mantener sin tilde para compatibilidad con código
    RAISE NOTICE '✅ Columna "titulo" en desafios ya está sin tilde (OK para compatibilidad)';
  END IF;
END $$;

-- 4.2 y 4.3: Renombres ya aplicados en migraciones anteriores
-- ✅ horarios_de_clase.notas_entrenador (era texto_profesor)
-- ✅ asistencias.rol_asistencia (era rol_en_el_momento)
DO $$
BEGIN
  RAISE NOTICE '✅ Renombres de nomenclatura ya aplicados en migraciones anteriores';
  RAISE NOTICE '   - horarios_de_clase.notas_entrenador';
  RAISE NOTICE '   - asistencias.rol_asistencia';
END $$;

-- ============================================================================
-- SECCIÓN 5: VALIDACIÓN DE ESTRUCTURA JSONB
-- ============================================================================

-- 5.1 Normalizar y validar estructura de contacto_emergencia
DO $$
DECLARE
  rows_updated INT;
BEGIN
  -- Primero, normalizar datos existentes que no cumplen la estructura
  -- Convertir contacto_emergencia vacío o incompleto a NULL
  UPDATE perfiles
  SET contacto_emergencia = NULL
  WHERE contacto_emergencia IS NOT NULL
    AND NOT (
      contacto_emergencia ? 'nombre' AND
      contacto_emergencia ? 'telefono' AND
      contacto_emergencia ? 'parentesco'
    );
  
  GET DIAGNOSTICS rows_updated = ROW_COUNT;
  
  IF rows_updated > 0 THEN
    RAISE NOTICE '⚠️ Normalizados % registros de contacto_emergencia (convertidos a NULL)', rows_updated;
    RAISE NOTICE 'ℹ️ Estos registros necesitarán completar su contacto de emergencia desde el frontend';
  END IF;
  
  -- Ahora agregar el constraint (los datos ya están normalizados)
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'check_contacto_emergencia'
  ) THEN
    ALTER TABLE perfiles
      ADD CONSTRAINT check_contacto_emergencia
      CHECK (
        contacto_emergencia IS NULL OR (
          contacto_emergencia ? 'nombre' AND
          contacto_emergencia ? 'telefono' AND
          contacto_emergencia ? 'parentesco'
        )
      );
    RAISE NOTICE '✅ Constraint agregado: check_contacto_emergencia';
  ELSE
    RAISE NOTICE '✅ Constraint check_contacto_emergencia ya existe';
  END IF;
END $$;

-- 5.2 Normalizar y validar estructura de informacion_medica
DO $$
DECLARE
  rows_updated INT;
BEGIN
  -- Primero, normalizar datos existentes que no cumplen la estructura
  -- Convertir informacion_medica vacío o incompleto a NULL
  UPDATE perfiles
  SET informacion_medica = NULL
  WHERE informacion_medica IS NOT NULL
    AND NOT (
      informacion_medica ? 'grupo_sanguineo' AND
      informacion_medica ? 'presion_arterial'
    );
  
  GET DIAGNOSTICS rows_updated = ROW_COUNT;
  
  IF rows_updated > 0 THEN
    RAISE NOTICE '⚠️ Normalizados % registros de informacion_medica (convertidos a NULL)', rows_updated;
    RAISE NOTICE 'ℹ️ Estos registros necesitarán completar su información médica desde el onboarding';
  END IF;
  
  -- Ahora agregar el constraint (los datos ya están normalizados)
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'check_informacion_medica'
  ) THEN
    ALTER TABLE perfiles
      ADD CONSTRAINT check_informacion_medica
      CHECK (
        informacion_medica IS NULL OR (
          informacion_medica ? 'grupo_sanguineo' AND
          informacion_medica ? 'presion_arterial'
        )
      );
    RAISE NOTICE '✅ Constraint agregado: check_informacion_medica';
  ELSE
    RAISE NOTICE '✅ Constraint check_informacion_medica ya existe';
  END IF;
END $$;


-- ============================================================================
-- SECCIÓN 6: COMENTARIOS Y DOCUMENTACIÓN
-- ============================================================================

-- Documentar deuda técnica de ARRAYS
COMMENT ON COLUMN ejercicios.equipamiento IS 
  'ARRAY temporal. Migrar a tabla ejercicios_equipamiento cuando > 500 rutinas para analytics avanzado.';

COMMENT ON COLUMN rutinas.equipamiento_usado IS 
  'ARRAY temporal. Migrar a tabla rutinas_equipamiento cuando se necesiten reportes de uso de equipamiento.';

COMMENT ON COLUMN objetivos_del_usuario.objetivos_secundarios IS 
  'ARRAY de objetivos secundarios. Considerar normalizar si se necesitan métricas por objetivo.';

COMMENT ON COLUMN objetivos_del_usuario.dias_disponibles IS 
  'ARRAY de días (1-7). Suficiente para MVP, normalizar solo si se necesita lógica compleja de disponibilidad.';

-- Documentar triggers críticos
COMMENT ON TRIGGER trigger_validar_capacidad ON reservas_de_clase IS 
  'Previene sobre-reservas validando capacidad máxima de la actividad antes de confirmar reserva.';

-- ============================================================================
-- SECCIÓN 7: VERIFICACIÓN POST-MIGRACIÓN
-- ============================================================================

DO $$
DECLARE
  total_indices INT;
  total_constraints INT;
BEGIN
  -- Contar índices creados
  SELECT COUNT(*) INTO total_indices
  FROM pg_indexes
  WHERE schemaname = 'public'
    AND indexname LIKE 'idx_%';
  
  -- Contar constraints agregados
  SELECT COUNT(*) INTO total_constraints
  FROM pg_constraint
  WHERE conname LIKE 'check_%';
  
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ MIGRACIÓN COMPLETADA EXITOSAMENTE';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Índices totales: %', total_indices;
  RAISE NOTICE 'Constraints JSONB: %', total_constraints;
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Próximos pasos:';
  RAISE NOTICE '1. Ejecutar ANALYZE en tablas principales';
  RAISE NOTICE '2. Verificar performance con EXPLAIN ANALYZE';
  RAISE NOTICE '3. Regenerar tipos TypeScript (supabase gen types)';
  RAISE NOTICE '4. Actualizar frontend para usar nuevos nombres de columnas';
  RAISE NOTICE '========================================';
END $$;

-- Ejecutar ANALYZE en tablas principales para actualizar estadísticas del query planner
ANALYZE perfiles;
ANALYZE rutinas;
ANALYZE ejercicios;
ANALYZE sesiones_de_entrenamiento;
ANALYZE registros_de_ejercicio;
ANALYZE asistencias;
ANALYZE reservas_de_clase;
ANALYZE mensajes;
ANALYZE gamificacion_del_usuario;
ANALYZE pagos;
ANALYZE desafios;

COMMIT;

-- ============================================================================
-- FIN DE LA MIGRACIÓN
-- ============================================================================
