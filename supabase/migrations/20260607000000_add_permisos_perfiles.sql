-- Migración para añadir columna de permisos al perfil del usuario
-- Esto permite configurar privilegios finos para roles como recepcionistas o subadmins.

ALTER TABLE public.perfiles 
ADD COLUMN IF NOT EXISTS permisos JSONB DEFAULT '{}'::jsonb;

-- Asegurar comentarios en la columna
COMMENT ON COLUMN public.perfiles.permisos IS 'Permisos específicos del usuario (ej: acceso_usuarios, acceso_finanzas, etc.) para modular su rol.';
