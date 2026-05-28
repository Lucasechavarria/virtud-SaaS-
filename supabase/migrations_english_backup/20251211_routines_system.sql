-- ============================================
-- MIGRATION: Sistema de Rutinas Personalizadas
-- Fecha: 2025-12-11
-- Descripción: Agrega tablas para sistema completo de rutinas
--              con información médica, inventario, objetivos y nutrición
-- ============================================

-- ============================================
-- 1. INVENTARIO DEL GIMNASIO
-- ============================================

CREATE TABLE IF NOT EXISTS gym_equipment (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL,
    category TEXT NOT NULL CHECK (category IN (
        'cardio', 'strength', 'free_weights', 'machines', 
        'functional', 'accessories', 'other'
    )),
    brand TEXT,
    quantity INTEGER DEFAULT 1,
    is_available BOOLEAN DEFAULT true,
    condition TEXT CHECK (condition IN ('excellent', 'good', 'fair', 'needs_repair')),
    notes TEXT,
    image_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para gym_equipment
CREATE INDEX IF NOT EXISTS idx_gym_equipment_category ON gym_equipment(category);
CREATE INDEX IF NOT EXISTS idx_gym_equipment_is_available ON gym_equipment(is_available);

-- RLS para gym_equipment
ALTER TABLE gym_equipment ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Everyone can view equipment" ON gym_equipment;
CREATE POLICY "Everyone can view equipment" ON gym_equipment
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins can manage equipment" ON gym_equipment;
CREATE POLICY "Admins can manage equipment" ON gym_equipment
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND role IN ('admin', 'superadmin')
        )
    );

-- ============================================
-- 2. OBJETIVOS DE USUARIOS
-- ============================================

CREATE TABLE IF NOT EXISTS user_goals (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    
    -- Objetivos principales
    primary_goal TEXT NOT NULL CHECK (primary_goal IN (
        'muscle_gain', 'weight_loss', 'strength', 'endurance',
        'flexibility', 'general_fitness', 'sport_specific', 'rehabilitation'
    )),
    secondary_goals TEXT[],
    
    -- Métricas objetivo
    target_weight DECIMAL(5, 2),
    target_body_fat_percentage DECIMAL(4, 2),
    target_muscle_mass DECIMAL(5, 2),
    
    -- Timeline
    start_date DATE NOT NULL DEFAULT CURRENT_DATE,
    target_date DATE,
    
    -- Preferencias
    training_frequency_per_week INTEGER,
    preferred_training_time TEXT CHECK (preferred_training_time IN ('morning', 'afternoon', 'evening', 'flexible')),
    available_days TEXT[], -- ['monday', 'wednesday', 'friday']
    
    -- Limitaciones
    time_per_session_minutes INTEGER,
    equipment_access TEXT[], -- IDs de equipamiento disponible en casa
    
    -- Notas del coach
    coach_notes TEXT,
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para user_goals
CREATE INDEX IF NOT EXISTS idx_user_goals_user_id ON user_goals(user_id);
CREATE INDEX IF NOT EXISTS idx_user_goals_is_active ON user_goals(is_active);

-- RLS para user_goals
ALTER TABLE user_goals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own goals" ON user_goals;
CREATE POLICY "Users can view own goals" ON user_goals
    FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Coaches can view assigned users goals" ON user_goals;
CREATE POLICY "Coaches can view assigned users goals" ON user_goals
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND role IN ('coach', 'admin', 'superadmin')
        )
    );

DROP POLICY IF EXISTS "Coaches can manage goals" ON user_goals;
CREATE POLICY "Coaches can manage goals" ON user_goals
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND role IN ('coach', 'admin', 'superadmin')
        )
    );

-- ============================================
-- 3. PLANES NUTRICIONALES
-- ============================================

CREATE TABLE IF NOT EXISTS nutrition_plans (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    coach_id UUID REFERENCES profiles(id),
    
    -- Plan general
    daily_calories INTEGER,
    protein_grams INTEGER,
    carbs_grams INTEGER,
    fats_grams INTEGER,
    
    -- Comidas (JSON con estructura flexible)
    meals JSONB,
    
    -- Suplementación
    supplements JSONB,
    
    -- Hidratación
    water_liters DECIMAL(3, 1),
    
    -- Notas
    general_guidelines TEXT,
    restrictions TEXT[], -- Alergias, intolerancias
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para nutrition_plans
CREATE INDEX IF NOT EXISTS idx_nutrition_plans_user_id ON nutrition_plans(user_id);
CREATE INDEX IF NOT EXISTS idx_nutrition_plans_coach_id ON nutrition_plans(coach_id);

-- RLS para nutrition_plans
ALTER TABLE nutrition_plans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own nutrition plans" ON nutrition_plans;
CREATE POLICY "Users can view own nutrition plans" ON nutrition_plans
    FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Coaches can view assigned nutrition plans" ON nutrition_plans;
CREATE POLICY "Coaches can view assigned nutrition plans" ON nutrition_plans
    FOR SELECT USING (
        coach_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND role IN ('admin', 'superadmin')
        )
    );

DROP POLICY IF EXISTS "Coaches can manage nutrition plans" ON nutrition_plans;
CREATE POLICY "Coaches can manage nutrition plans" ON nutrition_plans
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND role IN ('coach', 'admin', 'superadmin')
        )
    );

-- ============================================
-- 4. ACTUALIZAR TABLA ROUTINES
-- ============================================

-- Agregar nuevas columnas a routines
ALTER TABLE routines ADD COLUMN IF NOT EXISTS nutrition_plan_id UUID REFERENCES nutrition_plans(id);
ALTER TABLE routines ADD COLUMN IF NOT EXISTS user_goal_id UUID REFERENCES user_goals(id);
ALTER TABLE routines ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'pending_approval', 'approved', 'active', 'completed', 'archived'));
ALTER TABLE routines ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES profiles(id);
ALTER TABLE routines ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE routines ADD COLUMN IF NOT EXISTS medical_considerations TEXT;
ALTER TABLE routines ADD COLUMN IF NOT EXISTS equipment_used UUID[];
ALTER TABLE routines ADD COLUMN IF NOT EXISTS view_count INTEGER DEFAULT 0;
ALTER TABLE routines ADD COLUMN IF NOT EXISTS last_viewed_at TIMESTAMP WITH TIME ZONE;

-- Índices adicionales para routines
CREATE INDEX IF NOT EXISTS idx_routines_status ON routines(status);
CREATE INDEX IF NOT EXISTS idx_routines_nutrition_plan_id ON routines(nutrition_plan_id);
CREATE INDEX IF NOT EXISTS idx_routines_user_goal_id ON routines(user_goal_id);

-- ============================================
-- 5. LOGS DE ACCESO A RUTINAS (SEGURIDAD)
-- ============================================

CREATE TABLE IF NOT EXISTS routine_access_logs (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    routine_id UUID REFERENCES routines(id) ON DELETE CASCADE,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    
    -- Detalles del acceso
    action TEXT NOT NULL CHECK (action IN ('view', 'download_attempt', 'screenshot_attempt', 'share_attempt', 'devtools_detected', 'view_interrupted')),
    ip_address INET,
    user_agent TEXT,
    device_info JSONB,
    
    -- Geolocalización (opcional)
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para routine_access_logs
CREATE INDEX IF NOT EXISTS idx_routine_access_logs_routine_id ON routine_access_logs(routine_id);
CREATE INDEX IF NOT EXISTS idx_routine_access_logs_user_id ON routine_access_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_routine_access_logs_action ON routine_access_logs(action);
CREATE INDEX IF NOT EXISTS idx_routine_access_logs_created_at ON routine_access_logs(created_at);

-- RLS para routine_access_logs
ALTER TABLE routine_access_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Coaches and admins can view logs" ON routine_access_logs;
CREATE POLICY "Coaches and admins can view logs" ON routine_access_logs
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND role IN ('coach', 'admin', 'superadmin')
        )
    );

DROP POLICY IF EXISTS "System can insert logs" ON routine_access_logs;
CREATE POLICY "System can insert logs" ON routine_access_logs
    FOR INSERT WITH CHECK (true);

-- ============================================
-- 6. CAMPOS ADICIONALES PARA PROFILES
-- ============================================

-- Campos para observaciones del coach
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS coach_observations TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS additional_restrictions TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS recommended_modifications TEXT;

-- Campos para onboarding
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS onboarding_completed_at TIMESTAMP WITH TIME ZONE;

-- ============================================
-- 7. HISTORIAL DE CAMBIOS EN PERFILES
-- ============================================

CREATE TABLE IF NOT EXISTS profile_change_history (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    changed_by UUID REFERENCES profiles(id),
    field_changed TEXT NOT NULL,
    old_value TEXT,
    new_value TEXT,
    reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para profile_change_history
CREATE INDEX IF NOT EXISTS idx_profile_change_history_profile_id ON profile_change_history(profile_id);
CREATE INDEX IF NOT EXISTS idx_profile_change_history_changed_by ON profile_change_history(changed_by);
CREATE INDEX IF NOT EXISTS idx_profile_change_history_created_at ON profile_change_history(created_at);

-- RLS para profile_change_history
ALTER TABLE profile_change_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own change history" ON profile_change_history;
CREATE POLICY "Users can view own change history" ON profile_change_history
    FOR SELECT USING (profile_id = auth.uid());

DROP POLICY IF EXISTS "Coaches can view assigned users history" ON profile_change_history;
CREATE POLICY "Coaches can view assigned users history" ON profile_change_history
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND role IN ('coach', 'admin', 'superadmin')
        )
    );

DROP POLICY IF EXISTS "System can insert history" ON profile_change_history;
CREATE POLICY "System can insert history" ON profile_change_history
    FOR INSERT WITH CHECK (true);

-- ============================================
-- 8. TRIGGERS PARA UPDATED_AT
-- ============================================

-- Trigger para gym_equipment
DROP TRIGGER IF EXISTS update_gym_equipment_updated_at ON gym_equipment;
CREATE TRIGGER update_gym_equipment_updated_at 
    BEFORE UPDATE ON gym_equipment
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger para user_goals
DROP TRIGGER IF EXISTS update_user_goals_updated_at ON user_goals;
CREATE TRIGGER update_user_goals_updated_at 
    BEFORE UPDATE ON user_goals
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger para nutrition_plans
DROP TRIGGER IF EXISTS update_nutrition_plans_updated_at ON nutrition_plans;
CREATE TRIGGER update_nutrition_plans_updated_at 
    BEFORE UPDATE ON nutrition_plans
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 9. COMENTARIOS PARA DOCUMENTACIÓN
-- ============================================

COMMENT ON TABLE gym_equipment IS 'Inventario de equipamiento del gimnasio';
COMMENT ON TABLE user_goals IS 'Objetivos personalizados de entrenamiento de usuarios';
COMMENT ON TABLE nutrition_plans IS 'Planes nutricionales personalizados';
COMMENT ON TABLE routine_access_logs IS 'Logs de auditoría de acceso a rutinas (seguridad)';
COMMENT ON TABLE profile_change_history IS 'Historial de cambios en perfiles de usuarios';

COMMENT ON COLUMN routines.status IS 'Estado de la rutina: draft, pending_approval, approved, active, completed, archived';
COMMENT ON COLUMN routines.medical_considerations IS 'Consideraciones médicas específicas para esta rutina';
COMMENT ON COLUMN routines.equipment_used IS 'Array de IDs de equipamiento utilizado en la rutina';
COMMENT ON COLUMN routines.view_count IS 'Número de veces que se ha visualizado la rutina';

COMMENT ON COLUMN profiles.coach_observations IS 'Observaciones del coach sobre el alumno';
COMMENT ON COLUMN profiles.onboarding_completed IS 'Indica si el alumno completó el proceso de onboarding';

-- ============================================
-- FIN DE MIGRACIÓN
-- ============================================
