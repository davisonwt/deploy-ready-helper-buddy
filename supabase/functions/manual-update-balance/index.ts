import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

// Inline CORS headers (secure)
const getCorsHeaders = (req: Request): Record<string, string> => {
  const origin = req.headers.get("origin");
  const allowedOrigins = [
    "https://sow2growapp.com",
    "https://www.sow2growapp.com",
    "https://app.sow2grow.com",
    "http://localhost:5173",
    "http://localhost:3000",
  ];

  if (!origin) {
    return {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-idempotency-key, x-csrf-token, x-my-custom-header",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
    };
  }

  if (allowedOrigins.includes(origin)) {
    return {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": origin,
      "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-idempotency-key, x-csrf-token, x-my-custom-header",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Credentials": "true",
    };
  }

  return {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-idempotency-key, x-csrf-token, x-my-custom-header",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };
};

const requestSchema = z.object({
  balance: z.number().min(0, "Balance cannot be negative"),
});

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: getCorsHeaders(req) });
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
      return jsonResponse({ error: "Unauthorized" }, 401, req);
    }

    const token = authHeader.replace("Bearer ", "");

    const authClient = createClient(supabaseUrl, anonKey, {
      auth: { persistSession: false },
    });

    const { data: userData, error: userError } = await authClient.auth
      .getUser(token);

    if (userError || !userData?.user) {
      return jsonResponse({ error: "Authentication failed" }, 401, req);
    }

    const body = await req.json();
    const parsed = requestSchema.safeParse(body);

    if (!parsed.success) {
      return jsonResponse(
        {
          error: "Invalid request payload",
          details: parsed.error.flatten(),
        },
        400,
        req
      );
    }

    const serviceClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    });

    // Get user's Binance Pay wallet
    const { data: wallet, error: walletError } = await serviceClient
      .from("user_wallets")
      .select("wallet_address")
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
      return jsonResponse(
        { error: "No active Binance Pay wallet linked" },
        404,
        req
      );
    }

    // Update wallet balance
    await serviceClient.rpc("update_wallet_balance_secure", {
      target_user_id: userData.user.id,
      target_wallet_address: wallet.wallet_address,
      new_balance: parsed.data.balance,
    });

    return jsonResponse({
      success: true,
      balance: parsed.data.balance,
      walletAddress: wallet.wallet_address,
      updatedAt: new Date().toISOString(),
      message: "Balance updated successfully",
    }, 200, req);
  } catch (error) {
    console.error("Manual update balance error:", error);
    return jsonResponse(
      {
        error: error instanceof Error ? error.message : String(error),
      },
      500,
      req
    );
  }
});

function jsonResponse(body: unknown, status = 200, req: Request): Response {
  return new Response(
    JSON.stringify(body),
    {
      status,
      headers: getCorsHeaders(req),
    },
  );
}

