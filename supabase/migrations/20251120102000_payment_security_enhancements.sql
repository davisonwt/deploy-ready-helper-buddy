-- Payment Security Enhancements
-- Critical security improvements for payment processing

-- 1. Payment Idempotency Table
CREATE TABLE IF NOT EXISTS public.payment_idempotency (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  idempotency_key TEXT UNIQUE NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  result JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_payment_idempotency_key ON public.payment_idempotency(idempotency_key);
CREATE INDEX IF NOT EXISTS idx_payment_idempotency_user ON public.payment_idempotency(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_idempotency_expires ON public.payment_idempotency(expires_at);

-- Enable RLS
ALTER TABLE public.payment_idempotency ENABLE ROW LEVEL SECURITY;

-- Only service role can access idempotency records
CREATE POLICY "payment_idempotency_service_role_only" 
ON public.payment_idempotency 
FOR ALL 
USING (current_setting('role') = 'service_role');

-- 2. Processed Webhooks Table (replay attack protection)
CREATE TABLE IF NOT EXISTS public.processed_webhooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  webhook_id TEXT NOT NULL,
  provider TEXT NOT NULL CHECK (provider IN ('binance_pay', 'stripe', 'other')),
  payload_hash TEXT NOT NULL, -- SHA256 hash of payload for verification
  processed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(webhook_id, provider)
);

CREATE INDEX IF NOT EXISTS idx_processed_webhooks_lookup ON public.processed_webhooks(webhook_id, provider);
CREATE INDEX IF NOT EXISTS idx_processed_webhooks_created ON public.processed_webhooks(processed_at);

-- Enable RLS
ALTER TABLE public.processed_webhooks ENABLE ROW LEVEL SECURITY;

-- Only service role can access webhook records
CREATE POLICY "processed_webhooks_service_role_only" 
ON public.processed_webhooks 
FOR ALL 
USING (current_setting('role') = 'service_role');

-- 3. Payment Audit Log Table
CREATE TABLE IF NOT EXISTS public.payment_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL CHECK (action IN (
    'payment_created',
    'payment_initiated',
    'payment_completed',
    'payment_failed',
    'payment_cancelled',
    'payment_refunded',
    'webhook_received',
    'webhook_processed',
    'webhook_failed',
    'amount_verification_failed',
    'rate_limit_exceeded',
    'idempotency_check'
  )),
  payment_method TEXT NOT NULL CHECK (payment_method IN ('stripe', 'binance_pay', 'eft', 'usdc', 'other')),
  amount NUMERIC NOT NULL,
  currency TEXT NOT NULL,
  bestowal_id UUID REFERENCES public.bestowals(id) ON DELETE SET NULL,
  transaction_id TEXT,
  ip_address INET,
  user_agent TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payment_audit_user ON public.payment_audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_audit_bestowal ON public.payment_audit_log(bestowal_id);
CREATE INDEX IF NOT EXISTS idx_payment_audit_created ON public.payment_audit_log(created_at);
CREATE INDEX IF NOT EXISTS idx_payment_audit_action ON public.payment_audit_log(action);
CREATE INDEX IF NOT EXISTS idx_payment_audit_method ON public.payment_audit_log(payment_method);

-- Enable RLS
ALTER TABLE public.payment_audit_log ENABLE ROW LEVEL SECURITY;

-- Only admins and service role can view audit logs
CREATE POLICY "payment_audit_admin_only" 
ON public.payment_audit_log 
FOR SELECT 
USING (
  current_setting('role') = 'service_role' 
  OR EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'
  )
);

-- 4. Cleanup function for expired idempotency keys
CREATE OR REPLACE FUNCTION public.cleanup_expired_idempotency_keys()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  DELETE FROM public.payment_idempotency
  WHERE expires_at < now();
  
  -- Also cleanup old webhook records (older than 30 days)
  DELETE FROM public.processed_webhooks
  WHERE processed_at < now() - INTERVAL '30 days';
END;
$$;

-- 5. Function to check and store idempotency
CREATE OR REPLACE FUNCTION public.check_payment_idempotency(
  idempotency_key_param TEXT,
  user_id_param UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  existing_record RECORD;
BEGIN
  -- Check for existing idempotency key
  SELECT id, result INTO existing_record
  FROM public.payment_idempotency
  WHERE idempotency_key = idempotency_key_param
  AND user_id = user_id_param
  AND expires_at > now();
  
  IF existing_record.id IS NOT NULL THEN
    -- Return existing result
    RETURN jsonb_build_object(
      'exists', true,
      'result', existing_record.result
    );
  END IF;
  
  -- Key doesn't exist or expired
  RETURN jsonb_build_object('exists', false);
END;
$$;

-- 6. Function to store idempotency result
CREATE OR REPLACE FUNCTION public.store_payment_idempotency(
  idempotency_key_param TEXT,
  user_id_param UUID,
  result_param JSONB
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  INSERT INTO public.payment_idempotency (
    idempotency_key,
    user_id,
    result,
    expires_at
  ) VALUES (
    idempotency_key_param,
    user_id_param,
    result_param,
    now() + INTERVAL '24 hours'
  )
  ON CONFLICT (idempotency_key) DO NOTHING;
END;
$$;

-- 7. Function to check if webhook was already processed
CREATE OR REPLACE FUNCTION public.check_webhook_processed(
  webhook_id_param TEXT,
  provider_param TEXT
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  exists_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO exists_count
  FROM public.processed_webhooks
  WHERE webhook_id = webhook_id_param
  AND provider = provider_param;
  
  RETURN exists_count > 0;
END;
$$;

-- 8. Function to mark webhook as processed
CREATE OR REPLACE FUNCTION public.mark_webhook_processed(
  webhook_id_param TEXT,
  provider_param TEXT,
  payload_hash_param TEXT
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  INSERT INTO public.processed_webhooks (
    webhook_id,
    provider,
    payload_hash
  ) VALUES (
    webhook_id_param,
    provider_param,
    payload_hash_param
  )
  ON CONFLICT (webhook_id, provider) DO NOTHING;
END;
$$;

-- 9. Function to log payment audit event
CREATE OR REPLACE FUNCTION public.log_payment_audit(
  user_id_param UUID,
  action_param TEXT,
  payment_method_param TEXT,
  amount_param NUMERIC,
  currency_param TEXT,
  bestowal_id_param UUID DEFAULT NULL,
  transaction_id_param TEXT DEFAULT NULL,
  ip_address_param INET DEFAULT NULL,
  user_agent_param TEXT DEFAULT NULL,
  metadata_param JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  audit_id UUID;
BEGIN
  INSERT INTO public.payment_audit_log (
    user_id,
    action,
    payment_method,
    amount,
    currency,
    bestowal_id,
    transaction_id,
    ip_address,
    user_agent,
    metadata
  ) VALUES (
    user_id_param,
    action_param,
    payment_method_param,
    amount_param,
    currency_param,
    bestowal_id_param,
    transaction_id_param,
    ip_address_param,
    user_agent_param,
    metadata_param
  )
  RETURNING id INTO audit_id;
  
  RETURN audit_id;
END;
$$;

-- 10. Schedule cleanup job (runs daily)
-- Note: This requires pg_cron extension. If not available, run manually or via cron job.
-- SELECT cron.schedule('cleanup-payment-data', '0 2 * * *', 'SELECT public.cleanup_expired_idempotency_keys();');

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.cleanup_expired_idempotency_keys() TO service_role;
GRANT EXECUTE ON FUNCTION public.check_payment_idempotency(TEXT, UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.store_payment_idempotency(TEXT, UUID, JSONB) TO service_role;
GRANT EXECUTE ON FUNCTION public.check_webhook_processed(TEXT, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.mark_webhook_processed(TEXT, TEXT, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.log_payment_audit(UUID, TEXT, TEXT, NUMERIC, TEXT, UUID, TEXT, INET, TEXT, JSONB) TO service_role;

COMMENT ON TABLE public.payment_idempotency IS 'Stores idempotency keys to prevent duplicate payment processing';
COMMENT ON TABLE public.processed_webhooks IS 'Tracks processed webhooks to prevent replay attacks';
COMMENT ON TABLE public.payment_audit_log IS 'Comprehensive audit log for all payment-related activities';

