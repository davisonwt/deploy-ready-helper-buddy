import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import {
  RateLimitPresets,
  withRateLimit,
} from "../_shared/rateLimiter.ts";
import {
  BinancePayClient,
  BinanceOrderResponse,
} from "../_shared/binance.ts";
import { buildDistributionData } from "../_shared/distribution.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-my-custom-header",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const requestSchema = z.object({
  orchardId: z.string().uuid(),
  amount: z.number().positive(),
  pocketsCount: z.number().int().positive(),
  message: z.string().max(500).optional(),
  growerId: z.string().uuid().optional(),
  returnUrl: z.string().url().optional(),
  cancelUrl: z.string().url().optional(),
  clientOrigin: z.string().url().optional(),
});

type RequestPayload = z.infer<typeof requestSchema>;

const handler = async (req: Request): Promise<Response> => {
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
      console.error("Binance Pay auth error:", userError);
      return jsonResponse(
        { error: "Authentication failed" },
        401,
      );
    }

    const requestBody = await req.json();
    const parsed = requestSchema.safeParse(requestBody);

    if (!parsed.success) {
      return jsonResponse(
        {
          error: "Invalid request payload",
          details: parsed.error.flatten(),
        },
        400,
      );
    }

      const payload = parsed.data as RequestPayload;

      const serviceClient = createClient(supabaseUrl, serviceRoleKey, {
        auth: { persistSession: false },
      });

      const { data: orchard, error: orchardError } = await serviceClient
        .from("orchards")
        .select(
          "id, title, user_id, pocket_price, currency, status, commission_rate, allow_commission_marketing, orchard_type, courier_cost, product_type",
        )
        .eq("id", payload.orchardId)
        .single();

    if (orchardError || !orchard) {
      console.error("Failed to fetch orchard:", orchardError);
      return jsonResponse(
        { error: "Orchard not found" },
        404,
      );
    }

    if (orchard.status !== "active") {
      return jsonResponse(
        { error: "Orchard is not available for bestowals" },
        400,
      );
    }

      const currency = orchard.currency ?? "USDC";
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
        payment_method: "binance_pay",
        payment_status: "pending",
        distribution_data: distribution,
      })
      .select()
      .single();

    if (insertError || !bestowal) {
      console.error("Failed to create bestowal:", insertError);
      throw new Error("Failed to create bestowal record");
    }

    // Load s2gholding wallet credentials for payment collection
    const { data: holdingWallet } = await serviceClient
      .from("organization_wallets")
      .select("api_key, api_secret, merchant_id")
      .eq("wallet_name", "s2gholding")
      .eq("is_active", true)
      .single();

    if (!holdingWallet?.api_key || !holdingWallet?.api_secret) {
      throw new Error("s2gholding wallet credentials not configured");
    }

    const binanceClient = new BinancePayClient({
      apiKey: holdingWallet.api_key,
      apiSecret: holdingWallet.api_secret,
      merchantId: holdingWallet.merchant_id || "",
      apiBaseUrl: "https://bpay.binanceapi.com",
      defaultTradeType: "WEB",
      walletName: "s2gholding"
    });
    const { returnUrl, cancelUrl } = buildReturnUrls(
      req,
      payload,
      bestowal.id,
    );

    const orderResponse: BinanceOrderResponse = await binanceClient
      .createOrder({
        merchantTradeNo: bestowal.id,
        currency,
        totalAmount: payload.amount,
        subject: orchard.title,
        description: `Bestowal for orchard ${orchard.title}`,
        returnUrl,
        cancelUrl,
        goods: [
          {
            goodsType: "02",
            goodsCategory: "6000",
            referenceGoodsId: orchard.id,
            goodsName: orchard.title,
          },
        ],
        meta: {
          orchardId: orchard.id,
          bestowalId: bestowal.id,
          userId: userData.user.id,
        },
      });

    await serviceClient
      .from("bestowals")
      .update({
        payment_reference: orderResponse.prepayId,
      })
      .eq("id", bestowal.id);

    try {
      await serviceClient
        .from("payment_transactions")
        .insert({
          bestowal_id: bestowal.id,
          payment_method: "binance_pay",
          payment_provider_id: orderResponse.prepayId,
          amount: payload.amount,
          currency,
          status: "pending",
          provider_response: orderResponse,
        });
    } catch (transactionError) {
      console.warn(
        "Failed to persist payment transaction for Binance Pay order:",
        transactionError,
      );
    }

    const paymentUrl = orderResponse.checkoutUrl ??
      orderResponse.prepayUrl ??
      orderResponse.qrcodeLink;

    return jsonResponse(
      {
        success: true,
        bestowalId: bestowal.id,
        prepayId: orderResponse.prepayId,
        paymentUrl,
        distribution,
      },
    );
  } catch (error) {
    console.error("Binance Pay order creation error:", error);
    return jsonResponse(
      {
        error: "Failed to create Binance Pay order",
        message: error instanceof Error ? error.message : String(error),
      },
      500,
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

  const defaultReturn = `${origin}/payment-success?orderId=${bestowalId}`;
  const defaultCancel = `${origin}/payment-cancelled?orderId=${bestowalId}`;

  return {
    returnUrl: payload.returnUrl ?? defaultReturn,
    cancelUrl: payload.cancelUrl ?? defaultCancel,
  };
}

function jsonResponse(body: unknown, status = 200): Response {
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
