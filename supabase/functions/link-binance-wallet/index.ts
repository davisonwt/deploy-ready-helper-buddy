import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-my-custom-header",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const requestSchema = z.object({
  payId: z.string()
    .trim()
    .min(6, "Pay ID must be at least 6 characters")
    .max(64, "Pay ID must be at most 64 characters")
    .regex(/^[A-Za-z0-9]+$/, "Pay ID can only contain letters and numbers"),
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

    const body = await req.json();
    const parsed = requestSchema.safeParse(body);

    if (!parsed.success) {
      return jsonResponse(
        {
          error: "Invalid request payload",
          details: parsed.error.flatten(),
        },
        400,
      );
    }

    const payId = parsed.data.payId;
    const normalizedPayId = payId.trim();

    const serviceClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    });

    // Ensure this Pay ID is not already linked to another user
    const { data: existingWallet, error: walletLookupError } = await serviceClient
      .from("user_wallets")
      .select("user_id")
      .eq("wallet_address", normalizedPayId)
      .maybeSingle();

    if (walletLookupError && walletLookupError.code !== "PGRST116") {
      throw walletLookupError;
    }

    if (existingWallet && existingWallet.user_id !== userData.user.id) {
      return jsonResponse(
        { error: "This Binance Pay ID is already linked to another account." },
        409,
      );
    }

    // Deactivate previous Binance Pay wallets for this user
    await serviceClient
      .from("user_wallets")
      .update({
        is_primary: false,
        is_active: false,
      })
      .eq("user_id", userData.user.id)
      .in("wallet_type", ["binance_pay", "binance", "binance_pay_id"]);

    // Upsert the new wallet
    const { error: upsertError } = await serviceClient
      .from("user_wallets")
      .upsert({
        user_id: userData.user.id,
        wallet_address: normalizedPayId,
        wallet_type: "binance_pay",
        is_primary: true,
        is_active: true,
      }, {
        onConflict: "user_id,wallet_address",
      });

    if (upsertError) {
      throw upsertError;
    }

    // Initialize wallet balance entry if it does not exist
    try {
      await serviceClient.rpc("update_wallet_balance_secure", {
        target_user_id: userData.user.id,
        target_wallet_address: normalizedPayId,
        new_balance: 0,
      });
    } catch (balanceError) {
      console.warn("Failed to initialize wallet balance:", balanceError);
    }

    return jsonResponse({
      success: true,
      wallet: {
        wallet_address: normalizedPayId,
        wallet_type: "binance_pay",
      },
    });
  } catch (error) {
    console.error("Link Binance wallet error:", error);
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
