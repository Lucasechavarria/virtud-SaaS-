-- Create class_bookings table
CREATE TABLE IF NOT EXISTS class_bookings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) NOT NULL,
    class_schedule_id UUID REFERENCES class_schedules(id) NOT NULL,
    date DATE NOT NULL,
    status VARCHAR(50) DEFAULT 'booked' CHECK (status IN ('booked', 'attended', 'cancelled', 'no_show')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, class_schedule_id, date) -- Prevent double booking
);

-- Enable RLS for bookings
ALTER TABLE class_bookings ENABLE ROW LEVEL SECURITY;

-- Booking Policies
CREATE POLICY "Users can view own bookings" ON class_bookings
    FOR SELECT TO authenticated
    USING (user_id = auth.uid());

CREATE POLICY "Users can create own bookings" ON class_bookings
    FOR INSERT TO authenticated
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own bookings" ON class_bookings
    FOR UPDATE TO authenticated
    USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Admins can view all bookings" ON class_bookings;
CREATE POLICY "Admins can view all bookings" ON class_bookings
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('coach', 'admin', 'superadmin')
        )
    );

DROP POLICY IF EXISTS "Admins can update all bookings" ON class_bookings;
CREATE POLICY "Admins can update all bookings" ON class_bookings
    FOR UPDATE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('coach', 'admin', 'superadmin')
        )
    );

-- Create user_gamification table
CREATE TABLE IF NOT EXISTS user_gamification (
    user_id UUID REFERENCES profiles(id) PRIMARY KEY,
    points INTEGER DEFAULT 0,
    current_streak INTEGER DEFAULT 0,
    longest_streak INTEGER DEFAULT 0,
    level INTEGER DEFAULT 1,
    last_activity_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS for gamification
ALTER TABLE user_gamification ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own gamification stats" ON user_gamification
    FOR SELECT TO authenticated
    USING (user_id = auth.uid());

CREATE POLICY "System/Admins can update gamification" ON user_gamification
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('coach', 'admin', 'superadmin')
        )
        OR user_id = auth.uid() -- Allow self-update for now (via server actions usually)
    );

-- Create achievements catalogue
CREATE TABLE IF NOT EXISTS achievements (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    icon VARCHAR(50) DEFAULT '🏆',
    points_reward INTEGER DEFAULT 100,
    category VARCHAR(50) DEFAULT 'general', -- 'streak', 'attendance', 'performance'
    condition_type VARCHAR(50), -- e.g. 'total_classes', 'streak_days'
    condition_value INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS: Public read (authenticated)
ALTER TABLE achievements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Everyone can read achievements" ON achievements FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage achievements" ON achievements FOR ALL TO authenticated 
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('admin', 'superadmin')
        )
    );

-- Create user_achievements (Unlocked badges)
CREATE TABLE IF NOT EXISTS user_achievements (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) NOT NULL,
    achievement_id UUID REFERENCES achievements(id) NOT NULL,
    unlocked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, achievement_id)
);

-- RLS
ALTER TABLE user_achievements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own achievements" ON user_achievements FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Admins can grant achievements" ON user_achievements FOR INSERT TO authenticated 
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('coach', 'admin', 'superadmin')
        )
        OR user_id = auth.uid() -- Ideally only server-side
    );

-- Insert some default achievements
INSERT INTO achievements (name, description, icon, points_reward, category, condition_type, condition_value)
VALUES 
    ('Primer Paso', 'Completar tu primera clase', '🚀', 50, 'attendance', 'total_classes', 1),
    ('Constancia Semanal', 'Asistir a 3 clases en una semana', '🔥', 150, 'attendance', 'classes_week', 3),
    ('Racha de 7 días', 'Mantener una racha de 7 días consecutivos', '⚡', 300, 'streak', 'streak_days', 7),
    ('Nivel 10', 'Alcanzar el nivel 10', '🏅', 500, 'general', 'level', 10)
ON CONFLICT DO NOTHING;

-- Initial gamification record trigger
CREATE OR REPLACE FUNCTION public.handle_new_user_gamification()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.user_gamification (user_id)
  VALUES (new.id)
  ON CONFLICT DO NOTHING;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created_gamification ON public.profiles;
CREATE TRIGGER on_auth_user_created_gamification
  AFTER INSERT ON public.profiles
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user_gamification();
