

## Why Your Balance Shows $0.00

After a thorough investigation, I found **critical bugs in the NOWPayments webhook** that prevent your balance from ever being updated. Here is what's happening:

### Root Cause: Webhook Processing Fails Silently

The `nowpayments-webhook` edge function has **zero logs** and the `processed_webhooks` table is **empty** — meaning no webhook from NOWPayments has ever been successfully processed. Even though invoices are being created successfully (I can see 3 recent invoice creations), when NOWPayments sends the payment confirmation callback, the webhook crashes due to column-name mismatches in the database queries.

### Bugs Found

1. **`orchards.grower_id` does not exist** — the actual column is `user_id`. The webhook queries `orchards(title, grower_id)` which silently fails, so the sower's balance is never credited.

2. **`payment_transactions.user_id` does not exist** — the actual column is `bestowal_id`. The webhook tries to insert with `user_id` causing an error.

3. **`payment_audit_log.status` does not exist** — the webhook inserts a `status` field that doesn't exist in the table schema.

These three bugs cause the webhook to crash every time NOWPayments sends a payment confirmation, which is why your `sower_balances` stays at $0.00.

### Implementation Plan

**Step 1 — Fix `nowpayments-webhook` edge function**
- Change `orchards(title, grower_id)` to `orchards(title, user_id)` and update all references from `grower_id` to `user_id`
- Fix `payment_transactions` insert to use correct column names (`bestowal_id` instead of `user_id`)
- Fix `payment_audit_log` insert to remove the nonexistent `status` column
- Redeploy the function

**Step 2 — Create a balance sync edge function**
- New edge function `sync-nowpayments-balance` that calls the NOWPayments API (`/v1/payment/{id}`) to check the status of past invoices
- Queries `product_bestowals` and `bestowals` for records with `payment_status = 'pending'` and payment references
- For any that show `finished` on NOWPayments, retroactively credit the sower's balance
- This catches any payments that completed while the webhook was broken

**Step 3 — Add "Sync Balance" button to the UI**
- In `SowerBalanceCard`, the refresh button will also call the sync function
- Shows a toast with the result (e.g., "Found 2 completed payments, balance updated")

**Step 4 — Verify IPN callback URL is configured in NOWPayments dashboard**
- The code sets `ipn_callback_url` per-invoice which is correct
- But you should also verify in your NOWPayments dashboard settings that the IPN URL is set to: `https://zuwkgasbkpjlxzsjzumu.supabase.co/functions/v1/nowpayments-webhook`

### Technical Detail: Column Mismatches

```text
Webhook code                  Actual DB column
─────────────────────────────────────────────────
orchards.grower_id        →   orchards.user_id
payment_transactions.user_id → payment_transactions.bestowal_id
payment_audit_log.status  →   (does not exist, remove)
```

