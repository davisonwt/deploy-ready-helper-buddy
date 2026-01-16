import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// S2G Platform Wallet Addresses
const S2G_WALLETS = {
  // Main Holdings Wallet - all funds received here (USDC on Solana)
  HOLDINGS: 'Hai8nC5rir14DFdiFTiC5NS4if5XYYgqGRRPctpfTdaM',
  // Admin/Tithings Wallet - receives platform fees (USDT on Solana)
  ADMIN: 'Hai8nC5rir14DFdiFTiC5NS4if5XYYgqGRRPctpfTdaN',
};

// Distribution percentages for orchards
const DISTRIBUTION = {
  GROWER: 0.85,   // 85% to grower/sower
  TITHING: 0.10,  // 10% tithing
  ADMIN: 0.05,    // 5% admin fee
};

interface DistributionData {
  total_amount: number;
  currency: string;
  grower_id?: string;
  grower_amount: number;
  tithing_amount: number;
  admin_amount: number;
  holding_wallet: string;
  admin_wallet: string;
  mode: "automatic" | "manual";
  hold_reason?: string | null;
  distributed_at?: string | null;
  distribution_triggered_by?: string | null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    if (!supabaseUrl || !anonKey || !serviceRoleKey) {
      throw new Error("Supabase configuration missing for distribution handler");
    }

    const authHeader = req.headers.get("Authorization");

    if (!authHeader) {
      return jsonResponse({ success: false, error: "Unauthorized" }, 401);
    }

    const token = authHeader.replace("Bearer ", "");

    const authClient = createClient(supabaseUrl, anonKey, {
      auth: { persistSession: false },
    });

    const { data: userData, error: userError } = await authClient.auth.getUser(token);

    if (userError || !userData?.user) {
      return jsonResponse({ success: false, error: "Unauthorized" }, 401);
    }

    const supabaseClient = createClient(
      supabaseUrl,
      serviceRoleKey,
      { auth: { persistSession: false } },
    );

    // Check if user is admin or gosat
    const { data: isGosat } = await supabaseClient.rpc(
      "is_admin_or_gosat",
      { _user_id: userData.user.id },
    );

    if (!isGosat) {
      return jsonResponse({ success: false, error: "Forbidden - Admin/Gosat only" }, 403);
    }

    const { bestowalId, action } = await req.json();

    if (!bestowalId) {
      throw new Error("bestowalId is required");
    }

    // Get bestowal details
    const { data: bestowal, error: bestowError } = await supabaseClient
      .from("bestowals")
      .select(`
        id, 
        payment_status, 
        amount, 
        currency, 
        distribution_data,
        bestower_id,
        orchard_id,
        pockets_count,
        hold_reason,
        orchards(title, grower_id)
      `)
      .eq("id", bestowalId)
      .single();

    if (bestowError || !bestowal) {
      throw new Error(`Bestowal not found: ${bestowalId}`);
    }

    // Check if already distributed
    if (bestowal.payment_status === "distributed") {
      return jsonResponse({
        success: true,
        message: "Bestowal already distributed",
        bestowalId,
      });
    }

    // Must be completed before distribution
    if (bestowal.payment_status !== "completed") {
      throw new Error(
        `Bestowal must be 'completed' before distribution. Current: ${bestowal.payment_status}`,
      );
    }

    // Calculate distribution amounts
    const totalAmount = Number(bestowal.amount);
    const growerAmount = roundAmount(totalAmount * DISTRIBUTION.GROWER);
    const tithingAmount = roundAmount(totalAmount * DISTRIBUTION.TITHING);
    const adminAmount = roundAmount(totalAmount * DISTRIBUTION.ADMIN);

    // Build distribution record
    const distributionRecord: DistributionData = {
      total_amount: totalAmount,
      currency: bestowal.currency || 'USDC',
      grower_id: bestowal.orchards?.grower_id,
      grower_amount: growerAmount,
      tithing_amount: tithingAmount,
      admin_amount: adminAmount,
      holding_wallet: S2G_WALLETS.HOLDINGS,
      admin_wallet: S2G_WALLETS.ADMIN,
      mode: 'manual',
      hold_reason: null,
      distributed_at: new Date().toISOString(),
      distribution_triggered_by: userData.user.id,
    };

    // Log distribution action (actual fund transfer is manual from Holdings wallet)
    console.log('📤 Distribution triggered for bestowal:', bestowalId);
    console.log('💰 Distribution breakdown:');
    console.log(`   - Total: $${totalAmount} ${distributionRecord.currency}`);
    console.log(`   - Grower (85%): $${growerAmount} → ${bestowal.orchards?.grower_id || 'N/A'}`);
    console.log(`   - Tithing (10%): $${tithingAmount} → ${S2G_WALLETS.ADMIN}`);
    console.log(`   - Admin (5%): $${adminAmount} → ${S2G_WALLETS.ADMIN}`);
    console.log(`   - Funds held in: ${S2G_WALLETS.HOLDINGS}`);

    // Update bestowal status to distributed
    const { error: updateError } = await supabaseClient
      .from("bestowals")
      .update({
        payment_status: "distributed",
        distributed_at: new Date().toISOString(),
        distribution_data: distributionRecord,
        hold_reason: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", bestowalId);

    if (updateError) {
      console.error('Failed to update bestowal:', updateError);
      throw updateError;
    }

    // Create distribution audit log
    await supabaseClient.from('payment_audit_log').insert({
      user_id: userData.user.id,
      action: 'bestowal_distribution_triggered',
      amount: totalAmount,
      currency: distributionRecord.currency,
      status: 'distributed',
      ip_address: req.headers.get('x-forwarded-for') || 'unknown',
      metadata: {
        bestowal_id: bestowalId,
        distribution: distributionRecord,
        triggered_by: userData.user.id,
        note: 'Manual distribution from S2G Holdings wallet required',
      },
    });

    // Create payment transaction record for distribution
    await supabaseClient.from('payment_transactions').insert({
      user_id: bestowal.bestower_id,
      amount: totalAmount,
      currency: distributionRecord.currency,
      payment_method: 'distribution',
      payment_provider_id: `dist_${bestowalId}`,
      status: 'completed',
      metadata: {
        type: 'distribution',
        bestowal_id: bestowalId,
        grower_id: bestowal.orchards?.grower_id,
        distribution: distributionRecord,
        action: 'funds_ready_for_manual_transfer',
      },
    });

    // Notify grower about distribution
    if (bestowal.orchards?.grower_id) {
      await supabaseClient.from('activity_feed').insert({
        user_id: bestowal.orchards.grower_id,
        actor_id: userData.user.id,
        action_type: 'bestowal_distributed',
        mode_type: 'orchard',
        entity_type: 'bestowal',
        entity_id: bestowalId,
        content: `Your bestowal of $${totalAmount} has been processed. You'll receive $${growerAmount} (85%).`,
        metadata: {
          total_amount: totalAmount,
          grower_amount: growerAmount,
          currency: distributionRecord.currency,
          distribution_triggered_by: userData.user.id,
        },
      });
    }

    return jsonResponse({
      success: true,
      message: "Distribution recorded successfully. Manual transfer from Holdings wallet required.",
      bestowalId,
      distribution: {
        grower: {
          user_id: bestowal.orchards?.grower_id,
          amount: growerAmount,
          percentage: '85%',
        },
        tithing: {
          wallet: S2G_WALLETS.ADMIN,
          amount: tithingAmount,
          percentage: '10%',
        },
        admin: {
          wallet: S2G_WALLETS.ADMIN,
          amount: adminAmount,
          percentage: '5%',
        },
        source_wallet: S2G_WALLETS.HOLDINGS,
        note: "Admin must manually transfer funds from Holdings wallet to recipients",
      },
    });

  } catch (error) {
    console.error("Error distributing bestowal:", error);
    return jsonResponse(
      {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      },
      400,
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

function roundAmount(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}
