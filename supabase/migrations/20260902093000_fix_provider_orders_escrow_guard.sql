-- guard_provider_orders_escrow() gated provider_confirmed_at on "NOT
-- is_buyer" -- any authenticated non-buyer could set it, not just the
-- actual provider on that order. provider_orders.provider_id references
-- providers.id (that table's own PK, confirmed via its FK constraint),
-- not the provider's auth id -- providers.user_id is the real owner.
-- Resolve it the same way product_bestowals.sower_id -> sowers.id is
-- resolved elsewhere, instead of comparing provider_id to auth.uid()
-- directly (which would never match) or trusting "not the buyer" as a
-- stand-in for "is the provider".

CREATE OR REPLACE FUNCTION public.guard_provider_orders_escrow()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_is_buyer boolean := (OLD.buyer_id = auth.uid());
  v_is_provider boolean := EXISTS (
    SELECT 1 FROM public.providers p
     WHERE p.id = OLD.provider_id AND p.user_id = auth.uid()
  );
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

  -- only the buyer may confirm receipt; only the actual provider may confirm dispatch
  IF NEW.buyer_confirmed_at IS DISTINCT FROM OLD.buyer_confirmed_at AND NOT v_is_buyer THEN
    NEW.buyer_confirmed_at := OLD.buyer_confirmed_at;
  END IF;
  IF NEW.provider_confirmed_at IS DISTINCT FROM OLD.provider_confirmed_at AND NOT v_is_provider THEN
    NEW.provider_confirmed_at := OLD.provider_confirmed_at;
  END IF;

  RETURN NEW;
END;
$function$;
