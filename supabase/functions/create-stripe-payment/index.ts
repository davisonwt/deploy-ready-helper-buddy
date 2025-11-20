import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { checkRateLimit, createRateLimitResponse, RateLimitPresets } from "../_shared/rateLimiter.ts";
import { getSecureCorsHeaders, validatePaymentAmount, getClientIp, createErrorResponse, createSuccessResponse } from "../_shared/security.ts";

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[STRIPE-PAYMENT] ${step}${detailsStr}`);
};

serve(async (req) => {
  const corsHeaders = getSecureCorsHeaders(req);
  
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Stripe payment creation started");

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
        payment_method_param: 'stripe',
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

    const requestBody = await req.json();
    const { amount, currency, orchardId, pocketsCount, pocketNumbers } = requestBody;
    
    // Enhanced input validation
    const amountValidation = validatePaymentAmount(amount);
    if (!amountValidation.valid) {
      return createErrorResponse(amountValidation.error || 'Invalid amount', 400, req);
    }
    
    const allowedCurrencies = ['usd', 'eur', 'gbp', 'zar'];
    if (!currency || !allowedCurrencies.includes(currency.toLowerCase())) {
      return createErrorResponse('Invalid currency. Allowed: USD, EUR, GBP, ZAR', 400, req);
    }
    
    if (!orchardId || typeof orchardId !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(orchardId)) {
      return createErrorResponse('Invalid orchard ID format', 400, req);
    }
    
    if (pocketsCount !== undefined && (typeof pocketsCount !== 'number' || !Number.isInteger(pocketsCount) || pocketsCount < 0 || pocketsCount > 10000)) {
      return createErrorResponse('Invalid pockets count. Must be between 0 and 10000', 400, req);
    }
    
    if (pocketNumbers && (!Array.isArray(pocketNumbers) || pocketNumbers.length > 10000)) {
      return createErrorResponse('Invalid pocket numbers', 400, req);
    }
    
    logStep("Request data validated", { amount, currency, orchardId, pocketsCount });

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) {
      throw new Error("Stripe secret key not configured");
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });

    // Check if customer exists
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    let customerId;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
    }

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : user.email,
      line_items: [
        {
          price_data: {
            currency: currency?.toLowerCase() || "usd",
            product_data: {
              name: `Sow2Grow Orchard Bestowal`,
              description: `Support for orchard with ${pocketsCount} pockets`,
            },
            unit_amount: Math.round(amount * 100), // Convert to cents
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${req.headers.get("origin")}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.headers.get("origin")}/payment-cancelled`,
      metadata: {
        orchard_id: orchardId,
        user_id: user.id,
        pockets_count: pocketsCount?.toString() || "0",
      },
    });

    logStep("Stripe checkout session created", { sessionId: session.id });

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
        payment_method: "stripe",
        payment_reference: session.id,
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
        payment_method: "stripe",
        payment_provider_id: session.id,
        amount: amount,
        currency: currency || "USD",
        status: "pending",
        provider_response: { session_id: session.id, payment_status: session.payment_status },
      });

    if (transactionError) {
      logStep("Transaction record error", transactionError);
    }

    logStep("Stripe payment process completed", { sessionId: session.id, url: session.url });

    const result = {
      sessionId: session.id,
      url: session.url,
      bestowId: bestowal.id,
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
      payment_method_param: 'stripe',
      amount_param: amount,
      currency_param: currency?.toUpperCase() || 'USD',
      bestowal_id_param: bestowal.id,
      transaction_id_param: session.id,
      ip_address_param: getClientIp(req),
      user_agent_param: req.headers.get('user-agent') || null,
      metadata_param: { orchardId, pocketsCount, idempotencyKey }
    });

    return createSuccessResponse(result, req);

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in Stripe payment creation", { message: errorMessage });
    if (error instanceof Error && error.stack) {
      console.error("Error stack:", error.stack);
    }
    
    // Try to log audit event (don't fail if this fails)
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
            payment_method_param: 'stripe',
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