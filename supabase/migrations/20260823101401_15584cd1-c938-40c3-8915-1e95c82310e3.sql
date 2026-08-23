
-- Helper: is the current user the owner of this whisperer profile?
CREATE OR REPLACE FUNCTION public.is_my_whisperer(_whisperer_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.whisperers w
    WHERE w.id = _whisperer_id AND w.user_id = auth.uid()
  );
$$;

-- Enforce the prescribed path:
--   whisperer-initiated rows are ALWAYS 'pending' (no earnings)
--   only the sower may move a row to 'active' / 'declined' / 'revoked'
--   the whisperer may only 'withdraw' their own pending request
CREATE OR REPLACE FUNCTION public.enforce_whisperer_assignment_flow()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_sower boolean := (auth.uid() = NEW.sower_id);
  is_whisperer boolean := public.is_my_whisperer(NEW.whisperer_id);
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF is_sower THEN
      -- Sower invites / assigns directly: allowed to be active immediately.
      NEW.status := COALESCE(NEW.status, 'active');
    ELSIF is_whisperer THEN
      -- Whisperer requests permission: never active until the sower approves.
      NEW.status := 'pending';
    ELSE
      RAISE EXCEPTION 'Only the sower or the whisperer may create a whisperer link';
    END IF;
    RETURN NEW;
  END IF;

  -- UPDATE
  IF is_sower THEN
    IF NEW.status NOT IN ('pending','active','declined','revoked') THEN
      RAISE EXCEPTION 'Invalid whisperer assignment status: %', NEW.status;
    END IF;
    RETURN NEW;
  ELSIF is_whisperer THEN
    IF NEW.status <> 'withdrawn' OR OLD.status <> 'pending' THEN
      RAISE EXCEPTION 'A whisperer may only withdraw their own pending request';
    END IF;
    NEW.commission_percent := OLD.commission_percent;
    NEW.sower_id := OLD.sower_id;
    NEW.total_earned := OLD.total_earned;
    NEW.total_bestowals := OLD.total_bestowals;
    RETURN NEW;
  END IF;

  RAISE EXCEPTION 'Not allowed to modify this whisperer link';
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_whisperer_assignment_flow ON public.product_whisperer_assignments;
CREATE TRIGGER trg_enforce_whisperer_assignment_flow
BEFORE INSERT OR UPDATE ON public.product_whisperer_assignments
FOR EACH ROW EXECUTE FUNCTION public.enforce_whisperer_assignment_flow();

-- Whisperers may request a link
DROP POLICY IF EXISTS "Whisperers can request assignments" ON public.product_whisperer_assignments;
CREATE POLICY "Whisperers can request assignments"
ON public.product_whisperer_assignments
FOR INSERT TO authenticated
WITH CHECK (public.is_my_whisperer(whisperer_id));

-- Whisperers may withdraw their own pending request (trigger restricts to 'withdrawn')
DROP POLICY IF EXISTS "Whisperers can withdraw own request" ON public.product_whisperer_assignments;
CREATE POLICY "Whisperers can withdraw own request"
ON public.product_whisperer_assignments
FOR UPDATE TO authenticated
USING (public.is_my_whisperer(whisperer_id))
WITH CHECK (public.is_my_whisperer(whisperer_id));

-- One open link per whisperer per seed
CREATE UNIQUE INDEX IF NOT EXISTS uniq_whisperer_open_product
  ON public.product_whisperer_assignments (whisperer_id, product_id)
  WHERE product_id IS NOT NULL AND status IN ('pending','active');
CREATE UNIQUE INDEX IF NOT EXISTS uniq_whisperer_open_book
  ON public.product_whisperer_assignments (whisperer_id, book_id)
  WHERE book_id IS NOT NULL AND status IN ('pending','active');
CREATE UNIQUE INDEX IF NOT EXISTS uniq_whisperer_open_orchard
  ON public.product_whisperer_assignments (whisperer_id, orchard_id)
  WHERE orchard_id IS NOT NULL AND status IN ('pending','active');
