-- =========================================================================
-- 👤 SEED DE BASE DE DATOS: USUARIOS DE PRUEBA DE CYPRESS (CAUSA 2)
-- Fecha: 25 de Mayo de 2026
-- Objetivo: Generar de forma idempotente los usuarios de prueba para Cypress
--           en auth.users y public.perfiles con roles y contraseñas correctas.
-- =========================================================================

-- Habilitar extensión pgcrypto si no está activa (necesaria para encriptación crypt)
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

DO $$
DECLARE
    default_gym_id UUID;
    admin_user_id UUID := 'a0e0a0e0-0000-0000-0000-000000000001';
    student_user_id UUID := 'a0e0a0e0-0000-0000-0000-000000000002';
    encrypted_pass TEXT;
BEGIN
    -- 1. Asegurar la existencia del Gimnasio por defecto
    SELECT id INTO default_gym_id FROM public.gimnasios WHERE slug = 'virtud-central' LIMIT 1;
    IF default_gym_id IS NULL THEN
        SELECT id INTO default_gym_id FROM public.gimnasios LIMIT 1;
    END IF;

    -- Si no existe ningún gimnasio en absoluto, crearlo de inmediato
    IF default_gym_id IS NULL THEN
        INSERT INTO public.gimnasios (nombre, slug, plan_id, es_activo)
        VALUES ('Virtud Central', 'virtud-central', 'pro', true)
        RETURNING id INTO default_gym_id;
    END IF;

    -- Generar el hash de contraseña bcrypt compatible con Supabase Auth para 'Password123!'
    -- Usamos el salt bf (Blowfish / bcrypt) con factor de costo 10
    encrypted_pass := extensions.crypt('Password123!', extensions.gen_salt('bf', 10));

    -- 2. Insertar de forma idempotente al usuario SUPERADMIN de pruebas (admin@virtudgym.com)
    IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'admin@virtudgym.com') THEN
        INSERT INTO auth.users (
            id,
            instance_id,
            email,
            encrypted_password,
            email_confirmed_at,
            raw_app_meta_data,
            raw_user_meta_data,
            aud,
            role,
            is_sso_user,
            created_at,
            updated_at
        ) VALUES (
            admin_user_id,
            '00000000-0000-0000-0000-000000000000',
            'admin@virtudgym.com',
            encrypted_pass,
            now(),
            '{"provider": "email", "providers": ["email"]}'::jsonb,
            '{"nombre_completo": "Administrador de Pruebas", "rol": "superadmin"}'::jsonb,
            'authenticated',
            'authenticated',
            false,
            now(),
            now()
        );
    END IF;

    -- 3. Insertar de forma idempotente al usuario ALUMNO de pruebas (student@virtudgym.com)
    IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'student@virtudgym.com') THEN
        INSERT INTO auth.users (
            id,
            instance_id,
            email,
            encrypted_password,
            email_confirmed_at,
            raw_app_meta_data,
            raw_user_meta_data,
            aud,
            role,
            is_sso_user,
            created_at,
            updated_at
        ) VALUES (
            student_user_id,
            '00000000-0000-0000-0000-000000000000',
            'student@virtudgym.com',
            encrypted_pass,
            now(),
            '{"provider": "email", "providers": ["email"]}'::jsonb,
            '{"nombre_completo": "Alumno de Pruebas", "rol": "member"}'::jsonb,
            'authenticated',
            'authenticated',
            false,
            now(),
            now()
        );
    END IF;

    -- 4. Sincronizar y forzar la consistencia en public.perfiles
    -- (Por si el trigger falló en el runner o para actualizar perfiles manuales)
    
    -- Insertar perfiles si no fueron disparados por el trigger
    INSERT INTO public.perfiles (id, correo, nombre_completo, gimnasio_id, rol, estado_membresia, creado_en, actualizado_en)
    VALUES 
        (admin_user_id, 'admin@virtudgym.com', 'Administrador de Pruebas', default_gym_id, 'superadmin'::public.user_role, 'active', now(), now()),
        (student_user_id, 'student@virtudgym.com', 'Alumno de Pruebas', default_gym_id, 'member'::public.user_role, 'active', now(), now())
    ON CONFLICT (id) DO UPDATE SET
        gimnasio_id = EXCLUDED.gimnasio_id,
        rol = EXCLUDED.rol,
        estado_membresia = 'active';

    -- Confirmar sincronización
    RAISE NOTICE 'Seed de usuarios de Cypress finalizado con éxito. Gimnasio ID: %', default_gym_id;

EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Error al ejecutar el seed de base de datos de pruebas: %', SQLERRM;
END $$;
