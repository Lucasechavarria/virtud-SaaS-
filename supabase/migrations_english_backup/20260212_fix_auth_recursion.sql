-- ============================================================================
-- MIGRACIÓN: Corrección de Recursión RLS y Sincronización de Roles
-- ============================================================================
-- Objetivo:
-- 1. Redefinir funciones de seguridad para usar JWT metadata (evitar recursión).
-- 2. Asegurar sincronización bidireccional de metadatos (rol/role).
-- 3. Corregir políticas de la tabla 'perfiles'.
-- ============================================================================

BEGIN;

-- 1. Redefinir funciones de seguridad para máxima eficiencia y sin recursión
-- Usamos auth.jwt() para obtener los claims del token actual sin consultar tablas.
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  -- Priorizamos JWT metadata para evitar hits a la DB y recursión RLS
  SELECT (
    COALESCE(auth.jwt() -> 'app_metadata' ->> 'rol', auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  );
$$;

CREATE OR REPLACE FUNCTION public.is_coach()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  -- El coach puede ser 'coach' o 'admin'
  SELECT (
    COALESCE(auth.jwt() -> 'app_metadata' ->> 'rol', auth.jwt() -> 'app_metadata' ->> 'role') IN ('coach', 'admin')
  );
$$;

-- 2. Trigger robusto para sincronización de metadatos
-- Este trigger se asegura de que cuando el rol cambie en la tabla perfiles, 
-- se actualice inmediatamente en la tabla auth.users (metadatos del JWT).
CREATE OR REPLACE FUNCTION public.sync_user_role_metadata()
RETURNS TRIGGER AS $$
BEGIN
  -- Actualizamos auth.users para que el siguiente JWT emitido tenga el rol correcto
  -- Sincronizamos tanto 'rol' como 'role' para máxima compatibilidad con código viejo/nuevo
  UPDATE auth.users
  SET raw_app_meta_data = 
    COALESCE(raw_app_meta_data, '{}'::jsonb) || 
    jsonb_build_object(
      'rol', NEW.rol::text,
      'role', NEW.rol::text
    )
  WHERE id = NEW.id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Re-vincular trigger
DROP TRIGGER IF EXISTS on_profile_role_change ON public.perfiles;
CREATE TRIGGER on_profile_role_change
AFTER INSERT OR UPDATE OF rol ON public.perfiles
FOR EACH ROW
EXECUTE FUNCTION public.sync_user_role_metadata();

-- 3. Corregir Políticas de la tabla 'perfiles' (PUNTO CRÍTICO)
-- Eliminamos políticas viejas que causaban recursión
DROP POLICY IF EXISTS "Usuarios ven propio perfil" ON perfiles;
DROP POLICY IF EXISTS "Admins ven todo perfil" ON perfiles;
DROP POLICY IF EXISTS "Update propio perfil" ON perfiles;
DROP POLICY IF EXISTS "Admins update todo perfil" ON perfiles;
DROP POLICY IF EXISTS "Usuarios pueden ver su propio perfil" ON perfiles;
DROP POLICY IF EXISTS "Admins ven todos los perfiles" ON perfiles;
DROP POLICY IF EXISTS "Usuarios editan su propio perfil" ON perfiles;
DROP POLICY IF EXISTS "Admins editan cualquier perfil" ON perfiles;

-- Definir políticas nuevas basadas en auth.uid() y metadatos (sin loops)
-- LECTURA
CREATE POLICY "perfiles_select_policy" 
ON perfiles FOR SELECT 
USING (
  auth.uid() = id OR is_admin()
);

-- ACTUALIZACIÓN
CREATE POLICY "perfiles_update_policy" 
ON perfiles FOR UPDATE 
USING (
  auth.uid() = id OR is_admin()
);

-- INSERT (Solo el usuario al crearse o admin)
DROP POLICY IF EXISTS "Permitir inserción de perfil propio" ON perfiles;
CREATE POLICY "perfiles_insert_policy" 
ON perfiles FOR INSERT 
WITH CHECK (
  auth.uid() = id OR is_admin()
);

-- 4. Forzar una sincronización inicial para usuarios existentes (opcional pero recomendado)
-- Esto ayuda a que los usuarios actuales no tengan que esperar a un update para tener metadatos correctos.
-- Nota: En despliegues grandes esto puede ser lento, pero para Virtud Gym es seguro.
DO $$
DECLARE
  u RECORD;
BEGIN
  FOR u IN SELECT id, rol FROM public.perfiles LOOP
    UPDATE auth.users
    SET raw_app_meta_data = 
      COALESCE(raw_app_meta_data, '{}'::jsonb) || 
      jsonb_build_object(
        'rol', u.rol::text,
        'role', u.rol::text
      )
    WHERE id = u.id;
  END LOOP;
END $$;

COMMIT;
