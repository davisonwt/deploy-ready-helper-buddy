

# Plan: Add PayPal as Additional Payment Option

## Understanding
- PayPal is added **alongside** the existing NOWPayments (crypto) option — not replacing it
- All PayPal fees are borne by the **sower/bestower**, not the Sow2Grow platform account
- PayPal Client ID and Secret are already set up in Supabase under app name "sow2growapp"
- Same distribution logic applies (85/10/5 for orchards, 70/15/10/5 for products)

## What Gets Built

### 1. Add PayPal Secrets to Edge Functions
The `PAYPAL_CLIENT_ID` and `PAYPAL_CLIENT_SECRET` need to be added as Supabase Edge Function secrets so the new edge function can access them.

### 2. Create `create-paypal-order` Edge Function
- Same authentication, rate-limiting, and validation as `create-nowpayments-order`
- Calls PayPal REST API v2 (`/v2/checkout/orders`) to create an order
- Uses sandbox URL for testing, live for production
- Creates pending bestowal/payment records
- Returns PayPal approval URL for redirect
- Sets `payment_method: 'paypal'` on bestowal records

### 3. Create `paypal-webhook` Edge Function
- Receives PayPal webhook notifications (CHECKOUT.ORDER.APPROVED, PAYMENT.CAPTURE.COMPLETED)
- Verifies webhook authenticity via PayPal API
- Updates payment status to confirmed
- Triggers distribution (same `distribute-bestowal` logic)
- Registered in `config.toml` with `verify_jwt = false`

### 4. Create `PayPalButton` Component (`src/components/payment/PayPalButton.tsx`)
- Same interface/props as `NowPaymentsButton` (orchardId, amount, paymentType, productItems, etc.)
- Calls `create-paypal-order` edge function
- Redirects to PayPal checkout
- PayPal-branded styling with PayPal icon

### 5. Create `PaymentMethodSelector` Component
A reusable wrapper that shows two payment buttons side-by-side or stacked:
- **Pay with Crypto** (existing NowPaymentsButton)
- **Pay with PayPal** (new PayPalButton)

### 6. Update All 4 Payment Surfaces
Replace the standalone `NowPaymentsButton` with the new `PaymentMethodSelector` in:
- `PaymentModal.jsx` — orchard payments
- `EnhancedBestowalPayment.jsx` — orchard bestowals
- `OrchardPaymentWidget.jsx` — orchard widget
- `BestowalCheckout.tsx` — product bestowals

Each surface will show both payment options with the same props they currently pass.

## Technical Details

- **PayPal API**: REST v2 at `api-m.paypal.com` (live) / `api-m.sandbox.paypal.com` (sandbox)
- **Auth**: Server-side client credentials grant → create order → redirect user → webhook confirms
- **Fee handling**: PayPal fees are naturally charged to the receiving account; since funds go to the S2G PayPal account first then distribute, the fee is effectively passed to the bestower via the total amount (no markup needed — PayPal deducts from received amount)
- **Webhook URL**: `https://zuwkgasbkpjlxzsjzumu.supabase.co/functions/v1/paypal-webhook`

## Steps
1. Request `PAYPAL_CLIENT_ID` and `PAYPAL_CLIENT_SECRET` as Edge Function secrets
2. Create `create-paypal-order` edge function + config.toml entry
3. Create `paypal-webhook` edge function + config.toml entry
4. Create `PayPalButton` component
5. Create `PaymentMethodSelector` component
6. Update 4 payment surfaces to show both options

