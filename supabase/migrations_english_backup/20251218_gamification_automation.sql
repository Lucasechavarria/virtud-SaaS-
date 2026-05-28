-- ⚙️ VIRTUD GYM: AUTOMATIZACIÓN DE GAMIFICACIÓN (VERSIÓN FINAL)

-- 0. FUNCIÓN AUXILIAR PARA INCREMENTAR PUNTOS
CREATE OR REPLACE FUNCTION increment_points(user_id_param UUID, points_param INTEGER)
RETURNS void AS $$
BEGIN
    UPDATE user_gamification
    SET 
        points = points + points_param,
        updated_at = NOW()
    WHERE user_id = user_id_param;
    
    -- Si no existe el registro, lo creamos
    IF NOT FOUND THEN
        INSERT INTO user_gamification (user_id, points)
        VALUES (user_id_param, points_param);
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger function for Class Attendance
CREATE OR REPLACE FUNCTION check_attendance_milestones()
RETURNS TRIGGER AS $$
DECLARE
    v_total_attended INTEGER;
    v_achievement_id UUID;
BEGIN
    -- Only act on 'attended' status
    IF NEW.status = 'attended' AND (OLD.status IS DISTINCT FROM 'attended') THEN
        -- 1. Award points for attendance (50 XP per class)
        PERFORM increment_points(NEW.user_id, 50);

        -- 2. Check for "Primer Paso" (First class)
        SELECT count(*) INTO v_total_attended 
        FROM bookings 
        WHERE user_id = NEW.user_id AND status = 'attended';

        IF v_total_attended = 1 THEN
            SELECT id INTO v_achievement_id FROM achievements WHERE name ILIKE '%Primer Paso%';
            IF v_achievement_id IS NOT NULL THEN
                INSERT INTO user_achievements (user_id, achievement_id)
                VALUES (NEW.user_id, v_achievement_id)
                ON CONFLICT DO NOTHING;
            END IF;
        END IF;

        -- 3. Check for "Constancia" (3 classes in a week)
        SELECT count(*) INTO v_total_attended 
        FROM bookings 
        WHERE user_id = NEW.user_id 
        AND status = 'attended'
        AND booking_date > (CURRENT_DATE - INTERVAL '7 days');

        IF v_total_attended >= 3 THEN
            SELECT id INTO v_achievement_id FROM achievements WHERE name ILIKE '%Constancia%';
            IF v_achievement_id IS NOT NULL THEN
                INSERT INTO user_achievements (user_id, achievement_id)
                VALUES (NEW.user_id, v_achievement_id)
                ON CONFLICT DO NOTHING;
            END IF;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for attendance
DROP TRIGGER IF EXISTS tr_check_attendance_milestones ON public.bookings;
CREATE TRIGGER tr_check_attendance_milestones
    AFTER UPDATE ON public.bookings
    FOR EACH ROW
    WHEN (NEW.status = 'attended')
    EXECUTE FUNCTION check_attendance_milestones();
