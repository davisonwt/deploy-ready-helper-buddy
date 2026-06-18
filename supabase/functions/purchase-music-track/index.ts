import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, data?: any) => {
  console.log(`[purchase-music-track] ${step}`, data ? JSON.stringify(data) : '');
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Starting music track purchase");
    
    // Create Supabase client for user authentication
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    // Create service role client for privileged operations
    const supabaseService = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Get the user from the Authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      logStep("Missing authorization header");
      return new Response(
        JSON.stringify({ error: "Authorization required" }),
        { 
          status: 401, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(
      authHeader.replace("Bearer ", "")
    );

    if (authError || !user) {
      logStep("Authentication failed", { authError });
      return new Response(
        JSON.stringify({ error: "Invalid authentication" }),
        { 
          status: 401, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    logStep("User authenticated", { userId: user.id });

    // Parse request body
    const { trackId, paymentReference } = await req.json();
    
    if (!trackId) {
      return new Response(
        JSON.stringify({ error: "Track ID is required" }),
        { 
          status: 400, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    logStep("Processing purchase", { trackId, userId: user.id });

    // Get track details
    const { data: track, error: trackError } = await supabaseService
      .from('dj_music_tracks')
      .select('*')
      .eq('id', trackId)
      .single();

    if (trackError || !track) {
      logStep("Track not found", { trackError });
      return new Response(
        JSON.stringify({ error: "Track not found" }),
        { 
          status: 404, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    // Calculate pricing
    const baseAmount = 1.25;
    const platformFee = baseAmount * 0.10; // 10%
    const sow2growFee = baseAmount * 0.005; // 0.5%
    const totalAmount = baseAmount + platformFee + sow2growFee;

    logStep("Calculated pricing", { baseAmount, platformFee, sow2growFee, totalAmount });

    // Create purchase record
    const { data: purchase, error: purchaseError } = await supabaseService
      .from('music_purchases')
      .insert({
        buyer_id: user.id,
        track_id: trackId,
        amount: baseAmount,
        platform_fee: platformFee,
        sow2grow_fee: sow2growFee,
        total_amount: totalAmount,
        payment_status: paymentReference ? 'completed' : 'pending',
        payment_reference: paymentReference
      })
      .select()
      .single();

    if (purchaseError) {
      logStep("Failed to create purchase record", { purchaseError });
      return new Response(
        JSON.stringify({ error: "Failed to create purchase record" }),
        { 
          status: 500, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    logStep("Purchase created", { purchaseId: purchase.id });

    // If payment is completed, deliver the track to direct chat
    if (paymentReference) {
      logStep("Payment completed, delivering track");
      
      // Create or get direct room with track owner
      const { data: directRoom, error: roomError } = await supabaseService
        .rpc('get_or_create_direct_room', {
          user1_id: user.id,
          user2_id: track.dj_id
        });

      if (roomError) {
        logStep("Failed to create direct room", { roomError });
        // Continue with purchase but log the error
      } else {
        // Generate a short-lived signed URL so the buyer (and only the buyer)
        // can download. After it expires the buyer re-fetches via the
        // get-purchased-track-url edge function from their purchases page.
        const extractPath = (fileUrl: string): string | null => {
          if (!fileUrl) return null;
          try {
            const u = new URL(fileUrl);
            const marker = "/storage/v1/object/";
            const idx = u.pathname.indexOf(marker);
            if (idx !== -1) {
              const after = u.pathname.substring(idx + marker.length);
              const parts = after.split("/").filter(Boolean);
              const bucketIdx = ["public", "sign", "authenticated"].includes(parts[0]) ? 1 : 0;
              if (parts[bucketIdx] === "music-tracks") {
                return decodeURIComponent(parts.slice(bucketIdx + 1).join("/"));
              }
            }
            return null;
          } catch {
            return fileUrl.replace(/^\/+/, "").replace(/^public\//, "");
          }
        };

        const path = extractPath(track.file_url);
        let signedUrl: string | null = null;
        if (path) {
          const { data: signed, error: signErr } = await supabaseService.storage
            .from("music-tracks")
            .createSignedUrl(path, 60 * 60 * 24 * 7); // 7 days
          if (signErr) {
            logStep("Failed to sign track url", { signErr, path });
          } else {
            signedUrl = signed?.signedUrl ?? null;
          }
        } else {
          logStep("Could not derive storage path from file_url", { file_url: track.file_url });
        }

        const { error: messageError } = await supabaseService
          .from('chat_messages')
          .insert({
            room_id: directRoom,
            sender_id: user.id, // System message from buyer
            content: `🎵 Music Purchase: ${track.track_title}\n\n⚠️ This file is for your personal use only and cannot be shared with others.\n\nThe download link below expires in 7 days. If it stops working, open My Purchases to get a fresh link.`,
            message_type: 'file',
            file_url: signedUrl ?? '',
            file_name: `${track.track_title}.mp3`,
            file_size: track.file_size,
            file_type: 'audio',
            system_metadata: {
              purchase_id: purchase.id,
              track_id: trackId,
              is_purchased_content: true,
              access_restricted: true,
              buyer_only: true,
              signed_url_expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
              resign_function: 'get-purchased-track-url'
            }
          });

        if (messageError) {
          logStep("Failed to send track to chat", { messageError });
        } else {
          // Update purchase as delivered
          await supabaseService
            .from('music_purchases')
            .update({ delivered_at: new Date().toISOString() })
            .eq('id', purchase.id);
          
          logStep("Track delivered to direct chat");
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        purchase: {
          id: purchase.id,
          track_title: track.track_title,
          artist_name: track.artist_name,
          total_amount: totalAmount,
          payment_status: purchase.payment_status
        }
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );

  } catch (error) {
    logStep("Unexpected error", { error: error.message });
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});