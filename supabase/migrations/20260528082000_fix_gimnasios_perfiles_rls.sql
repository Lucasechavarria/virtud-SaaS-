-- =========================================================================
-- 🛡️ MIGRACIÓN DE SEGURIDAD: POLÍTICAS RLS PARA GIMNASIOS Y PERFILES
-- Fecha: 28 de Mayo de 2026
-- Objetivo: Crear las políticas de Row Level Security (RLS) faltantes para
--           las tablas public.gimnasios y public.perfiles. Al habilitar RLS
--           en migraciones anteriores sin definir políticas, PostgreSQL bloqueaba
--           las consultas de roles, haciendo que el middleware redirigiera a '/'
--           y rompiera el flujo de Cypress.
-- =========================================================================

-- 1. POLÍTICAS PARA LA TABLA: public.gimnasios
-- Permite que cualquier usuario (autenticado o anónimo) consulte la información pública
-- de los gimnasios (nombre, slug, logo, módulos activos) para el correcto renderizado y enrutamiento.
DROP POLICY IF EXISTS "Permitir lectura publica de gimnasios" ON public.gimnasios;
CREATE POLICY "Permitir lectura publica de gimnasios" ON public.gimnasios
FOR SELECT USING (true);


-- 2. POLÍTICAS PARA LA TABLA: public.perfiles
-- Permite a un usuario ver, insertar y actualizar su propio perfil de forma segura.
-- Permite a entrenadores y administradores del mismo gimnasio ver/gestionar perfiles de su tenant.

-- A. SELECT (Lectura)
DROP POLICY IF EXISTS "Permitir lectura de propio perfil o por coaches/admins" ON public.perfiles;
DROP POLICY IF EXISTS "perfiles_select_policy" ON public.perfiles;
CREATE POLICY "Permitir lectura de propio perfil o por coaches/admins" ON public.perfiles
FOR SELECT USING (
  id = auth.uid()
  OR
  (
    gimnasio_id = public.get_user_gym_id()
    AND public.get_user_role() IN ('coach', 'admin', 'superadmin')
  )
);

-- B. UPDATE (Actualización)
DROP POLICY IF EXISTS "Permitir update de propio perfil o por admins" ON public.perfiles;
DROP POLICY IF EXISTS "perfiles_update_policy" ON public.perfiles;
CREATE POLICY "Permitir update de propio perfil o por admins" ON public.perfiles
FOR UPDATE USING (
  id = auth.uid()
  OR
  (
    gimnasio_id = public.get_user_gym_id()
    AND public.get_user_role() IN ('admin', 'superadmin')
  )
);

-- C. INSERT (Inserción - para registro)
DROP POLICY IF EXISTS "Permitir insert de propio perfil o por admins" ON public.perfiles;
DROP POLICY IF EXISTS "perfiles_insert_policy" ON public.perfiles;
CREATE POLICY "Permitir insert de propio perfil o por admins" ON public.perfiles
FOR INSERT WITH CHECK (
  id = auth.uid()
  OR
  (
    gimnasio_id = public.get_user_gym_id()
    AND public.get_user_role() IN ('admin', 'superadmin')
  )
);
