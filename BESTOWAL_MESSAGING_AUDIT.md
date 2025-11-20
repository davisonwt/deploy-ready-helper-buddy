# Bestowal Messaging Audit

## Current Status

### ✅ FOUND: Gosat → Bestower (Invoice/Proof)
**Location**: `supabase/functions/binance-pay-webhook/index.ts` - `sendBestowalProofMessage()`
- Sends invoice/proof message from gosat to bestower
- **Security Issue**: Uses direct `chat_messages.insert()` instead of secure `insert_system_chat_message()`

### ❌ MISSING: Sower → Bestower (Thank You)
**Required**: Automatic thank you message from sower to bestower
- Should be sent when bestowal is completed
- Should thank bestower for their contribution

### ❌ MISSING: Gosat → Sower (Bestowal Notification)
**Required**: Notification message from gosat to sower
- Should notify sower that a bestowal was made to their orchard
- Should include bestowal details and invoice

---

## Required Implementation

1. Create `sendSowerThankYouMessage()` function
2. Create `sendSowerBestowalNotification()` function
3. Update `sendBestowalProofMessage()` to use secure system message function
4. Call all three functions in webhook when payment completes
5. Ensure all messages use `insert_system_chat_message()` for security

---

## Security Requirements

- ✅ All messages must use `insert_system_chat_message()` (service role only)
- ✅ All messages must be logged to `chat_system_message_audit`
- ✅ Room access must be validated
- ✅ Message content must be sanitized
- ✅ Rate limiting must be enforced

