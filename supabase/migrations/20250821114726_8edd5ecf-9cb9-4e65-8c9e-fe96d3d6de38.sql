-- Update handle_new_user function to include timezone and country
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (
    user_id, 
    first_name, 
    last_name, 
    display_name,
    location,
    preferred_currency,
    timezone,
    country
  )
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data ->> 'first_name',
    NEW.raw_user_meta_data ->> 'last_name',
    COALESCE(
      NEW.raw_user_meta_data ->> 'display_name',
      CONCAT(
        NEW.raw_user_meta_data ->> 'first_name',
        ' ',
        NEW.raw_user_meta_data ->> 'last_name'
      )
    ),
    NEW.raw_user_meta_data ->> 'location',
    COALESCE(NEW.raw_user_meta_data ->> 'preferred_currency', 'USD'),
    COALESCE(NEW.raw_user_meta_data ->> 'timezone', 'UTC'),
    NEW.raw_user_meta_data ->> 'country'
  );
  RETURN NEW;
END;
$$;