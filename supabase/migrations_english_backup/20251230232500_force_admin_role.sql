-- FORCE SUPERADMIN ROLE
-- Target User ID: b557f175-9533-4794-9498-72c84a7df612
-- Run this in Supabase SQL Editor

DO $$
DECLARE
    target_user_id UUID := 'b557f175-9533-4794-9498-72c84a7df612';
BEGIN
    -- 1. Force update public.profiles
    -- This ensures the database record is correct
    UPDATE public.profiles
    SET role = 'superadmin'
    WHERE id = target_user_id;

    -- 2. Force update auth.users metadata
    -- This is the CRITICAL part. The new RLS policies read from here.
    -- Updating this ensures the next time the user logs in, their JWT has the correct role.
    UPDATE auth.users
    SET raw_app_meta_data = 
        COALESCE(raw_app_meta_data, '{}'::jsonb) || '{"role": "superadmin"}'::jsonb
    WHERE id = target_user_id;
    
    RAISE NOTICE 'User % promoted to SUPERADMIN successfully.', target_user_id;
END;
$$;

-- 3. Validation Queries (Check the output after running)
SELECT 'AUTH USER' as source, id, email, raw_app_meta_data 
FROM auth.users 
WHERE id = 'b557f175-9533-4794-9498-72c84a7df612';

SELECT 'PROFILE' as source, id, role 
FROM public.profiles 
WHERE id = 'b557f175-9533-4794-9498-72c84a7df612';
