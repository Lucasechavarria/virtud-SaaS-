-- Migration: Fix profiles coach assignment and payments user_id constraint
-- Date: 2025-12-20

-- 1. Add assigned_coach_id if missing
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS assigned_coach_id UUID REFERENCES public.profiles(id);

-- 2. Make user_id nullable in payments (for general gym expenses)
ALTER TABLE public.payments 
ALTER COLUMN user_id DROP NOT NULL;

-- 3. Force schema cache refresh (PostgREST)
COMMENT ON TABLE public.profiles IS 'User profiles and roles';
COMMENT ON TABLE public.profiles IS NULL;
