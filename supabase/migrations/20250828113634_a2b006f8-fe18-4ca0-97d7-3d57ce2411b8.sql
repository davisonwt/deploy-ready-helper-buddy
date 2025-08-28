-- Update increment_ai_usage to handle both parameter patterns
CREATE OR REPLACE FUNCTION public.increment_ai_usage(user_id_param uuid DEFAULT NULL)
RETURNS INTEGER AS $$
DECLARE
  target_user_id uuid;
  current_count INTEGER;
BEGIN
  -- Use provided user_id or fall back to auth.uid()
  target_user_id := COALESCE(user_id_param, auth.uid());
  
  IF target_user_id IS NULL THEN
    RETURN 0;
  END IF;
  
  INSERT INTO public.ai_creations (user_id, content_type, title, content_text)
  SELECT target_user_id, 'script', 'Usage increment', 'Auto-generated usage record'
  WHERE NOT EXISTS (
    SELECT 1 FROM public.ai_creations 
    WHERE user_id = target_user_id 
    AND DATE(created_at) = CURRENT_DATE 
    AND content_text = 'Auto-generated usage record'
  );
  
  -- Get current count
  SELECT COUNT(*) INTO current_count
  FROM public.ai_creations
  WHERE user_id = target_user_id 
  AND DATE(created_at) = CURRENT_DATE;
  
  RETURN current_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;