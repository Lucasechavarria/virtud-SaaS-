-- 🛡️ UNIFICACIÓN DE ESQUEMA: ELIMINAR LEGADO EN INGLÉS Y ASEGURAR TRIGGERS
-- Este script unifica el esquema a 'perfiles' (Español) y blinda los triggers de Auth.

-- 1. Eliminar tabla legacy 'profiles' (plural en Inglés) para evitar ambigüedad
DROP TABLE IF EXISTS public.profiles CASCADE;

-- 2. Asegurar extensiones de forma global (fuera de bloques procedurales en el seed)
CREATE EXTENSION IF NOT EXISTS pgcrypto SCHEMA public;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" SCHEMA public;

-- 3. Redefinir handle_new_user con calificación total y SET search_path (Blindaje 500)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    default_gym_id UUID;
BEGIN
    -- Forzar search_path dentro de la función por seguridad y visibilidad
    -- Esto resuelve el error "Database error querying schema" al evitar ambigüedad
    SET search_path TO public, extensions;

    -- Intentar obtener el gimnasio por defecto
    SELECT id INTO default_gym_id FROM public.gimnasios WHERE slug = 'virtud-central' LIMIT 1;
    
    IF default_gym_id IS NULL THEN
        SELECT id INTO default_gym_id FROM public.gimnasios LIMIT 1;
    END IF;

    -- Inserción con tipos calificados (public.user_role)
    INSERT INTO public.perfiles (
        id, correo, nombre_completo, rol, gimnasio_id, estado_membresia
    )
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'nombre_completo', split_part(NEW.email, '@', 1)),
        COALESCE((NEW.raw_user_meta_data->>'rol')::text, 'member')::public.user_role,
        default_gym_id,
        'active'
    )
    ON CONFLICT (id) DO NOTHING;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions;

-- 4. Asegurar el trigger en auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 5. Comentario de cierre
COMMENT ON FUNCTION public.handle_new_user() IS 
  'Trigger de Supabase Auth robusto que unifica el esquema a perfiles en Español y maneja roles dinámicos.';

-- 6. LIMPIEZA DE TRIGGERS FANTASMAS EN EL LOGIN (FIX 500 ERROR)
-- Al hacer login, Supabase actualiza 'last_sign_in_at'. Si hay triggers viejos aquí, el login explota.
DROP TRIGGER IF EXISTS on_auth_user_updated ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_deleted ON auth.users;

-- 7. LIMPIEZA DE FUNCIONES LEGACY
-- Aseguramos que ninguna función vieja intente buscar la tabla 'profiles' en inglés
DROP FUNCTION IF EXISTS public.handle_updated_user() CASCADE;
DROP FUNCTION IF EXISTS public.handle_deleted_user() CASCADE;

-- 8. PERMISOS DEL MOTOR DE AUTH
-- Garantizamos que el rol interno de Supabase tenga acceso al esquema extensions (donde vive pgcrypto)
GRANT USAGE ON SCHEMA extensions TO supabase_auth_admin;
GRANT SELECT ON public.gimnasios TO supabase_auth_admin;
