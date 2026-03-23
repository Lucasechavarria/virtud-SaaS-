-- Create student_reports table
CREATE TABLE student_reports (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    type VARCHAR(50) NOT NULL, -- 'pain', 'injury', 'question', 'concern'
    status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'in_progress', 'resolved'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    resolved_at TIMESTAMP WITH TIME ZONE,
    resolved_by UUID REFERENCES profiles(id)
);

-- RLS Policies
ALTER TABLE student_reports ENABLE ROW LEVEL SECURITY;

-- Users can view and create their own reports
CREATE POLICY "Users can view own reports" ON student_reports
    FOR SELECT TO authenticated
    USING (user_id = auth.uid());

CREATE POLICY "Users can create own reports" ON student_reports
    FOR INSERT TO authenticated
    WITH CHECK (user_id = auth.uid());

-- Coaches/Admins can view and update all reports
CREATE POLICY "Coaches can view all reports" ON student_reports
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('coach', 'admin', 'superadmin')
        )
    );

CREATE POLICY "Coaches can update reports" ON student_reports
    FOR UPDATE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('coach', 'admin', 'superadmin')
        )
    );
