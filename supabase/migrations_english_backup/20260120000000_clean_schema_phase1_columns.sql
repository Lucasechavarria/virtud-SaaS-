-- =============================================================================================
-- MIGRACIÓN: LIMPIEZA Y REFACTORIZACIÓN DE SCHEMA (FASE 1 - NORMALIZACIÓN)
-- Fecha: 2026-01-20
-- Versión: 2.0 (Mejorada con defensivas)
-- Objetivo: Normalizar columnas a español con verificaciones defensivas
-- =============================================================================================

-- 0. DESACTIVAR TRIGGERS TEMPORALMENTE
SET session_replication_role = 'replica';

-- =============================================================================================
-- HELPER: Función para renombrar columnas de forma segura
-- =============================================================================================
CREATE OR REPLACE FUNCTION safe_rename_column(
  p_table_name text,
  p_old_column_name text,
  p_new_column_name text
) RETURNS void AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public'
      AND table_name = p_table_name 
      AND column_name = p_old_column_name
  ) THEN
    EXECUTE format('ALTER TABLE public.%I RENAME COLUMN %I TO %I', 
      p_table_name, p_old_column_name, p_new_column_name);
    RAISE NOTICE 'Renombrado: %.% -> %', p_table_name, p_old_column_name, p_new_column_name;
  ELSE
    RAISE NOTICE 'SKIP: %.% no existe', p_table_name, p_old_column_name;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================================
-- 1. ELIMINAR TABLA DUPLICADA: gamificación_del_usuario (con tilde)
-- =============================================================================================
-- DECISIÓN SEMÁNTICA: Solo mantenemos gamificacion_del_usuario (sin tilde)
-- Razón: Compatibilidad con tooling JS/TS y ORMs
DROP TABLE IF EXISTS public.gamificación_del_usuario CASCADE;

-- =============================================================================================
-- 2. NORMALIZAR TABLA: ejercicios
-- =============================================================================================
SELECT safe_rename_column('ejercicios', 'name', 'nombre');
SELECT safe_rename_column('ejercicios', 'description', 'descripcion');
SELECT safe_rename_column('ejercicios', 'sets', 'series');
SELECT safe_rename_column('ejercicios', 'reps', 'repeticiones');
SELECT safe_rename_column('ejercicios', 'instructions', 'instrucciones');

-- =============================================================================================
-- 3. NORMALIZAR TABLA: equipamiento
-- =============================================================================================
SELECT safe_rename_column('equipamiento', 'name', 'nombre');
SELECT safe_rename_column('equipamiento', 'brand', 'marca');
SELECT safe_rename_column('equipamiento', 'quantity', 'cantidad');
SELECT safe_rename_column('equipamiento', 'notes', 'notas');
SELECT safe_rename_column('equipamiento', 'image_url', 'url_imagen');

-- =============================================================================================
-- 4. NORMALIZAR TABLA: rutinas
-- =============================================================================================
SELECT safe_rename_column('rutinas', 'name', 'nombre');
SELECT safe_rename_column('rutinas', 'description', 'descripcion');
SELECT safe_rename_column('rutinas', 'goal', 'objetivo');

-- =============================================================================================
-- 5. NORMALIZAR TABLA: desafios
-- =============================================================================================
SELECT safe_rename_column('desafios', 'title', 'titulo');
SELECT safe_rename_column('desafios', 'description', 'descripcion');
SELECT safe_rename_column('desafios', 'rules', 'reglas');
SELECT safe_rename_column('desafios', 'type', 'tipo');
SELECT safe_rename_column('desafios', 'points_reward', 'puntos_recompensa');
SELECT safe_rename_column('desafios', 'status', 'estado');
SELECT safe_rename_column('desafios', 'created_by', 'creado_por');
SELECT safe_rename_column('desafios', 'judge_id', 'juez_id');
SELECT safe_rename_column('desafios', 'winner_id', 'ganador_id');
SELECT safe_rename_column('desafios', 'start_date', 'fecha_inicio');
SELECT safe_rename_column('desafios', 'end_date', 'fecha_fin');
SELECT safe_rename_column('desafios', 'created_at', 'creado_en');
SELECT safe_rename_column('desafios', 'updated_at', 'actualizado_en');

-- =============================================================================================
-- 6. NORMALIZAR TABLA: participantes_desafio
-- =============================================================================================
SELECT safe_rename_column('participantes_desafio', 'challenge_id', 'desafio_id');
SELECT safe_rename_column('participantes_desafio', 'user_id', 'usuario_id');
SELECT safe_rename_column('participantes_desafio', 'current_score', 'puntuacion_actual');
SELECT safe_rename_column('participantes_desafio', 'status', 'estado');
SELECT safe_rename_column('participantes_desafio', 'joined_at', 'unido_en');
SELECT safe_rename_column('participantes_desafio', 'updated_at', 'actualizado_en');

-- =============================================================================================
-- 7. NORMALIZAR TABLA: reportes_de_alumnos
-- =============================================================================================
SELECT safe_rename_column('reportes_de_alumnos', 'user_id', 'usuario_id');
SELECT safe_rename_column('reportes_de_alumnos', 'title', 'titulo');
SELECT safe_rename_column('reportes_de_alumnos', 'description', 'descripcion');
SELECT safe_rename_column('reportes_de_alumnos', 'type', 'tipo');
SELECT safe_rename_column('reportes_de_alumnos', 'status', 'estado');
SELECT safe_rename_column('reportes_de_alumnos', 'created_at', 'creado_en');
SELECT safe_rename_column('reportes_de_alumnos', 'updated_at', 'actualizado_en');
SELECT safe_rename_column('reportes_de_alumnos', 'resolved_at', 'resuelto_en');
SELECT safe_rename_column('reportes_de_alumnos', 'resolved_by', 'resuelto_por');

-- =============================================================================================
-- 8. NORMALIZAR TABLA: registros_acceso_rutina
-- =============================================================================================
SELECT safe_rename_column('registros_acceso_rutina', 'routine_id', 'rutina_id');
SELECT safe_rename_column('registros_acceso_rutina', 'user_id', 'usuario_id');
SELECT safe_rename_column('registros_acceso_rutina', 'action', 'accion');
SELECT safe_rename_column('registros_acceso_rutina', 'ip_address', 'direccion_ip');
SELECT safe_rename_column('registros_acceso_rutina', 'user_agent', 'agente_usuario');
SELECT safe_rename_column('registros_acceso_rutina', 'device_info', 'info_dispositivo');
SELECT safe_rename_column('registros_acceso_rutina', 'latitude', 'latitud');
SELECT safe_rename_column('registros_acceso_rutina', 'longitude', 'longitud');
SELECT safe_rename_column('registros_acceso_rutina', 'created_at', 'creado_en');

-- =============================================================================================
-- 9. NORMALIZAR TABLA: relacion_alumno_coach
-- =============================================================================================
SELECT safe_rename_column('relacion_alumno_coach', 'user_id', 'usuario_id');
SELECT safe_rename_column('relacion_alumno_coach', 'coach_id', 'entrenador_id');
SELECT safe_rename_column('relacion_alumno_coach', 'is_primary', 'es_principal');
SELECT safe_rename_column('relacion_alumno_coach', 'assigned_at', 'asignado_en');
SELECT safe_rename_column('relacion_alumno_coach', 'is_active', 'esta_activo');

-- =============================================================================================
-- 10. NORMALIZAR TABLA: participantes_conversacion
-- =============================================================================================
SELECT safe_rename_column('participantes_conversacion', 'conversation_id', 'conversacion_id');
SELECT safe_rename_column('participantes_conversacion', 'user_id', 'usuario_id');
SELECT safe_rename_column('participantes_conversacion', 'joined_at', 'unido_en');

-- =============================================================================================
-- 11. NORMALIZAR TABLA: objetivos_del_usuario
-- =============================================================================================
SELECT safe_rename_column('objetivos_del_usuario', 'target_body_fat_percentage', 'porcentaje_grasa_objetivo');
SELECT safe_rename_column('objetivos_del_usuario', 'target_muscle_mass', 'masa_muscular_objetivo');
SELECT safe_rename_column('objetivos_del_usuario', 'start_date', 'fecha_inicio');
SELECT safe_rename_column('objetivos_del_usuario', 'target_date', 'fecha_objetivo');

-- =============================================================================================
-- 12. NORMALIZAR TABLA: mediciones
-- =============================================================================================
SELECT safe_rename_column('mediciones', 'weight', 'peso');
SELECT safe_rename_column('mediciones', 'notes', 'notas');

-- =============================================================================================
-- 13. NORMALIZAR TABLA: pagos
-- =============================================================================================
SELECT safe_rename_column('pagos', 'concept', 'concepto');
SELECT safe_rename_column('pagos', 'payment_provider', 'proveedor_pago');
SELECT safe_rename_column('pagos', 'provider_payment_id', 'id_pago_proveedor');
SELECT safe_rename_column('pagos', 'notes', 'notas');
SELECT safe_rename_column('pagos', 'metadata', 'metadatos');

-- =============================================================================================
-- 14. NORMALIZAR TABLA: planes_nutricionales
-- =============================================================================================
SELECT safe_rename_column('planes_nutricionales', 'meals', 'comidas');
SELECT safe_rename_column('planes_nutricionales', 'supplements', 'suplementos');
SELECT safe_rename_column('planes_nutricionales', 'restrictions', 'restricciones');

-- =============================================================================================
-- 15. NORMALIZAR TABLA: reservas_de_clase
-- =============================================================================================
SELECT safe_rename_column('reservas_de_clase', 'date', 'fecha');

-- =============================================================================================
-- 16. NORMALIZAR TABLA: actividades
-- =============================================================================================
-- DECISIÓN SEMÁNTICA: Eliminar 'category' porque 'tipo' ya cumple esa función
-- Verificación: Si category tiene datos únicos que tipo no tiene, migrar primero
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name='actividades' AND column_name='category'
  ) THEN
    -- Verificar si hay datos en category que no estén en tipo
    IF EXISTS (
      SELECT 1 FROM actividades 
      WHERE category IS NOT NULL AND (tipo IS NULL OR tipo != category)
    ) THEN
      RAISE WARNING 'ATENCIÓN: actividades.category tiene datos que difieren de tipo. Revisar antes de eliminar.';
    ELSE
      ALTER TABLE public.actividades DROP COLUMN category;
      RAISE NOTICE 'Eliminada columna redundante: actividades.category';
    END IF;
  END IF;
END $$;

-- =============================================================================================
-- 17. NORMALIZAR TABLA: logros_del_usuario
-- =============================================================================================
SELECT safe_rename_column('logros_del_usuario', 'achievement_id', 'logro_id');

-- =============================================================================================
-- 18. LIMPIAR FUNCIÓN HELPER
-- =============================================================================================
DROP FUNCTION IF EXISTS safe_rename_column(text, text, text);

-- =============================================================================================
-- 19. REACTIVAR TRIGGERS
-- =============================================================================================
SET session_replication_role = 'origin';

-- =============================================================================================
-- CHECKPOINT: FASE 1 COMPLETADA
-- =============================================================================================
-- Siguiente: Ejecutar 20260120000001_clean_schema_constraints.sql
