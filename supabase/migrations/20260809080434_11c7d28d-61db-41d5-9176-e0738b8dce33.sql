
-- Helper: is the current connection a privileged server-side caller?
CREATE OR REPLACE FUNCTION public.is_service_role()
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT coalesce(current_setting('request.jwt.claim.role', true), current_setting('role', true), '') = 'service_role'
     OR current_user = 'service_role'
     OR auth.role() = 'service_role';
$$;

-- ============ book_orders ============
CREATE OR REPLACE FUNCTION public.guard_book_orders_financials()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.is_service_role() THEN
    RETURN NEW;
  END IF;
  NEW.payment_status    := OLD.payment_status;
  NEW.payment_reference := OLD.payment_reference;
  NEW.payment_method    := OLD.payment_method;
  NEW.bestowal_amount   := OLD.bestowal_amount;
  NEW.tithing_amount    := OLD.tithing_amount;
  NEW.admin_fee         := OLD.admin_fee;
  NEW.total_amount      := OLD.total_amount;
  NEW.bestower_id       := OLD.bestower_id;
  NEW.sower_id          := OLD.sower_id;
  NEW.book_id           := OLD.book_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_book_orders_financials ON public.book_orders;
CREATE TRIGGER trg_guard_book_orders_financials
BEFORE UPDATE ON public.book_orders
FOR EACH ROW EXECUTE FUNCTION public.guard_book_orders_financials();

DROP POLICY IF EXISTS "Sowers can update their book orders" ON public.book_orders;
CREATE POLICY "Sowers can update fulfilment on their book orders"
ON public.book_orders FOR UPDATE TO authenticated
USING (auth.uid() = sower_id)
WITH CHECK (auth.uid() = sower_id);

-- ============ stay_bookings ============
CREATE OR REPLACE FUNCTION public.guard_stay_bookings_financials()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.is_service_role() THEN
    RETURN NEW;
  END IF;
  NEW.payment_status    := OLD.payment_status;
  NEW.payment_reference := OLD.payment_reference;
  NEW.total_price       := OLD.total_price;
  NEW.currency          := OLD.currency;
  NEW.guest_id          := OLD.guest_id;
  NEW.sower_id          := OLD.sower_id;
  NEW.listing_id        := OLD.listing_id;
  -- only the sower may move the operational booking status
  IF NEW.status IS DISTINCT FROM OLD.status AND auth.uid() <> OLD.sower_id THEN
    NEW.status := OLD.status;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_stay_bookings_financials ON public.stay_bookings;
CREATE TRIGGER trg_guard_stay_bookings_financials
BEFORE UPDATE ON public.stay_bookings
FOR EACH ROW EXECUTE FUNCTION public.guard_stay_bookings_financials();

DROP POLICY IF EXISTS "Sowers can update booking status" ON public.stay_bookings;
CREATE POLICY "Booking parties can update non-financial fields"
ON public.stay_bookings FOR UPDATE TO authenticated
USING ((sower_id = auth.uid()) OR (guest_id = auth.uid()))
WITH CHECK ((sower_id = auth.uid()) OR (guest_id = auth.uid()));

-- ============ gig_bookings ============
CREATE OR REPLACE FUNCTION public.guard_gig_bookings_financials()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.is_service_role() THEN
    RETURN NEW;
  END IF;
  NEW.payment_status         := OLD.payment_status;
  NEW.final_fare             := OLD.final_fare;
  NEW.estimated_fare         := OLD.estimated_fare;
  NEW.customer_id            := OLD.customer_id;
  NEW.provider_id            := OLD.provider_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_gig_bookings_financials ON public.gig_bookings;
CREATE TRIGGER trg_guard_gig_bookings_financials
BEFORE UPDATE ON public.gig_bookings
FOR EACH ROW EXECUTE FUNCTION public.guard_gig_bookings_financials();

DROP POLICY IF EXISTS "Booking parties can update" ON public.gig_bookings;
CREATE POLICY "Booking parties can update non-financial fields"
ON public.gig_bookings FOR UPDATE TO authenticated
USING ((auth.uid() = customer_id) OR (auth.uid() = provider_id))
WITH CHECK ((auth.uid() = customer_id) OR (auth.uid() = provider_id));

-- ============ provider_orders ============
CREATE OR REPLACE FUNCTION public.guard_provider_orders_escrow()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_buyer boolean := (OLD.buyer_id = auth.uid());
BEGIN
  IF public.is_service_role() THEN
    RETURN NEW;
  END IF;

  -- escrow lifecycle is server-owned
  NEW.escrow_status      := OLD.escrow_status;
  NEW.escrow_held_at     := OLD.escrow_held_at;
  NEW.escrow_released_at := OLD.escrow_released_at;

  -- money fields are immutable client-side
  NEW.unit_price          := OLD.unit_price;
  NEW.quantity            := OLD.quantity;
  NEW.total_amount        := OLD.total_amount;
  NEW.courier_fee         := OLD.courier_fee;
  NEW.platform_commission := OLD.platform_commission;
  NEW.payment_method      := OLD.payment_method;
  NEW.tx_reference        := OLD.tx_reference;
  NEW.buyer_id            := OLD.buyer_id;
  NEW.provider_id         := OLD.provider_id;
  NEW.product_id          := OLD.product_id;

  -- only the buyer may confirm receipt; only the provider may confirm dispatch
  IF NEW.buyer_confirmed_at IS DISTINCT FROM OLD.buyer_confirmed_at AND NOT v_is_buyer THEN
    NEW.buyer_confirmed_at := OLD.buyer_confirmed_at;
  END IF;
  IF NEW.provider_confirmed_at IS DISTINCT FROM OLD.provider_confirmed_at AND v_is_buyer THEN
    NEW.provider_confirmed_at := OLD.provider_confirmed_at;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_provider_orders_escrow ON public.provider_orders;
CREATE TRIGGER trg_guard_provider_orders_escrow
BEFORE UPDATE ON public.provider_orders
FOR EACH ROW EXECUTE FUNCTION public.guard_provider_orders_escrow();

DROP POLICY IF EXISTS "Providers can update order status" ON public.provider_orders;
CREATE POLICY "Providers can update fulfilment status"
ON public.provider_orders FOR UPDATE TO authenticated
USING (provider_id IN (SELECT providers.id FROM providers WHERE providers.user_id = auth.uid()))
WITH CHECK (provider_id IN (SELECT providers.id FROM providers WHERE providers.user_id = auth.uid()));

-- ============ quote requests ============
CREATE OR REPLACE FUNCTION public.guard_driver_quote_request_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_driver boolean;
BEGIN
  IF public.is_service_role() THEN
    RETURN NEW;
  END IF;
  SELECT EXISTS (
    SELECT 1 FROM community_drivers cd
    WHERE cd.id = OLD.driver_id AND cd.user_id = auth.uid()
  ) INTO v_is_driver;

  NEW.requester_id := OLD.requester_id;
  NEW.driver_id    := OLD.driver_id;
  IF NOT v_is_driver THEN
    NEW.status := OLD.status;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_driver_quote_request_status ON public.driver_quote_requests;
CREATE TRIGGER trg_guard_driver_quote_request_status
BEFORE UPDATE ON public.driver_quote_requests
FOR EACH ROW EXECUTE FUNCTION public.guard_driver_quote_request_status();

DROP POLICY IF EXISTS "Users can update their own requests" ON public.driver_quote_requests;
CREATE POLICY "Requesters can update their own requests"
ON public.driver_quote_requests FOR UPDATE TO authenticated
USING (auth.uid() = requester_id)
WITH CHECK (auth.uid() = requester_id);

DROP POLICY IF EXISTS "Drivers can update requests sent to them" ON public.driver_quote_requests;
CREATE POLICY "Drivers can update requests sent to them"
ON public.driver_quote_requests FOR UPDATE TO authenticated
USING (EXISTS (SELECT 1 FROM community_drivers cd WHERE cd.id = driver_quote_requests.driver_id AND cd.user_id = auth.uid()))
WITH CHECK (EXISTS (SELECT 1 FROM community_drivers cd WHERE cd.id = driver_quote_requests.driver_id AND cd.user_id = auth.uid()));

CREATE OR REPLACE FUNCTION public.guard_service_quote_request_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_provider boolean;
BEGIN
  IF public.is_service_role() THEN
    RETURN NEW;
  END IF;
  SELECT EXISTS (
    SELECT 1 FROM service_providers sp
    WHERE sp.id = OLD.provider_id AND sp.user_id = auth.uid()
  ) INTO v_is_provider;

  NEW.requester_id := OLD.requester_id;
  NEW.provider_id  := OLD.provider_id;
  IF NOT v_is_provider THEN
    NEW.status := OLD.status;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_service_quote_request_status ON public.service_quote_requests;
CREATE TRIGGER trg_guard_service_quote_request_status
BEFORE UPDATE ON public.service_quote_requests
FOR EACH ROW EXECUTE FUNCTION public.guard_service_quote_request_status();

DROP POLICY IF EXISTS "Requesters can update quote status" ON public.service_quote_requests;
DROP POLICY IF EXISTS "Requesters can update their own requests" ON public.service_quote_requests;
CREATE POLICY "Requesters can update their own requests"
ON public.service_quote_requests FOR UPDATE TO authenticated
USING (auth.uid() = requester_id)
WITH CHECK (auth.uid() = requester_id);

DROP POLICY IF EXISTS "Providers can update requests sent to them" ON public.service_quote_requests;
CREATE POLICY "Providers can update requests sent to them"
ON public.service_quote_requests FOR UPDATE TO authenticated
USING (EXISTS (SELECT 1 FROM service_providers sp WHERE sp.id = service_quote_requests.provider_id AND sp.user_id = auth.uid()))
WITH CHECK (EXISTS (SELECT 1 FROM service_providers sp WHERE sp.id = service_quote_requests.provider_id AND sp.user_id = auth.uid()));

-- ============ organization_wallets: remove plaintext secrets ============
ALTER TABLE public.organization_wallets DROP COLUMN IF EXISTS api_key;
ALTER TABLE public.organization_wallets DROP COLUMN IF EXISTS api_secret;
