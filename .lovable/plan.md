
# Security Re-scan + `premium-room` Investigation

## 1. Re-scan results — all prior CRITICAL/HIGH still resolved

Just ran both `security--run_security_scan` (204 findings) and `supabase--linter` (199 issues). **Every finding is level=warn — zero errors, zero criticals.** No regressions.

| Item | Status |
|---|---|
| C1 `wallet_balances` — owner write policies removed | ✅ in place |
| C2 `sower_balances` / `sower_payouts` — user UPDATE revoked | ✅ |
| C3 `product_bestowals` — tightened policies | ✅ |
| C4 `create-binance-pay-order` — server-side `pocket_price × pocketsCount ±0.01` validation | ✅ live in `supabase/functions/create-binance-pay-order/index.ts` |
| H1 `bestowals` policies | ✅ |
| H2 `usdc_transactions` | ✅ |
| H3 `organization_wallets` | ✅ |
| H4 `profiles` | ✅ |
| M1 `study-uploads` bucket private | ✅ confirmed `storage.buckets.public = false` |
| M3 `tribal_hearts_profiles` browse via `get_hearts_browse` RPC | ✅ |
| M4 `user_wallets` policy consolidation | ✅ |
| M5 `seller_credentials` self-verify guard | ✅ |
| L3 CORS Lovable-preview regex | ✅ |

### New issues vs the original audit

- **NEW — paywall bypass risk on `premium-room` bucket** (see §2 below). Only material new finding.
- All other warns are the previously-acknowledged `SECURITY DEFINER`-callable-by-anon/authenticated noise (~200 entries) — intentional RPCs (`has_role`, `get_hearts_browse`, `update_wallet_balance_secure`, password-reset helpers, audit helpers). No change recommended.
- **L1 leaked-password protection** still requires a manual toggle in Supabase Auth dashboard (unchanged).

---

## 2. `premium-room` bucket investigation

### What's in it

`storage.buckets`: `id=premium-room`, **`public=true`**.

Sampled `storage.objects` rows (multiple users, Nov 2025 → Mar 2026):

```text
covers/<user_uuid>/<unix-ms>.jpg|.png        ← cover images
products/<user_uuid>/<unix-ms>.MOV|.mp3      ← product media (video / audio)
```

Folder layout (`covers/` + `products/` per user) and content types (sellable MOV/MP3) match the **premium content sale flow** (tables `premium_rooms`, `premium_item_purchases`, `premium_room_access`).

### Who writes / reads it

- **Zero references** to the literal string `premium-room` anywhere in `src/` or `supabase/functions/`. So uploads aren't happening through the current repo — likely an older path, Supabase Studio, or external uploader. Worth confirming with you which UI is producing these uploads.
- Storage RLS policies on `storage.objects` for this bucket:

```text
"Allow authenticated access to premium-room"   cmd=ALL    USING bucket_id='premium-room'   ← NO owner / payment check
"Authenticated upload premium-room"            INSERT     WITH CHECK owner-folder match
"Authenticated update premium-room"            UPDATE     USING owner-folder match
"Authenticated delete premium-room"            DELETE     USING owner-folder match
```

INSERT/UPDATE/DELETE are correctly scoped to the uploader's own folder. **SELECT is wide-open to any authenticated user.** And because `public=true`, **anyone — no auth at all — can fetch any file directly** via:

```text
https://zuwkgasbkpjlxzsjzumu.supabase.co/storage/v1/object/public/premium-room/products/<uid>/<filename>
```

### Finding — Paywall bypass (HIGH)

If any `products/*.MOV` / `*.mp3` files are sold as premium content, **a non-paying user who obtains or guesses a URL can download the full file without ever triggering the purchase/access check**. Filenames are predictable Unix-ms timestamps (e.g. `1764356355631.MOV`), making URL guessing more feasible than random UUIDs. Nothing on the Supabase side links storage reads to `premium_item_purchases` / `premium_room_access`.

Whether this is a real-money exposure depends on whether `products/` are the same assets gated by `premium_rooms` / `premium_item_purchases`. The bucket name and content strongly suggest yes.

### Proposed fix (NOT applied — awaiting your go-ahead)

1. **Confirm** with you that `premium-room/products/*` is paid/gated content.
2. Flip bucket to private: `UPDATE storage.buckets SET public=false WHERE id='premium-room'`.
3. Drop `"Allow authenticated access to premium-room"`. Replace SELECT with a policy that allows reads only when:
   - `auth.uid()::text = (storage.foldername(name))[1]` (owner), OR
   - caller has a matching row in `premium_item_purchases` / `premium_room_access` for that asset, OR
   - caller has `admin` role.
4. Frontend fetches via **signed URLs** (`createSignedUrl`, short TTL ~5–15 min) issued by an edge function that first verifies payment/access.
5. Optional hardening: future uploads use random UUIDs instead of timestamps so legacy URLs aren't guessable during transition.
6. Audit the uploader path (not in repo) so flipping private doesn't break a live seller flow.

### Questions before I implement

- (a) Are `premium-room/products/*` files actually the assets sold through `premium_rooms` / `premium_item_purchases`? Or is "premium-room" repurposed for something else?
- (b) Stop-gap (private + tightened SELECT only) or full fix (also build signed-URL edge function + update consuming UI)? Per scope-lock I won't start the broader option without explicit yes.
- (c) Since the uploader isn't in the current `src/`, do you know which app/page uploads here so the read path can be verified before changing anything?

No code or DB changes have been made.
