-- ===============================================
-- VIRTUD SAAS - MASTER SEED SCRIPT (ULTRA-ROBUSTO)
-- CORREGIDO: Orden de Precedencia para Triggers 500
-- ===============================================

DO $$
DECLARE
  v_admin_id UUID := 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
  v_student_id UUID := 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a22';
  v_gym_id UUID := 'c2eebc99-9c0b-4ef8-bb6d-6bb9bd380a33';
  v_activity_id UUID := 'd3eebc99-9c0b-4ef8-bb6d-6bb9bd380a44';
  v_horario_id UUID := 'e4eebc99-9c0b-4ef8-bb6d-6bb9bd380a55';
BEGIN
    -- 0️⃣ Asegurar extensiones
    CREATE EXTENSION IF NOT EXISTS pgcrypto;

    -- 1️⃣ LIMPIEZA TOTAL EN CASCADA MANUAL (Orden inverso de dependencias)
    DELETE FROM public.gamificacion_del_usuario WHERE usuario_id IN (v_admin_id, v_student_id);
    DELETE FROM public.mediciones WHERE usuario_id IN (v_admin_id, v_student_id);
    DELETE FROM public.registros_nutricion WHERE usuario_id IN (v_admin_id, v_student_id);
    DELETE FROM public.horarios_de_clase WHERE entrenador_id IN (v_admin_id, v_student_id);
    DELETE FROM public.asistencias WHERE usuario_id IN (v_admin_id, v_student_id);
    DELETE FROM public.accesos_qr WHERE alumno_id IN (v_admin_id, v_student_id);
    DELETE FROM public.audit_logs WHERE usuario_id IN (v_admin_id, v_student_id);
    DELETE FROM public.perfiles WHERE id IN (v_admin_id, v_student_id);
    DELETE FROM auth.users WHERE email IN ('admin@virtudgym.com', 'student@virtudgym.com');

    -- 2️⃣ INFRAESTRUCTURA: Crear Gimnasio (DEBE EXISTIR ANTES QUE LOS USUARIOS)
    -- El trigger 'handle_new_user' busca el slug 'virtud-central' falla si no existe.
    INSERT INTO public.gimnasios (id, nombre, slug, es_activo, color_primario, color_secundario)
    VALUES (v_gym_id, 'Virtud Central', 'virtud-central', true, '#3B82F6', '#1E3A8A')
    ON CONFLICT (id) DO NOTHING;

    -- 3️⃣ AUTENTICACIÓN: Crear Usuarios en Auth.Users (CON METADATA SINCROZINADA)
    -- El 'rol' en raw_user_meta_data le dice al trigger qué perfil crear.
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
        crypt('Password123!', gen_salt('bf')), now(), 
        false, now(), now()
    ),
    (
        v_student_id, 
        '00000000-0000-0000-0000-000000000000',
        'student@virtudgym.com', 
        '{"nombre_completo":"Alumno Pruebas", "rol":"member"}', 
        '{"provider":"email", "providers":["email"]}',
        'authenticated', 'authenticated',
        crypt('Password123!', gen_salt('bf')), now(), 
        false, now(), now()
    );

    -- 4️⃣ PERFILES PÚBLICOS: Actualización y Aseguramiento
    -- El trigger ya los habrá creado, pero esto asegura los campos manuales especiales.
    INSERT INTO public.perfiles (id, correo, nombre_completo, rol, gimnasio_id, estado_membresia)
    VALUES 
    (v_admin_id, 'admin@virtudgym.com', 'Super Admin Virtud', 'superadmin', v_gym_id, 'active'),
    (v_student_id, 'student@virtudgym.com', 'Alumno Pruebas', 'member', v_gym_id, 'active')
    ON CONFLICT (id) DO UPDATE SET 
        rol = EXCLUDED.rol,
        gimnasio_id = EXCLUDED.gimnasio_id,
        estado_membresia = EXCLUDED.estado_membresia;

    -- 5️⃣ Datos Médicos (Saturación de Metadatos)
    UPDATE public.perfiles 
    SET informacion_medica = '{
        "peso": 75, "altura": 180, "lesiones": "Ninguna", 
        "enfermedades_cronicas": "Ninguna", "grupo_sanguineo": "O+", "presion_arterial": "120/80"
    }'::jsonb
    WHERE id = v_student_id;

    -- 6️⃣ Actividades e Infraestructura Deportiva
    INSERT INTO public.actividades (id, nombre, descripcion, tipo, duracion_minutos, capacidad_maxima, esta_activa, gimnasio_id)
    VALUES (v_activity_id, 'CrossFit Intensivo', 'Clase dura de fuerza', 'gym', 60, 20, true, v_gym_id)
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO public.horarios_de_clase (id, actividad_id, entrenador_id, dia_de_la_semana, hora_inicio, hora_fin, esta_activa, gimnasio_id)
    VALUES (v_horario_id, v_activity_id, v_admin_id, 1, '18:00:00', '19:00:00', true, v_gym_id)
    ON CONFLICT (id) DO NOTHING;

    -- 7️⃣ Datos Vitales (Mediciones y Nutrición)
    INSERT INTO public.mediciones (id, usuario_id, peso, grasa_corporal, registrado_en) 
    VALUES 
    (gen_random_uuid(), v_student_id, 76.5, 18.2, (now() - interval '30 days')),
    (gen_random_uuid(), v_student_id, 75.0, 17.5, now())
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO public.registros_nutricion (id, usuario_id, nombre_comida, calorias_estimadas, puntuacion_salud, creado_en, actualizado_en)
    VALUES (gen_random_uuid(), v_student_id, 'Pollo con Arroz', 600, 8, now(), now())
    ON CONFLICT (id) DO NOTHING;

END $$;
