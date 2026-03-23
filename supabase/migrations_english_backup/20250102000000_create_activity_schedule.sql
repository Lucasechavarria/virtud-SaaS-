-- ============================================
-- MIGRATION: Activity Schedule System
-- Date: 2025-01-02
-- Description: Tables for Managing Activities and Weekly Schedules
-- ============================================

-- Enable btree_gist for UUID support in GIST indexes (Required for EXCLUDE constraints with UUID)
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- 1. ACTIVITIES
CREATE TABLE IF NOT EXISTS activities (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    color TEXT DEFAULT '#3b82f6',
    capacity INTEGER DEFAULT 20,
    duration_minutes INTEGER DEFAULT 60,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS for activities
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;

-- Policy: Everyone can view
DROP POLICY IF EXISTS "Everyone can view activities" ON activities;
CREATE POLICY "Everyone can view activities" ON activities
    FOR SELECT USING (true);

-- Policy: Admins can manage
DROP POLICY IF EXISTS "Admins can manage activities" ON activities;
CREATE POLICY "Admins can manage activities" ON activities
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND role IN ('admin', 'superadmin')
        )
    );

-- 2. CLASS SCHEDULES
CREATE TABLE IF NOT EXISTS class_schedules (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    activity_id UUID REFERENCES activities(id) ON DELETE CASCADE,
    coach_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    
    day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 1 AND 7), -- 1=Monday
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    
    is_active BOOLEAN DEFAULT true,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Prevent overlapping schedules
    CONSTRAINT no_overlap_coach EXCLUDE USING gist (
        coach_id WITH =,
        day_of_week WITH =,
        tsrange(
            ('2000-01-01'::date + start_time)::timestamp,
            ('2000-01-01'::date + end_time)::timestamp
        ) WITH &&
    ) WHERE (coach_id IS NOT NULL)
);

-- Indices
CREATE INDEX IF NOT EXISTS idx_class_schedules_day_time ON class_schedules(day_of_week, start_time);

-- RLS for class_schedules
ALTER TABLE class_schedules ENABLE ROW LEVEL SECURITY;

-- Policy: Everyone can view schedules
DROP POLICY IF EXISTS "Everyone can view schedules" ON class_schedules;
CREATE POLICY "Everyone can view schedules" ON class_schedules
    FOR SELECT USING (true);

-- Policy: Admins can manage schedules
DROP POLICY IF EXISTS "Admins can manage schedules" ON class_schedules;
CREATE POLICY "Admins can manage schedules" ON class_schedules
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND role IN ('admin', 'superadmin')
        )
    );

-- 3. TRIGGERS
-- Trigger for activities
DROP TRIGGER IF EXISTS update_activities_updated_at ON activities;
CREATE TRIGGER update_activities_updated_at 
    BEFORE UPDATE ON activities
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger for class_schedules
DROP TRIGGER IF EXISTS update_class_schedules_updated_at ON class_schedules;
CREATE TRIGGER update_class_schedules_updated_at 
    BEFORE UPDATE ON class_schedules
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
