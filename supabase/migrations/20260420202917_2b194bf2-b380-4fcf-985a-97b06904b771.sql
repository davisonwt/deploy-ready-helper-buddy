
INSERT INTO public.profiles (id, user_id, first_name, last_name, phone, location, preferred_currency, timezone, country, username)
SELECT
  gen_random_uuid(),
  u.id,
  u.raw_user_meta_data->>'first_name',
  u.raw_user_meta_data->>'last_name',
  u.raw_user_meta_data->>'phone',
  u.raw_user_meta_data->>'location',
  u.raw_user_meta_data->>'preferred_currency',
  u.raw_user_meta_data->>'timezone',
  u.raw_user_meta_data->>'country',
  COALESCE(u.raw_user_meta_data->>'username', SPLIT_PART(u.email, '@', 1))
FROM auth.users u
WHERE NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.user_id = u.id);
