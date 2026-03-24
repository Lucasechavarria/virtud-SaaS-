-- ===============================================
-- VIRTUD SAAS - MASTER SEED SCRIPT (MOCK DATA)
-- Permite pruebas locales E2E y contexto para la IA
-- ===============================================

-- 1️⃣ Limpiar todo para que el reset sea idempotente (Opcional, pero recomendado si no se hace db reset completo)
-- DELETE FROM auth.users;

-- UUIDs Fijos para Predictibilidad en Tests E2E!
DO $$
DECLARE
  v_admin_id UUID := 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
  v_student_id UUID := 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a22';
  v_gym_id UUID := 'c2eebc99-9c0b-4ef8-bb6d-6bb9bd380a33';
  v_activity_id UUID := 'd3eebc99-9c0b-4ef8-bb6d-6bb9bd380a44';
  v_horario_id UUID := 'e4eebc99-9c0b-4ef8-bb6d-6bb9bd380a55';
BEGIN

    -- 2️⃣ Inserción en AUTH.USERS (Bypass local)
    INSERT INTO auth.users (id, email, raw_user_meta_data, role, encrypted_password, email_confirmed_at, created_at, updated_at)
    VALUES 
    (v_admin_id, 'admin@virtudgym.com', '{"nombre_completo":"Super Admin"}', 'authenticated', crypt('Password123!', gen_salt('bf')), now(), now(), now()),
    (v_student_id, 'student@virtudgym.com', '{"nombre_completo":"Alumno Pruebas"}', 'authenticated', crypt('Password123!', gen_salt('bf')), now(), now(), now())
    ON CONFLICT (id) DO NOTHING;

    -- 3️⃣ Crear Gimnasio Principal
    INSERT INTO public.gimnasios (id, nombre, slug, es_activo, color_primario, color_secundario)
    VALUES (v_gym_id, 'Virtud Central', 'virtud-central', true, '#3B82F6', '#1E3A8A')
    ON CONFLICT (id) DO NOTHING;

    -- 4️⃣ Perfiles Públicos
    INSERT INTO public.perfiles (id, correo, nombre_completo, rol, gimnasio_id, estado_membresia)
    VALUES 
    (v_admin_id, 'admin@virtudgym.com', 'Super Admin Virtud', 'superadmin', v_gym_id, 'activa'),
    (v_student_id, 'student@virtudgym.com', 'Alumno Pruebas', 'alumno', v_gym_id, 'activa')
    ON CONFLICT (id) DO NOTHING;

    -- Actualizar metadata médica para que GEMINI IA tenga contexto
    UPDATE public.perfiles 
    SET informacion_medica = '{"peso": 75, "altura": 180, "lesiones": "Esguince tobillo izquierdo hace 1 mes", "enfermedades_cronicas": "Ninguna"}'::jsonb
    WHERE id = v_student_id;

    -- 5️⃣ Actividades (Clases)
    INSERT INTO public.actividades (id, nombre, descripcion, tipo, duracion_minutos, capacidad_maxima, esta_activa)
    VALUES (v_activity_id, 'CrossFit Intensivo', 'Clase dura de fuerza y resistencia', 'Hibrida', 60, 20, true)
    ON CONFLICT (id) DO NOTHING;

    -- 6️⃣ Horarios de Clase (El Overbooking Target)
    INSERT INTO public.horarios_de_clase (id, actividad_id, entrenador_id, dia_de_la_semana, hora_inicio, hora_fin, capacidad_maxima, capacidad_actual, esta_activa)
    VALUES (v_horario_id, v_activity_id, v_admin_id, 1, '18:00:00', '19:00:00', 20, 0, true)
    ON CONFLICT (id) DO NOTHING;

    -- 7️⃣ Datos Reactivos para IA (Mediciones/Nutricion)
    INSERT INTO public.mediciones (id, user_id, peso, grasa_corporal, registrado_en) 
    VALUES 
    (gen_random_uuid(), v_student_id, 76.5, 18.2, (now() - interval '30 days')),
    (gen_random_uuid(), v_student_id, 75.0, 17.5, now());

    INSERT INTO public.registros_nutricion (id, usuario_id, nombre_comida, calorias_estimadas, puntuacion_salud, creado_en, actualizado_en)
    VALUES (gen_random_uuid(), v_student_id, 'Pollo con Arroz', 600, 8, now(), now());

END $$;
