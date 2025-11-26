import { serve } from 'https://deno.land/std@0.190.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { getSecureCorsHeaders, createErrorResponse, createSuccessResponse } from '../_shared/security.ts';

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

    // Get authenticated user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return createErrorResponse('Unauthorized', 401, req);
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      return createErrorResponse('Authentication failed', 401, req);
    }

    const body = await req.json();
    const { libraryItemId, amount, sowerId } = body;

    if (!libraryItemId || !amount || !sowerId) {
      return createErrorResponse('Missing required fields', 400, req);
    }

    // Get library item details
    const { data: libraryItem, error: libraryError } = await supabase
      .from('s2g_library_items')
      .select('*')
      .eq('id', libraryItemId)
      .single();

    if (libraryError || !libraryItem) {
      return createErrorResponse('Library item not found', 404, req);
    }

    // Calculate distribution
    const tithingAmount = amount * 0.10; // 10% tithing
    const adminFee = amount * 0.05; // 5% admin fee
    const sowerAmount = amount * 0.70; // 70% to sower
    const productWhispersAmount = amount * 0.15; // 15% to product whispers

    // Create library bestowal record
    const { data: bestowal, error: bestowalError } = await supabase
      .from('s2g_library_bestowals')
      .insert({
        library_item_id: libraryItemId,
        bestower_id: user.id,
        sower_id: sowerId,
        amount,
        currency: 'USDC',
        payment_status: 'completed',
        payment_method: 'binance_pay',
        payment_reference: `library-bestowal-${Date.now()}-${Math.random().toString(36).substring(7)}`,
        distribution_mode: 'auto',
      })
      .select()
      .single();

    if (bestowalError) {
      console.error('Failed to create library bestowal:', bestowalError);
      return createErrorResponse('Failed to create bestowal record', 500, req);
    }

    // Grant access to the bestower
    await supabase
      .from('s2g_library_item_access')
      .insert({
        library_item_id: libraryItemId,
        user_id: user.id,
        bestowal_id: bestowal.id,
      })
      .onConflict('library_item_id,user_id')
      .merge();

    // Update library item bestowal count
    await supabase
      .from('s2g_library_items')
      .update({ 
        bestowal_count: (libraryItem.bestowal_count || 0) + 1 
      })
      .eq('id', libraryItemId);

    // Create payment transaction record for accounting
    await supabase
      .from('payment_transactions')
      .insert({
        bestowal_id: null,
        payment_method: 'binance_pay',
        payment_provider_id: bestowal.payment_reference,
        amount,
        currency: 'USDC',
        status: 'completed',
        provider_response: {
          type: 'library_bestowal',
          library_bestowal_id: bestowal.id,
          library_item_id: libraryItemId,
          sower_id: sowerId,
          library_item_title: libraryItem.title,
          distribution: {
            sower: sowerAmount,
            whispers: productWhispersAmount,
            tithing: tithingAmount,
            admin: adminFee
          }
        },
      });

    // Get gosat user
    const { data: gosatUser } = await supabase
      .from('user_roles')
      .select('user_id')
      .eq('role', 'gosat')
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle();

    // Get sower and bestower profiles
    const { data: sowerProfile } = await supabase
      .from('profiles')
      .select('first_name, display_name')
      .eq('user_id', sowerId)
      .single();

    const { data: bestowerProfile } = await supabase
      .from('profiles')
      .select('first_name, display_name')
      .eq('user_id', user.id)
      .single();

    const sowerName = sowerProfile?.display_name || sowerProfile?.first_name || 'Sower';
    const bestowerName = bestowerProfile?.display_name || bestowerProfile?.first_name || 'Friend';
    const libraryItemTitle = libraryItem.title || 'Library Item';

    // 1. Send Gosat → Bestower (Invoice/Proof)
    if (gosatUser?.user_id) {
      const { data: roomId1 } = await supabase.rpc('get_or_create_direct_room', {
        user1_id: gosatUser.user_id,
        user2_id: user.id,
      });

      if (roomId1) {
        const roomIdValue1 = typeof roomId1 === 'string' ? roomId1 : Array.isArray(roomId1) ? roomId1[0] : roomId1;
        
        if (roomIdValue1) {
          const invoiceMessage = [
            '🧾 Library Item Bestowal Proof & Invoice',
            '',
            `Item: ${libraryItemTitle}`,
            `Amount: $${amount.toFixed(2)} USDC`,
            `Reference: ${bestowal.payment_reference}`,
            `Date: ${new Date().toLocaleString('en-US')}`,
            '',
            'Distribution:',
            `- Sower: $${sowerAmount.toFixed(2)} (70%)`,
            `- Product Whispers: $${productWhispersAmount.toFixed(2)} (15%)`,
            `- Tithing: $${tithingAmount.toFixed(2)} (10%)`,
            `- Admin Fee: $${adminFee.toFixed(2)} (5%)`,
            '',
            '✅ Access granted! Download link sent below.',
          ].join('\n');

          await supabase.rpc('insert_system_chat_message', {
            p_room_id: roomIdValue1,
            p_content: invoiceMessage,
            p_message_type: 'text',
            p_system_metadata: {
              type: 'library_bestowal_invoice',
              bestowal_id: bestowal.id,
              library_item_id: libraryItemId,
              user_id: user.id,
              is_system: true,
              sender_name: 's2g gosat'
            }
          });

          // Send file download link
          const downloadMessage = `📥 Download: ${libraryItemTitle}\n\n${libraryItem.file_url}`;
          await supabase.rpc('insert_system_chat_message', {
            p_room_id: roomIdValue1,
            p_content: downloadMessage,
            p_message_type: 'text',
            p_system_metadata: {
              type: 'library_download_link',
              library_item_id: libraryItemId,
              bestowal_id: bestowal.id,
              is_system: true,
              sender_name: 's2g gosat'
            }
          });

          await supabase
            .from('chat_rooms')
            .update({ updated_at: new Date().toISOString() })
            .eq('id', roomIdValue1);
        }
      }
    }

    // 2. Send Sower → Bestower (Thank You)
    const { data: roomId2 } = await supabase.rpc('get_or_create_direct_room', {
      user1_id: sowerId,
      user2_id: user.id,
    });

    if (roomId2) {
      const roomIdValue2 = typeof roomId2 === 'string' ? roomId2 : Array.isArray(roomId2) ? roomId2[0] : roomId2;
      
      if (roomIdValue2) {
        const thankYouMessage = [
          `🙏 Thank You, ${bestowerName}!`,
          '',
          `I am deeply grateful for your generous bestowal of $${amount.toFixed(2)} USDC for "${libraryItemTitle}".`,
          '',
          `Your support means the world to me and helps bring this vision to life. Every contribution, no matter the size, makes a difference.`,
          '',
          `Blessings and gratitude,`,
          `${sowerName}`
        ].join('\n');

        await supabase.rpc('insert_system_chat_message', {
          p_room_id: roomIdValue2,
          p_content: thankYouMessage,
          p_message_type: 'text',
          p_system_metadata: {
            type: 'library_sower_thank_you',
            bestowal_id: bestowal.id,
            library_item_id: libraryItemId,
            user_id: user.id,
            sower_id: sowerId,
            is_system: true,
            sender_name: sowerName
          }
        });

        await supabase
          .from('chat_rooms')
          .update({ updated_at: new Date().toISOString() })
          .eq('id', roomIdValue2);
      }
    }

    // 3. Send Gosat → Sower (Bestowal Notification)
    if (gosatUser?.user_id) {
      const { data: roomId3 } = await supabase.rpc('get_or_create_direct_room', {
        user1_id: gosatUser.user_id,
        user2_id: sowerId,
      });

      if (roomId3) {
        const roomIdValue3 = typeof roomId3 === 'string' ? roomId3 : Array.isArray(roomId3) ? roomId3[0] : roomId3;
        
        if (roomIdValue3) {
          const notificationMessage = [
            '🎉 New Library Item Bestowal Received!',
            '',
            `Great news! Your library item "${libraryItemTitle}" has received a new bestowal.`,
            '',
            `Bestower: ${bestowerName}`,
            `Amount: $${amount.toFixed(2)} USDC`,
            `Payment Reference: ${bestowal.payment_reference}`,
            '',
            `Distribution:`,
            `- Your Share: $${sowerAmount.toFixed(2)} (70%)`,
            `- Product Whispers: $${productWhispersAmount.toFixed(2)} (15%)`,
            `- Tithing: $${tithingAmount.toFixed(2)} (10%)`,
            `- Admin Fee: $${adminFee.toFixed(2)} (5%)`,
            '',
            `Proof of payment attached. The bestower has been granted access and received the download link.`,
            '',
            `This brings you closer to your goals! Keep creating and engaging with your community.`,
            '',
            `Blessings,`,
            `s2g gosat`
          ].join('\n');

          await supabase.rpc('insert_system_chat_message', {
            p_room_id: roomIdValue3,
            p_content: notificationMessage,
            p_message_type: 'text',
            p_system_metadata: {
              type: 'library_sower_bestowal_notification',
              bestowal_id: bestowal.id,
              library_item_id: libraryItemId,
              user_id: sowerId,
              is_system: true,
              sender_name: 's2g gosat'
            }
          });

          await supabase
            .from('chat_rooms')
            .update({ updated_at: new Date().toISOString() })
            .eq('id', roomIdValue3);
        }
      }
    }

    // Log to payment audit
    await supabase.rpc('log_payment_audit', {
      user_id_param: user.id,
      action_param: 'library_bestowal_completed',
      payment_method_param: 'binance_pay',
      amount_param: amount,
      currency_param: 'USDC',
      transaction_id_param: bestowal.payment_reference,
      metadata_param: {
        library_item_id: libraryItemId,
        sower_id: sowerId,
        bestowal_id: bestowal.id,
        distribution: {
          sower: sowerAmount,
          whispers: productWhispersAmount,
          tithing: tithingAmount,
          admin: adminFee
        }
      }
    });

    return createSuccessResponse({
      success: true,
      bestowalId: bestowal.id,
      message: 'Library bestowal completed, access granted, and messages sent'
    }, req);

  } catch (error) {
    console.error('Error completing library bestowal:', error);
    return createErrorResponse(
      error instanceof Error ? error.message : 'Failed to complete library bestowal',
      500,
      req
    );
  }
});

