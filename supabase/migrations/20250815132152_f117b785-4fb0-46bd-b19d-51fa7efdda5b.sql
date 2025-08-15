-- Reset password for davison.taljaard@icloud.com
-- This will allow login with a temporary password

UPDATE auth.users 
SET 
  encrypted_password = crypt('TempPassword123!', gen_salt('bf')),
  email_confirmed_at = now(),
  updated_at = now()
WHERE email = 'davison.taljaard@icloud.com';