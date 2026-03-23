-- FIX RLS RECURSION: Sync Roles to Metadata
-- Timestamp: 2025-12-30 23:00

-- 1. Create a function to sync role changes to auth.users metadata
CREATE OR REPLACE FUNCTION public.sync_user_role()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE auth.users
  SET raw_app_meta_data = 
    COALESCE(raw_app_meta_data, '{}'::jsonb) || 
    jsonb_build_object('role', NEW.role)
  WHERE id = NEW.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Create the trigger on profiles
DROP TRIGGER IF EXISTS on_profile_role_change ON public.profiles;
CREATE TRIGGER on_profile_role_change
AFTER UPDATE OF role ON public.profiles
FOR EACH ROW
WHEN (OLD.role IS DISTINCT FROM NEW.role)
EXECUTE FUNCTION public.sync_user_role();

-- 3. Run a one-time sync for existing users
DO $$
DECLARE
  profile_rec RECORD;
BEGIN
  FOR profile_rec IN SELECT id, role FROM public.profiles LOOP
    UPDATE auth.users
    SET raw_app_meta_data = 
      COALESCE(raw_app_meta_data, '{}'::jsonb) || 
      jsonb_build_object('role', profile_rec.role)
    WHERE id = profile_rec.id;
  END LOOP;
END;
$$;

-- 4. Update Helper Functions to read from JWT (No DB Query = No Recursion)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  -- Read from the JWT claim 'role' injected by Supabase Auth
  RETURN (auth.jwt() -> 'app_metadata' ->> 'role') IN ('admin', 'superadmin');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.is_coach()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN (auth.jwt() -> 'app_metadata' ->> 'role') = 'coach';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Force Client Refresh (Optional, but good practice)
-- The user might need to sign out and sign in again to get the new JWT with roles.
