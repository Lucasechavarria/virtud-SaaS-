-- 1. Create Helper Function (Security Definer to bypass RLS recursion)
-- This function runs with the privileges of the creator (postgres), avoiding the infinite loop
-- of checking RLS on 'perfiles' while trying to read 'perfiles' to check permissions.
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM perfiles
    WHERE id = auth.uid()
    AND role IN ('admin', 'superadmin')
  );
$$;

-- 2. Enable RLS on perfiles
ALTER TABLE perfiles ENABLE ROW LEVEL SECURITY;

-- 3. Policy: User views own profile
DROP POLICY IF EXISTS "Usuarios pueden ver su propio perfil" ON perfiles;
CREATE POLICY "Usuarios pueden ver su propio perfil"
ON perfiles FOR SELECT
USING (auth.uid() = id);

-- 4. Policy: Admin views all profiles (Uses function to avoid recursion)
DROP POLICY IF EXISTS "Admins ven todos los perfiles" ON perfiles;
CREATE POLICY "Admins ven todos los perfiles"
ON perfiles FOR SELECT
USING (is_admin());

-- 5. Policy: User updates own profile
DROP POLICY IF EXISTS "Usuarios editan su propio perfil" ON perfiles;
CREATE POLICY "Usuarios editan su propio perfil"
ON perfiles FOR UPDATE
USING (auth.uid() = id);

-- 6. Policy: Admin updates all profiles
DROP POLICY IF EXISTS "Admins editan cualquier perfil" ON perfiles;
CREATE POLICY "Admins editan cualquier perfil"
ON perfiles FOR UPDATE
USING (is_admin());

-- 7. Grant permissions for the function
GRANT EXECUTE ON FUNCTION public.is_admin TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin TO service_role;
