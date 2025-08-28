-- Update function to accept parameters as expected by edge function
CREATE OR REPLACE FUNCTION public.get_ai_usage_today(user_id_param uuid DEFAULT NULL)
RETURNS INTEGER AS $$
DECLARE
  target_user_id uuid;
BEGIN
  -- Use provided user_id or fall back to auth.uid()
  target_user_id := COALESCE(user_id_param, auth.uid());
  
  IF target_user_id IS NULL THEN
    RETURN 0;
  END IF;
  
  RETURN (
    SELECT COUNT(*)
    FROM public.ai_creations
    WHERE user_id = target_user_id
    AND DATE(created_at) = CURRENT_DATE
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;