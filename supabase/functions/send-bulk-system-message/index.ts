import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getSecureCorsHeaders } from "../_shared/security.ts";

serve(async (req) => {
  const corsHeaders = getSecureCorsHeaders(req);

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    });

    // Verify caller is a gosat user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: corsHeaders,
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Authentication failed' }), {
        status: 401, headers: corsHeaders,
      });
    }

    // Verify gosat role
    const { data: roleCheck } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'gosat')
      .maybeSingle();

    if (!roleCheck) {
      return new Response(JSON.stringify({ error: 'Forbidden: GoSat role required' }), {
        status: 403, headers: corsHeaders,
      });
    }

    const body = await req.json();
    const { targetRole, message, dryRun } = body;

    // targetRole: 'all' | 'sower' | 'grower' | 'whisperer' | 'driver'
    // message: custom message text (optional, uses default if not provided)
    // dryRun: if true, just returns count without sending

    // Get the GoSat system user (sender)
    const { data: gosatUser } = await supabase
      .from('user_roles')
      .select('user_id')
      .eq('role', 'gosat')
      .order('created_at', { ascending: true })
      .limit(1)
      .single();

    if (!gosatUser) {
      return new Response(JSON.stringify({ error: 'GoSat system user not found' }), {
        status: 500, headers: corsHeaders,
      });
    }

    const gosatUserId = gosatUser.user_id;

    // Build the list of target users
    let targetUserIds: string[] = [];

    if (targetRole === 'all') {
      // Get all users with profiles
      const { data: allProfiles } = await supabase
        .from('profiles')
        .select('user_id')
        .neq('user_id', gosatUserId);

      targetUserIds = (allProfiles || []).map((p: any) => p.user_id);
    } else {
      // Get users with specific role
      const { data: roleUsers } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', targetRole)
        .neq('user_id', gosatUserId);

      targetUserIds = (roleUsers || []).map((r: any) => r.user_id);
    }

    // Deduplicate
    targetUserIds = [...new Set(targetUserIds)];

    console.log(`📢 Bulk message target: ${targetRole} | ${targetUserIds.length} users`);

    if (dryRun) {
      return new Response(JSON.stringify({
        success: true,
        dryRun: true,
        targetCount: targetUserIds.length,
        targetRole,
      }), { headers: corsHeaders });
    }

    // Default wallet reminder message
    const defaultMessage = [
      `📢 Important: Set Up Your Payout Wallet`,
      ``,
      `Shalom! 🌱`,
      ``,
      `To receive payouts for your earnings on Sow2Grow, you need to add a crypto wallet address to your profile.`,
      ``,
      `📋 What you need to do:`,
      `1. Go to your Dashboard → Settings → Wallet`,
      `2. Add your Solana wallet address (for USDC/USDT payouts)`,
      `3. If you don't have one yet, download Phantom Wallet (phantom.app) — it's free and takes 2 minutes`,
      ``,
      `💡 Why is this important?`,
      `Without a wallet address, we cannot process payouts for your bestowal earnings, whisperer commissions, or delivery payments.`,
      ``,
      `📌 Minimum withdrawal: $10 USD`,
      `📌 Payout fee: 0.5%`,
      `📌 All payouts are in USDC on Solana (fast & low fees)`,
      ``,
      `If you need help setting up your wallet, reply to this message and we'll guide you through it!`,
      ``,
      `Blessings,`,
      `s2g gosat 🌳`,
    ].join('\n');

    const messageText = message || defaultMessage;

    // Send messages in batches to avoid overwhelming the system
    let sentCount = 0;
    let failedCount = 0;
    const batchSize = 10;

    for (let i = 0; i < targetUserIds.length; i += batchSize) {
      const batch = targetUserIds.slice(i, i + batchSize);

      const promises = batch.map(async (targetUserId) => {
        try {
          // Create or get direct room
          const { data: roomData } = await supabase.rpc('get_or_create_direct_room', {
            user1_id: gosatUserId,
            user2_id: targetUserId,
          });

          if (!roomData) {
            console.warn(`⚠️ Could not create room for user ${targetUserId}`);
            failedCount++;
            return;
          }

          const roomId = typeof roomData === 'string' ? roomData : Array.isArray(roomData) ? roomData[0] : roomData;

          if (!roomId) {
            failedCount++;
            return;
          }

          // Send system message
          await supabase.rpc('insert_system_chat_message', {
            p_room_id: roomId,
            p_content: messageText,
            p_message_type: 'text',
            p_system_metadata: {
              type: 'bulk_system_announcement',
              target_role: targetRole,
              is_system: true,
              sender_name: 's2g gosat',
            },
          });

          // Update room timestamp so it appears at top
          await supabase
            .from('chat_rooms')
            .update({ updated_at: new Date().toISOString() })
            .eq('id', roomId);

          sentCount++;
        } catch (err: any) {
          console.error(`❌ Failed to send to user ${targetUserId}:`, err.message);
          failedCount++;
        }
      });

      await Promise.all(promises);

      // Small delay between batches to avoid rate limiting
      if (i + batchSize < targetUserIds.length) {
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    }

    console.log(`📢 Bulk message complete: ${sentCount} sent, ${failedCount} failed`);

    return new Response(JSON.stringify({
      success: true,
      sentCount,
      failedCount,
      totalTargeted: targetUserIds.length,
      targetRole,
    }), { headers: corsHeaders });

  } catch (error: any) {
    console.error('❌ Bulk message error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500, headers: corsHeaders,
    });
  }
});
