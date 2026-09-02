#!/usr/bin/env bash
# End-to-end test of the payout-address hardening flow, against the REAL
# deployed edge functions. Run this yourself (Git Bash / WSL / any bash) --
# it needs SUPABASE_SERVICE_ROLE_KEY, which should never be pasted into a
# chat session.
#
# IMPORTANT before running: TEST_USER_ID below defaults to the account
# used as "the non-admin test account" throughout this session
# (6ec87b18-44fe-4c68-8c6a-f5b2a79ae7b2). It has a real email on file
# (confirmed: rodney@theriseblueprint.online). This script sets a KNOWN
# TEMPORARY PASSWORD on that account via the Auth admin API so it can sign
# in as a real session -- password changes are one-way (hashed, not
# reversible), so if this is a real person's account, they will not be
# able to log in with their old password afterward. If you have a
# dedicated, disposable test account instead, use its user id here.
# Either way, decide this before running, not after.
#
# Usage:
#   export SUPABASE_URL="https://zuwkgasbkpjlxzsjzumu.supabase.co"
#   export SUPABASE_ANON_KEY="<anon key, safe to hardcode, it's already public in src/integrations/supabase/client.ts>"
#   export SUPABASE_SERVICE_ROLE_KEY="<paste from Supabase -> Settings -> API>"
#   bash scripts/wallet-hardening-e2e-test.sh

set -euo pipefail

SUPABASE_URL="${SUPABASE_URL:-https://zuwkgasbkpjlxzsjzumu.supabase.co}"
SUPABASE_ANON_KEY="${SUPABASE_ANON_KEY:-eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp1d2tnYXNia3BqbHh6c2p6dW11Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI4NDk4MjEsImV4cCI6MjA2ODQyNTgyMX0.ffH_7MzNCgyjXf8BFzGDCiVE7Qjptqb9qKBkq3gVbiU}"
: "${SUPABASE_SERVICE_ROLE_KEY:?Set SUPABASE_SERVICE_ROLE_KEY first (Supabase dashboard -> Settings -> API -> service_role).}"

TEST_USER_ID="${TEST_USER_ID:-6ec87b18-44fe-4c68-8c6a-f5b2a79ae7b2}"
TEST_TEMP_PASSWORD="${TEST_TEMP_PASSWORD:-Wallet-Hardening-Test-$(date +%s)!}"
TEST_SOLANA_ADDRESS="7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU"  # a syntactically valid Solana address, used only as test data

echo "=== 0. Look up the test account's email ==="
EMAIL=$(curl -s "${SUPABASE_URL}/auth/v1/admin/users/${TEST_USER_ID}" \
  -H "apikey: ${SUPABASE_SERVICE_ROLE_KEY}" \
  -H "Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}" | python3 -c "import json,sys; print(json.load(sys.stdin).get('email',''))")
echo "Test account email: ${EMAIL}"
if [ -z "$EMAIL" ]; then echo "Could not resolve email for $TEST_USER_ID -- aborting."; exit 1; fi

echo ""
echo "=== 1. Set a known temporary password (Auth admin API) ==="
curl -s -X PUT "${SUPABASE_URL}/auth/v1/admin/users/${TEST_USER_ID}" \
  -H "apikey: ${SUPABASE_SERVICE_ROLE_KEY}" \
  -H "Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}" \
  -H "Content-Type: application/json" \
  -d "{\"password\": \"${TEST_TEMP_PASSWORD}\"}" | python3 -m json.tool
echo "(expect an updated_at timestamp, no error)"

echo ""
echo "=== 2. Sign in for real, get a genuine session access token ==="
SIGNIN=$(curl -s -X POST "${SUPABASE_URL}/auth/v1/token?grant_type=password" \
  -H "apikey: ${SUPABASE_ANON_KEY}" \
  -H "Content-Type: application/json" \
  -d "{\"email\": \"${EMAIL}\", \"password\": \"${TEST_TEMP_PASSWORD}\"}")
ACCESS_TOKEN=$(echo "$SIGNIN" | python3 -c "import json,sys; print(json.load(sys.stdin).get('access_token',''))")
if [ -z "$ACCESS_TOKEN" ]; then echo "Sign-in failed: $SIGNIN"; exit 1; fi
echo "Got a real access token (not shown)."

echo ""
echo "=== 3. Wrong password -- expect 401 reauth_failed, no change made ==="
curl -s -w "\nHTTP %{http_code}\n" -X POST "${SUPABASE_URL}/functions/v1/update-crypto-payout" \
  -H "apikey: ${SUPABASE_ANON_KEY}" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -H "Content-Type: application/json" \
  -d "{\"payout_network\":\"solana_usdc\",\"payout_address\":\"${TEST_SOLANA_ADDRESS}\",\"payout_address_confirm\":\"${TEST_SOLANA_ADDRESS}\",\"payout_tag\":null,\"payout_wallet_type\":\"personal\",\"current_password\":\"definitely-the-wrong-password\"}"
echo "^ expect: HTTP 401, code reauth_failed"

echo ""
echo "=== 4. Right password -- expect success, payout_details_updated_at set to now ==="
curl -s -w "\nHTTP %{http_code}\n" -X POST "${SUPABASE_URL}/functions/v1/update-crypto-payout" \
  -H "apikey: ${SUPABASE_ANON_KEY}" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -H "Content-Type: application/json" \
  -d "{\"payout_network\":\"solana_usdc\",\"payout_address\":\"${TEST_SOLANA_ADDRESS}\",\"payout_address_confirm\":\"${TEST_SOLANA_ADDRESS}\",\"payout_tag\":null,\"payout_wallet_type\":\"personal\",\"current_password\":\"${TEST_TEMP_PASSWORD}\"}"
echo "^ expect: HTTP 200, success:true, payout.payout_address = ${TEST_SOLANA_ADDRESS}"
echo ""
echo "Now check the inbox for ${EMAIL} for a 'payout destination was changed' email."
echo "(If BREVO_API_KEY isn't configured in Supabase secrets, this step fails silently --"
echo " check the send_brevo_email function's logs in the Supabase dashboard if no email arrives.)"

echo ""
echo "=== 5. Rate limiting -- fire more requests, expect the 6th (overall, this hour) to 429 ==="
echo "Already made 2 POSTs above (steps 3-4). PAYMENT preset = 5/hour, so 3 more should"
echo "succeed-or-fail-normally, and the 6th total should be HTTP 429."
for i in 3 4 5; do
  echo "--- attempt #$i (of this run) ---"
  curl -s -w "\nHTTP %{http_code}\n" -X POST "${SUPABASE_URL}/functions/v1/update-crypto-payout" \
    -H "apikey: ${SUPABASE_ANON_KEY}" \
    -H "Authorization: Bearer ${ACCESS_TOKEN}" \
    -H "Content-Type: application/json" \
    -d "{\"payout_network\":\"solana_usdc\",\"payout_address\":\"${TEST_SOLANA_ADDRESS}\",\"payout_address_confirm\":\"${TEST_SOLANA_ADDRESS}\",\"payout_tag\":null,\"payout_wallet_type\":\"personal\",\"current_password\":\"${TEST_TEMP_PASSWORD}\"}"
done
echo "--- attempt #6 (of this run, #6 overall this hour) -- expect HTTP 429 ---"
curl -s -w "\nHTTP %{http_code}\n" -X POST "${SUPABASE_URL}/functions/v1/update-crypto-payout" \
  -H "apikey: ${SUPABASE_ANON_KEY}" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -H "Content-Type: application/json" \
  -d "{\"payout_network\":\"solana_usdc\",\"payout_address\":\"${TEST_SOLANA_ADDRESS}\",\"payout_address_confirm\":\"${TEST_SOLANA_ADDRESS}\",\"payout_tag\":null,\"payout_wallet_type\":\"personal\",\"current_password\":\"${TEST_TEMP_PASSWORD}\"}"
echo "^ expect: HTTP 429, X-RateLimit-Exceeded header, error 'Rate limit exceeded'"

echo ""
echo "=== 6. Cooling-off -- payout-earnings dry run should show this recipient skipped ==="
echo "(Only observable if this account currently has an owed balance on the Solana rail --"
echo " if it doesn't, this recipient won't appear in the dry-run output at all, and the"
echo " only available proof is profiles.payout_details_updated_at being very recent, which"
echo " step 4 above already confirmed via the response body.)"
curl -s -X POST "${SUPABASE_URL}/functions/v1/payout-earnings" \
  -H "apikey: ${SUPABASE_ANON_KEY}" \
  -H "Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}" \
  -H "Content-Type: application/json" \
  -d '{"dry_run": true}' | python3 -c "
import json, sys
data = json.load(sys.stdin)
mine = [r for r in data.get('recipients', []) if r.get('recipient_user_id') == '${TEST_USER_ID}']
if mine:
    print(json.dumps(mine, indent=2))
    for r in mine:
        if r.get('reason') == 'payout_address_cooling_off':
            print('CONFIRMED: cooling-off is blocking this recipient.')
else:
    print('This recipient has no owed balance right now -- nothing to show in the dry run.')
"

echo ""
echo "=== Done. Cleanup reminder ==="
echo "This account's password is now: ${TEST_TEMP_PASSWORD}"
echo "If this is a real person's account, either tell them the new password or reset it"
echo "again yourself -- their original password cannot be recovered (it was hashed, not stored)."
echo "The payout_address was changed to the test address ${TEST_SOLANA_ADDRESS} above --"
echo "clear it in the app's payout settings (or via SQL) if that's not desired to persist."
