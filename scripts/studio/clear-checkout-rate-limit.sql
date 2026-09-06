-- Unblock a member caught by the checkout (or payment) rate limit.
-- Run in Studio as the owner; the function is gosat/admin-only and logs
-- who cleared what. Replace the user id. Studio has no JWT, so act as the
-- owner's own gosat account first.

SELECT set_config('request.jwt.claims',
  json_build_object('sub', '04754d57-d41d-4ea7-93df-542047a6785b', 'role', 'authenticated')::text, false);

-- how many attempts the member has in the window right now
SELECT access_type, count(*) AS rows_in_last_hour
FROM public.billing_access_logs
WHERE access_type IN ('rate_limit:checkout:3971cc26-3894-4712-8f61-d50587c93dc9',
                      'rate_limit:payment:3971cc26-3894-4712-8f61-d50587c93dc9')
  AND created_at > now() - interval '60 minutes'
GROUP BY access_type;

-- clear the checkout bucket (use 'payment' for the money-out bucket)
SELECT public.clear_member_rate_limit('3971cc26-3894-4712-8f61-d50587c93dc9', 'checkout') AS rows_deleted;
