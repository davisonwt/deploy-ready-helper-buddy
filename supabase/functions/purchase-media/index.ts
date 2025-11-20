import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

import { getSecureCorsHeaders } from '../_shared/security.ts';

serve(async (req) => {
  const corsHeaders = getSecureCorsHeaders(req);
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Authenticate user
    const authHeader = req.headers.get('Authorization')!;
    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    const { mediaId, paymentMethod } = await req.json();

    // Fetch media details
    const { data: media, error: mediaError } = await supabase
      .from('live_session_media')
      .select('*')
      .eq('id', mediaId)
      .single();

    if (mediaError || !media) {
      throw new Error('Media not found');
    }

    if (media.price_cents === 0) {
      throw new Error('This media is free');
    }

    if (media.uploader_id === user.id) {
      throw new Error('Cannot purchase your own media');
    }

    // Check if already purchased
    const { data: existingPurchase } = await supabase
      .from('live_session_media_purchases')
      .select('id')
      .eq('media_id', mediaId)
      .eq('buyer_id', user.id)
      .single();

    if (existingPurchase) {
      throw new Error('You already own this media');
    }

    // Calculate revenue split
    const totalCents = media.price_cents;
    const uploaderShare = Math.round(totalCents * 0.8);
    const hostShare = Math.round(totalCents * 0.1);
    const platformShare = totalCents - uploaderShare - hostShare;

    console.log('Revenue split:', { totalCents, uploaderShare, hostShare, platformShare });

    // Create purchase record
    const { data: purchase, error: purchaseError } = await supabase
      .from('live_session_media_purchases')
      .insert({
        media_id: mediaId,
        buyer_id: user.id,
        seller_id: media.uploader_id,
        price_paid_cents: totalCents,
        payment_method: paymentMethod,
        payment_reference: `${paymentMethod}-${Date.now()}`,
        delivered_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (purchaseError) throw purchaseError;

    // Get s2g gosat user
    const { data: gosatUser } = await supabase
      .from('user_roles')
      .select('user_id')
      .eq('role', 'gosat')
      .limit(1)
      .single();

    if (!gosatUser) {
      throw new Error('S2G Gosat not found for delivery');
    }

    // Get or create direct chat room between buyer and gosat
    const { data: roomId, error: roomError } = await supabase.rpc('get_or_create_direct_room', {
      user1_id: user.id,
      user2_id: gosatUser.user_id,
    });

    if (roomError || !roomId) {
      console.error('Room creation error:', roomError);
      throw new Error('Failed to create chat room');
    }

    // Get signed URL for the media file
    const bucket = media.media_type === 'doc' 
      ? 'live-session-docs' 
      : media.media_type === 'music' 
      ? 'live-session-music' 
      : 'live-session-art';

    const { data: signedUrl } = await supabase.storage
      .from(bucket)
      .createSignedUrl(media.file_path, 2592000); // 30 days

    // Send delivery message to chat room using secure system message function
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    await supabase.rpc('insert_system_chat_message', {
      p_room_id: roomId,
      p_content: `📦 Purchase Complete: ${media.file_name}`,
      p_message_type: 'purchase_delivery',
      p_system_metadata: {
        type: 'purchase_delivery',
        file_url: signedUrl?.signedUrl,
        file_name: media.file_name,
        file_size: media.file_size,
        price_paid: totalCents / 100,
        media_type: media.media_type,
        purchase_id: purchase.id,
        user_id: user.id,
        expires_at: expiresAt,
        is_system: true
      }
    });

    console.log('Purchase completed successfully');

    return new Response(
      JSON.stringify({
        success: true,
        purchaseId: purchase.id,
        chatRoomId: roomId,
        message: 'Purchase successful! File delivered to your chat.',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error: any) {
    console.error('Purchase error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Purchase failed',
      }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
