-- 🛡️ UNIFICACIÓN DE ESQUEMA: ELIMINAR LEGADO EN INGLÉS Y ASEGURAR TRIGGERS
-- Este script unifica el esquema a 'perfiles' (Español) y blinda los triggers de Auth.

-- 1. Eliminar tabla legacy 'profiles' (plural en Inglés) para evitar ambigüedad
DROP TABLE IF EXISTS public.profiles CASCADE;

-- 2. Asegurar extensiones de forma global (fuera de bloques procedurales en el seed)
CREATE EXTENSION IF NOT EXISTS pgcrypto SCHEMA public;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" SCHEMA public;

-- 3. Redefinir handle_new_user con calificación total de tipos para el motor de Auth
-- GoTrue corre como un usuario diferente y necesita rutas absolutas (public.perfiles, public.user_role)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    default_gym_id UUID;
BEGIN
    -- Intentar obtener el gimnasio por defecto (slug inmutable creado en el seed)
    SELECT id INTO default_gym_id FROM public.gimnasios WHERE slug = 'virtud-central' LIMIT 1;
    
    -- Failsafe: Si no existe, tomar el primero (útil para otros entornos)
    IF default_gym_id IS NULL THEN
        SELECT id INTO default_gym_id FROM public.gimnasios LIMIT 1;
    END IF;

    -- Inserción DEFENSIVA: Evitamos fallos por campos nulos o metadatos perdidos
    INSERT INTO public.perfiles (
        id, 
        correo, 
        nombre_completo, 
        rol, 
        gimnasio_id, 
        estado_membresia
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Asegurar el trigger en auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 5. Comentario de cierre
COMMENT ON FUNCTION public.handle_new_user() IS 
  'Trigger de Supabase Auth robusto que unifica el esquema a perfiles en Español y maneja roles dinámicos.';
