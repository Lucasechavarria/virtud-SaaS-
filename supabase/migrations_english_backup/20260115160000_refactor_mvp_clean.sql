-- ==============================================================================
-- MIGRACIÓN DE REFACTORIZACIÓN "MVP LIMPIO" Y ESTRUCTURAL
-- ==============================================================================
-- Descripción: 
-- 1. Creación de ENUMs.
-- 2. Limpieza y deduplicación de 'perfiles'.
-- 3. Nueva tabla 'relacion_alumno_coach' (M:N).
-- 4. Unificación de asistencias.
-- 5. Estructura de conversaciones para chat.
-- 6. Simplificación de auditoría.
-- 7. Actualización de RLS simplificado (Sin Superadmin).
-- ==============================================================================

-- 1. ENUMS (Mejor práctica PostgreSQL)
-- ------------------------------------------------------------------------------
-- Si existen tipos previos como texto, los convertiremos.
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('admin', 'coach', 'member');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE membership_status_enum AS ENUM ('active', 'inactive', 'suspended', 'expired');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. REFACTOR TABLA PERFILES
-- ------------------------------------------------------------------------------
-- Unificar campos duplicados y usar JSONB.

-- A. Unificar fecha de nacimiento (usaremos 'birth_date')
UPDATE perfiles SET birth_date = date_of_birth WHERE birth_date IS NULL;
ALTER TABLE perfiles DROP COLUMN IF EXISTS date_of_birth;

-- B. Unificar contacto emergencia (usaremos 'emergency_contact' JSONB)
-- Migrar datos viejos si existen
UPDATE perfiles 
SET emergency_contact = jsonb_build_object(
    'name', emergency_contact_name, 
    'phone', emergency_contact_phone
)
WHERE emergency_contact IS NULL OR emergency_contact = '{}'::jsonb;
ALTER TABLE perfiles DROP COLUMN IF EXISTS emergency_contact_name;
ALTER TABLE perfiles DROP COLUMN IF EXISTS emergency_contact_phone;

-- C. Unificar información médica (usaremos 'medical_info' JSONB)
-- Migrar arrays a JSONB si es necesario (simplificación)
ALTER TABLE perfiles DROP COLUMN IF EXISTS medical_conditions; 
ALTER TABLE perfiles DROP COLUMN IF EXISTS injuries;
ALTER TABLE perfiles DROP COLUMN IF EXISTS medications;
ALTER TABLE perfiles DROP COLUMN IF EXISTS restrictions;
-- Notas: Se asume que medical_info ya contendrá esta data estructurada en el futuro.

-- !!! IMPORTANTE: REPARAR DEPENDENCIAS ANTES DEL CAST DE COLUMNAS !!!
-- PostgreSQL no permite cambiar el tipo de una columna usada en políticas, triggers o restricciones.

-- 1. Eliminar funciones dependientes
DROP FUNCTION IF EXISTS public.is_admin() CASCADE;
DROP FUNCTION IF EXISTS public.is_coach() CASCADE;
DROP FUNCTION IF EXISTS public.sync_user_role() CASCADE;

-- 2. "NUCLEAR OPTION": Eliminar TODAS las políticas y VISTAS en el esquema public
-- Esto asegura que ninguna política o vista bloquee el cambio de tipo de columnas.
DO $$ 
DECLARE 
    r RECORD;
BEGIN
    -- Eliminar políticas
    FOR r IN (
        SELECT policyname, tablename 
        FROM pg_policies 
        WHERE schemaname = 'public'
    ) LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I', r.policyname, r.tablename);
    END LOOP;

    -- Eliminar vistas (pueden depender de tipos de columna)
    FOR r IN (
        SELECT viewname 
        FROM pg_views 
        WHERE schemaname = 'public'
    ) LOOP
        EXECUTE format('DROP VIEW IF EXISTS %I CASCADE', r.viewname);
    END LOOP;
END $$;

-- 2.1 RE-CREAR FUNCIONES DE SEGURIDAD (Requeridas por políticas posteriores)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM perfiles
    WHERE id = auth.uid()
    AND role::text = 'admin'
  );
$$;

CREATE OR REPLACE FUNCTION public.is_coach()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM perfiles
    WHERE id = auth.uid()
    AND role::text IN ('coach', 'admin')
  );
$$;

-- 3. Eliminar TODOS los TRIGGERS de la tabla perfiles
DO $$ 
DECLARE 
    r RECORD;
BEGIN
    FOR r IN (
        SELECT trigger_name, event_object_table 
        FROM information_schema.triggers 
        WHERE event_object_schema = 'public' 
        AND event_object_table = 'perfiles'
    ) LOOP
        EXECUTE format('DROP TRIGGER IF EXISTS %I ON %I', r.trigger_name, r.event_object_table);
    END LOOP;
END $$;

-- 4. Eliminar restricciones de CHECK de la tabla perfiles (pueden depender del tipo viejo)
DO $$ 
DECLARE 
    r RECORD;
BEGIN
    FOR r IN (
        SELECT constraint_name, table_name 
        FROM information_schema.table_constraints 
        WHERE table_schema = 'public' 
        AND table_name = 'perfiles' 
        AND constraint_type = 'CHECK'
    ) LOOP
        EXECUTE format('ALTER TABLE perfiles DROP CONSTRAINT IF EXISTS %I', r.constraint_name);
    END LOOP;
END $$;


-- D. Convertir ROLE a ENUM
-- Primero mapear 'superadmin' a 'admin' (usando cast a texto para seguridad si se re-ejecuta)
UPDATE perfiles SET role = 'admin' WHERE role::text = 'superadmin';

-- Quitar default previo para evitar error de cast automático de literal de texto a enum
ALTER TABLE perfiles ALTER COLUMN role DROP DEFAULT;

-- Cast a nuevo tipo (necesita alter column con using)
ALTER TABLE perfiles 
  ALTER COLUMN role TYPE user_role 
  USING role::user_role;
  
-- Default a member
ALTER TABLE perfiles ALTER COLUMN role SET DEFAULT 'member'::user_role;

-- E. Convertir MEMBERSHIP_STATUS a ENUM (con limpieza de default previo)
ALTER TABLE perfiles ALTER COLUMN membership_status DROP DEFAULT;

ALTER TABLE perfiles 
  ALTER COLUMN membership_status TYPE membership_status_enum 
  USING membership_status::membership_status_enum;

ALTER TABLE perfiles ALTER COLUMN membership_status SET DEFAULT 'inactive'::membership_status_enum;


-- 2.5 ESTANDARIZACIÓN DE GAMIFICACIÓN AL ESPAÑOL
-- ------------------------------------------------------------------------------

-- Renombrar tablas si existen con nombres en inglés o versiones previas de español
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'user_gamification') THEN
        ALTER TABLE user_gamification RENAME TO gamificación_del_usuario;
    ELSIF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'gamificacion_usuario') THEN
        ALTER TABLE gamificacion_usuario RENAME TO gamificación_del_usuario;
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'user_achievements') THEN
        ALTER TABLE user_achievements RENAME TO logros_del_usuario;
    ELSIF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'logros_usuario') THEN
        ALTER TABLE logros_usuario RENAME TO logros_del_usuario;
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'achievements') THEN
        ALTER TABLE achievements RENAME TO logros;
    END IF;
END $$;

-- Asegurar existencia de tablas (si no fueron migradas antes)
CREATE TABLE IF NOT EXISTS public.gamificación_del_usuario (
    user_id uuid PRIMARY KEY REFERENCES public.perfiles(id) ON DELETE CASCADE,
    points integer DEFAULT 0,
    current_streak integer DEFAULT 0,
    longest_streak integer DEFAULT 0,
    level integer DEFAULT 1,
    last_activity_date date,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.logros (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    name text NOT NULL,
    description text,
    icon text DEFAULT '🏆',
    points_reward integer DEFAULT 100,
    category text DEFAULT 'general',
    condition_type text,
    condition_value integer,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT logros_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.logros_del_usuario (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES public.perfiles(id) ON DELETE CASCADE,
    achievement_id uuid NOT NULL REFERENCES public.logros(id) ON DELETE CASCADE,
    unlocked_at timestamp with time zone DEFAULT now(),
    CONSTRAINT logros_del_usuario_pkey PRIMARY KEY (id),
    CONSTRAINT user_achievement_unique UNIQUE (user_id, achievement_id)
);

-- RLS Gamificación
ALTER TABLE public.gamificación_del_usuario ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.logros ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.logros_del_usuario ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Ver mis puntos" ON gamificación_del_usuario;
CREATE POLICY "Ver mis puntos" ON gamificación_del_usuario FOR SELECT USING (user_id = auth.uid() OR is_admin());

DROP POLICY IF EXISTS "Ranking público" ON gamificación_del_usuario;
CREATE POLICY "Ranking público" ON gamificación_del_usuario FOR SELECT USING (true);

DROP POLICY IF EXISTS "Ver logros" ON logros;
CREATE POLICY "Ver logros" ON logros FOR SELECT USING (true);

DROP POLICY IF EXISTS "Ver mis logros" ON logros_del_usuario;
CREATE POLICY "Ver mis logros" ON logros_del_usuario FOR SELECT USING (user_id = auth.uid() OR is_admin());

-- (La lógica de puntos por asistencia se movió después de la creación de la tabla asistencias)
-- 3. RELACIÓN ALUMNO - COACH (M:N)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.relacion_alumno_coach (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES public.perfiles(id) ON DELETE CASCADE,
    coach_id uuid NOT NULL REFERENCES public.perfiles(id) ON DELETE SET NULL,
    is_primary boolean DEFAULT false,
    assigned_at timestamp with time zone DEFAULT now(),
    is_active boolean DEFAULT true,
    CONSTRAINT relacion_alumno_coach_pkey PRIMARY KEY (id),
    CONSTRAINT unique_active_relation UNIQUE (user_id, coach_id)
);

-- Migrar datos existentes (assigned_coach_id -> tabla nueva)
INSERT INTO public.relacion_alumno_coach (user_id, coach_id, is_primary)
SELECT id, assigned_coach_id, true
FROM perfiles
WHERE assigned_coach_id IS NOT NULL
ON CONFLICT DO NOTHING;

-- Eliminar columna vieja
ALTER TABLE perfiles DROP COLUMN IF EXISTS assigned_coach_id;

-- RLS para relacion_alumno_coach
ALTER TABLE public.relacion_alumno_coach ENABLE ROW LEVEL SECURITY;
GRANT ALL ON TABLE public.relacion_alumno_coach TO authenticated;
GRANT ALL ON TABLE public.relacion_alumno_coach TO service_role;


-- 4. ASISTENCIAS UNIFICADAS (QR)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.asistencias (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES public.perfiles(id),
    role_at_time user_role NOT NULL, -- Rol que tenía al momento del check-in
    check_in timestamp with time zone DEFAULT now(),
    check_out timestamp with time zone,
    source text DEFAULT 'qr',
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT asistencias_pkey PRIMARY KEY (id)
);

-- Eliminar tabla vieja de coaches
DROP TABLE IF EXISTS asistencia_entrenador;

-- RLS para asistencias
ALTER TABLE public.asistencias ENABLE ROW LEVEL SECURITY;
GRANT ALL ON TABLE public.asistencias TO authenticated;
GRANT ALL ON TABLE public.asistencias TO service_role;

-- Triggers de Gamificación (Puntos por asistencia)
-- Se crea aquí porque depende tanto de 'asistencias' como de 'gamificación_del_usuario'
CREATE OR REPLACE FUNCTION public.reward_attendance()
RETURNS trigger AS $$
BEGIN
    -- Incrementar puntos al usuario (miembro)
    UPDATE public.gamificación_del_usuario
    SET points = points + 50,
        updated_at = now()
    WHERE user_id = NEW.user_id;
    
    -- Si no tiene registro, crear uno
    IF NOT FOUND THEN
        INSERT INTO public.gamificación_del_usuario (user_id, points)
        VALUES (NEW.user_id, 50);
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_reward_attendance ON public.asistencias;
CREATE TRIGGER tr_reward_attendance
    AFTER INSERT ON public.asistencias
    FOR EACH ROW
    EXECUTE FUNCTION public.reward_attendance();


-- 5. MENSAJERÍA (CONVERSACIONES)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.conversaciones (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    created_at timestamp with time zone DEFAULT now(),
    type text DEFAULT 'private' CHECK (type IN ('private', 'support', 'group')),
    metadata jsonb DEFAULT '{}'::jsonb,
    CONSTRAINT conversaciones_pkey PRIMARY KEY (id)
);

-- Participantes de la conversación
CREATE TABLE IF NOT EXISTS public.participantes_conversacion (
    conversation_id uuid NOT NULL REFERENCES public.conversaciones(id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES public.perfiles(id) ON DELETE CASCADE,
    joined_at timestamp with time zone DEFAULT now(),
    PRIMARY KEY (conversation_id, user_id)
);

-- Modificar tabla mensajes
ALTER TABLE mensajes ADD COLUMN IF NOT EXISTS conversation_id uuid REFERENCES public.conversaciones(id) ON DELETE CASCADE;

-- (Opcional) Migrar mensajes huerfanos: crear conversaciones ad-hoc si hay tiempo, 
-- pero por ahora permitimos null en conversation_id temporalmente o limpiamos.
-- Para MVP limpio: Si no hay conversation_id, son mensajes legacy.


-- 6. SIMPLIFICACIÓN AUDITORÍA
-- ------------------------------------------------------------------------------
ALTER TABLE registros_acceso_rutina DROP COLUMN IF EXISTS screenshot_attempt;
ALTER TABLE registros_acceso_rutina DROP COLUMN IF EXISTS devtools_detected;
ALTER TABLE registros_acceso_rutina DROP COLUMN IF EXISTS download_attempt;
ALTER TABLE registros_acceso_rutina DROP COLUMN IF EXISTS share_attempt;
ALTER TABLE registros_acceso_rutina DROP COLUMN IF EXISTS view_interrupted;
-- Mantenemos action (podemos simplificar checks), ip_address, user_agent para info básica.


-- 7. SEGURIDAD (RLS & FUNCIONES)
-- ------------------------------------------------------------------------------

-- (Las funciones is_admin e is_coach ahora se definen al inicio del script)


-- RE-APLICAR POLÍTICAS CLAVE CON NUEVA ESTRUCTURA

-- === RELACION ALUMNO COACH ===
DROP POLICY IF EXISTS "Ver mis relaciones" ON relacion_alumno_coach;
CREATE POLICY "Ver mis relaciones" ON relacion_alumno_coach 
FOR SELECT USING (
    user_id = auth.uid() OR coach_id = auth.uid() OR is_admin()
);

DROP POLICY IF EXISTS "Admin/Coach gestiona relaciones" ON relacion_alumno_coach;
CREATE POLICY "Admin/Coach gestiona relaciones" ON relacion_alumno_coach 
FOR ALL USING (is_coach()); -- Coaches pueden asignarse alumnos? O solo admin? Asumimos coach+

-- === ASISTENCIAS ===
DROP POLICY IF EXISTS "Ver mis asistencias" ON asistencias;
CREATE POLICY "Ver mis asistencias" ON asistencias 
FOR SELECT USING (user_id = auth.uid() OR is_coach());

DROP POLICY IF EXISTS "Gestión asistencias" ON asistencias;
CREATE POLICY "Gestión asistencias" ON asistencias 
FOR ALL USING (is_admin()); -- Solo admin o sistema (QR) crea asistencias via service_role

-- === CONVERSACIONES ===
ALTER TABLE conversaciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE participantes_conversacion ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Ver mis conversaciones" ON conversaciones
FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM participantes_conversacion p 
        WHERE p.conversation_id = conversaciones.id 
        AND p.user_id = auth.uid()
    )
);

CREATE POLICY "Ver participantes" ON participantes_conversacion
FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM participantes_conversacion p 
        WHERE p.conversation_id = participantes_conversacion.conversation_id 
        AND p.user_id = auth.uid()
    )
);

-- === RUTINAS (Actualización por cambio de tabla de relación coach) ===
-- El coach ve rutinas si es el coach asignado en la tabla de relaciones
DROP POLICY IF EXISTS "Coach ve rutinas asignadas" ON rutinas;
CREATE POLICY "Coach ve rutinas asignadas" ON rutinas 
FOR SELECT USING (
    is_admin() 
    OR 
    EXISTS (
        SELECT 1 FROM relacion_alumno_coach r 
        WHERE r.user_id = rutinas.user_id 
        AND r.coach_id = auth.uid()
    )
    OR
    coach_id = auth.uid() -- Por compatibilidad si se asigna directo en la rutina
);

-- Corregir referencias en registros de acceso a rutinas si existen
-- (No es vital para la migración pero limpia el sistema)
ALTER TABLE IF EXISTS registros_acceso_rutina DROP CONSTRAINT IF EXISTS routine_access_logs_routine_id_fkey;
ALTER TABLE IF EXISTS registros_acceso_rutina ADD CONSTRAINT routine_access_logs_routine_id_fkey FOREIGN KEY (routine_id) REFERENCES rutinas(id) ON DELETE CASCADE;


-- === ROLE SYNC (Evitar RLS Recursion via Metadata) ===
CREATE OR REPLACE FUNCTION public.sync_user_role()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE auth.users
  SET raw_app_meta_data = 
    COALESCE(raw_app_meta_data, '{}'::jsonb) || 
    jsonb_build_object('role', NEW.role::text)
  WHERE id = NEW.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_profile_role_change ON public.perfiles;
CREATE TRIGGER on_profile_role_change
AFTER UPDATE OF role ON public.perfiles
FOR EACH ROW
WHEN (OLD.role::text IS DISTINCT FROM NEW.role::text)
EXECUTE FUNCTION public.sync_user_role();

-- === RESTAURACIÓN DE VISTAS ===
-- Re-crear vistas eliminadas en la "Nuclear Option" apuntando a la nueva estructura

CREATE OR REPLACE VIEW public.classes_with_availability AS
SELECT 
    c.*,
    a.name as activity_name,
    a.type as activity_type,
    a.image_url as activity_image,
    p.full_name as coach_name,
    COALESCE(a.max_capacity, 20) as max_capacity,
    (SELECT count(*)::int FROM reservas_de_clase r WHERE r.class_schedule_id = c.id AND r.status::text = 'booked') as current_capacity,
    (COALESCE(a.max_capacity, 20) - (SELECT count(*)::int FROM reservas_de_clase r WHERE r.class_schedule_id = c.id AND r.status::text = 'booked')) as available_spots,
    CASE 
        WHEN (SELECT count(*)::int FROM reservas_de_clase r WHERE r.class_schedule_id = c.id AND r.status::text = 'booked') >= COALESCE(a.max_capacity, 20) THEN 'full'
        WHEN (SELECT count(*)::int FROM reservas_de_clase r WHERE r.class_schedule_id = c.id AND r.status::text = 'booked') >= (COALESCE(a.max_capacity, 20) * 0.8) THEN 'almost_full'
        ELSE 'available'
    END as availability_status
FROM horarios_de_clase c
LEFT JOIN actividades a ON c.activity_id = a.id
LEFT JOIN perfiles p ON c.coach_id = p.id
WHERE c.is_active = true;

CREATE OR REPLACE VIEW public.user_bookings_detailed AS
SELECT 
    b.*,
    c.day_of_week,
    c.start_time,
    c.end_time,
    a.name as activity_name,
    a.type as activity_type,
    a.image_url as activity_image,
    p.full_name as coach_name
FROM reservas_de_clase b
JOIN horarios_de_clase c ON b.class_schedule_id = c.id
JOIN actividades a ON c.activity_id = a.id
LEFT JOIN perfiles p ON c.coach_id = p.id;

CREATE OR REPLACE VIEW public.active_memberships AS
SELECT 
    id,
    email,
    full_name,
    membership_status,
    membership_start_date,
    membership_end_date,
    CASE 
        WHEN membership_end_date < NOW() THEN 'expired'
        WHEN membership_end_date < NOW() + INTERVAL '7 days' THEN 'expiring_soon'
        ELSE 'active'
    END as membership_alert
FROM perfiles
WHERE membership_status::text = 'active';

-- Reset final de permisos
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO postgres, anon, authenticated, service_role;
