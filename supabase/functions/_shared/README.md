# Shared Edge Function Utilities

This directory contains shared utilities used across multiple edge functions for security, validation, and common operations.

## 📁 Files

### `rateLimiter.ts`
Rate limiting utilities to prevent abuse of edge functions.

**Usage Example:**
```typescript
import { checkRateLimit, createRateLimitResponse, RateLimitPresets } from '../_shared/rateLimiter.ts';

Deno.serve(async (req) => {
  const supabase = createClient(/* ... */);
  const userId = /* extract from JWT */;
  
  // Check rate limit
  const allowed = await checkRateLimit(
    supabase,
    userId,
    'payment',
    RateLimitPresets.PAYMENT.maxAttempts,
    RateLimitPresets.PAYMENT.timeWindowMinutes
  );
  
  if (!allowed) {
    return createRateLimitResponse();
  }
  
  // Continue with your function logic...
});
```

**Decorator Style (Recommended):**
```typescript
import { withRateLimit, RateLimitPresets } from '../_shared/rateLimiter.ts';

const handler = async (req: Request) => {
  // Your edge function logic here
  return new Response('Success');
};

// Wrap handler with rate limiting
Deno.serve(withRateLimit(handler, RateLimitPresets.PAYMENT));
```

## 🔒 Rate Limit Presets

- **PAYMENT**: 5 attempts per hour (for financial operations)
- **AI_GENERATION**: 10 attempts per 5 minutes (for AI content generation)
- **EMAIL**: 20 attempts per hour (for email sending)
- **GENERAL_API**: 100 attempts per 15 minutes (for general API calls)

## 🛠️ Custom Configuration

You can create custom rate limit configs:

```typescript
const customConfig = {
  limitType: 'my_custom_function',
  maxAttempts: 30,
  timeWindowMinutes: 10,
  getIdentifier: async (req) => {
    // Custom identifier extraction logic
    return 'custom-id';
  }
};

Deno.serve(withRateLimit(handler, customConfig));
```

## 📝 Best Practices

1. **Always use rate limiting** on user-facing edge functions
2. **Choose appropriate limits** based on function purpose:
   - Financial operations: Low limits (5-10 per hour)
   - AI generation: Medium limits (10-20 per 5-10 minutes)
   - Read operations: Higher limits (50-100 per 15 minutes)
3. **Log rate limit violations** for security monitoring
4. **Fail open** - If rate limit check fails, allow the request (prevents legitimate users from being blocked)
5. **Use pre-configured presets** when possible for consistency

## 🔐 Security Notes

- Rate limiting uses the `check_rate_limit_enhanced` database function
- All rate limit checks are logged in `billing_access_logs` table
- Excessive rate limit violations trigger security alerts
- Rate limit data is automatically cleaned up after 1 hour (via `cleanup_old_rate_limits()` function)

## 🧪 Testing

To test rate limiting in development:

```bash
# Make rapid requests to trigger rate limit
for i in {1..20}; do
  curl -X POST https://your-project.supabase.co/functions/v1/your-function \
    -H "Authorization: Bearer YOUR_TOKEN" \
    -d '{"test": "data"}'
done
```

After exceeding the limit, you should receive a 429 response with retry-after header.
