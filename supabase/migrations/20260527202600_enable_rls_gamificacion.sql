-- =========================================================================
-- 🛡️ MIGRACIÓN DE SEGURIDAD DEVSECOPS: ACTIVAR RLS EN GAMIFICACIÓN
-- Fecha: 27 de Mayo de 2026
-- Objetivo: Activar RLS en la tabla public.gamificacion_del_usuario y
--           crear políticas multi-tenant seguras para prevenir fugas.
-- =========================================================================

-- 1. Habilitar Row Level Security (RLS) en la tabla de gamificación
ALTER TABLE public.gamificacion_del_usuario ENABLE ROW LEVEL SECURITY;

-- 2. Eliminar políticas antiguas si existen
DROP POLICY IF EXISTS "Multi-tenant: Acceso a gamificacion" ON public.gamificacion_del_usuario;

-- 3. Crear política multi-tenant ultra-segura
-- Bloquea fugas entre diferentes gimnasios y permite el acceso al dueño o entrenadores del tenant
CREATE POLICY "Multi-tenant: Acceso a gamificacion" ON public.gamificacion_del_usuario
FOR ALL USING (
  -- El propio alumno puede ver y gestionar sus puntos
  usuario_id = auth.uid()
  OR
  -- Los entrenadores, admins y superadmins de su mismo gimnasio pueden verlos
  (
    (SELECT gimnasio_id FROM public.perfiles WHERE id = usuario_id) = public.get_user_gym_id()
    AND public.get_user_role() IN ('coach', 'admin', 'superadmin')
  )
);

COMMENT ON POLICY "Multi-tenant: Acceso a gamificacion" ON public.gamificacion_del_usuario IS
  'Aislamiento de gamificación: restringe la lectura y escritura al alumno dueño o coaches de su gimnasio.';
