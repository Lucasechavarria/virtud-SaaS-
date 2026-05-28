-- SECURITY MIGRATION: RLS Policies for Virtud Gym
-- Generated based on RLS_DESIGN.md and User Feedback
-- Timestamp: 2025-12-30

-- 1. Helper Functions (Optional but recommended for cleanliness)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role IN ('admin', 'superadmin')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.is_coach()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'coach'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 1.1 Create Missing Tables
CREATE TABLE IF NOT EXISTS public.coach_attendance (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    coach_id UUID REFERENCES public.profiles(id),
    check_in TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    check_out TIMESTAMP WITH TIME ZONE,
    is_absent BOOLEAN DEFAULT false,
    absence_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Enable RLS on all critical tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.routines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.class_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.challenge_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gym_equipment ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coach_attendance ENABLE ROW LEVEL SECURITY;

-- 3. PROFILES POLICIES
DROP POLICY IF EXISTS "Profiles: View own" ON public.profiles;
CREATE POLICY "Profiles: View own" ON public.profiles
    FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Profiles: Coach view assigned students" ON public.profiles;
CREATE POLICY "Profiles: Coach view assigned students" ON public.profiles
    FOR SELECT USING (
        -- Coach can see student IF assigned
        (auth.uid() = assigned_coach_id AND public.is_coach())
    );

DROP POLICY IF EXISTS "Profiles: Admin view all" ON public.profiles;
CREATE POLICY "Profiles: Admin view all" ON public.profiles
    FOR SELECT USING (public.is_admin());

DROP POLICY IF EXISTS "Profiles: Update own basic info" ON public.profiles;
CREATE POLICY "Profiles: Update own basic info" ON public.profiles
    FOR UPDATE USING (auth.uid() = id);

DROP POLICY IF EXISTS "Profiles: Coach update medical notes" ON public.profiles;
CREATE POLICY "Profiles: Coach update medical notes" ON public.profiles
    FOR UPDATE USING (
        -- Coach can update student IF assigned
        (auth.uid() = assigned_coach_id AND public.is_coach())
    );

DROP POLICY IF EXISTS "Profiles: Admin manage all" ON public.profiles;
CREATE POLICY "Profiles: Admin manage all" ON public.profiles
    FOR ALL USING (public.is_admin());


-- 4. ROUTINES POLICIES
DROP POLICY IF EXISTS "Routines: Member view own active" ON public.routines;
CREATE POLICY "Routines: Member view own active" ON public.routines
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Routines: Coach manage assigned" ON public.routines;
CREATE POLICY "Routines: Coach manage assigned" ON public.routines
    FOR ALL USING (
        -- Own routines or Assigned Students
        (user_id = auth.uid()) OR
        (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = routines.user_id AND p.assigned_coach_id = auth.uid()) AND public.is_coach())
    );

DROP POLICY IF EXISTS "Routines: Admin manage all" ON public.routines;
CREATE POLICY "Routines: Admin manage all" ON public.routines
    FOR ALL USING (public.is_admin());


-- 5. CLASS BOOKINGS POLICIES
DROP POLICY IF EXISTS "Bookings: Member manage own" ON public.class_bookings;
CREATE POLICY "Bookings: Member manage own" ON public.class_bookings
    FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Bookings: Coach view and mark attendance" ON public.class_bookings;
CREATE POLICY "Bookings: Coach view and mark attendance" ON public.class_bookings
    FOR ALL USING (
        -- Check if user is the coach of the class schedule
        EXISTS (
            SELECT 1 FROM public.class_schedules cs 
            WHERE cs.id = class_bookings.class_schedule_id AND cs.coach_id = auth.uid()
        ) AND public.is_coach()
    );

DROP POLICY IF EXISTS "Bookings: Admin manage all" ON public.class_bookings;
CREATE POLICY "Bookings: Admin manage all" ON public.class_bookings
    FOR ALL USING (public.is_admin());


-- 6. CHALLENGES POLICIES
DROP POLICY IF EXISTS "Challenges: View all" ON public.challenges;
CREATE POLICY "Challenges: View all" ON public.challenges
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Challenges: Member create" ON public.challenges;
CREATE POLICY "Challenges: Member create" ON public.challenges
    FOR INSERT WITH CHECK (auth.uid() = created_by);

DROP POLICY IF EXISTS "Challenges: Admin manage all" ON public.challenges;
CREATE POLICY "Challenges: Admin manage all" ON public.challenges
    FOR ALL USING (public.is_admin());


-- 7. MESSAGES POLICIES
DROP POLICY IF EXISTS "Messages: Participants view" ON public.messages;
CREATE POLICY "Messages: Participants view" ON public.messages
    FOR SELECT USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

DROP POLICY IF EXISTS "Messages: Admin audit" ON public.messages;
CREATE POLICY "Messages: Admin audit" ON public.messages
    FOR SELECT USING (public.is_admin());

DROP POLICY IF EXISTS "Messages: Send own" ON public.messages;
CREATE POLICY "Messages: Send own" ON public.messages
    FOR INSERT WITH CHECK (auth.uid() = sender_id);


-- 8. STUDENT REPORTS POLICIES
DROP POLICY IF EXISTS "Reports: Member view/create own" ON public.student_reports;
CREATE POLICY "Reports: Member view/create own" ON public.student_reports
    FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Reports: Admin manage" ON public.student_reports;
CREATE POLICY "Reports: Admin manage" ON public.student_reports
    FOR ALL USING (public.is_admin());


-- 9. COACH ATTENDANCE POLICIES
DROP POLICY IF EXISTS "Coach Attendance: Manage own" ON public.coach_attendance;
CREATE POLICY "Coach Attendance: Manage own" ON public.coach_attendance
    FOR ALL USING (coach_id = auth.uid());

DROP POLICY IF EXISTS "Coach Attendance: Admin view all" ON public.coach_attendance;
CREATE POLICY "Coach Attendance: Admin view all" ON public.coach_attendance
    FOR SELECT USING (public.is_admin());


-- 10. Grant Permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
