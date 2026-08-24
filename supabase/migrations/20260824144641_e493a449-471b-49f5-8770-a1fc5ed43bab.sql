-- 1) Listing ownership helper (sower user must own product/orchard/book)
CREATE OR REPLACE FUNCTION public.sower_owns_listing(
  _user uuid,
  _product_id uuid,
  _orchard_id uuid,
  _book_id uuid
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT
    -- exactly one target must be provided
    (num_nonnulls(_product_id, _orchard_id, _book_id) = 1)
    AND (
      (_product_id IS NOT NULL AND EXISTS (
         SELECT 1 FROM public.products p
         JOIN public.sowers s ON s.id = p.sower_id
         WHERE p.id = _product_id AND s.user_id = _user))
      OR (_orchard_id IS NOT NULL AND EXISTS (
         SELECT 1 FROM public.orchards o
         WHERE o.id = _orchard_id AND o.user_id = _user))
      OR (_book_id IS NOT NULL AND EXISTS (
         SELECT 1 FROM public.sower_books b
         LEFT JOIN public.sowers s2 ON s2.id = b.sower_id
         WHERE b.id = _book_id AND (b.user_id = _user OR s2.user_id = _user)))
    )
$$;

-- 2) Assignments: sower may only create for listings they own
DROP POLICY IF EXISTS "Sowers can create assignments" ON public.product_whisperer_assignments;
CREATE POLICY "Sowers can create assignments"
ON public.product_whisperer_assignments
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = sower_id
  AND public.sower_owns_listing(auth.uid(), product_id, orchard_id, book_id)
);

-- 3) Invitations: same ownership requirement
DROP POLICY IF EXISTS "Sowers can create invitations for their own products/orchards/b" ON public.whisperer_invitations;
CREATE POLICY "Sowers can create invitations for their own listings"
ON public.whisperer_invitations
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = sower_id
  AND public.sower_owns_listing(auth.uid(), product_id, orchard_id, book_id)
);

-- 4) Referral links: no direct client INSERT (minted only by
--    public.ensure_whisperer_ref_link, which verifies assignment ownership)
DROP POLICY IF EXISTS "Whisperers can create own referral links" ON public.whisperer_referral_links;
REVOKE INSERT ON public.whisperer_referral_links FROM authenticated;

-- 5) Premium room free access: no client INSERT; go through a verified RPC
DROP POLICY IF EXISTS "Users join free rooms only" ON public.premium_room_access;
REVOKE INSERT ON public.premium_room_access FROM authenticated;

CREATE OR REPLACE FUNCTION public.join_free_premium_room(p_room_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_price numeric;
  v_id uuid;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;

  SELECT COALESCE(price, 0) INTO v_price
  FROM public.premium_rooms WHERE id = p_room_id;

  IF NOT FOUND THEN RAISE EXCEPTION 'room_not_found'; END IF;
  IF v_price > 0 THEN RAISE EXCEPTION 'room_requires_payment'; END IF;

  SELECT id INTO v_id FROM public.premium_room_access
   WHERE room_id = p_room_id AND user_id = v_uid
   LIMIT 1;

  IF v_id IS NOT NULL THEN RETURN v_id; END IF;

  INSERT INTO public.premium_room_access
    (user_id, room_id, access_granted_at, payment_amount, payment_status)
  VALUES (v_uid, p_room_id, now(), 0, 'free')
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.join_free_premium_room(uuid) TO authenticated;