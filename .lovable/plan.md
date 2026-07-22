
# Pharmacy pilot → reusable "Regulated Business" template

Goal: onboard your friend's pharmacy end-to-end as a stress test, and generalize the pieces so any regulated seller (clinic, herbalist, vet, optician…) can reuse the exact same flow. Reuse what already exists — bulk product upload, ChatApp, product images, courier tables — and only add the missing regulated-seller pieces.

## What we're building

1. **Onboard the pharmacy as a Sower** with a new "Regulated Business" seller template.
2. **Bulk upload his shelf inventory** through the existing `bulk-parse-products` flow (CSV / XLSX / PDF / DOCX already supported).
3. **Prescription intake**: clients upload their doctor's prescription image → private bucket → only the pharmacist can view (signed URLs).
4. **Symptom consult**: one-tap "Ask the Pharmacist" opens a 1-on-1 ChatApp room using the existing flow; pharmacist quotes a cost inside the chat.
5. **Fulfillment**: on every order the pharmacist picks per-order between **In-store pickup**, **Pharmacy delivers**, **Community driver**, or **Courier quote** — all four routed to tables we already have (`courier_deliveries`, `driver_quote_requests`).
6. **Pharmacist workspace**: a "Prescriptions" tab in his Sower dashboard to see incoming scripts, respond, quote, and mark ready/dispatched/collected.

Everything else (payments, USDC settlement, chat, notifications, verified badges, wallet, ratings) is already built — we just wire the pharmacy flow into it.

## Scope of changes

### New (small, focused)

- **`prescription_requests` table** — one row per prescription. Fields: client `user_id`, `sower_id`, `chat_room_id`, `status` (`submitted → reviewed → quoted → paid → ready → fulfilled → cancelled`), `fulfillment_mode` (`pickup | self_deliver | community_driver | courier_quote`), `quoted_amount_usdc`, `pharmacist_notes`, `client_notes` (symptoms), timestamps. Owner-only RLS + pharmacist-of-sower RLS.
- **Private `prescriptions` storage bucket** — pharmacist-only signed URLs; object key `sower_id/request_id/filename`.
- **Seller template flag on `sowers`** — add `regulated_business` alongside existing wandering roles. Enabling it requires an approved `seller_credentials` row (already exists) with a matching `credential_type` (e.g. `pharmacist_license`). Reuses the admin review queue at `/admin/credentials`.
- **`RegulatedBusinessPanel.tsx`** on the public sower page: "Upload Prescription", "Ask the Pharmacist", "Browse Shelf" (existing product grid).
- **`PrescriptionsInboxPage.tsx`** for the pharmacist at `/my-garden/prescriptions`: list, open, view image, reply in linked chat, set quote + fulfillment mode, advance status.
- **`submit-prescription` edge function** — validates auth, stores upload, creates chat room via existing helper, inserts `prescription_requests` row, notifies pharmacist.

### Extended (reuse existing)

- **Bulk uploader** (`bulk-parse-products` + `BulkUploadWizardPage`): add optional `regulated: true` column so scheduled/OTC items can be flagged (display-only badge; not a controlled-substance workflow).
- **ChatApp 1-on-1 rooms**: consult uses existing `CreateOneOnOneDialog` / room. The prescription image is auto-dropped into the chat as a file attachment for context.
- **Fulfillment**: order rows route to `courier_deliveries` (self/community driver) or `driver_quote_requests` (courier quote).
- **Payments**: pharmacist "quote" message → client pays via existing `content_purchases` (Shape 1) → status flips to `paid`.

### Explicitly out of scope (flag, don't build)

- No controlled-substance verification or e-prescribing standards. Regulatory compliance stays with the pharmacist; the app just facilitates.
- No insurance / medical-aid claim submission.
- No auto-dispensing logic beyond the `products.stock_qty` already tracked.

## Technical notes

- Prescription bucket **private**; pharmacist dashboard fetches signed URLs (5-min expiry) via edge function — same pattern already used for `music-tracks` and `premium-room` covers.
- `prescription_requests` RLS:
  - client: `SELECT/INSERT` where `user_id = auth.uid()`
  - pharmacist: `SELECT/UPDATE` where `sower_id` maps to `auth.uid()` via `sowers.user_id`
  - no anon access.
- Regulated template gated by a DB trigger on `sowers`: cannot enable `regulated_business` until a matching approved `seller_credentials` row exists — same pattern as trust tags.
- New table gets full `GRANT` block (authenticated + service_role).
- Reusable for future regulated sellers by swapping `credential_type`: `vet_license`, `herbalist_cert`, `optometrist_license`, etc.

## Pilot flow to validate

1. Pharmacist registers → applies for `pharmacist_license` credential → you approve at `/admin/credentials`.
2. He bulk-uploads his shelf via the existing wizard.
3. Test client submits a prescription image → private upload → pharmacist notified.
4. Pharmacist opens auto-created chat, quotes a price, picks "Community driver" fulfillment.
5. Client pays → driver quote flow kicks in → order marked fulfilled.
6. Same flow works for the next regulated business type with zero code changes.

## Deliverables checklist

- [ ] Migration: `prescription_requests` table + RLS + grants + `sowers` gating trigger
- [ ] Storage: private `prescriptions` bucket + object policies
- [ ] Edge function: `submit-prescription` (+ signed-URL read helper)
- [ ] UI: `RegulatedBusinessPanel` on public sower page (client side)
- [ ] UI: `PrescriptionsInboxPage` under My Garden (pharmacist side)
- [ ] Seller credentials: add `pharmacist_license` (stub siblings) to accepted credential types
- [ ] Bulk uploader `regulated` flag (display badge only)
- [ ] Fulfillment picker on prescription row → existing courier tables
- [ ] Notifications: new-prescription + quote-ready via existing `user_notifications`

Nothing outside these files/tables gets touched.
