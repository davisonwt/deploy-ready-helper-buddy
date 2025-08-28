-- Create function to get AI usage for today
CREATE OR REPLACE FUNCTION public.get_ai_usage_today()
RETURNS INTEGER AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)
    FROM public.ai_creations
    WHERE user_id = auth.uid()
    AND DATE(created_at) = CURRENT_DATE
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to increment AI usage
CREATE OR REPLACE FUNCTION public.increment_ai_usage()
RETURNS void AS $$
BEGIN
  -- This function is called by edge functions after successful AI generation
  -- The actual increment is handled by inserting into ai_creations table
  RETURN;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;