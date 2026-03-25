-- ===============================================
-- VIRTUD SAAS - MASTER SEED SCRIPT (PORTABLE v45)
-- CORREGIDO: Resolución de esquema para pgcrypto (Search Path)
-- ===============================================

-- 0️⃣ Asegurar extensiones de forma global
-- Intentar habilitar las extensiones necesarias en el esquema por defecto de Supabase
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 🛡️ BLINDAJE DE BÚSQUEDA: Asegurar que Postgres encuentre los tipos y funciones
-- Esto resuelve el error 42883 (function gen_salt does not exist)
SET search_path TO public, extensions, auth;

DO $$
DECLARE
  v_admin_id UUID := 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
  v_student_id UUID := 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a22';
  v_gym_id UUID := 'c2eebc99-9c0b-4ef8-bb6d-6bb9bd380a33';
  v_activity_id UUID := 'd3eebc99-9c0b-4ef8-bb6d-6bb9bd380a44';
  v_horario_id UUID := 'e4eebc99-9c0b-4ef8-bb6d-6bb9bd380a55';
BEGIN

    -- 1️⃣ LIMPIEZA TOTAL EN CASCADA MANUAL
    DELETE FROM public.gamificacion_del_usuario WHERE usuario_id IN (v_admin_id, v_student_id);
    DELETE FROM public.mediciones WHERE usuario_id IN (v_admin_id, v_student_id);
    DELETE FROM public.registros_nutricion WHERE usuario_id IN (v_admin_id, v_student_id);
    DELETE FROM public.horarios_de_clase WHERE entrenador_id IN (v_admin_id, v_student_id);
    DELETE FROM public.asistencias WHERE usuario_id IN (v_admin_id, v_student_id);
    DELETE FROM public.accesos_qr WHERE alumno_id IN (v_admin_id, v_student_id);
    DELETE FROM public.audit_logs WHERE usuario_id IN (v_admin_id, v_student_id);
    
    DELETE FROM public.perfiles WHERE id IN (v_admin_id, v_student_id);
    DELETE FROM auth.users WHERE email IN ('admin@virtudgym.com', 'student@virtudgym.com');

    -- 2️⃣ INFRAESTRUCTURA: Crear Gimnasio (ORDEN CRITICO: Antes que Auth Trigger)
    INSERT INTO public.gimnasios (id, nombre, slug, es_activo, color_primario, color_secundario)
    VALUES (v_gym_id, 'Virtud Central', 'virtud-central', true, '#3B82F6', '#1E3A8A')
    ON CONFLICT (id) DO NOTHING;

    -- 3️⃣ AUTENTICACIÓN: Crear Usuarios en Auth.Users (CON METADATA DE ROL)
    INSERT INTO auth.users (
        id, instance_id, email, 
        raw_user_meta_data, 
        raw_app_meta_data, 
        role, aud,
        encrypted_password, email_confirmed_at, 
        is_sso_user, created_at, updated_at
    )
    VALUES 
    (
        v_admin_id, 
        '00000000-0000-0000-0000-000000000000',
        'admin@virtudgym.com', 
        '{"nombre_completo":"Super Admin", "rol":"superadmin"}', 
        '{"provider":"email", "providers":["email"]}',
        'authenticated', 'authenticated',
        -- El motor buscará crypt() en el search_path (public/extensions)
        crypt('Password123!', gen_salt('bf')), 
        now(), false, now(), now()
    ),
    (
        v_student_id, 
        '00000000-0000-0000-0000-000000000000',
        'student@virtudgym.com', 
        '{"nombre_completo":"Alumno Pruebas", "rol":"member"}', 
        '{"provider":"email", "providers":["email"]}',
        'authenticated', 'authenticated',
        -- El motor buscará crypt() en el search_path (public/extensions)
        crypt('Password123!', gen_salt('bf')), 
        now(), false, now(), now()
    );

    -- 4️⃣ PERFILES PÚBLICOS: Aseguramiento y Sincronización
    INSERT INTO public.perfiles (id, correo, nombre_completo, rol, gimnasio_id, estado_membresia)
    VALUES 
    (v_admin_id, 'admin@virtudgym.com', 'Super Admin Virtud', 'superadmin', v_gym_id, 'active'),
    (v_student_id, 'student@virtudgym.com', 'Alumno Pruebas', 'member', v_gym_id, 'active')
    ON CONFLICT (id) DO UPDATE SET 
        rol = EXCLUDED.rol,
        gimnasio_id = EXCLUDED.gimnasio_id,
        estado_membresia = EXCLUDED.estado_membresia;

    -- 5️⃣ Datos Médicos
    UPDATE public.perfiles 
    SET informacion_medica = '{
        "peso": 75, "altura": 180, "lesiones": "Ninguna", 
        "enfermedades_cronicas": "Ninguna", "grupo_sanguineo": "O+", "presion_arterial": "120/80"
    }'::jsonb
    WHERE id = v_student_id;

    -- 6️⃣ Actividades
    INSERT INTO public.actividades (id, nombre, descripcion, tipo, duracion_minutos, capacidad_maxima, esta_activa, gimnasio_id)
    VALUES (v_activity_id, 'Crossfit Intensivo', 'Clase de fuerza', 'gym', 60, 20, true, v_gym_id)
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO public.horarios_de_clase (id, actividad_id, entrenador_id, dia_de_la_semana, hora_inicio, hora_fin, esta_activa, gimnasio_id)
    VALUES (v_horario_id, v_activity_id, v_admin_id, 1, '18:00:00', '19:00:00', true, v_gym_id)
    ON CONFLICT (id) DO NOTHING;

END $$;
