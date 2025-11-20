import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import { checkRateLimit, createRateLimitResponse, RateLimitPresets } from "../_shared/rateLimiter.ts";
import { getSecureCorsHeaders, validatePaymentAmount, getClientIp, createErrorResponse, createSuccessResponse } from "../_shared/security.ts";

serve(async (req) => {
  const corsHeaders = getSecureCorsHeaders(req);
  
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Create Supabase client for user authentication
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    // Create Supabase service client for database operations
    const supabaseService = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Get the authorization header and extract user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return createErrorResponse("No authorization header", 401, req);
    }

    const token = authHeader.replace("Bearer ", "");
    const { data, error: authError } = await supabaseClient.auth.getUser(token);
    
    if (authError || !data.user) {
      return createErrorResponse("Invalid token or user not found", 401, req);
    }

    const user = data.user;

    // Rate limiting
    const allowed = await checkRateLimit(
      supabaseService,
      user.id,
      'payment',
      RateLimitPresets.PAYMENT.maxAttempts,
      RateLimitPresets.PAYMENT.timeWindowMinutes
    );

    if (!allowed) {
      await supabaseService.rpc('log_payment_audit', {
        user_id_param: user.id,
        action_param: 'rate_limit_exceeded',
        payment_method_param: 'usdc',
        amount_param: 0,
        currency_param: 'USDC',
        ip_address_param: getClientIp(req),
        user_agent_param: req.headers.get('user-agent') || null,
      });
      return createRateLimitResponse(3600);
    }

    // Parse request body first to get signature for idempotency
    const rawBody = await req.json();
    const signature = rawBody.signature;

    // Check idempotency key (use signature as fallback)
    const idempotencyKey = req.headers.get('x-idempotency-key') || `usdc-${signature}`;
    
    // Check if already processed
    const { data: idempotencyCheck } = await supabaseService.rpc('check_payment_idempotency', {
      idempotency_key_param: idempotencyKey,
      user_id_param: user.id
    });

    if (idempotencyCheck?.exists) {
      return createSuccessResponse(idempotencyCheck.result, req);
    }

    // Define validation schema with enhanced validation
    const transferSchema = z.object({
      signature: z.string().min(64).max(150),
      amount: z.number().positive().max(1000000).refine((val) => {
        const validation = validatePaymentAmount(val);
        return validation.valid;
      }, 'Amount validation failed'),
      orchardId: z.string().uuid('Invalid orchard ID format'),
      pocketsCount: z.number().int().positive().max(10000),
      pocketNumbers: z.array(z.number().int().positive()).max(10000).optional(),
      fromWallet: z.string().regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid wallet address format'),
      toWallet: z.string().regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid wallet address format')
    });

    // Validate request body
    const validationResult = transferSchema.safeParse(rawBody);
    
    if (!validationResult.success) {
      console.error("Input validation failed:", validationResult.error);
      const errorMessage = validationResult.error.errors.map(e => e.message).join(", ");
      return createErrorResponse(`Invalid input: ${errorMessage}`, 400, req);
    }
    
    const { 
      amount, 
      orchardId, 
      pocketsCount, 
      pocketNumbers,
      fromWallet,
      toWallet 
    } = validationResult.data;

    console.log("Processing USDC transfer:", {
      signature,
      amount,
      orchardId,
      userId: user.id
    });

    // Check if transaction already exists (additional check)
    const { data: existingTx } = await supabaseService
      .from('usdc_transactions')
      .select('id')
      .eq('signature', signature)
      .maybeSingle();

    if (existingTx) {
      return createErrorResponse("Transaction already processed", 409, req);
    }

    // Create bestowal record
    const { data: bestowalData, error: bestowError } = await supabaseService
      .from('bestowals')
      .insert([{
        orchard_id: orchardId,
        bestower_id: user.id,
        amount: amount,
        currency: 'USDC',
        pockets_count: pocketsCount,
        pocket_numbers: pocketNumbers,
        payment_method: 'usdc',
        payment_status: 'completed',
        payment_reference: signature
      }])
      .select()
      .single();

    if (bestowError) {
      console.error("Error creating bestowal:", bestowError);
      throw bestowError;
    }

    // Record USDC transaction
    const { data: txData, error: txError } = await supabaseService
      .from('usdc_transactions')
      .insert([{
        user_id: user.id,
        from_wallet: fromWallet,
        to_wallet: toWallet,
        amount: amount,
        signature: signature,
        transaction_type: 'bestowal',
        status: 'confirmed',
        bestowal_id: bestowalData.id,
        confirmed_at: new Date().toISOString()
      }])
      .select()
      .single();

    if (txError) {
      console.error("Error recording transaction:", txError);
      throw txError;
    }

    // Update orchard statistics
    await supabaseService.rpc('update_orchard_stats', {
      orchard_id: orchardId
    });

    console.log("USDC transfer processed successfully:", {
      bestowId: bestowalData.id,
      txId: txData.id,
      signature
    });

    const result = {
      success: true,
      bestowal: bestowalData,
      transaction: txData,
      message: "USDC transfer processed successfully"
    };

    // Store idempotency result
    await supabaseService.rpc('store_payment_idempotency', {
      idempotency_key_param: idempotencyKey,
      user_id_param: user.id,
      result_param: result
    });

    // Audit log
    await supabaseService.rpc('log_payment_audit', {
      user_id_param: user.id,
      action_param: 'payment_completed',
      payment_method_param: 'usdc',
      amount_param: amount,
      currency_param: 'USDC',
      bestowal_id_param: bestowalData.id,
      transaction_id_param: signature,
      ip_address_param: getClientIp(req),
      user_agent_param: req.headers.get('user-agent') || null,
      metadata_param: { orchardId, pocketsCount, fromWallet, toWallet, idempotencyKey }
    });

    return createSuccessResponse(result, req);

  } catch (error) {
    console.error("Error processing USDC transfer:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    // Try to log audit event
    try {
      const supabaseService = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
        { auth: { persistSession: false } }
      );
      const authHeader = req.headers.get("Authorization");
      if (authHeader) {
        const token = authHeader.replace("Bearer ", "");
        const supabaseClient = createClient(
          Deno.env.get("SUPABASE_URL") ?? "",
          Deno.env.get("SUPABASE_ANON_KEY") ?? ""
        );
        const { data: userData } = await supabaseClient.auth.getUser(token);
        if (userData?.user) {
          await supabaseService.rpc('log_payment_audit', {
            user_id_param: userData.user.id,
            action_param: 'payment_failed',
            payment_method_param: 'usdc',
            amount_param: 0,
            currency_param: 'USDC',
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
      "Payment processing failed. Please try again or contact support.",
      500,
      req
    );
  }
});