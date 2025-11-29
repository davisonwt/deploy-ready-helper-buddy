-- Create RPC function to add XP to user_progress
-- This is safer than raw SQL updates and allows for additional logic

CREATE OR REPLACE FUNCTION public.add_xp(
  user_id_param UUID,
  amount INTEGER DEFAULT 100
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_xp INTEGER;
  new_xp INTEGER;
  current_level INTEGER;
  new_level INTEGER;
  level_up BOOLEAN := false;
BEGIN
  -- Get current progress
  SELECT xp, level INTO current_xp, current_level
  FROM public.user_progress
  WHERE user_id = user_id_param;

  -- If no record exists, create one
  IF current_xp IS NULL THEN
    INSERT INTO public.user_progress (user_id, xp, level, fruits, streak, last_active)
    VALUES (user_id_param, amount, 1, 0, 0, CURRENT_DATE)
    ON CONFLICT (user_id) DO UPDATE SET
      xp = public.user_progress.xp + amount,
      updated_at = now();
    
    SELECT xp, level INTO new_xp, new_level
    FROM public.user_progress
    WHERE user_id = user_id_param;
  ELSE
    -- Update XP
    UPDATE public.user_progress
    SET xp = xp + amount,
        updated_at = now()
    WHERE user_id = user_id_param
    RETURNING xp, level INTO new_xp, new_level;
  END IF;

  -- Calculate new level based on XP (using exponential formula: 100 * level^2.1)
  -- Reverse formula: level = (xp / 100)^(1/2.1)
  new_level := GREATEST(1, FLOOR(POWER(new_xp::NUMERIC / 100, 1.0/2.1))::INTEGER);

  -- Check if level increased
  IF new_level > current_level THEN
    level_up := true;
    
    -- Update level
    UPDATE public.user_progress
    SET level = new_level,
        updated_at = now()
    WHERE user_id = user_id_param;
  END IF;

  -- Return result
  RETURN jsonb_build_object(
    'success', true,
    'old_xp', current_xp,
    'new_xp', new_xp,
    'old_level', current_level,
    'new_level', new_level,
    'level_up', level_up,
    'xp_gained', amount
  );
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.add_xp(UUID, INTEGER) TO authenticated;

-- Create a simpler version that uses auth.uid() automatically
CREATE OR REPLACE FUNCTION public.add_xp_to_current_user(
  amount INTEGER DEFAULT 100
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN public.add_xp(auth.uid(), amount);
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.add_xp_to_current_user(INTEGER) TO authenticated;

