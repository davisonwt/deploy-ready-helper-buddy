import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import {
  RateLimitPresets,
  withRateLimit,
} from "../_shared/rateLimiter.ts";
import {
  CryptomusClient,
  CryptomusPaymentResponse,
} from "../_shared/cryptomus.ts";
import { buildDistributionData } from "../_shared/distribution.ts";

import { getSecureCorsHeaders, getClientIp, createErrorResponse, createSuccessResponse } from "../_shared/security.ts";

const requestSchema = z.object({
  orchardId: z.string().uuid(),
  amount: z.number().positive(),
  pocketsCount: z.number().int().positive(),
  message: z.string().max(500).optional(),
  growerId: z.string().uuid().optional(),
  returnUrl: z.string().url().optional(),
  cancelUrl: z.string().url().optional(),
  clientOrigin: z.string().url().optional(),
  currency: z.string().optional(), // e.g., "USDC", "USDT", "BTC"
  network: z.string().optional(), // e.g., "TRC20", "ERC20", "BEP20"
});

type RequestPayload = z.infer<typeof requestSchema>;

const handler = async (req: Request): Promise<Response> => {
  const corsHeaders = getSecureCorsHeaders(req);
  
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    if (!supabaseUrl || !anonKey || !serviceRoleKey) {
      throw new Error("Supabase environment variables are not configured");
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return jsonResponse(
        { error: "Unauthorized" },
        401,
      );
    }

    const token = authHeader.replace("Bearer ", "");

    const authClient = createClient(supabaseUrl, anonKey, {
      auth: { persistSession: false },
    });

    const { data: userData, error: userError } = await authClient.auth
      .getUser(token);

    if (userError || !userData?.user) {
      console.error("Cryptomus auth error:", userError);
      return createErrorResponse("Authentication failed", 401, req);
    }

    // Create service client
    const serviceClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    });

    // Check idempotency key
    const idempotencyKey = req.headers.get('x-idempotency-key');
    if (!idempotencyKey) {
      return createErrorResponse("Idempotency key required", 400, req);
    }

    // Check if already processed
    let idempotencyCheck: any = null;
    try {
      const { data, error: rpcError } = await serviceClient.rpc('check_payment_idempotency', {
        idempotency_key_param: idempotencyKey,
        user_id_param: userData.user.id
      });
      
      if (rpcError) {
        if (rpcError.message?.includes('function') || rpcError.message?.includes('does not exist')) {
          console.warn("Idempotency function not found, continuing without idempotency check");
        } else {
          throw rpcError;
        }
      } else {
        idempotencyCheck = data;
      }
    } catch (idempotencyError) {
      console.error("Idempotency check failed:", idempotencyError);
      if (idempotencyError instanceof Error && 
          (idempotencyError.message.includes('function') || idempotencyError.message.includes('does not exist'))) {
        console.warn("Idempotency function not available, continuing without check");
      } else {
        throw idempotencyError;
      }
    }

    if (idempotencyCheck?.exists) {
      console.log("Idempotency key found, returning cached result", { idempotencyKey });
      return createSuccessResponse(idempotencyCheck.result, req);
    }

    const requestBody = await req.json();
    const parsed = requestSchema.safeParse(requestBody);

    if (!parsed.success) {
      return createErrorResponse(
        `Invalid request payload: ${JSON.stringify(parsed.error.flatten())}`,
        400,
        req
      );
    }

    const payload = parsed.data as RequestPayload;

    const { data: orchard, error: orchardError } = await serviceClient
      .from("orchards")
      .select(
        "id, title, user_id, pocket_price, currency, status, commission_rate, allow_commission_marketing, orchard_type, courier_cost, product_type",
      )
      .eq("id", payload.orchardId)
      .single();

    if (orchardError || !orchard) {
      console.error("Failed to fetch orchard:", orchardError);
      return createErrorResponse("Orchard not found", 404, req);
    }

    if (orchard.status !== "active") {
      return createErrorResponse("Orchard is not available for bestowals", 400, req);
    }

    const currency = payload.currency ?? orchard.currency ?? "USDC";
    const network = payload.network ?? "TRC20"; // Default to TRC20 for USDC
    const orchardType = (orchard.orchard_type as string | null) ?? "standard";
    const productType = (orchard.product_type as string | null) ?? "physical";
    const courierRequired = !!(orchard.courier_cost && Number(orchard.courier_cost) > 0);

    // Digital products go directly to user wallets (automatic distribution)
    // Physical products go to s2gholding first (manual distribution after courier)
    let distributionMode: "manual" | "automatic" = productType === "digital" ? "automatic" : "manual";
    let holdReason: string | null = null;

    if (productType === "digital") {
      distributionMode = "automatic";
      holdReason = null;
    } else if (orchardType === "standard") {
      distributionMode = "manual";
      holdReason = "Standard orchard bestowal awaiting Gosat release from holding wallet.";
    } else if (orchardType === "full_value" && courierRequired) {
      distributionMode = "manual";
      holdReason = "Courier delivery required; funds held in s2gholding until delivery confirmed.";
    } else {
      distributionMode = "manual";
      holdReason = "Physical product bestowal held in s2gholding until distribution approved.";
    }

    const distribution = await buildDistributionData(serviceClient, {
      orchardId: orchard.id,
      orchardTitle: orchard.title,
      orchardUserId: orchard.user_id,
      totalAmount: payload.amount,
      currency,
      growerUserId: payload.growerId ?? null,
      distributionMode,
      holdReason,
      orchardType,
      courierRequired,
      productType,
    });

    const { data: bestowal, error: insertError } = await serviceClient
      .from("bestowals")
      .insert({
        orchard_id: orchard.id,
        bestower_id: userData.user.id,
        amount: payload.amount,
        currency,
        pockets_count: payload.pocketsCount,
        message: payload.message ?? null,
        payment_method: "cryptomus",
        payment_status: "pending",
        distribution_data: distribution,
      })
      .select()
      .single();

    if (insertError || !bestowal) {
      console.error("Failed to create bestowal:", insertError);
      throw new Error("Failed to create bestowal record");
    }

    // Load Cryptomus credentials from environment or organization_wallets table
    const merchantId = Deno.env.get("CRYPTOMUS_MERCHANT_ID");
    const paymentApiKey = Deno.env.get("CRYPTOMUS_PAYMENT_API_KEY");

    if (!merchantId || !paymentApiKey) {
      throw new Error("Cryptomus credentials not configured");
    }

    const cryptomusClient = new CryptomusClient({
      merchantId,
      paymentApiKey,
      apiBaseUrl: Deno.env.get("CRYPTOMUS_API_BASE_URL") ?? "https://api.cryptomus.com/v1",
      walletName: "s2gholding"
    });

    const { returnUrl, cancelUrl, callbackUrl } = buildReturnUrls(
      req,
      payload,
      bestowal.id,
    );

    const paymentResponse: CryptomusPaymentResponse = await cryptomusClient
      .createPayment({
        orderId: bestowal.id,
        amount: payload.amount,
        currency,
        network,
        urlReturn: returnUrl,
        urlSuccess: returnUrl,
        urlCallback: callbackUrl,
        lifetime: 30, // 30 minutes
        additionalData: {
          orchardId: orchard.id,
          bestowalId: bestowal.id,
          userId: userData.user.id,
          orchardTitle: orchard.title,
        },
      });

    await serviceClient
      .from("bestowals")
      .update({
        payment_reference: paymentResponse.result.uuid,
      })
      .eq("id", bestowal.id);

    try {
      await serviceClient
        .from("payment_transactions")
        .insert({
          bestowal_id: bestowal.id,
          payment_method: "cryptomus",
          payment_provider_id: paymentResponse.result.uuid,
          amount: payload.amount,
          currency,
          status: "pending",
          provider_response: paymentResponse,
        });
    } catch (transactionError) {
      console.warn(
        "Failed to persist payment transaction for Cryptomus order:",
        transactionError,
      );
    }

    const paymentUrl = paymentResponse.result.url;

    const result = {
      success: true,
      bestowalId: bestowal.id,
      paymentId: paymentResponse.result.uuid,
      paymentUrl,
      address: paymentResponse.result.address,
      amount: paymentResponse.result.paymentAmount,
      currency: paymentResponse.result.currency,
      network: paymentResponse.result.network,
      distribution,
    };

    // Store idempotency result
    try {
      await serviceClient.rpc('store_payment_idempotency', {
        idempotency_key_param: idempotencyKey,
        user_id_param: userData.user.id,
        result_param: result
      });
    } catch (storeError) {
      console.warn("Failed to store idempotency result:", storeError);
    }

    // Audit log
    try {
      await serviceClient.rpc('log_payment_audit', {
        user_id_param: userData.user.id,
        action_param: 'payment_created',
        payment_method_param: 'cryptomus',
        amount_param: payload.amount,
        currency_param: currency,
        bestowal_id_param: bestowal.id,
        transaction_id_param: paymentResponse.result.uuid,
        ip_address_param: getClientIp(req),
        user_agent_param: req.headers.get('user-agent') || null,
        metadata_param: { orchardId: payload.orchardId, pocketsCount: payload.pocketsCount, idempotencyKey }
      });
    } catch (auditError) {
      console.warn("Failed to log audit event:", auditError);
    }

    return createSuccessResponse(result, req);
  } catch (error) {
    console.error("Cryptomus payment creation error:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    return createErrorResponse(
      "Failed to create Cryptomus payment. Please try again or contact support.",
      500,
      req
    );
  }
};

function buildReturnUrls(
  req: Request,
  payload: RequestPayload,
  bestowalId: string,
) {
  const origin = payload.returnUrl
      ? new URL(payload.returnUrl).origin
      : payload.clientOrigin ??
      req.headers.get("origin") ??
      Deno.env.get("PUBLIC_SITE_URL") ??
      "https://app.sow2grow.com";

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const defaultReturn = `${origin}/payment-success?orderId=${bestowalId}`;
  const defaultCancel = `${origin}/payment-cancelled?orderId=${bestowalId}`;
  const defaultCallback = `${supabaseUrl}/functions/v1/cryptomus-webhook`;

  return {
    returnUrl: payload.returnUrl ?? defaultReturn,
    cancelUrl: payload.cancelUrl ?? defaultCancel,
    callbackUrl: defaultCallback,
  };
}

function jsonResponse(body: unknown, status = 200, req?: Request): Response {
  const corsHeaders = req ? getSecureCorsHeaders(req) : {};
  return new Response(
    JSON.stringify(body),
    {
      status,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
      },
    },
  );
}

serve(withRateLimit(handler, RateLimitPresets.PAYMENT));

