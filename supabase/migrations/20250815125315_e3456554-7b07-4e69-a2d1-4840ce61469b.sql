-- Reset password for the existing user
UPDATE auth.users 
SET encrypted_password = crypt('newpassword123', gen_salt('bf')),
    email_confirmed_at = now(),
    updated_at = now()
WHERE email = 'davison.taljaard@icloud.com';