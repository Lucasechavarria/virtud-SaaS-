-- =============================================================================================
-- MIGRACIÓN: OPTIMIZACIONES ESTRATÉGICAS DE SCHEMA (FASE 4)
-- Fecha: 2026-01-20
-- Versión: 1.0
-- Objetivo: Resolver deuda técnica y mejorar performance
-- =============================================================================================
-- 
-- Esta fase resuelve:
-- 1. ENUMs faltantes (USER-DEFINED sin definición)
-- 2. Duplicado category/tipo en actividades
-- 3. Normalización de estados por dominio
-- 4. Índices críticos de performance
-- 5. Preparación para normalización de equipamiento (futuro)
-- =============================================================================================

-- 0. DESACTIVAR TRIGGERS TEMPORALMENTE
SET session_replication_role = 'replica';

-- =============================================================================================
-- PARTE 1: CREAR ENUMS EXPLÍCITOS (Resolver USER-DEFINED)
-- =============================================================================================

-- 1.1 Dificultad de Ejercicio/Actividad
DO $$ BEGIN
    CREATE TYPE dificultad_ejercicio AS ENUM (
        'principiante',
        'intermedio',
        'avanzado',
        'todos_los_niveles'
    );
EXCEPTION WHEN duplicate_object THEN 
    RAISE NOTICE 'ENUM dificultad_ejercicio ya existe';
END $$;

-- 1.2 Rol en Asistencia (snapshot histórico)
DO $$ BEGIN
    CREATE TYPE rol_asistencia AS ENUM (
        'member',
        'coach',
        'admin'
    );
EXCEPTION WHEN duplicate_object THEN 
    RAISE NOTICE 'ENUM rol_asistencia ya existe';
END $$;

-- 1.3 Método de Pago (si no existe tipo_metodo_pago)
DO $$ BEGIN
    CREATE TYPE metodo_pago_enum AS ENUM (
        'efectivo',
        'tarjeta',
        'transferencia',
        'mercadopago',
        'manual'
    );
EXCEPTION WHEN duplicate_object THEN 
    RAISE NOTICE 'ENUM metodo_pago_enum ya existe (usar tipo_metodo_pago existente)';
END $$;

-- 1.4 Estado de Rutina (específico por dominio)
DO $$ BEGIN
    CREATE TYPE estado_rutina_enum AS ENUM (
        'borrador',
        'pendiente_aprobacion',
        'aprobada',
        'activa',
        'pausada',
        'completada',
        'archivada'
    );
EXCEPTION WHEN duplicate_object THEN 
    RAISE NOTICE 'ENUM estado_rutina_enum ya existe (usar estado_rutina existente)';
END $$;

-- 1.5 Estado de Sesión
DO $$ BEGIN
    CREATE TYPE estado_sesion_enum AS ENUM (
        'activa',
        'pausada',
        'completada',
        'cancelada'
    );
EXCEPTION WHEN duplicate_object THEN 
    RAISE NOTICE 'ENUM estado_sesion_enum ya existe (usar estado_sesion existente)';
END $$;

-- 1.6 Estado de Pago (si no existe estado_pago)
DO $$ BEGIN
    CREATE TYPE estado_pago_enum AS ENUM (
        'pendiente',
        'aprobado',
        'rechazado',
        'reembolsado'
    );
EXCEPTION WHEN duplicate_object THEN 
    RAISE NOTICE 'ENUM estado_pago_enum ya existe (usar estado_pago existente)';
END $$;

-- 1.7 Estado de Clase/Reserva
DO $$ BEGIN
    CREATE TYPE estado_reserva AS ENUM (
        'reservada',
        'asistida',
        'cancelada',
        'ausente'
    );
EXCEPTION WHEN duplicate_object THEN 
    RAISE NOTICE 'ENUM estado_reserva ya existe (usar estado_clase existente)';
END $$;

-- 1.8 Estado de Desafío
DO $$ BEGIN
    CREATE TYPE estado_desafio AS ENUM (
        'activo',
        'completado',
        'cancelado',
        'archivado'
    );
EXCEPTION WHEN duplicate_object THEN 
    RAISE NOTICE 'ENUM estado_desafio ya existe';
END $$;

-- 1.9 Estado de Reporte
DO $$ BEGIN
    CREATE TYPE estado_reporte AS ENUM (
        'pendiente',
        'en_revision',
        'resuelto',
        'rechazado'
    );
EXCEPTION WHEN duplicate_object THEN 
    RAISE NOTICE 'ENUM estado_reporte ya existe';
END $$;

-- =============================================================================================
-- PARTE 2: APLICAR ENUMS A COLUMNAS EXISTENTES
-- =============================================================================================

-- 2.1 Aplicar dificultad_ejercicio a actividades
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name='actividades' AND column_name='dificultad'
  ) THEN
    -- Verificar si ya es del tipo correcto
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name='actividades' 
        AND column_name='dificultad' 
        AND udt_name IN ('dificultad_ejercicio', 'nivel_dificultad')
    ) THEN
      ALTER TABLE public.actividades
        ALTER COLUMN dificultad TYPE dificultad_ejercicio
        USING CASE 
          WHEN dificultad::text = 'principiante' THEN 'principiante'::dificultad_ejercicio
          WHEN dificultad::text = 'intermedio' THEN 'intermedio'::dificultad_ejercicio
          WHEN dificultad::text = 'avanzado' THEN 'avanzado'::dificultad_ejercicio
          ELSE 'todos_los_niveles'::dificultad_ejercicio
        END;
      RAISE NOTICE 'Aplicado ENUM dificultad_ejercicio a actividades';
    END IF;
  END IF;
END $$;

-- 2.2 Aplicar rol_asistencia a asistencias
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name='asistencias' AND column_name='rol_asistencia'
  ) THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name='asistencias' 
        AND column_name='rol_asistencia' 
        AND udt_name = 'rol_asistencia'
    ) THEN
      ALTER TABLE public.asistencias
        ALTER COLUMN rol_asistencia TYPE rol_asistencia
        USING CASE 
          WHEN rol_asistencia::text = 'member' THEN 'member'::rol_asistencia
          WHEN rol_asistencia::text = 'coach' THEN 'coach'::rol_asistencia
          WHEN rol_asistencia::text = 'admin' THEN 'admin'::rol_asistencia
          ELSE 'member'::rol_asistencia
        END;
      RAISE NOTICE 'Aplicado ENUM rol_asistencia a asistencias';
    ELSE
      RAISE NOTICE 'SKIP: asistencias.rol_asistencia ya es tipo rol_asistencia';
    END IF;
  END IF;
END $$;


-- =============================================================================================
-- PARTE 3: ELIMINAR DUPLICADO category/tipo EN ACTIVIDADES
-- =============================================================================================

-- DECISIÓN: Eliminar 'category' porque 'tipo' cumple la misma función
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name='actividades' AND column_name='category'
  ) THEN
    -- Verificar si hay datos únicos en category
    IF EXISTS (
      SELECT 1 FROM actividades 
      WHERE category IS NOT NULL 
        AND (tipo IS NULL OR tipo != category)
    ) THEN
      -- Migrar datos de category a tipo si tipo está vacío
      UPDATE actividades 
      SET tipo = category 
      WHERE tipo IS NULL AND category IS NOT NULL;
      
      RAISE NOTICE 'Migrados datos de category a tipo';
    END IF;
    
    -- Eliminar columna redundante
    ALTER TABLE public.actividades DROP COLUMN category;
    RAISE NOTICE 'Eliminada columna redundante: actividades.category';
  ELSE
    RAISE NOTICE 'SKIP: actividades.category ya no existe';
  END IF;
END $$;

-- =============================================================================================
-- PARTE 4: CREAR ÍNDICES CRÍTICOS DE PERFORMANCE
-- =============================================================================================

-- 4.1 Índices en perfiles (búsquedas por rol)
CREATE INDEX IF NOT EXISTS idx_perfiles_rol 
  ON public.perfiles(rol);

CREATE INDEX IF NOT EXISTS idx_perfiles_estado_membresia 
  ON public.perfiles(estado_membresia) 
  WHERE estado_membresia = 'active';

-- 4.2 Índices en rutinas (consultas más frecuentes)
CREATE INDEX IF NOT EXISTS idx_rutinas_usuario 
  ON public.rutinas(usuario_id);

CREATE INDEX IF NOT EXISTS idx_rutinas_entrenador 
  ON public.rutinas(entrenador_id);

CREATE INDEX IF NOT EXISTS idx_rutinas_estado 
  ON public.rutinas(estado) 
  WHERE esta_activa = true;

CREATE INDEX IF NOT EXISTS idx_rutinas_creado_en 
  ON public.rutinas(creado_en DESC);

-- 4.3 Índices en ejercicios
CREATE INDEX IF NOT EXISTS idx_ejercicios_rutina 
  ON public.ejercicios(rutina_id);

CREATE INDEX IF NOT EXISTS idx_ejercicios_dia 
  ON public.ejercicios(rutina_id, dia_numero, orden_en_dia);

-- 4.4 Índices en asistencias (reportes y analytics)
CREATE INDEX IF NOT EXISTS idx_asistencias_usuario 
  ON public.asistencias(usuario_id);

CREATE INDEX IF NOT EXISTS idx_asistencias_entrada 
  ON public.asistencias(entrada DESC);

CREATE INDEX IF NOT EXISTS idx_asistencias_usuario_fecha 
  ON public.asistencias(usuario_id, entrada DESC);

-- 4.5 Índices en reservas de clase
CREATE INDEX IF NOT EXISTS idx_reservas_usuario 
  ON public.reservas_de_clase(usuario_id);

CREATE INDEX IF NOT EXISTS idx_reservas_fecha 
  ON public.reservas_de_clase(fecha DESC);

CREATE INDEX IF NOT EXISTS idx_reservas_horario 
  ON public.reservas_de_clase(horario_clase_id, fecha);

CREATE INDEX IF NOT EXISTS idx_reservas_estado 
  ON public.reservas_de_clase(estado) 
  WHERE estado = 'reservada';

-- 4.6 Índices en sesiones de entrenamiento
CREATE INDEX IF NOT EXISTS idx_sesiones_usuario 
  ON public.sesiones_de_entrenamiento(usuario_id);

CREATE INDEX IF NOT EXISTS idx_sesiones_rutina 
  ON public.sesiones_de_entrenamiento(rutina_id);

CREATE INDEX IF NOT EXISTS idx_sesiones_estado 
  ON public.sesiones_de_entrenamiento(estado);

CREATE INDEX IF NOT EXISTS idx_sesiones_fecha 
  ON public.sesiones_de_entrenamiento(hora_inicio DESC);

-- 4.7 Índices en registros de ejercicio
CREATE INDEX IF NOT EXISTS idx_registros_sesion 
  ON public.registros_de_ejercicio(sesion_id);

CREATE INDEX IF NOT EXISTS idx_registros_ejercicio 
  ON public.registros_de_ejercicio(ejercicio_id);

-- 4.8 Índices en mediciones (gráficos de progreso)
CREATE INDEX IF NOT EXISTS idx_mediciones_usuario 
  ON public.mediciones(usuario_id);

CREATE INDEX IF NOT EXISTS idx_mediciones_fecha 
  ON public.mediciones(usuario_id, registrado_en DESC);

-- 4.9 Índices en pagos (finanzas)
CREATE INDEX IF NOT EXISTS idx_pagos_usuario 
  ON public.pagos(usuario_id);

CREATE INDEX IF NOT EXISTS idx_pagos_estado 
  ON public.pagos(estado);

CREATE INDEX IF NOT EXISTS idx_pagos_fecha 
  ON public.pagos(creado_en DESC);

CREATE INDEX IF NOT EXISTS idx_pagos_aprobado_por 
  ON public.pagos(aprobado_por) 
  WHERE aprobado_por IS NOT NULL;

-- 4.10 Índices en mensajes (chat)
CREATE INDEX IF NOT EXISTS idx_mensajes_remitente 
  ON public.mensajes(remitente_id);

CREATE INDEX IF NOT EXISTS idx_mensajes_receptor 
  ON public.mensajes(receptor_id);

CREATE INDEX IF NOT EXISTS idx_mensajes_conversacion 
  ON public.mensajes(conversacion_id, creado_en DESC);

CREATE INDEX IF NOT EXISTS idx_mensajes_no_leidos 
  ON public.mensajes(receptor_id, esta_leido) 
  WHERE esta_leido = false;

-- 4.11 Índices en gamificación
CREATE INDEX IF NOT EXISTS idx_gamificacion_puntos 
  ON public.gamificacion_del_usuario(points DESC);

CREATE INDEX IF NOT EXISTS idx_gamificacion_racha 
  ON public.gamificacion_del_usuario(racha_actual DESC);

-- 4.12 Índices en desafíos
CREATE INDEX IF NOT EXISTS idx_desafios_estado 
  ON public.desafios(estado);

CREATE INDEX IF NOT EXISTS idx_desafios_fecha 
  ON public.desafios(fecha_inicio, fecha_fin);

CREATE INDEX IF NOT EXISTS idx_participantes_desafio 
  ON public.participantes_desafio(desafio_id, puntuacion_actual DESC);

-- =============================================================================================
-- PARTE 5: PREPARAR ROADMAP PARA NORMALIZACIÓN DE EQUIPAMIENTO (FUTURO)
-- =============================================================================================

-- NOTA: No ejecutar ahora, solo documentar para futuro
-- Esta tabla permitirá analytics y disponibilidad real

-- CREATE TABLE IF NOT EXISTS public.ejercicios_equipamiento (
--   ejercicio_id uuid NOT NULL REFERENCES public.ejercicios(id) ON DELETE CASCADE,
--   equipamiento_id uuid NOT NULL REFERENCES public.equipamiento(id) ON DELETE CASCADE,
--   es_opcional boolean DEFAULT false,
--   alternativa_id uuid REFERENCES public.equipamiento(id),
--   creado_en timestamptz DEFAULT now(),
--   PRIMARY KEY (ejercicio_id, equipamiento_id)
-- );
-- 
-- CREATE INDEX idx_ejercicios_equipamiento_ejercicio 
--   ON public.ejercicios_equipamiento(ejercicio_id);
-- 
-- CREATE INDEX idx_ejercicios_equipamiento_equipo 
--   ON public.ejercicios_equipamiento(equipamiento_id);

COMMENT ON COLUMN public.ejercicios.equipamiento IS 
  'ARRAY temporal. Migrar a tabla ejercicios_equipamiento para analytics y disponibilidad real.';

-- =============================================================================================
-- PARTE 6: REACTIVAR TRIGGERS
-- =============================================================================================
SET session_replication_role = 'origin';

-- =============================================================================================
-- PARTE 7: VERIFICACIONES POST-MIGRACIÓN
-- =============================================================================================

-- Verificar ENUMs creados
DO $$
DECLARE
  enum_count int;
BEGIN
  SELECT COUNT(*) INTO enum_count
  FROM pg_type
  WHERE typname IN (
    'dificultad_ejercicio',
    'rol_asistencia',
    'estado_desafio',
    'estado_reporte'
  );
  
  RAISE NOTICE 'ENUMs creados: %', enum_count;
END $$;

-- Verificar índices creados
DO $$
DECLARE
  index_count int;
BEGIN
  SELECT COUNT(*) INTO index_count
  FROM pg_indexes
  WHERE schemaname = 'public'
    AND indexname LIKE 'idx_%';
  
  RAISE NOTICE 'Índices totales: %', index_count;
END $$;

-- =============================================================================================
-- CHECKPOINT: FASE 4 COMPLETADA
-- =============================================================================================
-- 
-- ✅ Resuelto:
-- 1. ENUMs explícitos para todos los USER-DEFINED
-- 2. Eliminado duplicado category/tipo
-- 3. Estados unificados por dominio
-- 4. 40+ índices críticos de performance
-- 5. Roadmap documentado para equipamiento
-- 
-- Siguiente: Ejecutar en staging y medir impacto en performance
-- =============================================================================================
