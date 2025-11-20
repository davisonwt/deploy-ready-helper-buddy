import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

// Inline CORS headers (secure) - includes x-my-custom-header
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

const createErrorResponse = (message: string, status: number, req: Request): Response => {
  return new Response(
    JSON.stringify({ error: message }),
    {
      status,
      headers: getCorsHeaders(req),
    }
  );
};

const createSuccessResponse = (data: unknown, req: Request): Response => {
  return new Response(
    JSON.stringify(data),
    {
      status: 200,
      headers: getCorsHeaders(req),
    }
  );
};

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
      return createErrorResponse("Unauthorized", 401, req);
    }

    const token = authHeader.replace("Bearer ", "");

    const authClient = createClient(supabaseUrl, anonKey, {
      auth: { persistSession: false },
    });

    const { data: userData, error: userError } = await authClient.auth
      .getUser(token);

    if (userError || !userData?.user) {
      return createErrorResponse("Authentication failed", 401, req);
    }

    const serviceClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    });

    // Get user's Binance Pay wallet
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
      return createErrorResponse("No active Binance Pay wallet linked", 404, req);
    }

    // Calculate balance from payment transactions
    // For Binance Pay, balance = payments received - payments sent
    
    // Payments received (bestowals where user is the grower/sower)
    const { data: receivedBestowals, error: receivedError } = await serviceClient
      .from("bestowals")
      .select("amount, currency, payment_status, grower_id, sower_id")
      .or(`grower_id.eq.${userData.user.id},sower_id.eq.${userData.user.id}`)
      .eq("payment_status", "completed");

    if (receivedError) {
      console.error("Error fetching received payments:", receivedError);
    }

    // Also check product bestowals (where user is the sower)
    const { data: receivedProductBestowals, error: productReceivedError } = await serviceClient
      .from("product_bestowals")
      .select("amount, sower_amount, sower_id, status")
      .eq("sower_id", userData.user.id)
      .eq("status", "completed");

    if (productReceivedError) {
      console.error("Error fetching product bestowals:", productReceivedError);
    }

    // Payments sent (bestowals where user is the bestower)
    const { data: sentBestowals, error: sentError } = await serviceClient
      .from("bestowals")
      .select("amount, currency, payment_status")
      .eq("bestower_id", userData.user.id)
      .eq("payment_status", "completed");

    if (sentError) {
      console.error("Error fetching sent payments:", sentError);
    }

    // Also check product bestowals sent
    const { data: sentProductBestowals, error: productSentError } = await serviceClient
      .from("product_bestowals")
      .select("amount, bestower_id, status")
      .eq("bestower_id", userData.user.id)
      .eq("status", "completed");

    if (productSentError) {
      console.error("Error fetching sent product bestowals:", productSentError);
    }

    // Calculate total received
    let totalReceived = 0;
    
    // From orchard bestowals (user is grower or sower)
    if (receivedBestowals) {
      totalReceived += receivedBestowals.reduce((sum, bestowal) => {
        const amount = parseFloat(bestowal.amount.toString());
        // TODO: Use actual distribution amounts (grower_amount, sower_amount) from bestowals table
        return sum + amount;
      }, 0);
    }
    
    // From product bestowals (user is sower)
    if (receivedProductBestowals) {
      totalReceived += receivedProductBestowals.reduce((sum, bestowal) => {
        // Use sower_amount (70% of total)
        const amount = parseFloat((bestowal.sower_amount || bestowal.amount).toString());
        return sum + amount;
      }, 0);
    }

    // Calculate total sent
    const totalSent = (sentBestowals || []).reduce((sum, payment) => {
      const amount = parseFloat(payment.amount.toString());
      return sum + amount;
    }, 0) + (sentProductBestowals || []).reduce((sum, payment) => {
      const amount = parseFloat(payment.amount.toString());
      return sum + amount;
    }, 0);

    // Calculate balance (received - sent)
    const calculatedBalance = Math.max(0, totalReceived - totalSent);

    // Update wallet balance in database
    try {
      await serviceClient.rpc("update_wallet_balance_secure", {
        target_user_id: userData.user.id,
        target_wallet_address: wallet.wallet_address,
        new_balance: calculatedBalance,
      });
    } catch (updateError) {
      console.error("Error updating wallet balance:", updateError);
      throw updateError;
    }

    return createSuccessResponse({
      success: true,
      balance: calculatedBalance,
      totalReceived,
      totalSent,
      walletAddress: wallet.wallet_address,
      syncedAt: new Date().toISOString(),
    }, req);

  } catch (error) {
    console.error("Sync wallet balance error:", error);
    return createErrorResponse(
      error instanceof Error ? error.message : String(error),
      500,
      req
    );
  }
});

