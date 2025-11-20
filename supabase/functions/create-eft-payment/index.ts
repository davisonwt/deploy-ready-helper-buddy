import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import { checkRateLimit, createRateLimitResponse, RateLimitPresets } from "../_shared/rateLimiter.ts";
import { getSecureCorsHeaders, validatePaymentAmount, getClientIp, createErrorResponse, createSuccessResponse } from "../_shared/security.ts";

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[EFT-PAYMENT] ${step}${detailsStr}`);
};

serve(async (req) => {
  const corsHeaders = getSecureCorsHeaders(req);
  
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("EFT payment creation started");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return createErrorResponse("No authorization header provided", 401, req);
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) {
      return createErrorResponse(`Authentication error: ${userError.message}`, 401, req);
    }
    const user = userData.user;
    if (!user?.email) {
      return createErrorResponse("User not authenticated", 401, req);
    }
    logStep("User authenticated", { userId: user.id, email: user.email });

    // Rate limiting
    const allowed = await checkRateLimit(
      supabaseClient,
      user.id,
      'payment',
      RateLimitPresets.PAYMENT.maxAttempts,
      RateLimitPresets.PAYMENT.timeWindowMinutes
    );

    if (!allowed) {
      logStep("Rate limit exceeded", { userId: user.id });
      await supabaseClient.rpc('log_payment_audit', {
        user_id_param: user.id,
        action_param: 'rate_limit_exceeded',
        payment_method_param: 'eft',
        amount_param: 0,
        currency_param: 'USD',
        ip_address_param: getClientIp(req),
        user_agent_param: req.headers.get('user-agent') || null,
      });
      return createRateLimitResponse(3600);
    }

    // Check idempotency key
    const idempotencyKey = req.headers.get('x-idempotency-key');
    if (!idempotencyKey) {
      return createErrorResponse("Idempotency key required", 400, req);
    }

    // Check if already processed
    const { data: idempotencyCheck } = await supabaseClient.rpc('check_payment_idempotency', {
      idempotency_key_param: idempotencyKey,
      user_id_param: user.id
    });

    if (idempotencyCheck?.exists) {
      logStep("Idempotency key found, returning cached result", { idempotencyKey });
      return createSuccessResponse(idempotencyCheck.result, req);
    }

    // Define validation schema with enhanced validation
    const eftPaymentSchema = z.object({
      amount: z.number().positive().max(1000000).refine((val) => {
        const validation = validatePaymentAmount(val);
        return validation.valid;
      }, 'Amount validation failed'),
      currency: z.enum(['USD', 'ZAR', 'EUR', 'GBP']).optional(),
      orchardId: z.string().uuid('Invalid orchard ID format'),
      pocketsCount: z.number().int().min(0).max(10000).optional(),
      pocketNumbers: z.array(z.number().int().positive()).max(10000).optional()
    });

    // Parse and validate request body
    const rawBody = await req.json();
    const validationResult = eftPaymentSchema.safeParse(rawBody);
    
    if (!validationResult.success) {
      logStep('Input validation failed', { errors: validationResult.error });
      const errorMessage = validationResult.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(", ");
      return createErrorResponse(`Invalid input: ${errorMessage}`, 400, req);
    }
    
    const { amount, currency, orchardId, pocketsCount, pocketNumbers } = validationResult.data;
    logStep("Request data validated", { amount, currency, orchardId, pocketsCount });

    // Generate unique reference number for EFT
    const referenceNumber = `SOW${Date.now()}${Math.random().toString(36).substr(2, 4).toUpperCase()}`;
    
    // Get bank details from payment config using secure RPC
    const { data: paymentConfig, error: configError } = await supabaseClient
      .rpc('get_payment_config_secure');

    if (configError || !paymentConfig) {
      logStep("Payment config error", configError);
      throw new Error("Payment configuration not found");
    }

    // Create bestowal record
    const { data: bestowal, error: bestowError } = await supabaseClient
      .from("bestowals")
      .insert({
        orchard_id: orchardId,
        bestower_id: user.id,
        amount: amount,
        currency: currency || "USD",
        pockets_count: pocketsCount || 0,
        pocket_numbers: pocketNumbers || [],
        payment_status: "pending",
        payment_method: "eft",
        payment_reference: referenceNumber,
      })
      .select()
      .single();

    if (bestowError) {
      logStep("Bestowal creation error", bestowError);
      throw new Error("Failed to create bestowal record");
    }

    // Create payment transaction record
    const { error: transactionError } = await supabaseClient
      .from("payment_transactions")
      .insert({
        bestowal_id: bestowal.id,
        payment_method: "eft",
        payment_provider_id: referenceNumber,
        amount: amount,
        currency: currency || "USD",
        status: "pending",
        provider_response: {
          reference_number: referenceNumber,
          bank_details: paymentConfig,
          instructions: "Please use the reference number when making your EFT payment",
        },
      });

    if (transactionError) {
      logStep("Transaction record error", transactionError);
    }

    logStep("EFT payment record created", { referenceNumber, bestowId: bestowal.id });

    const result = {
      referenceNumber: referenceNumber,
      bankDetails: {
        bankName: paymentConfig.bank_name,
        accountName: paymentConfig.bank_account_name,
        accountNumber: paymentConfig.bank_account_number,
        swiftCode: paymentConfig.bank_swift_code,
        businessEmail: paymentConfig.business_email,
      },
      amount: amount,
      currency: currency || "USD",
      bestowId: bestowal.id,
      instructions: [
        "Use the reference number as your payment reference",
        "Allow 1-3 business days for processing",
        "You will receive a confirmation email once payment is verified",
      ],
    };

    // Store idempotency result
    await supabaseClient.rpc('store_payment_idempotency', {
      idempotency_key_param: idempotencyKey,
      user_id_param: user.id,
      result_param: result
    });

    // Audit log
    await supabaseClient.rpc('log_payment_audit', {
      user_id_param: user.id,
      action_param: 'payment_created',
      payment_method_param: 'eft',
      amount_param: amount,
      currency_param: currency || 'USD',
      bestowal_id_param: bestowal.id,
      transaction_id_param: referenceNumber,
      ip_address_param: getClientIp(req),
      user_agent_param: req.headers.get('user-agent') || null,
      metadata_param: { orchardId, pocketsCount, idempotencyKey }
    });

    return createSuccessResponse(result, req);

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in EFT payment creation", { message: errorMessage });
    
    // Try to log audit event
    try {
      const supabaseClient = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
        { auth: { persistSession: false } }
      );
      const authHeader = req.headers.get("Authorization");
      if (authHeader) {
        const token = authHeader.replace("Bearer ", "");
        const { data: userData } = await supabaseClient.auth.getUser(token);
        if (userData?.user) {
          await supabaseClient.rpc('log_payment_audit', {
            user_id_param: userData.user.id,
            action_param: 'payment_failed',
            payment_method_param: 'eft',
            amount_param: 0,
            currency_param: 'USD',
            ip_address_param: getClientIp(req),
            user_agent_param: req.headers.get('user-agent') || null,
            metadata_param: { error: errorMessage }
          });
        }
      }
    } catch (auditError) {
      console.error("Failed to log audit event:", auditError);
    }
    
    return createErrorResponse(
      'Payment processing failed. Please try again or contact support.',
      500,
      req
    );
  }
});