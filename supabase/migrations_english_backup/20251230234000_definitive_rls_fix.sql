-- RLS FIX 2.0: Eliminate Recursion & Force Access
-- Timestamp: 2025-12-30 23:35

-- 1. Temporary Safety: Disable RLS while we fix things
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;

-- 2. Drop all policies that might use recursive functions
DROP POLICY IF EXISTS "Profiles: View own" ON public.profiles;
DROP POLICY IF EXISTS "Profiles: Coach view assigned students" ON public.profiles;
DROP POLICY IF EXISTS "Profiles: Admin view all" ON public.profiles;
DROP POLICY IF EXISTS "Profiles: Update own basic info" ON public.profiles;
DROP POLICY IF EXISTS "Profiles: Coach update medical notes" ON public.profiles;
DROP POLICY IF EXISTS "Profiles: Admin manage all" ON public.profiles;
DROP POLICY IF EXISTS "Coaches can see assigned profiles" ON public.profiles;
DROP POLICY IF EXISTS "Coaches can update assigned profile medicals" ON public.profiles;
DROP POLICY IF EXISTS "Coaches can see all profiles" ON public.profiles;

-- 3. Update Metadata Sync (Correcting potential issues in the previous trigger)
CREATE OR REPLACE FUNCTION public.sync_user_role()
RETURNS TRIGGER AS $$
BEGIN
  BEGIN
    UPDATE auth.users
    SET raw_app_meta_data = 
      COALESCE(raw_app_meta_data, '{}'::jsonb) || 
      jsonb_build_object('role', NEW.role)
    WHERE id = NEW.id;
  EXCEPTION WHEN OTHERS THEN
    -- Ignore errors if auth.users is not accessible to the trigger
    RAISE LOG 'Error syncing role to auth.users for id %: %', NEW.id, SQLERRM;
  END;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. EMERGENCY FORCE: Set your user as Superadmin in both places
DO $$
DECLARE
    target_uid UUID := 'b557f175-9533-4794-9498-72c84a7df612';
BEGIN
    -- Update Profile
    UPDATE public.profiles SET role = 'superadmin' WHERE id = target_uid;
    
    -- Update Auth Metadata (Directly)
    UPDATE auth.users
    SET raw_app_meta_data = 
        COALESCE(raw_app_meta_data, '{}'::jsonb) || '{"role": "superadmin"}'::jsonb
    WHERE id = target_uid;
    
    RAISE NOTICE 'User % forced to Superadmin in DB and Metadata', target_uid;
END;
$$;

-- 5. RECREATE POLICIES (INLINE LOGIC - NO FUNCTIONS TO AVOID RECURSION)
-- We use auth.jwt() DIRECTLY in the USING clause.

-- Member can see/edit their own profile (Most basic, no recursion possible)
CREATE POLICY "Profiles: My Own" ON public.profiles
    FOR ALL USING (auth.uid() = id);

-- Admin can see/edit EVERYTHING (Using JWT claim, no DB query involved)
CREATE POLICY "Profiles: Admin Full Access" ON public.profiles
    FOR ALL USING (
        (auth.jwt() -> 'app_metadata' ->> 'role') IN ('admin', 'superadmin')
    );

-- Coach can see assigned students (Using JWT claim + simple column check)
CREATE POLICY "Profiles: Coach Assigned" ON public.profiles
    FOR SELECT USING (
        (auth.jwt() -> 'app_metadata' ->> 'role') = 'coach' 
        AND assigned_coach_id = auth.uid()
    );

-- 6. Apply same logic to other sensitive tables (Routines, Bookings, etc.)
ALTER TABLE public.routines ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Routines: Member view own active" ON public.routines;
DROP POLICY IF EXISTS "Routines: Member view own active" ON public.routines;
DROP POLICY IF EXISTS "Routines: Coach manage assigned" ON public.routines;
DROP POLICY IF EXISTS "Routines: Admin manage all" ON public.routines;

CREATE POLICY "Routines: Member Own" ON public.routines
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Routines: Admin Access" ON public.routines
    FOR ALL USING ((auth.jwt() -> 'app_metadata' ->> 'role') IN ('admin', 'superadmin'));

-- 7. RE-ENABLE RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 8. Final Check
SELECT id, email, raw_app_meta_data FROM auth.users WHERE id = 'b557f175-9533-4794-9498-72c84a7df612';
SELECT id, role FROM public.profiles WHERE id = 'b557f175-9533-4794-9498-72c84a7df612';
