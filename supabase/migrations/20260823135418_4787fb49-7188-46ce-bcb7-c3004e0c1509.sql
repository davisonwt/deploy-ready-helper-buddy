CREATE TABLE public.xrp_quotes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  purpose text NOT NULL DEFAULT 'bestowal',
  reference text,
  usd_amount numeric(14,2) NOT NULL CHECK (usd_amount > 0),
  xrp_usd_rate numeric(18,8) NOT NULL CHECK (xrp_usd_rate > 0),
  xrp_amount numeric(18,6) NOT NULL CHECK (xrp_amount > 0),
  rate_sources jsonb NOT NULL DEFAULT '[]'::jsonb,
  destination_address text,
  destination_tag bigint,
  status text NOT NULL DEFAULT 'open',
  locked_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  consumed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_xrp_quotes_user ON public.xrp_quotes(user_id, created_at DESC);
CREATE INDEX idx_xrp_quotes_open ON public.xrp_quotes(status, expires_at) WHERE status = 'open';

GRANT SELECT ON public.xrp_quotes TO authenticated;
GRANT ALL ON public.xrp_quotes TO service_role;

ALTER TABLE public.xrp_quotes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members read their own XRP quotes"
  ON public.xrp_quotes FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Quotes are minted and settled only by the service role (xrp-quote /
-- payment-verification edge functions). No client-side writes: a client that
-- could write here could invent its own exchange rate.

COMMENT ON TABLE public.xrp_quotes IS
  'Locked XRP/USD checkout quotes. USD is the unit of account; a quote fixes how many XRP satisfy a USD amount for a 10-minute window. Service-role writes only.';

CREATE OR REPLACE FUNCTION public.expire_stale_xrp_quotes()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.xrp_quotes
     SET status = 'expired'
   WHERE status = 'open' AND expires_at < now();
$$;

REVOKE EXECUTE ON FUNCTION public.expire_stale_xrp_quotes() FROM anon, authenticated;