-- Clean up incomplete user registrations (users with no name data)
-- Delete users from auth.users who have no display_name, first_name, or last_name in their profile
-- This will cascade delete their profile records as well due to the ON DELETE CASCADE constraint

DO $$
DECLARE
  deleted_count integer;
BEGIN
  -- Delete from auth.users where the profile has no name information
  -- The cascade will automatically delete the profile record
  WITH users_to_delete AS (
    SELECT p.user_id
    FROM public.profiles p
    WHERE (p.display_name IS NULL OR TRIM(p.display_name) = '')
      AND (p.first_name IS NULL OR TRIM(p.first_name) = '')
      AND (p.last_name IS NULL OR TRIM(p.last_name) = '')
  )
  DELETE FROM auth.users
  WHERE id IN (SELECT user_id FROM users_to_delete);
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RAISE NOTICE 'Deleted % incomplete user accounts', deleted_count;
END $$;