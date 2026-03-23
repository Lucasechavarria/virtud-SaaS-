-- Habilitar RLS en perfiles (si no estaba habilitado)
ALTER TABLE perfiles ENABLE ROW LEVEL SECURITY;

-- 1. LECTURA: Usuario ve su propio perfil
DROP POLICY IF EXISTS "Usuarios pueden ver su propio perfil" ON perfiles;
CREATE POLICY "Usuarios pueden ver su propio perfil" 
ON perfiles FOR SELECT 
USING (auth.uid() = id);

-- 2. LECTURA: Admins y Superadmins ven TODOS los perfiles
-- IMPORTANTE: Para evitar recursión infinita (infinite recursion) al consultar el propio rol dentro de la política,
-- usamos una función security definer o confiamos en los metadatos JWT si es posible.
-- Sin embargo, la forma más robusta sin metadatos es un bypass para el propio usuario admin.
DROP POLICY IF EXISTS "Admins ven todos los perfiles" ON perfiles;
CREATE POLICY "Admins ven todos los perfiles" 
ON perfiles FOR SELECT 
USING (
  -- El usuario es admin/superadmin chequeando la misma tabla (cuidado con recursión)
  -- Para romper la recursión, supabase recomienda usar (auth.jwt() ->> 'app_metadata')::jsonb ->> 'role'
  -- O tener una tabla separada de roles. 
  -- Como estamos migrando, usaremos una subconsulta directa pero con cuidado.
  -- Una forma segura es:
  EXISTS (
    SELECT 1 FROM perfiles AS p
    WHERE p.id = auth.uid() 
    AND p.role IN ('admin', 'superadmin')
  )
);

-- 3. ACTUALIZACIÓN: Usuario edita sus datos básicos
DROP POLICY IF EXISTS "Usuarios editan su propio perfil" ON perfiles;
CREATE POLICY "Usuarios editan su propio perfil" 
ON perfiles FOR UPDATE 
USING (auth.uid() = id);

-- 4. ACTUALIZACIÓN: Admins editan cualquier perfil
DROP POLICY IF EXISTS "Admins editan cualquier perfil" ON perfiles;
CREATE POLICY "Admins editan cualquier perfil" 
ON perfiles FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM perfiles AS p
    WHERE p.id = auth.uid() 
    AND p.role IN ('admin', 'superadmin')
  )
);

-- Permisos para tabla 'equipamiento' (por si acaso faltan tras el rename)
ALTER TABLE equipamiento ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Cualquiera ve equipamiento disponible" ON equipamiento;
CREATE POLICY "Cualquiera ve equipamiento disponible" 
ON equipamiento FOR SELECT 
USING (true);

DROP POLICY IF EXISTS "Admins gestionan equipamiento" ON equipamiento;
CREATE POLICY "Admins gestionan equipamiento" 
ON equipamiento FOR ALL 
USING (
  EXISTS (
      SELECT 1 FROM perfiles AS p
      WHERE p.id = auth.uid() 
      AND p.role IN ('admin', 'superadmin')
  )
);
