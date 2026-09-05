-- /settings/payouts save failing with a generic non-2xx (2026-09-05).
--
-- update-crypto-payout calls verify_own_security_answer() WITH THE MEMBER'S
-- OWN TOKEN (authenticated role). On 2026-09-05 several SECURITY DEFINER
-- functions in this project turned out to have EXECUTE revoked live for
-- roles the migrations had granted (search_user_profiles,
-- get_all_user_profiles, get_public_profile). If the same happened to this
-- one, the edge function threw and answered 500 "Failed to update payout
-- details". Re-asserting the intended grants is idempotent and harmless if
-- they are already in place.

REVOKE EXECUTE ON FUNCTION public.verify_own_security_answer(int, text) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.verify_own_security_answer(int, text) TO authenticated, service_role;

-- Proof: authenticated must be true, anon false.
SELECT
  has_function_privilege('authenticated', 'public.verify_own_security_answer(int, text)', 'EXECUTE') AS authenticated_can_execute,
  has_function_privilege('anon',          'public.verify_own_security_answer(int, text)', 'EXECUTE') AS anon_can_execute;
