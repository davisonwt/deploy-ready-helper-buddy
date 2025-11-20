import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import {
  BinanceBalanceDetail,
  BinancePayClient,
} from "../_shared/binance.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-my-custom-header",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
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

    const body = await req.json().catch(() => ({}));
    const requestedWalletName = typeof body?.walletName === "string"
      ? body.walletName.trim()
      : null;

    let walletAddress: string | null = null;
    let walletName: string | null = null;
    let walletOrigin: "user" | "organization" = "user";

    if (requestedWalletName) {
      // Only gosats can access organization wallets
      const { data: isGosat, error: gosatError } = await serviceClient.rpc(
        "has_role",
        { _user_id: userData.user.id, _role: 'gosat' },
      );

      if (gosatError) {
        throw gosatError;
      }

      if (!isGosat) {
        return jsonResponse({ error: "Only gosats can access organization wallets" }, 403);
      }

      const { data: organizationWallet, error: organizationError } =
        await serviceClient
          .from("organization_wallets")
          .select("wallet_address, wallet_name")
          .eq("wallet_name", requestedWalletName)
          .eq("is_active", true)
          .maybeSingle();

      if (organizationError && organizationError.code !== "PGRST116") {
        throw organizationError;
      }

      if (!organizationWallet?.wallet_address) {
        return jsonResponse({
          success: false,
          error: "Organization wallet not found",
        }, 404);
      }

      walletAddress = organizationWallet.wallet_address;
      walletName = organizationWallet.wallet_name ?? requestedWalletName;
      walletOrigin = "organization";
    } else {
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

      walletAddress = wallet.wallet_address;
    }

    // Try to fetch balance from Binance API
    // For user wallets: Use their own API credentials if available
    // For organization wallets: Use platform credentials
    // If API call fails or credentials missing, fall back to cached balance
    
    let fetchedBalance: number | null = null;
    let source: "binance" | "cache" = "cache";
    let binanceClient: BinancePayClient | null = null;

    try {
      if (walletOrigin === "user") {
        // Try to use user's own Binance Pay API credentials
        const { data: userCreds, error: credsError } = await serviceClient
          .from("user_wallets")
          .select("api_key, api_secret, merchant_id")
          .eq("user_id", userData.user.id)
          .eq("wallet_type", "binance_pay")
          .eq("is_active", true)
          .order("is_primary", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (credsError && credsError.code !== "PGRST116") {
          throw credsError;
        }

        if (userCreds?.api_key && userCreds?.api_secret) {
          // User has their own Binance Pay merchant account - use their credentials
          console.log(`[${new Date().toISOString()}] Using user's Binance Pay API credentials to fetch balance`);
          binanceClient = new BinancePayClient({
            apiKey: userCreds.api_key,
            apiSecret: userCreds.api_secret,
            merchantId: userCreds.merchant_id ?? "",
            apiBaseUrl: Deno.env.get("BINANCE_PAY_API_BASE_URL") ?? "https://bpay.binanceapi.com",
            defaultTradeType: Deno.env.get("BINANCE_PAY_TRADE_TYPE") ?? "WEB",
            walletName,
          });
        } else {
          console.log("User doesn't have Binance Pay API credentials - will use cached balance");
          console.log("💡 Tip: Add your Binance Pay API credentials in wallet settings to get real-time balance from Binance");
        }
      } else {
        // Organization wallet - use platform credentials
        binanceClient = new BinancePayClient();
      }

      if (binanceClient) {
        console.log(`[${new Date().toISOString()}] Fetching balance from Binance API for wallet: ${walletAddress}`);
        
        const balanceResponse = await binanceClient.getWalletBalance({
          wallet: "FUNDING_WALLET",
          currency: "USDC",
        });

        console.log("[Balance Response]", JSON.stringify(balanceResponse, null, 2));

        if (balanceResponse && typeof balanceResponse.balance === 'number') {
          fetchedBalance = balanceResponse.balance;
          source = "binance";
          console.log(`✅ Balance fetched from Binance: ${fetchedBalance} USDC`);
        } else {
          console.warn("Unexpected balance response format:", balanceResponse);
        }
      }
    } catch (binanceError) {
      console.error("❌ Binance API error:", {
        error: binanceError instanceof Error ? binanceError.message : String(binanceError),
        wallet: walletAddress,
        walletOrigin,
        timestamp: new Date().toISOString()
      });
      // Fall through to cache
    }

    if (fetchedBalance === null) {
      // Try to get cached balance from database
      const { data: cachedBalance, error: cachedError } = await serviceClient
        .from("wallet_balances")
        .select("usdc_balance, updated_at")
        .eq("user_id", userData.user.id)
        .eq("wallet_address", walletAddress!)
        .maybeSingle();

      if (cachedError && cachedError.code !== "PGRST116") {
        throw cachedError;
      }

      const fallback = Number(cachedBalance?.usdc_balance ?? 0);
      
      // If no cached balance exists and it's a user wallet, initialize with 0
      if (!cachedBalance && walletOrigin === "user") {
        console.log("No cached balance found, initializing wallet balance to 0");
        try {
          await serviceClient.rpc("update_wallet_balance_secure", {
            target_user_id: userData.user.id,
            target_wallet_address: walletAddress!,
            new_balance: 0,
          });
        } catch (initError) {
          console.warn("Failed to initialize wallet balance:", initError);
        }
      }
      
      return jsonResponse({
        success: true,
        balance: fallback,
        source: "cache",
        walletAddress,
        walletName,
        walletOrigin,
        updatedAt: cachedBalance?.updated_at ?? null,
        note: walletOrigin === "user" 
          ? "User balance tracked in database. Update via webhooks or manual sync."
          : undefined,
      });
    }

    if (walletOrigin === "user") {
      await serviceClient.rpc("update_wallet_balance_secure", {
        target_user_id: userData.user.id,
        target_wallet_address: walletAddress!,
        new_balance: fetchedBalance,
      });
    }

    return jsonResponse({
      success: true,
      balance: fetchedBalance,
      source,
      walletAddress,
      walletName,
      walletOrigin,
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
