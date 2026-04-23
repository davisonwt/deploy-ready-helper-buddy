# Payment Security Quick Start Guide

## 🚨 Immediate Actions Required

### Step 1: Apply Database Migration
```bash
# Run the migration to create security tables
supabase db push
# Or apply manually: supabase/migrations/20251120102000_payment_security_enhancements.sql
```

### Step 2: Fix CORS in Payment Functions

**File**: `supabase/functions/create-stripe-payment/index.ts`

Replace:
```typescript
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
};
```

With:
```typescript
const getCorsHeaders = (req: Request) => {
  const origin = req.headers.get("origin");
  const allowedOrigins = [
    "https://sow2growapp.com",
    "https://www.sow2growapp.com",
  ];
  
  if (origin && allowedOrigins.includes(origin)) {
    return {
      "Access-Control-Allow-Origin": origin,
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-idempotency-key",
    };
  }
  
  return {}; // Deny if origin not allowed
};
```

Then replace all `corsHeaders` with `getCorsHeaders(req)`.

**Repeat for**:
- `create-eft-payment/index.ts`
- `create-binance-pay-order/index.ts`
- `process-usdc-transfer/index.ts`

### Step 3: Add Rate Limiting

**File**: `supabase/functions/create-stripe-payment/index.ts`

Add at the top:
```typescript
import { checkRateLimit, createRateLimitResponse, RateLimitPresets } from '../_shared/rateLimiter.ts';
```

Add after user authentication:
```typescript
// Rate limiting
const allowed = await checkRateLimit(
  supabaseClient,
  user.id,
  'payment',
  RateLimitPresets.PAYMENT.maxAttempts,
  RateLimitPresets.PAYMENT.timeWindowMinutes
);

if (!allowed) {
  return new Response(JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }), {
    status: 429,
    headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json', 'Retry-After': '3600' }
  });
}
```

**Repeat for**:
- `create-eft-payment/index.ts`
- `process-usdc-transfer/index.ts`

### Step 4: Add Idempotency Keys

**File**: `supabase/functions/create-stripe-payment/index.ts`

Add after rate limiting:
```typescript
// Check idempotency
const idempotencyKey = req.headers.get('x-idempotency-key');
if (!idempotencyKey) {
  return new Response(JSON.stringify({ error: 'Idempotency key required' }), {
    status: 400,
    headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' }
  });
}

// Check if already processed
const { data: idempotencyCheck } = await supabaseClient.rpc('check_payment_idempotency', {
  idempotency_key_param: idempotencyKey,
  user_id_param: user.id
});

if (idempotencyCheck?.exists) {
  return new Response(JSON.stringify(idempotencyCheck.result), {
    headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' }
  });
}
```

Before returning success, store the result:
```typescript
// After creating payment, store idempotency result
await supabaseClient.rpc('store_payment_idempotency', {
  idempotency_key_param: idempotencyKey,
  user_id_param: user.id,
  result_param: {
    sessionId: session.id,
    url: session.url,
    bestowId: bestowal.id
  }
});
```

### Step 5: Add Audit Logging

After each payment operation:
```typescript
await supabaseClient.rpc('log_payment_audit', {
  user_id_param: user.id,
  action_param: 'payment_created',
  payment_method_param: 'stripe',
  amount_param: amount,
  currency_param: currency || 'USD',
  bestowal_id_param: bestowal.id,
  transaction_id_param: session.id,
  ip_address_param: req.headers.get('x-forwarded-for') || null,
  user_agent_param: req.headers.get('user-agent') || null,
  metadata_param: { orchardId, pocketsCount }
});
```

### Step 6: Update Client-Side Code

**Add idempotency key to payment requests**:

```typescript
// In your payment hook/component
const makePayment = async (paymentData) => {
  const idempotencyKey = crypto.randomUUID();
  
  const response = await fetch('/functions/v1/create-stripe-payment', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'X-Idempotency-Key': idempotencyKey  // Add this
    },
    body: JSON.stringify(paymentData)
  });
  
  return response.json();
};
```

## ✅ Verification Checklist

After implementing:

- [ ] CORS only allows sow2growapp.com origins
- [ ] Rate limiting blocks after 5 payment attempts per hour
- [ ] Idempotency keys prevent duplicate payments
- [ ] Audit logs are created for all payment operations
- [ ] Webhook replay protection prevents duplicate processing
- [ ] All payment functions have input validation
- [ ] Amount verification prevents tampering

## 🧪 Testing

1. **Test CORS**: Try payment from unauthorized origin (should fail)
2. **Test Rate Limit**: Make 6 payment requests quickly (6th should fail)
3. **Test Idempotency**: Send same payment request twice with same key (should return same result)
4. **Test Audit Logs**: Check `payment_audit_log` table after payment

## 📚 Full Documentation

See `PAYMENT_SECURITY_HARDENING.md` for complete security guide.

