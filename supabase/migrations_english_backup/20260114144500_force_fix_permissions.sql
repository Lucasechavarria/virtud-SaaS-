-- ==============================================================================
-- CORRECCIÓN DEFINITIVA DE PERMISOS Y RLS (FORCE FIX)
-- ==============================================================================

-- 1. Asegurar acceso al Schema Public
-- ------------------------------------------------------------------------------
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;

-- 2. Redefinir Funciones de Seguridad (SECURITY DEFINER es CLAVE aquí)
--    Estas funciones se ejecutan con permisos de "postgres" (superuser),
--    saltándose las políticas RLS de la tabla 'perfiles' para evitar recursión.
-- ------------------------------------------------------------------------------

DROP FUNCTION IF EXISTS public.is_admin();
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM perfiles
    WHERE id = auth.uid()
    AND role IN ('admin', 'superadmin')
  );
$$;

DROP FUNCTION IF EXISTS public.is_coach();
CREATE OR REPLACE FUNCTION public.is_coach()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM perfiles
    WHERE id = auth.uid()
    AND role IN ('coach', 'admin', 'superadmin')
  );
$$;

-- Grant permisos de ejecución
GRANT EXECUTE ON FUNCTION public.is_admin TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_coach TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin TO service_role;
GRANT EXECUTE ON FUNCTION public.is_coach TO service_role;

-- 3. Resetear RLS en Tabla 'perfiles'
-- ------------------------------------------------------------------------------
ALTER TABLE public.perfiles ENABLE ROW LEVEL SECURITY;

-- Grant permisos explícitos de tabla
GRANT ALL ON TABLE public.perfiles TO authenticated;
GRANT ALL ON TABLE public.perfiles TO service_role;

-- Eliminar TODAS las políticas previas conocidas para evitar conflictos
DROP POLICY IF EXISTS "Usuarios ven propio perfil" ON public.perfiles;
DROP POLICY IF EXISTS "Admins ven todo perfil" ON public.perfiles;
DROP POLICY IF EXISTS "Update propio perfil" ON public.perfiles;
DROP POLICY IF EXISTS "Admins update todo perfil" ON public.perfiles;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.perfiles;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.perfiles;
DROP POLICY IF EXISTS "Usuarios pueden ver su propio perfil" ON public.perfiles;
DROP POLICY IF EXISTS "Admins ven todos los perfiles" ON public.perfiles;

-- Políticas DEFINITIVAS para 'perfiles'
-- A) SELECT: Uno mismo O es admin
CREATE POLICY "perfiles_select_policy" ON public.perfiles
FOR SELECT 
USING (
  auth.uid() = id 
  OR 
  is_admin()
);

-- B) UPDATE: Uno mismo O es admin
CREATE POLICY "perfiles_update_policy" ON public.perfiles
FOR UPDATE
USING (
  auth.uid() = id 
  OR 
  is_admin()
);

-- C) INSERT: Trigger handle_new_user se encarga, pero permitimos insert propio por si acaso
CREATE POLICY "perfiles_insert_policy" ON public.perfiles
FOR INSERT 
WITH CHECK (auth.uid() = id);

-- 4. Asegurar otras tablas (Un ejemplo crítico)
-- ------------------------------------------------------------------------------
-- Ajustamos 'rutinas' para asegurar que los admins las vean
GRANT ALL ON TABLE public.rutinas TO authenticated;
GRANT ALL ON TABLE public.rutinas TO service_role;
ALTER TABLE public.rutinas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Ver propias rutinas" ON public.rutinas;
DROP POLICY IF EXISTS "Admin/Coach ve rutinas" ON public.rutinas;

CREATE POLICY "rutinas_select_own" ON public.rutinas 
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "rutinas_select_staff" ON public.rutinas 
FOR SELECT USING (is_coach()); -- is_coach incluye admin/superadmin

-- Fin de la corrección
