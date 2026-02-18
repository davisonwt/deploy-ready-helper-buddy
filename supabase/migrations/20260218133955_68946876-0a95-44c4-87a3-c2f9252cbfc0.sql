-- Add index for call polling query (receiver_id + status + created_at)
CREATE INDEX IF NOT EXISTS idx_call_sessions_receiver_status_created 
ON public.call_sessions (receiver_id, status, created_at DESC);

-- Vacuum the billing_access_logs table to reclaim space
-- (this is a maintenance operation, not a schema change)

-- Clean up old error_logs to reduce table bloat
DELETE FROM public.error_logs WHERE created_at < now() - interval '7 days';

-- Clean up old billing_access_logs  
DELETE FROM public.billing_access_logs WHERE created_at < now() - interval '7 days';