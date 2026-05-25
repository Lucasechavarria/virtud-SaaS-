-- =========================================================================
-- 🛡️ MIGRACIÓN DE REPARACIÓN CONSOLIDADA: USUARIOS DE PRUEBA E IDENTIDADES (CAUSA 4)
-- Fecha: 25 de Mayo de 2026
-- Objetivo: Asegurar que los usuarios de prueba estén correctamente creados en auth.users,
--           cuenten con sus identidades en auth.identities y perfiles en public.perfiles.
--           Resuelve de forma definitiva los errores de llave foránea y "Database error querying schema".
-- =========================================================================

DO $$
DECLARE
    default_gym_id UUID;
    admin_user_id UUID;
    student_user_id UUID;
    encrypted_pass TEXT;
BEGIN
    -- 1. Obtener o crear el Gimnasio por defecto
    SELECT id INTO default_gym_id FROM public.gimnasios WHERE slug = 'virtud-central' LIMIT 1;
    IF default_gym_id IS NULL THEN
        SELECT id INTO default_gym_id FROM public.gimnasios LIMIT 1;
    END IF;
    IF default_gym_id IS NULL THEN
        INSERT INTO public.gimnasios (nombre, slug, plan_id, es_activo)
        VALUES ('Virtud Central', 'virtud-central', 'pro', true)
        RETURNING id INTO default_gym_id;
    END IF;

    -- Limpieza defensiva previa: eliminar cuentas de prueba antiguas e inconsistentes
    -- Esto previene violaciones de llave foránea al asegurar una recreación atómica y limpia.
    DELETE FROM public.perfiles WHERE correo IN ('admin@virtudgym.com', 'student@virtudgym.com');
    DELETE FROM auth.users WHERE email IN ('admin@virtudgym.com', 'student@virtudgym.com');

    -- Generar la contraseña bcrypt 'Password123!' usando pgcrypto del esquema extensions (donde está instalada)
    encrypted_pass := extensions.crypt('Password123!', extensions.gen_salt('bf', 10));

    -- 2. Insertar SUPERADMIN en auth.users y capturar el UUID real asignado por la base de datos
    INSERT INTO auth.users (
        instance_id, email, encrypted_password, email_confirmed_at,
        raw_app_meta_data, raw_user_meta_data, aud, role, is_sso_user,
        created_at, updated_at, confirmation_token, email_change_token_new,
        email_change_token_current, phone_change_token, recovery_token
    ) VALUES (
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
        now(),
        '', '', '', '', ''
    )
    RETURNING id INTO admin_user_id;

    -- 3. Insertar ALUMNO en auth.users y capturar el UUID real asignado por la base de datos
    INSERT INTO auth.users (
        instance_id, email, encrypted_password, email_confirmed_at,
        raw_app_meta_data, raw_user_meta_data, aud, role, is_sso_user,
        created_at, updated_at, confirmation_token, email_change_token_new,
        email_change_token_current, phone_change_token, recovery_token
    ) VALUES (
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
        now(),
        '', '', '', '', ''
    )
    RETURNING id INTO student_user_id;

    -- 4. Insertar de forma idempotente las identidades vinculantes en auth.identities
    INSERT INTO auth.identities (
        provider_id,
        user_id,
        identity_data,
        provider,
        last_sign_in_at,
        created_at,
        updated_at
    )
    SELECT 
        'a0e0a0e0-0000-0000-0000-000000000001',
        admin_user_id,
        '{"sub": "a0e0a0e0-0000-0000-0000-000000000001", "email": "admin@virtudgym.com", "email_verified": true}'::jsonb,
        'email',
        now(),
        now(),
        now()
    WHERE NOT EXISTS (
        SELECT 1 FROM auth.identities WHERE user_id = admin_user_id
    );

    INSERT INTO auth.identities (
        provider_id,
        user_id,
        identity_data,
        provider,
        last_sign_in_at,
        created_at,
        updated_at
    )
    SELECT 
        'a0e0a0e0-0000-0000-0000-000000000002',
        student_user_id,
        '{"sub": "a0e0a0e0-0000-0000-0000-000000000002", "email": "student@virtudgym.com", "email_verified": true}'::jsonb,
        'email',
        now(),
        now(),
        now()
    WHERE NOT EXISTS (
        SELECT 1 FROM auth.identities WHERE user_id = student_user_id
    );

    -- 5. Sincronizar y forzar la consistencia en public.perfiles
    INSERT INTO public.perfiles (id, correo, nombre_completo, gimnasio_id, rol, estado_membresia, creado_en, actualizado_en)
    VALUES 
        (admin_user_id, 'admin@virtudgym.com', 'Administrador de Pruebas', default_gym_id, 'superadmin'::public.user_role, 'active', now(), now()),
        (student_user_id, 'student@virtudgym.com', 'Alumno de Pruebas', default_gym_id, 'member'::public.user_role, 'active', now(), now())
    ON CONFLICT (id) DO UPDATE SET
        gimnasio_id = EXCLUDED.gimnasio_id,
        rol = EXCLUDED.rol,
        estado_membresia = 'active';

END $$;




