-- =========================================================================
-- 🛡️ MIGRACIÓN SPRINT 1: CLAIMS PERSONALIZADOS EN JWT (LOTE COMPLETO)
-- Fecha: 30 de Mayo de 2026
-- Objetivo: Extender la sincronización de metadatos de usuario hacia
--           auth.users.raw_app_meta_data para incluir el 'gimnasio_slug'
--           y los 'modulos_activos'. Esto permite al middleware realizar
--           gating de roles y módulos de forma local a partir del JWT (claims)
--           con latencia de red cero.
-- =========================================================================

-- 1. ACTUALIZAR FUNCIÓN DE TRIGGER PARA PERFILES
CREATE OR REPLACE FUNCTION public.sync_user_role_metadata()
RETURNS TRIGGER AS $$
DECLARE
  v_gym_slug TEXT;
  v_gym_modules JSONB;
BEGIN
  -- 1.1 Obtener los detalles del gimnasio asociado
  IF NEW.gimnasio_id IS NOT NULL THEN
    SELECT slug, COALESCE(modulos_activos, '[]'::jsonb) 
    INTO v_gym_slug, v_gym_modules
    FROM public.gimnasios 
    WHERE id = NEW.gimnasio_id;
  ELSE
    v_gym_slug := NULL;
    v_gym_modules := '[]'::jsonb;
  END IF;

  -- 1.2 Actualizar los claims en auth.users
  UPDATE auth.users
  SET raw_app_meta_data = 
    COALESCE(raw_app_meta_data, '{}'::jsonb) || 
    jsonb_build_object(
      'rol', NEW.rol::text,
      'role', NEW.rol::text,
      'gimnasio_id', COALESCE(NEW.gimnasio_id::text, ''),
      'gimnasio_slug', COALESCE(v_gym_slug, ''),
      'modulos_activos', v_gym_modules
    )
  WHERE id = NEW.id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.sync_user_role_metadata() IS 'Sincroniza rol, gimnasio_id, gimnasio_slug y modulos_activos en los claims del JWT de Supabase Auth tras cambios en el perfil.';


-- 2. CREAR FUNCIÓN Y TRIGGER PARA CAMBIOS EN GIMNASIOS (PROPAGACIÓN)
CREATE OR REPLACE FUNCTION public.sync_gym_modules_metadata()
RETURNS TRIGGER AS $$
BEGIN
  -- Actualizar la metadata de todos los usuarios vinculados a este gimnasio
  UPDATE auth.users u
  SET raw_app_meta_data = 
    COALESCE(u.raw_app_meta_data, '{}'::jsonb) || 
    jsonb_build_object(
      'gimnasio_slug', NEW.slug::text,
      'modulos_activos', COALESCE(NEW.modulos_activos, '[]'::jsonb)
    )
  FROM public.perfiles p
  WHERE u.id = p.id AND p.gimnasio_id = NEW.id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.sync_gym_modules_metadata() IS 'Propaga automáticamente cambios de slug o módulos contratados de un gimnasio hacia los claims JWT de todos sus usuarios vinculados.';

-- Vincular Trigger en gimnasios
DROP TRIGGER IF EXISTS on_gym_modules_change ON public.gimnasios;
CREATE TRIGGER on_gym_modules_change
AFTER UPDATE OF slug, modulos_activos ON public.gimnasios
FOR EACH ROW
EXECUTE FUNCTION public.sync_gym_modules_metadata();


-- 3. EJECUTAR SINCRONIZACIÓN INICIAL PARA USUARIOS EXISTENTES
-- Esto inyecta de forma imperativa todos los claims correctos en auth.users
-- permitiendo que las sesiones activas en desarrollo y producción obtengan los claims
-- tras refrescar sesión, sin causar inconsistencias.
DO $$
DECLARE
  u RECORD;
  v_gym_slug TEXT;
  v_gym_modules JSONB;
BEGIN
  FOR u IN SELECT id, rol, gimnasio_id FROM public.perfiles LOOP
    -- Obtener datos del gimnasio
    IF u.gimnasio_id IS NOT NULL THEN
      SELECT slug, COALESCE(modulos_activos, '[]'::jsonb) 
      INTO v_gym_slug, v_gym_modules
      FROM public.gimnasios 
      WHERE id = u.gimnasio_id;
    ELSE
      v_gym_slug := NULL;
      v_gym_modules := '[]'::jsonb;
    END IF;

    -- Inyectar claims
    UPDATE auth.users
    SET raw_app_meta_data = 
      COALESCE(raw_app_meta_data, '{}'::jsonb) || 
      jsonb_build_object(
        'rol', u.rol::text,
        'role', u.rol::text,
        'gimnasio_id', COALESCE(u.gimnasio_id::text, ''),
        'gimnasio_slug', COALESCE(v_gym_slug, ''),
        'modulos_activos', v_gym_modules
      )
    WHERE id = u.id;
  END LOOP;
END $$;
