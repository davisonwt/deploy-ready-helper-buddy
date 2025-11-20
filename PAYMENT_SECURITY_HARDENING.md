# Payment Security Hardening Guide
## sow2growapp.com - Critical Security Requirements

This document outlines comprehensive security measures for payment processing on sow2growapp.com, handling payments to the platform and to users (sowers/bestowers/growers/titihings/freewill gifts).

---

## 🔴 CRITICAL SECURITY FIXES REQUIRED

### 1. CORS Configuration - HIGH PRIORITY ⚠️

**Current Issue**: All payment endpoints use `"Access-Control-Allow-Origin": "*"` which allows any website to make payment requests.

**Risk**: Cross-origin attacks, payment fraud, CSRF attacks.

**Fix Required**:
```typescript
// Replace in ALL payment functions:
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",  // ❌ REMOVE THIS
};

// With:
const getCorsHeaders = (req: Request) => {
  const origin = req.headers.get("origin");
  const allowedOrigins = [
    "https://sow2growapp.com",
    "https://www.sow2growapp.com",
    // Add staging if needed: "https://staging.sow2growapp.com"
  ];
  
  if (origin && allowedOrigins.includes(origin)) {
    return {
      "Access-Control-Allow-Origin": origin,
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-idempotency-key",
      "Access-Control-Max-Age": "86400",
    };
  }
  
  return {
    "Access-Control-Allow-Origin": "null", // Deny if origin not allowed
  };
};
```

**Files to Update**:
- `supabase/functions/create-stripe-payment/index.ts`
- `supabase/functions/create-eft-payment/index.ts`
- `supabase/functions/create-binance-pay-order/index.ts`
- `supabase/functions/process-usdc-transfer/index.ts`
- `supabase/functions/binance-pay-webhook/index.ts` (webhook should NOT have CORS)

---

### 2. Rate Limiting on Payment Endpoints - HIGH PRIORITY ⚠️

**Current Issue**: Not all payment functions use rate limiting.

**Risk**: Payment fraud, brute force attacks, DDoS.

**Fix Required**: Add rate limiting to ALL payment functions:

```typescript
import { checkRateLimit, createRateLimitResponse, RateLimitPresets } from '../_shared/rateLimiter.ts';

// At the start of payment functions:
const userId = user.id;
const allowed = await checkRateLimit(
  supabaseClient,
  userId,
  'payment',
  RateLimitPresets.PAYMENT.maxAttempts,  // 5 attempts
  RateLimitPresets.PAYMENT.timeWindowMinutes  // per hour
);

if (!allowed) {
  return createRateLimitResponse(3600); // 1 hour retry
}
```

**Files to Update**:
- `supabase/functions/create-stripe-payment/index.ts` ❌ Missing
- `supabase/functions/create-eft-payment/index.ts` ❌ Missing
- `supabase/functions/process-usdc-transfer/index.ts` ❌ Missing
- `supabase/functions/create-binance-pay-order/index.ts` ✅ Already has it

**Recommended Limits**:
- Payment creation: 5 attempts per hour per user
- Payment status checks: 20 attempts per 15 minutes
- Webhook processing: No rate limit (server-to-server)

---

### 3. Idempotency Keys - HIGH PRIORITY ⚠️

**Current Issue**: No idempotency protection for payment requests.

**Risk**: Duplicate payments, race conditions, payment processing errors.

**Fix Required**: Implement idempotency keys:

```typescript
// Client sends:
headers: {
  'X-Idempotency-Key': crypto.randomUUID()
}

// Server checks:
const idempotencyKey = req.headers.get('x-idempotency-key');
if (!idempotencyKey) {
  return new Response(JSON.stringify({ error: 'Idempotency key required' }), {
    status: 400,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

// Check if this key was already processed
const { data: existing } = await supabaseClient
  .from('payment_idempotency')
  .select('id, result')
  .eq('idempotency_key', idempotencyKey)
  .single();

if (existing) {
  // Return cached result
  return new Response(JSON.stringify(existing.result), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

// Process payment, then store result
// ... payment processing ...
await supabaseClient
  .from('payment_idempotency')
  .insert({
    idempotency_key: idempotencyKey,
    user_id: user.id,
    result: paymentResult,
    expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
  });
```

**Database Migration Needed**:
```sql
CREATE TABLE public.payment_idempotency (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  idempotency_key TEXT UNIQUE NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  result JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL
);

CREATE INDEX idx_payment_idempotency_key ON public.payment_idempotency(idempotency_key);
CREATE INDEX idx_payment_idempotency_expires ON public.payment_idempotency(expires_at);

-- Auto-cleanup expired keys
CREATE OR REPLACE FUNCTION cleanup_expired_idempotency_keys()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  DELETE FROM public.payment_idempotency
  WHERE expires_at < now();
END;
$$;
```

---

### 4. Webhook Security - MEDIUM PRIORITY ✅

**Status**: Binance Pay webhook has signature verification ✅

**Additional Recommendations**:
- ✅ Signature verification implemented
- ✅ Timestamp validation (5-minute tolerance)
- ⚠️ Add replay attack protection (store processed webhook IDs)
- ⚠️ Add Stripe webhook signature verification if using Stripe webhooks

**Replay Attack Protection**:
```typescript
// Store processed webhook IDs
const webhookId = payload?.data?.transactionId || payload?.id;
const { data: existing } = await supabase
  .from('processed_webhooks')
  .select('id')
  .eq('webhook_id', webhookId)
  .eq('provider', 'binance_pay')
  .single();

if (existing) {
  console.log('Webhook already processed:', webhookId);
  return jsonResponse(successResponse); // Idempotent response
}

// Process webhook...
// Then store:
await supabase
  .from('processed_webhooks')
  .insert({
    webhook_id: webhookId,
    provider: 'binance_pay',
    processed_at: new Date().toISOString()
  });
```

---

### 5. Input Validation & Sanitization - MEDIUM PRIORITY ⚠️

**Current Status**: 
- ✅ Stripe payment has basic validation
- ✅ EFT payment uses Zod validation
- ⚠️ Need stricter amount validation
- ⚠️ Need currency whitelist enforcement

**Enhanced Validation Required**:

```typescript
// Amount validation
const AMOUNT_MIN = 0.01;  // Minimum payment
const AMOUNT_MAX = 1000000;  // Maximum payment
const ALLOWED_CURRENCIES = ['USD', 'ZAR', 'EUR', 'GBP', 'USDC'];

// Strict validation schema
const paymentSchema = z.object({
  amount: z.number()
    .positive()
    .min(AMOUNT_MIN, `Minimum payment is ${AMOUNT_MIN}`)
    .max(AMOUNT_MAX, `Maximum payment is ${AMOUNT_MAX}`)
    .refine((val) => {
      // Ensure no more than 2 decimal places
      return Number(val.toFixed(2)) === val;
    }, 'Amount must have at most 2 decimal places'),
  currency: z.enum(ALLOWED_CURRENCIES as [string, ...string[]]),
  orchardId: z.string().uuid('Invalid orchard ID format'),
  pocketsCount: z.number().int().min(0).max(10000).optional(),
  pocketNumbers: z.array(z.number().int().positive()).max(10000).optional()
});
```

---

### 6. Payment Amount Verification - HIGH PRIORITY ⚠️

**Risk**: Client-side amount manipulation.

**Fix Required**: Server-side amount verification:

```typescript
// After receiving payment request, verify amount hasn't been tampered with
// Store original amount in database when creating payment intent
// Verify on webhook that amount matches

// In webhook handler:
const { data: bestowal } = await supabase
  .from('bestowals')
  .select('amount, currency')
  .eq('id', merchantTradeNo)
  .single();

if (Math.abs(bestowal.amount - webhookAmount) > 0.01) {
  console.error('Amount mismatch detected!', {
    stored: bestowal.amount,
    webhook: webhookAmount
  });
  return jsonResponse({ code: 'ERROR', message: 'Amount verification failed' }, 400);
}
```

---

### 7. Audit Logging - HIGH PRIORITY ⚠️

**Current Issue**: Limited audit trail for payment operations.

**Fix Required**: Comprehensive audit logging:

```sql
CREATE TABLE public.payment_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  action TEXT NOT NULL, -- 'payment_created', 'payment_completed', 'payment_failed', etc.
  payment_method TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  currency TEXT NOT NULL,
  bestowal_id UUID REFERENCES public.bestowals(id),
  transaction_id TEXT,
  ip_address INET,
  user_agent TEXT,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_payment_audit_user ON public.payment_audit_log(user_id);
CREATE INDEX idx_payment_audit_bestowal ON public.payment_audit_log(bestowal_id);
CREATE INDEX idx_payment_audit_created ON public.payment_audit_log(created_at);
```

**Logging Implementation**:
```typescript
async function logPaymentEvent(
  supabase: SupabaseClient,
  event: {
    userId: string;
    action: string;
    paymentMethod: string;
    amount: number;
    currency: string;
    bestowalId?: string;
    transactionId?: string;
    metadata?: any;
  },
  req: Request
) {
  await supabase.from('payment_audit_log').insert({
    user_id: event.userId,
    action: event.action,
    payment_method: event.paymentMethod,
    amount: event.amount,
    currency: event.currency,
    bestowal_id: event.bestowalId,
    transaction_id: event.transactionId,
    ip_address: req.headers.get('x-forwarded-for') || 'unknown',
    user_agent: req.headers.get('user-agent') || 'unknown',
    metadata: event.metadata || {}
  });
}
```

---

### 8. Environment Variable Security - HIGH PRIORITY ✅

**Current Status**: Using environment variables correctly ✅

**Best Practices**:
- ✅ Never commit secrets to git
- ✅ Use Supabase secrets management
- ⚠️ Rotate API keys quarterly
- ⚠️ Use different keys for staging/production
- ⚠️ Monitor for key exposure

---

### 9. SQL Injection Protection - HIGH PRIORITY ✅

**Current Status**: 
- ✅ Using parameterized queries via Supabase client
- ✅ RLS policies in place
- ✅ Functions have `SET search_path = 'public'`

**No action needed** ✅

---

### 10. XSS Protection - MEDIUM PRIORITY ⚠️

**Current Issue**: Payment metadata might contain user input.

**Fix Required**: Sanitize all user-provided data:

```typescript
import { sanitizeInput } from '@/utils/inputSanitization'; // If exists

// Sanitize metadata before storing
const sanitizedMetadata = {
  ...metadata,
  description: sanitizeInput.text(metadata.description, 500),
  notes: sanitizeInput.text(metadata.notes, 1000)
};
```

---

### 11. CSRF Protection - HIGH PRIORITY ⚠️

**Current Issue**: No CSRF tokens for payment requests.

**Fix Required**: Implement CSRF protection:

```typescript
// Generate CSRF token on page load
const csrfToken = crypto.randomUUID();
localStorage.setItem('csrf_token', csrfToken);

// Include in payment requests
headers: {
  'X-CSRF-Token': csrfToken
}

// Verify on server
const csrfToken = req.headers.get('x-csrf-token');
const sessionToken = await getSessionToken(user.id); // From session store

if (csrfToken !== sessionToken) {
  return new Response(JSON.stringify({ error: 'Invalid CSRF token' }), {
    status: 403,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}
```

---

### 12. Payment Status Verification - MEDIUM PRIORITY ⚠️

**Risk**: Race conditions in payment status updates.

**Fix Required**: Use database transactions and optimistic locking:

```typescript
// Use database transaction for status updates
const { data, error } = await supabase.rpc('update_payment_status', {
  bestowal_id: bestowalId,
  new_status: 'completed',
  expected_status: 'pending', // Only update if currently pending
  transaction_id: transactionId
});

// RPC function with transaction:
CREATE OR REPLACE FUNCTION update_payment_status(
  bestowal_id_param UUID,
  new_status TEXT,
  expected_status TEXT,
  transaction_id_param TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  current_status TEXT;
BEGIN
  SELECT payment_status INTO current_status
  FROM public.bestowals
  WHERE id = bestowal_id_param
  FOR UPDATE; -- Row-level lock
  
  IF current_status != expected_status THEN
    RETURN jsonb_build_object('error', 'Status mismatch', 'current', current_status);
  END IF;
  
  UPDATE public.bestowals
  SET payment_status = new_status,
      payment_reference = transaction_id_param,
      updated_at = now()
  WHERE id = bestowal_id_param;
  
  RETURN jsonb_build_object('success', true);
END;
$$;
```

---

## 🔒 PCI Compliance Considerations

While you're using third-party payment processors (Stripe, Binance Pay), you still need to:

1. **Never store full card numbers** ✅ (Using Stripe/Binance, not storing cards)
2. **Encrypt sensitive data at rest** ⚠️ (Review payment_config encryption)
3. **Use HTTPS everywhere** ✅ (Supabase enforces HTTPS)
4. **Implement access controls** ✅ (RLS policies in place)
5. **Maintain audit logs** ⚠️ (See audit logging section above)
6. **Regular security testing** ⚠️ (Schedule quarterly penetration tests)

---

## 📋 Implementation Priority

### Phase 1 - Critical (Deploy Before Production)
1. ✅ Fix CORS configuration
2. ✅ Add rate limiting to all payment endpoints
3. ✅ Implement idempotency keys
4. ✅ Add payment amount verification
5. ✅ Implement audit logging

### Phase 2 - High Priority (Within 1 Week)
6. ✅ Add CSRF protection
7. ✅ Enhance input validation
8. ✅ Add webhook replay protection
9. ✅ Implement payment status verification with transactions

### Phase 3 - Medium Priority (Within 1 Month)
10. ✅ XSS protection for metadata
11. ✅ Enhanced error handling
12. ✅ Payment monitoring and alerts

---

## 🧪 Security Testing Checklist

Before deploying to production:

- [ ] Test CORS with unauthorized origins (should fail)
- [ ] Test rate limiting (should block after 5 attempts)
- [ ] Test idempotency (duplicate requests should return same result)
- [ ] Test amount tampering (should be rejected)
- [ ] Test webhook signature verification (invalid signatures should fail)
- [ ] Test CSRF protection (missing token should fail)
- [ ] Test input validation (invalid data should be rejected)
- [ ] Test SQL injection attempts (should be safe)
- [ ] Test XSS in payment metadata (should be sanitized)
- [ ] Review audit logs for all test payments

---

## 📞 Incident Response

If a security breach is detected:

1. **Immediately**: Disable affected payment endpoints
2. **Within 1 hour**: Review audit logs for suspicious activity
3. **Within 4 hours**: Notify affected users
4. **Within 24 hours**: Rotate all API keys and secrets
5. **Within 48 hours**: Complete security audit and document findings

---

## 🔄 Regular Security Reviews

- **Weekly**: Review payment audit logs
- **Monthly**: Review rate limit violations
- **Quarterly**: Full security audit and penetration testing
- **Annually**: PCI compliance review (if applicable)

---

**Last Updated**: 2024-11-20  
**Status**: 🔴 Critical fixes required before production deployment

