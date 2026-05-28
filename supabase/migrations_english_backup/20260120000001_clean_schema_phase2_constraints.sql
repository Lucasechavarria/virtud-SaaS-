-- =============================================================================================
-- MIGRACIÓN: LIMPIEZA Y REFACTORIZACIÓN DE SCHEMA (FASE 2 - CONSTRAINTS)
-- Fecha: 2026-01-20
-- Versión: 2.0
-- Objetivo: Actualizar constraints con nombres en español
-- =============================================================================================

-- 0. DESACTIVAR TRIGGERS TEMPORALMENTE
SET session_replication_role = 'replica';

-- =============================================================================================
-- 1. ACTUALIZAR CONSTRAINTS: desafios
-- =============================================================================================
DO $$
BEGIN
  -- Eliminar constraints antiguas si existen
  ALTER TABLE public.desafios DROP CONSTRAINT IF EXISTS challenges_created_by_fkey;
  ALTER TABLE public.desafios DROP CONSTRAINT IF EXISTS challenges_judge_id_fkey;
  ALTER TABLE public.desafios DROP CONSTRAINT IF EXISTS challenges_winner_id_fkey;
  
  -- Crear constraints con nombres en español
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'desafios_creado_por_fkey'
  ) THEN
    ALTER TABLE public.desafios 
      ADD CONSTRAINT desafios_creado_por_fkey 
      FOREIGN KEY (creado_por) REFERENCES public.perfiles(id);
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'desafios_juez_id_fkey'
  ) THEN
    ALTER TABLE public.desafios 
      ADD CONSTRAINT desafios_juez_id_fkey 
      FOREIGN KEY (juez_id) REFERENCES public.perfiles(id);
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'desafios_ganador_id_fkey'
  ) THEN
    ALTER TABLE public.desafios 
      ADD CONSTRAINT desafios_ganador_id_fkey 
      FOREIGN KEY (ganador_id) REFERENCES public.perfiles(id);
  END IF;
END $$;

-- =============================================================================================
-- 2. ACTUALIZAR CONSTRAINTS: participantes_desafio
-- =============================================================================================
DO $$
BEGIN
  ALTER TABLE public.participantes_desafio DROP CONSTRAINT IF EXISTS challenge_participants_challenge_id_fkey;
  ALTER TABLE public.participantes_desafio DROP CONSTRAINT IF EXISTS challenge_participants_user_id_fkey;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'participantes_desafio_desafio_id_fkey'
  ) THEN
    ALTER TABLE public.participantes_desafio 
      ADD CONSTRAINT participantes_desafio_desafio_id_fkey 
      FOREIGN KEY (desafio_id) REFERENCES public.desafios(id);
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'participantes_desafio_usuario_id_fkey'
  ) THEN
    ALTER TABLE public.participantes_desafio 
      ADD CONSTRAINT participantes_desafio_usuario_id_fkey 
      FOREIGN KEY (usuario_id) REFERENCES public.perfiles(id);
  END IF;
END $$;

-- =============================================================================================
-- 3. REACTIVAR TRIGGERS
-- =============================================================================================
SET session_replication_role = 'origin';

-- =============================================================================================
-- CHECKPOINT: FASE 2 COMPLETADA
-- =============================================================================================
-- Siguiente: Ejecutar 20260120000002_clean_schema_triggers.sql
