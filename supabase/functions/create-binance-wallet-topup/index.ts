import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { BinancePayClient, BinanceOrderResponse } from "../_shared/binance.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const requestSchema = z.object({
  amount: z.number().positive().max(1_000_000),
  currency: z.string().optional(),
  clientOrigin: z.string().url().optional(),
  walletName: z.string().trim().optional(),
});

serve(async (req) => {
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
      return jsonResponse({ error: "Unauthorized" }, 401);
    }

    const token = authHeader.replace("Bearer ", "");

    const authClient = createClient(supabaseUrl, anonKey, {
      auth: { persistSession: false },
    });

    const { data: userData, error: userError } = await authClient.auth
      .getUser(token);

    if (userError || !userData?.user) {
      return jsonResponse({ error: "Authentication failed" }, 401);
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

    const payload = parsed.data;
    const amount = payload.amount;
    const currency = (payload.currency ?? "USDC").toUpperCase();

    const serviceClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    });

    let walletName: string | null = null;
    if (payload.walletName) {
      const { data: isAdmin, error: adminError } = await serviceClient.rpc(
        "is_admin_or_gosat",
        { _user_id: userData.user.id },
      );

      if (adminError) {
        throw adminError;
      }

      if (!isAdmin) {
        return jsonResponse({ error: "Forbidden" }, 403);
      }

      const { data: organizationWallet, error: organizationError } =
        await serviceClient
          .from("organization_wallets")
          .select("wallet_address, wallet_name")
          .eq("wallet_name", payload.walletName)
          .eq("is_active", true)
          .maybeSingle();

      if (organizationError && organizationError.code !== "PGRST116") {
        throw organizationError;
      }

      if (!organizationWallet?.wallet_address) {
        return jsonResponse({
          error: "Organization wallet not found",
        }, 404);
      }

      walletName = organizationWallet.wallet_name ?? payload.walletName;
    }

    const origin = payload.clientOrigin ??
      req.headers.get("origin") ??
      Deno.env.get("PUBLIC_SITE_URL") ??
      "https://app.sow2grow.com";

    const binanceClient = new BinancePayClient();

    const tradeRef = `wallet-topup-${userData.user.id}-${Date.now()}`;

    const orderResponse: BinanceOrderResponse = await binanceClient
      .createOrder({
        merchantTradeNo: tradeRef,
        currency,
        totalAmount: amount,
        subject: "Sow2Grow Wallet Top-Up",
        description: "Add funds to your Sow2Grow wallet using Binance Pay",
        returnUrl: `${origin}/payment-success?orderId=${tradeRef}`,
        cancelUrl: `${origin}/payment-cancelled`,
        goods: [
          {
            goodsType: "02",
            goodsCategory: "6000",
            referenceGoodsId: tradeRef,
            goodsName: "Wallet Top-Up",
          },
        ],
          meta: {
            userId: userData.user.id,
            purpose: "wallet_topup",
            walletName: walletName ?? undefined,
          },
      });

    try {
      await serviceClient
        .from("payment_transactions")
        .insert({
          bestowal_id: null,
          payment_method: "binance_pay",
          payment_provider_id: orderResponse.prepayId,
          amount,
          currency,
          status: "pending",
          provider_response: {
            type: "wallet_topup",
            response: orderResponse,
          },
            metadata: {
              user_id: userData.user.id,
              purpose: "wallet_topup",
              wallet_name: walletName,
            },
        });
    } catch (transactionError) {
      console.warn(
        "Failed to persist wallet top-up transaction:",
        transactionError,
      );
    }

    const paymentUrl = orderResponse.checkoutUrl ??
      orderResponse.prepayUrl ??
      orderResponse.qrcodeLink;

      return jsonResponse({
        success: true,
        prepayId: orderResponse.prepayId,
        paymentUrl,
        tradeReference: tradeRef,
        walletName,
      });
  } catch (error) {
    console.error("Create Binance wallet top-up error:", error);
    return jsonResponse(
      {
        error: error instanceof Error ? error.message : String(error),
      },
      500,
    );
  }
});

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
