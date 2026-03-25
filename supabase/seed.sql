-- ===============================================
-- VIRTUD SAAS - MASTER SEED SCRIPT (MOCK DATA)
-- CORREGIDO: Enums Técnicos y Restricciones JSONB
-- ===============================================

DO $$
DECLARE
  v_admin_id UUID := 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
  v_student_id UUID := 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a22';
  v_gym_id UUID := 'c2eebc99-9c0b-4ef8-bb6d-6bb9bd380a33';
  v_activity_id UUID := 'd3eebc99-9c0b-4ef8-bb6d-6bb9bd380a44';
  v_horario_id UUID := 'e4eebc99-9c0b-4ef8-bb6d-6bb9bd380a55';
BEGIN

    -- 1️⃣ Inserción en AUTH.USERS (CORREGIDO: Incluye aud, is_sso_user e instance_id para compatibilidad total)
    INSERT INTO auth.users (
        id, 
        email, 
        raw_user_meta_data, 
        role, 
        aud,
        encrypted_password, 
        email_confirmed_at, 
        is_sso_user,
        instance_id,
        created_at, 
        updated_at
    )
    VALUES 
    (
        v_admin_id, 
        'admin@virtudgym.com', 
        '{"nombre_completo":"Super Admin"}', 
        'authenticated', 
        'authenticated',
        crypt('Password123!', gen_salt('bf')), 
        now(), 
        false, 
        '00000000-0000-0000-0000-000000000000',
        now(), 
        now()
    ),
    (
        v_student_id, 
        'student@virtudgym.com', 
        '{"nombre_completo":"Alumno Pruebas"}', 
        'authenticated', 
        'authenticated',
        crypt('Password123!', gen_salt('bf')), 
        now(), 
        false, 
        '00000000-0000-0000-0000-000000000000',
        now(), 
        now()
    )
    ON CONFLICT (id) DO NOTHING;

    -- 2️⃣ Crear Gimnasio Principal
    INSERT INTO public.gimnasios (id, nombre, slug, es_activo, color_primario, color_secundario)
    VALUES (v_gym_id, 'Virtud Central', 'virtud-central', true, '#3B82F6', '#1E3A8A')
    ON CONFLICT (id) DO NOTHING;

    -- 3️⃣ Perfiles Públicos (CORREGIDO: member/active + NULL failsafes)
    INSERT INTO public.perfiles (id, correo, nombre_completo, rol, gimnasio_id, estado_membresia, contacto_emergencia, informacion_medica)
    VALUES 
    (v_admin_id, 'admin@virtudgym.com', 'Super Admin Virtud', 'superadmin', v_gym_id, 'active', NULL, NULL),
    (v_student_id, 'student@virtudgym.com', 'Alumno Pruebas', 'member', v_gym_id, 'active', NULL, NULL)
    ON CONFLICT (id) DO NOTHING;

    -- 4️⃣ Actualizar metadata médica (CORREGIDO: Incluye campos requeridos por check_informacion_medica)
    UPDATE public.perfiles 
    SET informacion_medica = '{
        "peso": 75, 
        "altura": 180, 
        "lesiones": "Ninguna", 
        "enfermedades_cronicas": "Ninguna",
        "grupo_sanguineo": "O+", 
        "presion_arterial": "120/80"
    }'::jsonb
    WHERE id = v_student_id;

    -- 5️⃣ Actividades (CORREGIDO: tipo gym)
    INSERT INTO public.actividades (id, nombre, descripcion, tipo, duracion_minutos, capacidad_maxima, esta_activa)
    VALUES (v_activity_id, 'CrossFit Intensivo', 'Clase dura de fuerza y resistencia', 'gym', 60, 20, true)
    ON CONFLICT (id) DO NOTHING;

    -- 6️⃣ Horarios de Clase (Ajustado a esquema real: sin columnas de capacidad)
    INSERT INTO public.horarios_de_clase (id, actividad_id, entrenador_id, dia_de_la_semana, hora_inicio, hora_fin, esta_activa, gimnasio_id)
    VALUES (v_horario_id, v_activity_id, v_admin_id, 1, '18:00:00', '19:00:00', true, v_gym_id)
    ON CONFLICT (id) DO NOTHING;

    -- 7️⃣ Datos Reactivos para IA (Mediciones/Nutricion)
    INSERT INTO public.mediciones (id, usuario_id, peso, grasa_corporal, registrado_en) 
    VALUES 
    (gen_random_uuid(), v_student_id, 76.5, 18.2, (now() - interval '30 days')),
    (gen_random_uuid(), v_student_id, 75.0, 17.5, now())
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO public.registros_nutricion (id, usuario_id, nombre_comida, calorias_estimadas, puntuacion_salud, creado_en, actualizado_en)
    VALUES (gen_random_uuid(), v_student_id, 'Pollo con Arroz', 600, 8, now(), now())
    ON CONFLICT (id) DO NOTHING;

END $$;
