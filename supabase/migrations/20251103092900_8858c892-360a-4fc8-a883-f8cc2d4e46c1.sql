-- Update handle_new_user function to extract username from metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_username text;
BEGIN
  -- Extract username from raw_user_meta_data, or generate from email
  user_username := COALESCE(
    NEW.raw_user_meta_data->>'username',
    SPLIT_PART(NEW.email, '@', 1)
  );

  INSERT INTO public.profiles (
    id,
    user_id,
    first_name,
    last_name,
    phone,
    location,
    preferred_currency,
    timezone,
    country,
    username
  )
  VALUES (
    gen_random_uuid(),
    NEW.id,
    NEW.raw_user_meta_data->>'first_name',
    NEW.raw_user_meta_data->>'last_name',
    NEW.raw_user_meta_data->>'phone',
    NEW.raw_user_meta_data->>'location',
    NEW.raw_user_meta_data->>'preferred_currency',
    NEW.raw_user_meta_data->>'timezone',
    NEW.raw_user_meta_data->>'country',
    user_username
  );
  
  RETURN NEW;
END;
$$;