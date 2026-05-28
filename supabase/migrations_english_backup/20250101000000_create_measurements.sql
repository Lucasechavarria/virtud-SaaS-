-- Create measurements table
CREATE TABLE measurements (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) NOT NULL,
    weight DECIMAL(5,2), -- in kg
    body_fat DECIMAL(4,1), -- percentage
    muscle_mass DECIMAL(5,2), -- in kg
    notes TEXT,
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS Policies
ALTER TABLE measurements ENABLE ROW LEVEL SECURITY;

-- Coaches can view all measurements
CREATE POLICY "Coaches can view all measurements" ON measurements
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('coach', 'admin', 'superadmin')
        )
    );

-- Coaches can insert measurements
CREATE POLICY "Coaches can insert measurements" ON measurements
    FOR INSERT TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('coach', 'admin', 'superadmin')
        )
    );

-- Users can view their own measurements
CREATE POLICY "Users can view own measurements" ON measurements
    FOR SELECT TO authenticated
    USING (user_id = auth.uid());
