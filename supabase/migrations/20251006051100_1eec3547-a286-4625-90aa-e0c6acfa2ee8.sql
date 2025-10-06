-- Create rate_limits table for API rate limiting
CREATE TABLE IF NOT EXISTS public.rate_limits (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  identifier TEXT NOT NULL,
  action TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create index separately
CREATE INDEX IF NOT EXISTS idx_rate_limits_identifier_action_created 
ON public.rate_limits (identifier, action, created_at);

-- Enable RLS
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

-- Policy: Only service role can manage rate limits
CREATE POLICY "Service role can manage rate limits"
ON public.rate_limits
FOR ALL
USING (current_setting('role') = 'service_role')
WITH CHECK (current_setting('role') = 'service_role');

-- Add automatic cleanup of old records (older than 1 hour)
CREATE OR REPLACE FUNCTION public.cleanup_old_rate_limits()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.rate_limits
  WHERE created_at < now() - INTERVAL '1 hour';
END;
$$;

COMMENT ON TABLE public.rate_limits IS 'Stores rate limit tracking data for API endpoints. Records are automatically cleaned up after 1 hour.';
COMMENT ON FUNCTION public.cleanup_old_rate_limits IS 'Removes rate limit records older than 1 hour to keep the table size manageable.';