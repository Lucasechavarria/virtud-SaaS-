-- Corrige el error de Check Constraint en 'contacto_emergencia' y sincroniza perfiles en español.

-- 0. Limpieza de defaults tóxicos (Evitar que {} viole el CHECK)
ALTER TABLE public.perfiles ALTER COLUMN contacto_emergencia SET DEFAULT NULL;
ALTER TABLE public.perfiles ALTER COLUMN informacion_medica SET DEFAULT NULL;

-- 1. Asegurar tipo enum para roles (si no existe)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
        CREATE TYPE user_role AS ENUM ('member', 'coach', 'admin', 'superadmin');
    END IF;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 2. Redefinir la función handle_new_user de forma robusta
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    default_gym_id UUID;
BEGIN
    -- Obtener el gimnasio por defecto
    SELECT id INTO default_gym_id FROM public.gimnasios WHERE slug = 'virtud-central' LIMIT 1;
    
    -- Si no existe 'virtud-central', tomar el primero disponible
    IF default_gym_id IS NULL THEN
        SELECT id INTO default_gym_id FROM public.gimnasios LIMIT 1;
    END IF;

    -- Inserción defensiva en perfiles (Esquema Español)
    INSERT INTO public.perfiles (
        id, 
        correo, 
        nombre_completo, 
        nombre, 
        apellido, 
        rol, 
        gimnasio_id,
        estado_membresia,
        onboarding_completado,
        contacto_emergencia,
        informacion_medica
    )
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'nombre_completo', split_part(NEW.email, '@', 1)),
        COALESCE(NEW.raw_user_meta_data->>'nombre', split_part(NEW.email, '@', 1)),
        COALESCE(NEW.raw_user_meta_data->>'apellido', ''),
        COALESCE((NEW.raw_user_meta_data->>'rol')::text, 'member')::user_role,
        default_gym_id,
        'inactive',
        false,
        NULL, -- Crucial: NULL pasa el CHECK ({} falla)
        NULL  -- Crucial: NULL pasa el CHECK ({} falla)
    )
    ON CONFLICT (id) DO NOTHING;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Asegurar que el trigger esté vinculado a la tabla correcta (auth.users)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 4. Reparar perfiles existentes que tengan objetos vacíos y violen el Check
UPDATE public.perfiles 
SET contacto_emergencia = NULL 
WHERE contacto_emergencia::text = '{}';

UPDATE public.perfiles 
SET informacion_medica = NULL 
WHERE informacion_medica::text = '{}';
