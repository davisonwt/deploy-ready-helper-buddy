CREATE OR REPLACE FUNCTION public.get_sower_wallet_public(_user_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT wallet_address
  FROM public.sower_payout_wallets
  WHERE user_id = _user_id
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_sower_wallet_public(uuid) TO authenticated, anon;