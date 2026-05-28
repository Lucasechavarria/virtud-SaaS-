-- =========================================================================
-- 🛡️ MIGRACIÓN DE ARQUITECTURA: RESOLVER RECURSIÓN INFINITA RLS
-- Fecha: 28 de Mayo de 2026
-- Objetivo: Rediseñar las funciones get_user_gym_id() y get_user_role()
--           para obtener los datos directamente de la metadata del JWT (auth.jwt())
--           en lugar de consultar la tabla 'perfiles'. Esto elimina por completo
--           la recursión infinita en las políticas RLS ("infinite recursion detected").
-- =========================================================================

-- 1. REDEFINIR FUNCIONES AUXILIARES PARA LEER DEL JWT (EVITA HITS A BASE DE DATOS)
CREATE OR REPLACE FUNCTION public.get_user_gym_id() 
RETURNS UUID AS $$
  SELECT NULLIF(auth.jwt() -> 'app_metadata' ->> 'gimnasio_id', '')::uuid;
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.get_user_role() 
RETURNS TEXT AS $$
  SELECT COALESCE(auth.jwt() -> 'app_metadata' ->> 'rol', auth.jwt() -> 'app_metadata' ->> 'role');
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

COMMENT ON FUNCTION public.get_user_gym_id() IS 'Retorna el gimnasio_id del JWT para evitar recursividad en RLS.';
COMMENT ON FUNCTION public.get_user_role() IS 'Retorna el rol del JWT para evitar recursividad en RLS.';


-- 2. ROBUSTECER EL TRIGGER DE SINCRONIZACIÓN DE METADATOS EN PERFILES
-- Sincroniza tanto el rol como el gimnasio_id en los metadatos del usuario de Supabase Auth
CREATE OR REPLACE FUNCTION public.sync_user_role_metadata()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE auth.users
  SET raw_app_meta_data = 
    COALESCE(raw_app_meta_data, '{}'::jsonb) || 
    jsonb_build_object(
      'rol', NEW.rol::text,
      'role', NEW.rol::text,
      'gimnasio_id', COALESCE(NEW.gimnasio_id::text, '')
    )
  WHERE id = NEW.id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 3. RE-VINCULAR EL TRIGGER PARA REACCIONAR A CAMBIOS DE ROL Y GIMNASIO
DROP TRIGGER IF EXISTS on_profile_role_change ON public.perfiles;
CREATE TRIGGER on_profile_role_change
AFTER INSERT OR UPDATE OF rol, gimnasio_id ON public.perfiles
FOR EACH ROW
EXECUTE FUNCTION public.sync_user_role_metadata();


-- 4. FORZAR LA SINCRONIZACIÓN INICIAL PARA USUARIOS EXISTENTES
-- Esto inyecta de inmediato la metadata del rol y gimnasio en auth.users,
-- resolviendo de forma instantánea el problema de los usuarios de prueba en Cypress.
DO $$
DECLARE
  u RECORD;
BEGIN
  FOR u IN SELECT id, rol, gimnasio_id FROM public.perfiles LOOP
    UPDATE auth.users
    SET raw_app_meta_data = 
      COALESCE(raw_app_meta_data, '{}'::jsonb) || 
      jsonb_build_object(
        'rol', u.rol::text,
        'role', u.rol::text,
        'gimnasio_id', COALESCE(u.gimnasio_id::text, '')
      )
    WHERE id = u.id;
  END LOOP;
END $$;
