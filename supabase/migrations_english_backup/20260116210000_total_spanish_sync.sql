-- ==============================================================================
-- MIGRACIÓN DE SINCRONIZACIÓN TOTAL "ESPAÑOL SEGURO" (Idempotente + RLS FIX)
-- ==============================================================================
-- Esta migración renombra tablas y columnas a español solo si existen.
-- Corrige recursión de RLS y sincroniza roles con JWT metadata.
-- ==============================================================================

SET session_replication_role = 'replica';

-- 1. HABILITAR EXTENSIONES Y DEFINIR TIPOS ENUM
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'nivel_dificultad') THEN
        CREATE TYPE nivel_dificultad AS ENUM ('principiante', 'intermedio', 'avanzado', 'todos_los_niveles');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'tipo_conversacion') THEN
        CREATE TYPE tipo_conversacion AS ENUM ('privada', 'soporte', 'grupo');
    END IF;
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- 2. ELIMINAR VISTAS DEPENDIENTES
DROP VIEW IF EXISTS user_bookings_detailed CASCADE;
DROP VIEW IF EXISTS active_memberships CASCADE;
DROP VIEW IF EXISTS classes_with_availability CASCADE;

-- 3. RENOMBRADO SEGURO DE TABLAS Y COLUMNAS
DO $$ 
BEGIN
    -- PERFILES
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'perfiles' AND column_name = 'full_name') THEN
        ALTER TABLE perfiles RENAME COLUMN full_name TO nombre_completo;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'perfiles' AND column_name = 'email') THEN
        ALTER TABLE perfiles RENAME COLUMN email TO correo;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'perfiles' AND column_name = 'avatar_url') THEN
        ALTER TABLE perfiles RENAME COLUMN avatar_url TO url_avatar;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'perfiles' AND column_name = 'role') THEN
        ALTER TABLE perfiles RENAME COLUMN role TO rol;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'perfiles' AND column_name = 'created_at') THEN
        ALTER TABLE perfiles RENAME COLUMN created_at TO creado_en;
    END IF;

    -- SESIONES DE ENTRENAMIENTO
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'workout_sessions') THEN
        ALTER TABLE workout_sessions RENAME TO sesiones_de_entrenamiento;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sesiones_de_entrenamiento' AND column_name = 'user_id') THEN
        ALTER TABLE sesiones_de_entrenamiento RENAME COLUMN user_id TO usuario_id;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sesiones_de_entrenamiento' AND column_name = 'routine_id') THEN
        ALTER TABLE sesiones_de_entrenamiento RENAME COLUMN routine_id TO rutina_id;
    END IF;

    -- REGISTROS DE EJERCICIO
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'exercise_performance_logs') THEN
        ALTER TABLE exercise_performance_logs RENAME TO registros_de_ejercicio;
    ELSIF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'exercise_logs') THEN
        ALTER TABLE exercise_logs RENAME TO registros_de_ejercicio;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'registros_de_ejercicio' AND column_name = 'session_id') THEN
        ALTER TABLE registros_de_ejercicio RENAME COLUMN session_id TO sesion_id;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'registros_de_ejercicio' AND column_name = 'exercise_id') THEN
        ALTER TABLE registros_de_ejercicio RENAME COLUMN exercise_id TO ejercicio_id;
    END IF;

    -- EQUIPAMIENTO (Especial: Usamos 'estado' en lugar de 'condicion' porque el código lo prefiere)
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'equipamiento' AND column_name = 'condition') THEN
        ALTER TABLE equipamiento RENAME COLUMN condition TO estado;
    ELSIF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'equipamiento' AND column_name = 'condicion') THEN
        ALTER TABLE equipamiento RENAME COLUMN condicion TO estado;
    END IF;

    -- RESERVAS DE CLASE (Asegurar columna 'fecha')
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'reservas_de_clase' AND column_name = 'fecha') THEN
        ALTER TABLE reservas_de_clase ADD COLUMN fecha DATE;
    END IF;

    -- PLANES NUTRICIONALES (Asegurar columnas JSON)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'planes_nutricionales' AND column_name = 'comidas') THEN
        ALTER TABLE planes_nutricionales ADD COLUMN comidas JSONB DEFAULT '[]'::jsonb;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'planes_nutricionales' AND column_name = 'suplementos') THEN
        ALTER TABLE planes_nutricionales ADD COLUMN suplementos JSONB DEFAULT '[]'::jsonb;
    END IF;

    -- PREFERENCIAS DE NOTIFICACIÓN (Asegurar campos específicos)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'notificaciones_preferencias') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notificaciones_preferencias' AND column_name = 'pagos_confirmacion') THEN
            ALTER TABLE notificaciones_preferencias ADD COLUMN pagos_confirmacion BOOLEAN DEFAULT true;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notificaciones_preferencias' AND column_name = 'clases_recordatorio') THEN
            ALTER TABLE notificaciones_preferencias ADD COLUMN clases_recordatorio BOOLEAN DEFAULT true;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notificaciones_preferencias' AND column_name = 'logros_nuevos') THEN
            ALTER TABLE notificaciones_preferencias ADD COLUMN logros_nuevos BOOLEAN DEFAULT true;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notificaciones_preferencias' AND column_name = 'mensajes_nuevos') THEN
            ALTER TABLE notificaciones_preferencias ADD COLUMN mensajes_nuevos BOOLEAN DEFAULT true;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notificaciones_preferencias' AND column_name = 'rutinas_nuevas') THEN
            ALTER TABLE notificaciones_preferencias ADD COLUMN rutinas_nuevas BOOLEAN DEFAULT true;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notificaciones_preferencias' AND column_name = 'sistema') THEN
            ALTER TABLE notificaciones_preferencias ADD COLUMN sistema BOOLEAN DEFAULT true;
        END IF;
    END IF;

END $$;

-- 4. FUNCIONES DE SEGURIDAD OPTIMIZADAS (NORMALIZACIÓN DE ROLES)
-- Esta función normaliza nombres de roles (Profesor -> coach, etc) para evitar fallos de RLS
CREATE OR REPLACE FUNCTION public.get_normalized_role(role_text text)
RETURNS text LANGUAGE plpgsql IMMUTABLE AS $$
BEGIN
  RETURN CASE 
    WHEN LOWER(role_text) IN ('admin', 'administrador') THEN 'admin'
    WHEN LOWER(role_text) IN ('coach', 'profesor', 'entrenador') THEN 'coach'
    ELSE 'member'
  END;
END;
$$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT (public.get_normalized_role(COALESCE(auth.jwt() -> 'app_metadata' ->> 'rol', auth.jwt() -> 'app_metadata' ->> 'role')) = 'admin');
$$;

CREATE OR REPLACE FUNCTION public.is_coach()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT (public.get_normalized_role(COALESCE(auth.jwt() -> 'app_metadata' ->> 'rol', auth.jwt() -> 'app_metadata' ->> 'role')) IN ('coach', 'admin'));
$$;

-- 5. POLÍTICAS RLS (SIN RECURSIÓN)
DROP POLICY IF EXISTS "perfiles_select_policy" ON perfiles;
CREATE POLICY "perfiles_select_policy" ON perfiles FOR SELECT USING (auth.uid() = id OR is_admin());

DROP POLICY IF EXISTS "perfiles_update_policy" ON perfiles;
CREATE POLICY "perfiles_update_policy" ON perfiles FOR UPDATE USING (auth.uid() = id OR is_admin());

-- 6. TRIGGER DE SINCRONIZACIÓN DE ROLES (MEJORADO)
CREATE OR REPLACE FUNCTION public.sync_user_role_metadata()
RETURNS TRIGGER AS $$
DECLARE
  norm_role text;
BEGIN
  norm_role := public.get_normalized_role(NEW.rol::text);
  UPDATE auth.users 
  SET raw_app_meta_data = COALESCE(raw_app_meta_data, '{}'::jsonb) || 
    jsonb_build_object('rol', norm_role, 'role', norm_role) 
  WHERE id = NEW.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_profile_role_change ON public.perfiles;
CREATE TRIGGER on_profile_role_change 
AFTER INSERT OR UPDATE OF rol 
ON public.perfiles 
FOR EACH ROW 
EXECUTE FUNCTION public.sync_user_role_metadata();

-- ASEGURAR QUE LOS PERFILES TIENEN EL ROL CORRECTO
UPDATE perfiles SET rol = 'coach' WHERE rol::text IN ('Profesor', 'profesor', 'Coach', 'Entrenador');
UPDATE perfiles SET rol = 'admin' WHERE rol::text IN ('Admin', 'Administrador');

SET session_replication_role = 'origin';
