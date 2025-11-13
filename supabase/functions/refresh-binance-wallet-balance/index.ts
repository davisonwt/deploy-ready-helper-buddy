import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import {
  BinanceBalanceDetail,
  BinancePayClient,
} from "../_shared/binance.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

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

    const serviceClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    });

    const { data: wallet, error: walletError } = await serviceClient
      .from("user_wallets")
      .select("wallet_address, wallet_type")
      .eq("user_id", userData.user.id)
      .eq("wallet_type", "binance_pay")
      .eq("is_active", true)
      .order("is_primary", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (walletError && walletError.code !== "PGRST116") {
      throw walletError;
    }

    if (!wallet?.wallet_address) {
      return jsonResponse({
        success: false,
        error: "No active Binance Pay wallet linked",
      }, 404);
    }

    const binanceClient = new BinancePayClient();
    let fetchedBalance: number | null = null;
    let source: "binance" | "cache" = "cache";

    try {
      const balanceResponse = await binanceClient.getWalletBalance({
        payeeId: wallet.wallet_address,
      });

      const entries: BinanceBalanceDetail[] = Array.isArray(
        balanceResponse.balanceDetails,
      )
        ? balanceResponse.balanceDetails
        : [];

      const usdcEntry = entries.find((entry) =>
        entry.assetCode === "USDC" ||
        entry.asset === "USDC" ||
        entry.currency === "USDC"
      );

      if (usdcEntry) {
        const rawBalance = usdcEntry.availableAmount ??
          usdcEntry.totalAmount ??
          usdcEntry.balance ??
          "0";
        fetchedBalance = Number(rawBalance);
        if (!Number.isFinite(fetchedBalance)) {
          fetchedBalance = 0;
        }
        source = "binance";
      }
    } catch (binanceError) {
      console.warn("Binance balance fetch failed, falling back to cache:", binanceError);
    }

    if (fetchedBalance === null) {
      const { data: cachedBalance, error: cachedError } = await serviceClient
        .from("wallet_balances")
        .select("usdc_balance, updated_at")
        .eq("user_id", userData.user.id)
        .eq("wallet_address", wallet.wallet_address)
        .maybeSingle();

      if (cachedError && cachedError.code !== "PGRST116") {
        throw cachedError;
      }

      const fallback = Number(cachedBalance?.usdc_balance ?? 0);
      return jsonResponse({
        success: true,
        balance: fallback,
        source: "cache",
        walletAddress: wallet.wallet_address,
        updatedAt: cachedBalance?.updated_at ?? null,
      });
    }

    await serviceClient.rpc("update_wallet_balance_secure", {
      target_user_id: userData.user.id,
      target_wallet_address: wallet.wallet_address,
      new_balance: fetchedBalance,
    });

    return jsonResponse({
      success: true,
      balance: fetchedBalance,
      source,
      walletAddress: wallet.wallet_address,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Refresh Binance wallet balance error:", error);
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
