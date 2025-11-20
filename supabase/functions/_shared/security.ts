/**
 * Security Utilities for Edge Functions
 * Provides secure CORS, validation, and security helpers
 */

/**
 * Get secure CORS headers based on allowed origins
 */
export function getSecureCorsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get("origin");
  const allowedOrigins = [
    "https://sow2growapp.com",
    "https://www.sow2growapp.com",
    "https://app.sow2grow.com",
    // Add staging if needed
    // "https://staging.sow2growapp.com",
  ];

  // For webhooks (no origin), return minimal headers
  if (!origin) {
    return {
      "Content-Type": "application/json",
    };
  }

  // Check if origin is allowed
  if (origin && allowedOrigins.includes(origin)) {
    return {
      "Access-Control-Allow-Origin": origin,
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-idempotency-key, x-csrf-token",
      "Access-Control-Max-Age": "86400",
      "Content-Type": "application/json",
    };
  }

  // Deny unauthorized origins
  return {
    "Access-Control-Allow-Origin": "null",
    "Content-Type": "application/json",
  };
}

/**
 * Validate payment amount
 */
export function validatePaymentAmount(amount: number): { valid: boolean; error?: string } {
  const MIN_AMOUNT = 0.01;
  const MAX_AMOUNT = 1000000;

  if (typeof amount !== 'number' || !Number.isFinite(amount)) {
    return { valid: false, error: 'Amount must be a valid number' };
  }

  if (amount < MIN_AMOUNT) {
    return { valid: false, error: `Minimum payment is ${MIN_AMOUNT}` };
  }

  if (amount > MAX_AMOUNT) {
    return { valid: false, error: `Maximum payment is ${MAX_AMOUNT}` };
  }

  // Check decimal places (max 2)
  const decimalPlaces = (amount.toString().split('.')[1] || '').length;
  if (decimalPlaces > 2) {
    return { valid: false, error: 'Amount must have at most 2 decimal places' };
  }

  return { valid: true };
}

/**
 * Get IP address from request
 */
export function getClientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }
  return req.headers.get("x-real-ip") || "unknown";
}

/**
 * Create error response with secure headers
 */
export function createErrorResponse(
  error: string,
  status: number,
  req: Request,
  additionalHeaders: Record<string, string> = {}
): Response {
  return new Response(
    JSON.stringify({
      error,
      requestId: crypto.randomUUID(),
    }),
    {
      status,
      headers: {
        ...getSecureCorsHeaders(req),
        ...additionalHeaders,
      },
    }
  );
}

/**
 * Create success response with secure headers
 */
export function createSuccessResponse(
  data: any,
  req: Request,
  status: number = 200,
  additionalHeaders: Record<string, string> = {}
): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...getSecureCorsHeaders(req),
      ...additionalHeaders,
    },
  });
}

