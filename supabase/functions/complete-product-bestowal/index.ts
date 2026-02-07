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
    const { productId, amount, sowerId } = body;

    if (!productId || !amount || !sowerId) {
      return createErrorResponse('Missing required fields', 400, req);
    }

    // Get product details including delivery type
    const { data: product, error: productError } = await supabase
      .from('products')
      .select('*, sowers:profiles!products_sower_id_fkey(*)')
      .eq('id', productId)
      .single();

    if (productError || !product) {
      return createErrorResponse('Product not found', 404, req);
    }

    // Determine if this is a digital product (immediate release) or physical (escrow)
    const deliveryType = product.delivery_type || 'digital';
    const isDigitalProduct = deliveryType === 'digital' || 
                             product.type === 'doc' || 
                             product.type === 'art' || 
                             product.type === 'music';

    // Calculate distribution
    const tithingAmount = amount * 0.10; // 10% tithing
    const adminFee = amount * 0.05; // 5% admin fee
    const sowerAmount = amount * 0.70; // 70% to sower
    const productWhispersAmount = amount * 0.15; // 15% to product whispers

    // Determine release status based on delivery type
    const releaseStatus = isDigitalProduct ? 'released' : 'held';
    const holdReason = isDigitalProduct ? null : 'awaiting_courier_pickup';

    console.log(`📦 Product Bestowal: ${product.title}`);
    console.log(`📦 Delivery Type: ${deliveryType} (isDigital: ${isDigitalProduct})`);
    console.log(`📦 Release Status: ${releaseStatus}`);

    // Create product bestowal record with appropriate release status
    const { data: bestowal, error: bestowalError } = await supabase
      .from('product_bestowals')
      .insert({
        bestower_id: user.id,
        product_id: productId,
        sower_id: sowerId,
        amount,
        s2g_fee: adminFee,
        sower_amount: sowerAmount,
        grower_amount: productWhispersAmount,
        status: 'completed',
        release_status: releaseStatus,
        hold_reason: holdReason,
        released_at: isDigitalProduct ? new Date().toISOString() : null,
        payment_method: 'direct',
        payment_reference: `product-bestowal-${Date.now()}-${Math.random().toString(36).substring(7)}`,
      })
      .select()
      .single();

    if (bestowalError) {
      console.error('Failed to create product bestowal:', bestowalError);
      return createErrorResponse('Failed to create bestowal record', 500, req);
    }

    // Update product bestowal count
    await supabase
      .from('products')
      .update({ 
        bestowal_count: (product.bestowal_count || 0) + 1 
      })
      .eq('id', productId);

    // Credit sower balance based on delivery type
    if (isDigitalProduct) {
      // DIGITAL: Immediate credit to available balance
      console.log(`✅ DIGITAL PRODUCT: Crediting sower ${sowerId} with $${sowerAmount.toFixed(2)} (IMMEDIATE)`);
      
      // Get or create sower balance record
      const { data: existingBalance } = await supabase
        .from('sower_balances')
        .select('*')
        .eq('user_id', sowerId)
        .single();

      if (!existingBalance) {
        await supabase.from('sower_balances').insert({
          user_id: sowerId,
          available_balance: sowerAmount,
          pending_balance: 0,
          total_earned: sowerAmount,
        });
      } else {
        await supabase
          .from('sower_balances')
          .update({
            available_balance: existingBalance.available_balance + sowerAmount,
            total_earned: existingBalance.total_earned + sowerAmount,
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', sowerId);
      }
    } else {
      // PHYSICAL: Add to pending balance until courier confirms pickup
      console.log(`🔒 PHYSICAL PRODUCT: Holding $${sowerAmount.toFixed(2)} for sower ${sowerId} (ESCROW)`);
      
      const { data: existingBalance } = await supabase
        .from('sower_balances')
        .select('*')
        .eq('user_id', sowerId)
        .single();

      if (!existingBalance) {
        await supabase.from('sower_balances').insert({
          user_id: sowerId,
          available_balance: 0,
          pending_balance: sowerAmount,
          total_earned: 0, // Not earned until released
        });
      } else {
        await supabase
          .from('sower_balances')
          .update({
            pending_balance: existingBalance.pending_balance + sowerAmount,
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', sowerId);
      }
    }

    const productTitle = product.title || 'Product';

    // Create payment transaction record for accounting
    await supabase
      .from('payment_transactions')
      .insert({
        bestowal_id: null, // Product bestowals don't use bestowals table
        payment_method: 'direct',
        payment_provider_id: bestowal.payment_reference,
        amount,
        currency: 'USDC',
        status: 'completed',
        provider_response: {
          type: 'product_bestowal',
          product_bestowal_id: bestowal.id,
          product_id: productId,
          sower_id: sowerId,
          product_title: productTitle,
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
    const productTitle = product.title || 'Product';

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
            '🧾 Product Bestowal Proof & Invoice',
            '',
            `Product: ${productTitle}`,
            `Amount: $${amount.toFixed(2)} USDC`,
            `Reference: ${bestowal.payment_reference}`,
            `Date: ${new Date().toLocaleString('en-US')}`,
            '',
            'Distribution:',
            `- Sower: $${sowerAmount.toFixed(2)} (70%)`,
            `- Product Whispers: $${productWhispersAmount.toFixed(2)} (15%)`,
            `- Tithing: $${tithingAmount.toFixed(2)} (10%)`,
            `- Admin Fee: $${adminFee.toFixed(2)} (5%)`,
          ].join('\n');

          await supabase.rpc('insert_system_chat_message', {
            p_room_id: roomIdValue1,
            p_content: invoiceMessage,
            p_message_type: 'text',
            p_system_metadata: {
              type: 'product_bestowal_invoice',
              bestowal_id: bestowal.id,
              product_id: productId,
              user_id: user.id,
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
          `I am deeply grateful for your generous bestowal of $${amount.toFixed(2)} USDC for "${productTitle}".`,
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
            type: 'product_sower_thank_you',
            bestowal_id: bestowal.id,
            product_id: productId,
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
            '🎉 New Product Bestowal Received!',
            '',
            `Great news! Your product "${productTitle}" has received a new bestowal.`,
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
              type: 'product_sower_bestowal_notification',
              bestowal_id: bestowal.id,
              product_id: productId,
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
      action_param: 'product_bestowal_completed',
      payment_method_param: 'direct',
      amount_param: amount,
      currency_param: 'USDC',
      transaction_id_param: bestowal.payment_reference,
      metadata_param: {
        product_id: productId,
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

    // Award XP to bestower (100 XP per bestowal)
    await supabase.rpc('add_xp', {
      user_id_param: user.id,
      amount: 100
    }).catch((err) => {
      console.error('Failed to award XP:', err);
      // Don't fail the bestowal if XP award fails
    });

    return createSuccessResponse({
      success: true,
      bestowalId: bestowal.id,
      message: 'Product bestowal completed and messages sent'
    }, req);

  } catch (error) {
    console.error('Error completing product bestowal:', error);
    return createErrorResponse(
      error instanceof Error ? error.message : 'Failed to complete product bestowal',
      500,
      req
    );
  }
});

