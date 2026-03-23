-- SEED DATA FOR SCHEDULE

-- 0. Schema Fixes (Ensure columns exist if table was already created)
ALTER TABLE activities DROP CONSTRAINT IF EXISTS activities_type_check;
ALTER TABLE activities ADD COLUMN IF NOT EXISTS color TEXT DEFAULT '#3b82f6';
ALTER TABLE activities ADD COLUMN IF NOT EXISTS duration_minutes INTEGER DEFAULT 60;
-- Try to set default for type if it exists and is not null, or add it if missing
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'activities' AND column_name = 'type') THEN
        ALTER TABLE activities ALTER COLUMN type DROP NOT NULL;
    ELSE
         ALTER TABLE activities ADD COLUMN type TEXT DEFAULT 'CLASS';
    END IF;
END $$;


-- 1. Insert Activities
INSERT INTO activities (name, color, duration_minutes, type) VALUES
('Funcional', '#ef4444', 60, 'CLASS'), -- Red
('Kung Fu', '#f59e0b', 120, 'CLASS'), -- Amber
('Boxeo', '#3b82f6', 90, 'CLASS'), -- Blue
('Tai Chi', '#10b981', 60, 'CLASS'), -- Emerald
('Defensa Personal', '#6366f1', 60, 'CLASS'), -- Indigo
('Musculación', '#8b5cf6', 60, 'GYM'), -- Purple (Will represent open gym)
('Entrenamiento Personalizado', '#ec4899', 60, 'PERSONAL') -- Pink
ON CONFLICT DO NOTHING;

-- 2. Insert Teachers (Dummy Profiles for display purposes)
-- We need valid UUIDs. We'll generate them or assume existing users.
-- Ideally we link to real users, but for now we create placeholder profiles if possible.
-- NOTE: If 'profiles' has a strict FK to 'auth.users', we cannot insert here without auth users.
-- Assuming we might have to skip specific coach assignment if users don't exist, OR we rely on the user to manually update later.
-- For this seed, we will try to select existing users if they match names, or just insert activities.
-- Wait, the user wants "Profesora Rocio", "Maestro Daniel".
-- If I can't insert into profiles, I'll update the description of the activity or generic.
-- BUT, let's try to insert into profiles. If it fails due to FK, we'll see.
-- Actually, a better approach for a demo without auth users is to just rely on the activity name or create a temporary "Coach Name" text field in activities? No, the schema uses coach_id.
-- Let's assume we can't create profiles easily. I will insert the schedules with NULL coach_id for now, but I'll add the teacher name to the Activity Description or similar? 
-- Re-reading schema: `coach_id UUID REFERENCES profiles(id)`.
-- Let's try to find if there are ANY profiles.
-- If not, I will just create the schedules.

-- TO MAKE IT WORK PRETTY: I will update the `activities` table to include a `default_coach_name` text column for this seed, 
-- OR better, I'll just use the activity description to say "Prof. Rocio". 
-- Schema change: Add `teacher_name` generic text field to `class_schedules` to override/supplement the relation.
-- This is often useful for subs or external teachers.

ALTER TABLE class_schedules ADD COLUMN IF NOT EXISTS teacher_text TEXT;

-- 3. Insert Schedules
WITH 
  act_func AS (SELECT id FROM activities WHERE name = 'Funcional' LIMIT 1),
  act_kf AS (SELECT id FROM activities WHERE name = 'Kung Fu' LIMIT 1),
  act_box AS (SELECT id FROM activities WHERE name = 'Boxeo' LIMIT 1),
  act_tc AS (SELECT id FROM activities WHERE name = 'Tai Chi' LIMIT 1),
  act_dp AS (SELECT id FROM activities WHERE name = 'Defensa Personal' LIMIT 1),
  act_musc AS (SELECT id FROM activities WHERE name = 'Musculación' LIMIT 1),
  act_pers AS (SELECT id FROM activities WHERE name = 'Entrenamiento Personalizado' LIMIT 1)

INSERT INTO class_schedules (activity_id, day_of_week, start_time, end_time, teacher_text) VALUES
-- Funcional: Martes, Jueves, Viernes 19hs (1h) - Prof. Rocio
((SELECT id FROM act_func), 2, '19:00', '20:00', 'Prof. Rocio'),
((SELECT id FROM act_func), 4, '19:00', '20:00', 'Prof. Rocio'),
((SELECT id FROM act_func), 5, '19:00', '20:00', 'Prof. Rocio'),

-- Kung Fu: Lunes, Miercoles, Sabado 18hs (2h) - Maestro Daniel
((SELECT id FROM act_kf), 1, '18:00', '20:00', 'Maestro Daniel'),
((SELECT id FROM act_kf), 3, '18:00', '20:00', 'Maestro Daniel'),
((SELECT id FROM act_kf), 6, '18:00', '20:00', 'Maestro Daniel'),

-- Boxeo: Lunes, Miercoles, Viernes 20hs (1:30h) - Prof. Mariano Casco
((SELECT id FROM act_box), 1, '20:00', '21:30', 'Prof. Mariano Casco'),
((SELECT id FROM act_box), 3, '20:00', '21:30', 'Prof. Mariano Casco'),
((SELECT id FROM act_box), 5, '20:00', '21:30', 'Prof. Mariano Casco'),

-- Tai Chi: Martes, Jueves 17hs (1h) - Maestro Daniel
((SELECT id FROM act_tc), 2, '17:00', '18:00', 'Maestro Daniel'),
((SELECT id FROM act_tc), 4, '17:00', '18:00', 'Maestro Daniel'),

-- Defensa Personal: Martes, Jueves 18hs (1h) - Prof. Daniel
((SELECT id FROM act_dp), 2, '18:00', '19:00', 'Prof. Daniel'),
((SELECT id FROM act_dp), 4, '18:00', '19:00', 'Prof. Daniel'),

-- Musculación: Lunes-Viernes 9-20hs, Sabado 9-18hs - Prof. Nazareno
-- Note: Creating one long block per day
((SELECT id FROM act_musc), 1, '09:00', '20:00', 'Prof. Nazareno'),
((SELECT id FROM act_musc), 2, '09:00', '20:00', 'Prof. Nazareno'),
((SELECT id FROM act_musc), 3, '09:00', '20:00', 'Prof. Nazareno'),
((SELECT id FROM act_musc), 4, '09:00', '20:00', 'Prof. Nazareno'),
((SELECT id FROM act_musc), 5, '09:00', '20:00', 'Prof. Nazareno'),
((SELECT id FROM act_musc), 6, '09:00', '18:00', 'Prof. Nazareno'),

-- Entrenamiento Personalizado: L-V 20:00 y 21:00 (1h each), Sabado 9-18 ??
-- "Entrnamiento Personalizados de lunes a viernes a las 20 y 21 horas duracion una hora"
((SELECT id FROM act_pers), 1, '20:00', '21:00', 'Personalizado'),
((SELECT id FROM act_pers), 1, '21:00', '22:00', 'Personalizado'),
((SELECT id FROM act_pers), 2, '20:00', '21:00', 'Personalizado'),
((SELECT id FROM act_pers), 2, '21:00', '22:00', 'Personalizado'),
((SELECT id FROM act_pers), 3, '20:00', '21:00', 'Personalizado'),
((SELECT id FROM act_pers), 3, '21:00', '22:00', 'Personalizado'),
((SELECT id FROM act_pers), 4, '20:00', '21:00', 'Personalizado'),
((SELECT id FROM act_pers), 4, '21:00', '22:00', 'Personalizado'),
((SELECT id FROM act_pers), 5, '20:00', '21:00', 'Personalizado'),
((SELECT id FROM act_pers), 5, '21:00', '22:00', 'Personalizado'),

-- "y los sabados de 9 horas a 18 horas" -> Assuming pure availability block
((SELECT id FROM act_pers), 6, '09:00', '18:00', 'Personalizado')
;
