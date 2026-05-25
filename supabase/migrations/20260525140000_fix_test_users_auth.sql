-- =========================================================================
-- 🛡️ MIGRACIÓN DE REPARACIÓN: CORREGIR ERRORES DE SCHEMA EN AUTH.USERS (CAUSA 3)
-- Fecha: 25 de Mayo de 2026
-- Objetivo: Asegurar que las columnas de tokens de la tabla auth.users
--           no queden en NULL y tengan asociadas sus identidades en auth.identities.
--           Esto previene el error "Database error querying schema" (500)
--           del motor Gotrue de Supabase al intentar escanear filas con NULLs o sin identidad.
-- =========================================================================

-- 1. Actualizar de forma idempotente las columnas de tokens de texto a cadena vacía
UPDATE auth.users
SET 
  confirmation_token = COALESCE(confirmation_token, ''),
  email_change_token_new = COALESCE(email_change_token_new, ''),
  email_change_token_current = COALESCE(email_change_token_current, ''),
  phone = COALESCE(phone, NULL), -- mantener null para no colisionar si hay restricciones únicas
  phone_change_token = COALESCE(phone_change_token, ''),
  recovery_token = COALESCE(recovery_token, ''),
  reauthentication_token = COALESCE(reauthentication_token, ''),
  is_sso_user = COALESCE(is_sso_user, false)
WHERE email IN ('admin@virtudgym.com', 'student@virtudgym.com');

-- 2. Asegurar que las confirmaciones por email estén debidamente registradas
UPDATE auth.users
SET 
  email_confirmed_at = COALESCE(email_confirmed_at, now()),
  last_sign_in_at = COALESCE(last_sign_in_at, now())
WHERE email IN ('admin@virtudgym.com', 'student@virtudgym.com');

-- 3. Insertar de forma idempotente las IDENTIDADES correspondientes en auth.identities
-- (Gotrue requiere imperativamente una identidad para poder iniciar sesión con email)
INSERT INTO auth.identities (
    id,
    user_id,
    identity_data,
    provider,
    last_sign_in_at,
    created_at,
    updated_at
)
VALUES 
    (
        'a0e0a0e0-0000-0000-0000-000000000001',
        'a0e0a0e0-0000-0000-0000-000000000001',
        '{"sub": "a0e0a0e0-0000-0000-0000-000000000001", "email": "admin@virtudgym.com", "email_verified": true}'::jsonb,
        'email',
        now(),
        now(),
        now()
    ),
    (
        'a0e0a0e0-0000-0000-0000-000000000002',
        'a0e0a0e0-0000-0000-0000-000000000002',
        '{"sub": "a0e0a0e0-0000-0000-0000-000000000002", "email": "student@virtudgym.com", "email_verified": true}'::jsonb,
        'email',
        now(),
        now(),
        now()
    )
ON CONFLICT (provider, id) DO NOTHING;

