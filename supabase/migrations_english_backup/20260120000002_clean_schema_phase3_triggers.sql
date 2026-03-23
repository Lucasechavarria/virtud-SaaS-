-- =============================================================================================
-- MIGRACIÓN: LIMPIEZA Y REFACTORIZACIÓN DE SCHEMA (FASE 3 - TRIGGERS)
-- Fecha: 2026-01-20
-- Versión: 2.0
-- Objetivo: Completar triggers para todas las tablas con actualizado_en
-- =============================================================================================

-- =============================================================================================
-- 1. ACTUALIZAR FUNCIÓN DE TIMESTAMP
-- =============================================================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.actualizado_en = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================================
-- 2. HELPER: Crear trigger de forma segura
-- =============================================================================================
CREATE OR REPLACE FUNCTION create_updated_at_trigger(p_table_name text)
RETURNS void AS $$
DECLARE
  trigger_name text;
BEGIN
  trigger_name := 'update_' || p_table_name || '_updated_at';
  
  -- Eliminar trigger si existe
  EXECUTE format('DROP TRIGGER IF EXISTS %I ON public.%I', trigger_name, p_table_name);
  
  -- Crear trigger
  EXECUTE format('
    CREATE TRIGGER %I
      BEFORE UPDATE ON public.%I
      FOR EACH ROW 
      EXECUTE FUNCTION update_updated_at_column()
  ', trigger_name, p_table_name);
  
  RAISE NOTICE 'Trigger creado: % en tabla %', trigger_name, p_table_name;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================================
-- 3. CREAR TRIGGERS PARA TODAS LAS TABLAS CON actualizado_en
-- =============================================================================================

-- Tablas principales
SELECT create_updated_at_trigger('perfiles');
SELECT create_updated_at_trigger('actividades');
SELECT create_updated_at_trigger('horarios_de_clase');
SELECT create_updated_at_trigger('reservas_de_clase');
SELECT create_updated_at_trigger('objetivos_del_usuario');
SELECT create_updated_at_trigger('mediciones');
SELECT create_updated_at_trigger('rutinas');
SELECT create_updated_at_trigger('ejercicios');
SELECT create_updated_at_trigger('equipamiento');
SELECT create_updated_at_trigger('planes_nutricionales');
SELECT create_updated_at_trigger('gamificacion_del_usuario');
SELECT create_updated_at_trigger('pagos');
SELECT create_updated_at_trigger('mensajes');

-- Tablas de desafíos
SELECT create_updated_at_trigger('desafios');
SELECT create_updated_at_trigger('participantes_desafio');

-- Tablas de reportes
SELECT create_updated_at_trigger('reportes_de_alumnos');

-- =============================================================================================
-- 4. LIMPIAR FUNCIÓN HELPER
-- =============================================================================================
DROP FUNCTION IF EXISTS create_updated_at_trigger(text);

-- =============================================================================================
-- CHECKPOINT: FASE 3 COMPLETADA
-- =============================================================================================
-- Migración completa. Schema normalizado y consistente.
