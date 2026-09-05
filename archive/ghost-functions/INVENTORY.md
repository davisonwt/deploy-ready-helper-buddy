# Ghost edge functions — inventory (P0-3 part A, 2026-09-05)

"Ghost" = deployed on project `zuwkgasbkpjlxzsjzumu` but with no folder under
`supabase/functions/`. Nothing in this folder is deployable; it is a
read-only backup taken with `supabase functions download` on 2026-09-05.

| Deployed | Local | Ghosts | Source recovered | Referenced by anything live in the repo |
|---|---|---|---|---|
| 153 | 88 | 65 | 64 (all but `-Remnants-Wheel-Calendar`, whose slug the CLI rejects) | 0 |

**How "referenced by" was checked.** Each name was searched in `src/`,
`supabase/functions/`, `supabase/migrations/`, `supabase/config.toml`,
`package.json`, `scripts/`, `.env.example` (the only env file present), and
in every other downloaded ghost. Every ghost has a `[functions.<name>]`
entry in `config.toml`; those entries only pin `verify_jwt` (added in the
2026-08 hardening pass) and are not callers, so they are not listed as
references. Comment-only mentions are listed as "comment". The frontend's
one dynamic invoke (`src/hooks/useAIAssistant.jsx:23`) is only ever given
the four local `generate-*` names.

**Live database: NOT checked from this session** (no SQL access). Run the
query block at the end of this file in Studio and compare the output with
the names below before part B. Database Webhooks configured in the
dashboard would also not show up in the repo.

**Reading the flags.** `verify_jwt=false` means the gateway lets anyone
reach the function; whether it then checks the caller itself is in the
"Caller gate" column. "Money / roles / secrets" is what the code can do if
the gate is passed.

## Money, wallet, admin and auth ghosts (read in full or in part)

| Name | verify_jwt | Last updated | Referenced by | Caller gate (from source) | Money / roles / secrets | Source | Recommendation |
|---|---|---|---|---|---|---|---|
| admin-create-user | false | 2026-04-22 | nothing | user session + admin/gosat role | Creates auth users with a temp password (`auth.admin.createUser`), writes profiles, referral_circle. Roles: no. | yes | DELETE. Not called by the app; superseded by normal sign-up. |
| admin-delete-user | false | 2026-04-22 | nothing | user session + admin/gosat role | Deletes a user and rows in 40 tables incl. `user_roles`, `bestowals`, `products` (`auth.admin.deleteUser`). Roles: removes them. | yes | DELETE. Destructive, unused. |
| save-wallet-credentials | false | 2026-04-22 | nothing | user session + admin role | Writes secrets into the vault via `upsert_vault_secret`. Secrets: yes. | yes | DELETE. Nothing calls it; secrets are set via `supabase secrets set`. |
| get-wallet-credentials | false | 2026-04-22 | nothing | user session + admin role | Reads vault secrets via `get_vault_secret` and returns them to the caller. Secrets: yes, read-out. | yes | DELETE first. A read-out path for secrets that no page uses. |
| create-nowpayments-payout | false | 2026-04-22 | nothing | user session (any member) | Sends a NOWPayments payout of the caller's `sower_balances.available_balance` to a wallet they name, 1% fee, writes `sower_payouts`. Money: yes, real, if NOWPAYMENTS_API_KEY still works and the legacy balance table has a value. | yes | DELETE first. Legacy rail, bypasses `payout-earnings`' cooling-off, caps and ledger. |
| release-bestowal-escrow | false | 2026-04-22 | nothing | user session + gosat/courier/admin role | Moves legacy `sower_balances` pending → available, updates `bestowals`, `product_bestowals`, `whisperer_earnings`, `courier_deliveries`. Money: yes (legacy ledger). | yes | DELETE. Replaced by `release-escrow` + `confirm_delivery`. |
| send-bulk-system-message | false | 2026-04-22 | nothing | user session + gosat role | Posts a system chat message to every member. Money: no. | yes | DELETE (or move into git if gosats still want it; no UI calls it). |
| capture-paypal-payment | false | 2025-11-26 | nothing | **none** | Given any PayPal order id, captures it against the **sandbox** PayPal API and marks the `bestowals` row and `payment_transactions` row with that reference completed. Money: can mark a bestowal paid; sandbox credentials only, so a real capture cannot succeed. | yes | DELETE first. Unauthenticated, writes payment status. |
| capture-paypal-basket-order | false | 2026-08-28 | comment in `capture-paypal-order/index.ts:2` | user session; owner or admin/gosat | Old basket-only capture; calls `finalize_basket_order`. Money: yes, completes an order. | yes | DELETE. Generalised into `capture-paypal-order` on 2026-08-28. |
| payout-sower-earnings | false | 2026-08-29 | comments in 3 functions; `cron.unschedule('payout-sower-earnings-daily')` in migration 20260831090000 | CRON_SECRET, service role, or admin/gosat | Old daily NOWPayments payout of `product_bestowals`. Money: yes, if NOWPayments still works. | yes | DELETE. Retired 2026-08-31 in favour of `payout-earnings`; its cron was removed. |
| payout-whisperer-earnings | false | 2026-08-29 | comments; `cron.unschedule('payout-whisperer-earnings-daily')` in the same migration | CRON_SECRET, service role, or admin/gosat | Same for `whisperer_earnings`. Money: yes. | yes | DELETE. Same reason. |
| paypal-email-verify | true | 2026-08-29 | comments in `payout-earnings`, `paypal-connect` | user session, own wallet only | Email-OTP verification of a PayPal address; writes `user_wallets`, `paypal_email_verifications` (table dropped 2026-08-31). Money: no. | yes | DELETE. Replaced by `paypal-connect`; its table no longer exists. |
| clever-endpoint | true | 2025-11-21 | nothing | Binance Pay signature check inside; but `verify_jwt=true` means Binance itself can never reach it | Binance Pay webhook: marks `bestowals` completed, calls `update_wallet_balance_secure`, writes `payment_transactions`, `chat_rooms`. Money: yes, credits wallet balances. | yes | DELETE. Binance Pay is a retired rail; the gateway already blocks it. |
| create-nowpayments-order | false | 2026-04-22 | nothing | user session | Creates NOWPayments invoices for `bestowals` / `product_bestowals`, writes `payment_idempotency`, `payment_audit_log`. Money: starts a payment. | yes | DELETE. NOWPayments is being removed; the live path is `create-nowpayments-invoice` (also slated for removal). |
| nowpayments-payout-webhook | false | 2026-04-22 | called by ghost `create-nowpayments-payout` (URL) | NOWPayments IPN signature | Updates `sower_payouts` / `sower_balances` on payout status. Money: yes (legacy ledger). | yes | DELETE with `create-nowpayments-payout`. |
| sync-nowpayments-balance | false | 2026-04-22 | nothing | user session | For the caller's own orchards, polls NOWPayments and marks pending `bestowals` / `product_bestowals` completed, crediting 85% to `sower_balances`. Money: yes, and with the old 15%-deducted split. | yes | DELETE first. Any member can trigger completion of their own pending orchard bestowals under the wrong fee model. |
| get-nowpayments-balance | false | 2026-04-22 | nothing | user session + gosat role | Reads the NOWPayments account balance (key from vault). Secrets: reads one. | yes | DELETE. `treasury-balances` covers this. |
| create-agent-install-payment | false | 2026-04-22 | nothing | user session | NOWPayments invoice for "agent template installs" (85/10/5 split), writes `agent_template_installs`. Money: starts a payment. | yes | DELETE. Feature does not exist in the app. |
| monitor-solana-payments | true | 2025-10-06 | nothing | none inside; gateway JWT only | Writes `organization_payments`. Money: records payments. | yes | DELETE. Replaced by `check-solana-payment` / `sweep-solana-payments`. |
| password-reset-request | false | 2026-04-22 | nothing | **none** | Anyone can submit an email; lists all users via `auth.admin.listUsers()` to check existence; inserts a `password_reset_requests` row for gosat approval. Roles: no. Secrets: no. Generic response prevents enumeration by reply, but timing differs. | yes | DELETE. Live reset flow is `reset-password-via-questions`. |
| password-reset-approve | false | 2026-04-22 | nothing | user session + gosat role | Generates a recovery link via `auth.admin.generateLink`. Roles: no. Auth: yes, can mint a reset link for any account. | yes | DELETE with the above. |
| password-reset-with-security | false | 2026-04-22 | nothing | **none** (answers only) | Resets any user's password via `auth.admin.updateUserById` after matching security-question hashes computed client-side. Lockout/rate limit: not found in a quick scan, unverified. Auth: yes, account takeover surface if answers are guessable. | yes | DELETE first. Superseded by `reset-password-via-questions`, which has a lockout. |
| gig-bookings | false | 2026-04-22 | nothing | user session (+ role for some actions) | Community-driver gig bookings, writes `gig_bookings`, `gig_transactions`. Money: records transactions, does not move funds. | yes | DELETE (with gig-admin, gig-availability, gig-tracking). No page calls any of them. |
| agent-mint-bookkeeper | false | 2026-04-22 | called by ghost `linux-family-orchestrator` | user session | Writes `bestowal_reports`. Money: no. | yes | DELETE with the agent family. |
| create-daily-room | true | 2025-11-26 | nothing | none inside; gateway JWT only | Creates Daily.co rooms and meeting tokens with DAILY_API_KEY. Secrets: uses one. | yes | DELETE. Calls use Jitsi now. |
| trigger-video-agent | false | 2026-04-22 | nothing | **none** | Given a `user_id` and item, calls Anthropic and ComfyUI, writes `video_jobs`, and decrements that user's `profiles.video_credits`. Money: no; can spend API credits and drain any member's video credits. | yes | DELETE first. Unauthenticated write to other members' profiles. |

## Everything else

| Name | verify_jwt | Last updated | Referenced by | Caller gate | Money / roles / secrets | Source | Recommendation |
|---|---|---|---|---|---|---|---|
| -Remnants-Wheel-Calendar | false | 2025-12-02 | nothing | unknown | unknown | **no** (invalid slug, CLI refuses) | DELETE from the dashboard. A lowercase `remnants-wheel-calendar` exists in git and is deployed. |
| agent-arch-caller | false | 2026-04-22 | ghost `linux-family-orchestrator` | user session | writes `call_sessions`, `linux_family_call_log` | yes | DELETE (agent family, no UI). |
| agent-bestowal-matcher | false | 2026-04-22 | nothing | user session | writes `tribal_matches`, outbound messages | yes | DELETE. |
| agent-debian-collab-cron | false | 2026-04-22 | nothing | **none** | writes `chat_messages` | yes | HOLD until the DB cron check; name suggests a scheduler. Then DELETE. |
| agent-debian-event-scheduler | false | 2026-04-22 | nothing | none (service role only) | writes `tribal_events` | yes | HOLD until DB check; then DELETE. |
| agent-debian-messenger | false | 2026-04-22 | ghost orchestrator | user session | writes `chat_messages` | yes | DELETE. |
| agent-fedora-video | false | 2026-04-22 | nothing | user session | none | yes | DELETE. |
| agent-gentoo-mentorship-matcher | false | 2026-04-22 | nothing | none (service role) | writes `mentorship_pairings` | yes | HOLD until DB check; then DELETE. |
| agent-kali-images | false | 2026-04-22 | nothing | user session | spends LOVABLE_API_KEY | yes | DELETE. |
| agent-loaf-logistics | false | 2026-04-22 | ghost orchestrator | user session | none | yes | DELETE. |
| agent-sage-pricing | false | 2026-04-22 | ghost orchestrator | user session | none | yes | DELETE. |
| agent-tux-content | false | 2026-04-22 | nothing | user session | none | yes | DELETE. |
| agent-ubuntu-brand | false | 2026-04-22 | nothing | user session | none | yes | DELETE. |
| calendar-now | false | 2025-12-01 | nothing | **none** | none | yes | DELETE (local `remnants-wheel-calendar` / `get-or-generate-calendar-art` are the live ones). |
| chatterbox-tts | false | 2026-04-22 | nothing | user session | spends REPLICATE_API_TOKEN | yes | DELETE (`generate-voiceover` is live). |
| check-email-transport | false | 2026-08-29 | nothing (calls local `send-resend-email`) | admin/gosat, service role or CRON_SECRET | none | yes | DELETE. One-off diagnostic from 2026-08-29. |
| elder-council-rotation | false | 2026-04-22 | nothing | none (service role) | writes `elder_council_seats` | yes | HOLD until DB check; then DELETE. |
| generate-radio-script | false | 2026-04-22 | nothing | **none** | spends LOVABLE_API_KEY | yes | DELETE (`generate-script` is live). Unauthenticated key spend. |
| generate-seed-story | false | 2026-04-22 | nothing | **none** | spends LOVABLE_API_KEY | yes | DELETE (`generate-sower-story` is live). |
| generate-study-cover | false | 2026-04-22 | nothing | none (service role) | spends LOVABLE_API_KEY | yes | DELETE. |
| generate-weekly-playlist | false | 2026-04-22 | nothing | user session + role | writes `weekly_playlists`, notifications | yes | HOLD until DB check; then DELETE. |
| gig-admin | false | 2026-04-22 | nothing | user session + role | writes `community_drivers`, `service_zones` | yes | DELETE. |
| gig-availability | false | 2026-04-22 | nothing | user session | writes `availability_calendar` | yes | DELETE. |
| gig-tracking | false | 2026-04-22 | nothing | user session | writes `gig_live_tracking` | yes | DELETE. |
| ingest-analytics | false | 2026-04-22 | nothing | user session | writes `analytics_events` | yes | DELETE. |
| linux-family-cron | false | 2026-04-22 | nothing | **none** | writes `linux_family_suggestions` | yes | HOLD until DB check; then DELETE. |
| linux-family-orchestrator | false | 2026-04-22 | ghost `linux-family-terminal` | user session | writes `products`, `sowers`, tasks, memory; calls 5 agent ghosts | yes | DELETE. Can create products on a member's behalf; no UI. |
| linux-family-terminal | false | 2026-04-22 | nothing | user session | writes `linux_family_tasks` | yes | DELETE. |
| moderate-content | false | 2026-04-22 | nothing | none (service role) | writes `content_flags`; LOVABLE_API_KEY | yes | HOLD until DB check (may be a webhook target); `moderate-media` is the live one. |
| notify-driver-registration | false | 2026-04-22 | nothing | **none** | sends email via BREVO_API_KEY | yes | DELETE. Unauthenticated email sender. |
| notify-quote-request | false | 2026-04-22 | nothing | **none** | none | yes | DELETE. |
| notify-uncategorized-music | false | 2026-04-22 | nothing | user session + role | writes `chat_messages` | yes | DELETE. |
| orchard-shepherd | false | 2026-04-22 | nothing | **none** | spends LOVABLE_API_KEY | yes | DELETE. |
| poll-video-jobs | false | 2026-04-22 | nothing | none (service role) | writes `video_jobs`, `activity_feed`; COMFYUI keys | yes | HOLD until DB check; then DELETE with trigger-video-agent. |
| track-referral-click | false | 2026-04-22 | nothing | none (service role) | writes `user_referrals`, `increment_referral_clicks` | yes | DELETE. The live referral path is `whisperer_referral_links`. Confirm no page posts to it (none found). |
| tribal-hearts-icebreaker | false | 2026-04-22 | nothing | user session | writes `tribal_hearts_matches`, chat rooms; LOVABLE_API_KEY | yes | DELETE. No page calls it. |
| tribal-hearts-matcher | false | 2026-04-22 | nothing | user session | writes `tribal_hearts_matches` | yes | DELETE. No page calls it. |
| tribal-hearts-moderate | false | 2026-04-22 | nothing | none (service role) | writes `tribal_hearts_safety_flags` | yes | HOLD until DB check (webhook-shaped); then DELETE. |
| tribal-hearts-onboard | false | 2026-04-22 | nothing | user session | writes `tribal_hearts_answers`; LOVABLE_API_KEY | yes | DELETE. |

## Related but not a ghost

- `backup-database` is invoked from the frontend but is not deployed at all
  (grep of `functions.invoke` in `src`). That call can only fail. Not part
  of this inventory; noted for a later cleanup.

## Live database check (run in Studio before part B)

```sql
-- 1. Every cron job and its command
SELECT jobid, jobname, schedule, active, command FROM cron.job ORDER BY jobid;

-- 2. Every SQL function whose body calls an edge function or pg_net
SELECT n.nspname, p.proname
FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname NOT IN ('pg_catalog', 'information_schema')
  AND (pg_get_functiondef(p.oid) ILIKE '%functions/v1/%'
       OR pg_get_functiondef(p.oid) ILIKE '%net.http%');

-- 3. Triggers that call out over HTTP (database webhooks)
SELECT tgrelid::regclass AS table_name, tgname, pg_get_triggerdef(t.oid)
FROM pg_trigger t
WHERE NOT tgisinternal
  AND (pg_get_triggerdef(t.oid) ILIKE '%supabase_functions%'
       OR pg_get_triggerdef(t.oid) ILIKE '%http%');

-- 4. Dashboard-configured webhooks, if the table exists
SELECT id, hook_table_id, hook_name, request_id FROM supabase_functions.hooks ORDER BY id DESC LIMIT 50;
```

If any output names a ghost, move that ghost from DELETE/HOLD to KEEP and
record the object here before part B.
