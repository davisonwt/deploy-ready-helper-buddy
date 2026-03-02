# Bestowal Messaging Audit

## Current Status

### ✅ Gosat → Bestower (Congratulations + Receipt/Download)
**Location**: `supabase/functions/_shared/postPaymentMessages.ts`
- Sends congratulations message from GoSat to bestower
- Includes payment receipt details
- For music purchases: includes 7-day signed download URL
- Uses `insert_system_chat_message()` for security

### ✅ Gosat → Sower (Payment Received Notification)
**Location**: `supabase/functions/_shared/postPaymentMessages.ts`
- Notifies sower that a bestowal was made
- Includes earnings breakdown (85% sower, 10% tithe, 5% admin)
- Uses `insert_system_chat_message()` for security

### ✅ Gosat → GoSat HQ Chat (Internal Audit)
**Location**: `supabase/functions/_shared/postPaymentMessages.ts`
- Logs transaction to GoSat HQ group chat
- Includes buyer, sower, amount, method, reference
- Uses `insert_system_chat_message()` for security

### ✅ Email Notifications (Bestower + Sower)
**Location**: `supabase/functions/send-bestowal-notifications/index.ts`
- Sends email via Resend to bestower and sower
- Called from NOWPayments webhook for orchard bestowals

---

## Integration Points

| Webhook | ChatApp Messages | Email Notifications |
|---------|-----------------|---------------------|
| `paypal-webhook` | ✅ All 3 messages | ❌ Not yet |
| `nowpayments-webhook` | ✅ All 3 messages (orchard + product) | ✅ Orchard only |
| `complete-product-bestowal` | ✅ All 3 messages (pre-existing) | ❌ N/A |

---

## Security

- ✅ All messages use `insert_system_chat_message()` (service role only)
- ✅ All messages logged to `chat_system_message_audit`
- ✅ Room access validated via `get_or_create_direct_room` RPC
- ✅ Music download links use 7-day signed URLs
- ✅ All notification failures are non-critical (logged but don't block payment)
