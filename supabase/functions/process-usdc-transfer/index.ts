import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
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
      throw new Error("No authorization header");
    }

    const token = authHeader.replace("Bearer ", "");
    const { data, error: authError } = await supabaseClient.auth.getUser(token);
    
    if (authError || !data.user) {
      throw new Error("Invalid token or user not found");
    }

    const user = data.user;

    // Define validation schema
    const transferSchema = z.object({
      signature: z.string().min(64).max(150),
      amount: z.number().positive().max(1000000),
      orchardId: z.string().uuid(),
      pocketsCount: z.number().int().positive().max(10000),
      pocketNumbers: z.array(z.number().int().positive()).optional(),
      fromWallet: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
      toWallet: z.string().regex(/^0x[a-fA-F0-9]{40}$/)
    });

    // Parse and validate the request body
    const rawBody = await req.json();
    const validationResult = transferSchema.safeParse(rawBody);
    
    if (!validationResult.success) {
      console.error("Input validation failed:", validationResult.error);
      throw new Error(`Invalid input: ${validationResult.error.errors.map(e => e.message).join(", ")}`);
    }
    
    const { 
      signature, 
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

    // Validate required fields
    if (!signature || !amount || !orchardId || !fromWallet || !toWallet) {
      throw new Error("Missing required fields");
    }

    // Check if transaction already exists
    const { data: existingTx } = await supabaseService
      .from('usdc_transactions')
      .select('id')
      .eq('signature', signature)
      .single();

    if (existingTx) {
      throw new Error("Transaction already processed");
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

    return new Response(
      JSON.stringify({
        success: true,
        bestowal: bestowalData,
        transaction: txData,
        message: "USDC transfer processed successfully"
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );

  } catch (error) {
    console.error("Error processing USDC transfer:", error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || "Internal server error"
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});