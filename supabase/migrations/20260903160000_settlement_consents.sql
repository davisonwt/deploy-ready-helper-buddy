-- Settlement consent (non-custodial model, legal 2026-09-03): a sower
-- must explicitly acknowledge that Sow2Grow holds sale proceeds only
-- until they reach $20 (or on request) before they can list a seed or
-- have one sold. Append-only acceptance log, one row per acceptance --
-- never updated, so history survives a version bump.
CREATE TABLE public.settlement_consents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  version integer NOT NULL,
  accepted_at timestamptz NOT NULL DEFAULT now(),
  ip text
);

CREATE INDEX settlement_consents_user_version_idx ON public.settlement_consents (user_id, version);

ALTER TABLE public.settlement_consents ENABLE ROW LEVEL SECURITY;

-- Read-only from the client. Only accept-settlement-consent (service role,
-- captures accepted_at/ip server-side so neither can be spoofed) writes rows.
CREATE POLICY "users_read_own_settlement_consents"
  ON public.settlement_consents FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "gosats_read_all_settlement_consents"
  ON public.settlement_consents FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'gosat'::app_role));

-- Current required wording version. Bump this (UPDATE app_settings SET
-- value = to_jsonb(<n+1>) WHERE key = 'settlement_consent_version') when
-- the checkbox copy changes -- every existing acceptance is versioned, so
-- a bump alone re-prompts everyone: has_accepted_settlement_consent()
-- stops matching their old row automatically, no other code changes.
INSERT INTO public.app_settings (key, value)
VALUES ('settlement_consent_version', to_jsonb(1))
ON CONFLICT (key) DO NOTHING;

CREATE OR REPLACE FUNCTION public.get_settlement_consent_version()
RETURNS integer
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE((value #>> '{}')::integer, 1) FROM public.app_settings WHERE key = 'settlement_consent_version';
$$;
REVOKE ALL ON FUNCTION public.get_settlement_consent_version() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_settlement_consent_version() TO authenticated, anon, service_role;

CREATE OR REPLACE FUNCTION public.has_accepted_settlement_consent(_user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.settlement_consents
    WHERE user_id = _user_id AND version = public.get_settlement_consent_version()
  );
$$;
REVOKE ALL ON FUNCTION public.has_accepted_settlement_consent(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.has_accepted_settlement_consent(uuid) TO authenticated, service_role;

-- --- Block new listings until the sower has consented -----------------------
-- "First listing" half of the requirement. Products: sower_id -> sowers.user_id.
CREATE OR REPLACE FUNCTION public.enforce_settlement_consent_products()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_sower_user_id uuid;
BEGIN
  SELECT user_id INTO v_sower_user_id FROM public.sowers WHERE id = NEW.sower_id;
  IF v_sower_user_id IS NOT NULL AND NOT public.has_accepted_settlement_consent(v_sower_user_id) THEN
    RAISE EXCEPTION 'settlement_consent_required' USING ERRCODE = 'P0001';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_products_settlement_consent ON public.products;
CREATE TRIGGER trg_products_settlement_consent
  BEFORE INSERT ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.enforce_settlement_consent_products();

-- Orchards: user_id is the owner directly.
CREATE OR REPLACE FUNCTION public.enforce_settlement_consent_orchards()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.user_id IS NOT NULL AND NOT public.has_accepted_settlement_consent(NEW.user_id) THEN
    RAISE EXCEPTION 'settlement_consent_required' USING ERRCODE = 'P0001';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_orchards_settlement_consent ON public.orchards;
CREATE TRIGGER trg_orchards_settlement_consent
  BEFORE INSERT ON public.orchards
  FOR EACH ROW EXECUTE FUNCTION public.enforce_settlement_consent_orchards();
