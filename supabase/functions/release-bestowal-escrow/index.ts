import { serve } from 'https://deno.land/std@0.190.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { getSecureCorsHeaders, createErrorResponse, createSuccessResponse } from '../_shared/security.ts';

/**
 * RELEASE BESTOWAL ESCROW
 * 
 * This function is called when a courier confirms pickup for physical products/orchards.
 * It moves funds from pending_balance to available_balance for sowers and whisperers.
 * 
 * ESCROW RULES:
 * - Digital products (doc, art, music): Immediately released on purchase
 * - Physical products & orchards: Held until courier confirms pickup
 */

serve(async (req) => {
  const corsHeaders = getSecureCorsHeaders(req);
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

    if (!supabaseUrl || !serviceRoleKey) {
      return createErrorResponse('Server configuration error', 500, req);
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    });

    // Get authenticated user - must be gosat or courier
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return createErrorResponse('Unauthorized', 401, req);
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      return createErrorResponse('Authentication failed', 401, req);
    }

    // Check if user is authorized (gosat, courier, or admin)
    const { data: userRoles } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .in('role', ['gosat', 'courier', 'admin']);

    if (!userRoles || userRoles.length === 0) {
      return createErrorResponse('Unauthorized - only gosat, courier, or admin can release escrow', 403, req);
    }

    const body = await req.json();
    const { bestowalId, bestowalType, courierId, pickupConfirmation } = body;

    if (!bestowalId || !bestowalType) {
      return createErrorResponse('Missing required fields: bestowalId and bestowalType', 400, req);
    }

    if (!['orchard', 'product'].includes(bestowalType)) {
      return createErrorResponse('Invalid bestowalType - must be orchard or product', 400, req);
    }

    console.log(`🔓 Releasing escrow for ${bestowalType} bestowal: ${bestowalId}`);

    if (bestowalType === 'orchard') {
      // Release orchard bestowal
      const { data: bestowal, error: fetchError } = await supabase
        .from('bestowals')
        .select('*, orchards(grower_id, title)')
        .eq('id', bestowalId)
        .single();

      if (fetchError || !bestowal) {
        return createErrorResponse('Bestowal not found', 404, req);
      }

      if (bestowal.release_status === 'released') {
        return createSuccessResponse({ message: 'Already released', bestowalId }, req);
      }

      const growerId = bestowal.orchards?.grower_id;
      if (!growerId) {
        return createErrorResponse('Grower not found for this orchard', 400, req);
      }

      // Calculate amounts
      const sowerAmount = bestowal.amount * 0.85; // 85% to grower

      // Move from pending to available
      const { data: balance } = await supabase
        .from('sower_balances')
        .select('*')
        .eq('user_id', growerId)
        .single();

      if (balance) {
        await supabase
          .from('sower_balances')
          .update({
            pending_balance: Math.max(0, balance.pending_balance - sowerAmount),
            available_balance: balance.available_balance + sowerAmount,
            total_earned: balance.total_earned + sowerAmount,
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', growerId);

        console.log(`✅ Released $${sowerAmount.toFixed(2)} to grower ${growerId}`);
      }

      // Update bestowal status
      await supabase
        .from('bestowals')
        .update({
          release_status: 'released',
          released_at: new Date().toISOString(),
          hold_reason: null,
        })
        .eq('id', bestowalId);

      // Also update whisperer earnings if any
      await supabase
        .from('whisperer_earnings')
        .update({
          status: 'processed',
          processed_at: new Date().toISOString(),
        })
        .eq('bestowal_id', bestowalId)
        .eq('status', 'pending');

      // Update courier delivery record
      if (courierId && pickupConfirmation) {
        await supabase
          .from('courier_deliveries')
          .update({
            pickup_confirmed: true,
            pickup_confirmed_at: new Date().toISOString(),
            pickup_notes: pickupConfirmation.notes || 'Pickup confirmed',
            pickup_photo_url: pickupConfirmation.photoUrl || null,
          })
          .eq('bestowal_id', bestowalId);
      }

      // Notify sower
      const { data: gosatUser } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'gosat')
        .limit(1)
        .single();

      if (gosatUser?.user_id) {
        const { data: roomId } = await supabase.rpc('get_or_create_direct_room', {
          user1_id: gosatUser.user_id,
          user2_id: growerId,
        });

        if (roomId) {
          const message = [
            '🎉 Funds Released!',
            '',
            `Great news! Your bestowal for "${bestowal.orchards?.title}" has been released.`,
            `Amount: $${sowerAmount.toFixed(2)} USDC`,
            '',
            'The courier has confirmed pickup and your funds are now available for withdrawal.',
            '',
            'Blessings,',
            's2g gosat'
          ].join('\n');

          await supabase.rpc('insert_system_chat_message', {
            p_room_id: roomId,
            p_content: message,
            p_message_type: 'text',
            p_system_metadata: {
              type: 'escrow_released',
              bestowal_id: bestowalId,
              amount: sowerAmount,
              is_system: true,
              sender_name: 's2g gosat'
            }
          });
        }
      }

    } else {
      // Release product bestowal
      const { data: bestowal, error: fetchError } = await supabase
        .from('product_bestowals')
        .select('*, products(title)')
        .eq('id', bestowalId)
        .single();

      if (fetchError || !bestowal) {
        return createErrorResponse('Product bestowal not found', 404, req);
      }

      if (bestowal.release_status === 'released') {
        return createSuccessResponse({ message: 'Already released', bestowalId }, req);
      }

      const sowerId = bestowal.sower_id;
      const sowerAmount = bestowal.sower_amount;

      // Move from pending to available
      const { data: balance } = await supabase
        .from('sower_balances')
        .select('*')
        .eq('user_id', sowerId)
        .single();

      if (balance) {
        await supabase
          .from('sower_balances')
          .update({
            pending_balance: Math.max(0, balance.pending_balance - sowerAmount),
            available_balance: balance.available_balance + sowerAmount,
            total_earned: balance.total_earned + sowerAmount,
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', sowerId);

        console.log(`✅ Released $${sowerAmount.toFixed(2)} to sower ${sowerId}`);
      }

      // Update product bestowal status
      await supabase
        .from('product_bestowals')
        .update({
          release_status: 'released',
          released_at: new Date().toISOString(),
          hold_reason: null,
          delivery_confirmed_at: new Date().toISOString(),
        })
        .eq('id', bestowalId);

      // Update whisperer earnings
      await supabase
        .from('whisperer_earnings')
        .update({
          status: 'processed',
          processed_at: new Date().toISOString(),
        })
        .eq('bestowal_id', bestowal.payment_reference)
        .eq('status', 'pending');
    }

    // Log the release
    await supabase.from('payment_audit_log').insert({
      user_id: user.id,
      action: 'escrow_released',
      amount: 0,
      currency: 'USDC',
      status: 'completed',
      metadata: {
        bestowal_id: bestowalId,
        bestowal_type: bestowalType,
        released_by: user.id,
        courier_id: courierId || null,
      },
    });

    return createSuccessResponse({
      success: true,
      message: `Escrow released for ${bestowalType} bestowal`,
      bestowalId,
    }, req);

  } catch (error) {
    console.error('Error releasing escrow:', error);
    return createErrorResponse(
      error instanceof Error ? error.message : 'Failed to release escrow',
      500,
      req
    );
  }
});
