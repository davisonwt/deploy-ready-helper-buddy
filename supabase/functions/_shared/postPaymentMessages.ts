/**
 * Post-Payment Chat Notification System
 * Sends 3 ChatApp messages after any confirmed payment:
 * 1. GoSat → Bestower (congratulations + receipt/download)
 * 2. GoSat → Sower (payment received notification)
 * 3. GoSat HQ Chat (internal audit log)
 * 
 * All messages use insert_system_chat_message RPC for security + audit trail.
 */

interface PaymentDetails {
  bestowalId: string;
  bestowerId: string;
  sowerId: string;
  amount: number;
  currency: string;
  paymentMethod: 'paypal' | 'nowpayments' | 'crypto' | 'direct';
  paymentReference: string;
  // Content details
  contentType: 'orchard' | 'product' | 'music' | 'tithe' | 'freewill';
  contentTitle: string;
  // Optional music-specific
  trackFileUrl?: string;
  trackTitle?: string;
  artistName?: string;
  // Distribution breakdown
  sowerEarnings: number;
  tithingAmount: number;
  adminFee: number;
  whispererAmount?: number;
}

/**
 * Get the GoSat system user ID (first user with gosat role)
 */
async function getGosatUserId(supabase: any): Promise<string | null> {
  const { data } = await supabase
    .from('user_roles')
    .select('user_id')
    .eq('role', 'gosat')
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();
  return data?.user_id || null;
}

/**
 * Get user display name from profile
 */
async function getUserDisplayName(supabase: any, userId: string): Promise<string> {
  const { data } = await supabase
    .from('profiles')
    .select('first_name, display_name')
    .eq('user_id', userId)
    .single();
  return data?.display_name || data?.first_name || 'Friend';
}

/**
 * Create or get a direct chat room between two users
 */
async function getDirectRoom(supabase: any, user1Id: string, user2Id: string): Promise<string | null> {
  const { data } = await supabase.rpc('get_or_create_direct_room', {
    user1_id: user1Id,
    user2_id: user2Id,
  });
  if (!data) return null;
  return typeof data === 'string' ? data : Array.isArray(data) ? data[0] : data;
}

/**
 * Get the GoSat HQ chat room
 */
async function getGosatHQRoom(supabase: any): Promise<string | null> {
  const { data } = await supabase.rpc('get_or_create_gosat_room');
  if (!data) return null;
  return typeof data === 'string' ? data : Array.isArray(data) ? data[0] : data;
}

/**
 * Send a system chat message and update room timestamp
 */
async function sendSystemMessage(
  supabase: any,
  roomId: string,
  content: string,
  metadata: Record<string, any>
): Promise<void> {
  await supabase.rpc('insert_system_chat_message', {
    p_room_id: roomId,
    p_content: content,
    p_message_type: 'text',
    p_system_metadata: {
      ...metadata,
      is_system: true,
      sender_name: 's2g gosat',
    },
  });

  await supabase
    .from('chat_rooms')
    .update({ updated_at: new Date().toISOString() })
    .eq('id', roomId);
}

/**
 * Generate a signed download URL for music tracks
 */
async function getSignedDownloadUrl(supabase: any, fileUrl: string): Promise<string | null> {
  try {
    // Extract bucket and path from the file URL
    // Typical format: https://xxx.supabase.co/storage/v1/object/public/music-tracks/path/file.mp3
    const urlParts = fileUrl.split('/storage/v1/object/');
    if (urlParts.length < 2) return fileUrl;

    const pathPart = urlParts[1].replace(/^(public|sign)\//, '');
    const slashIndex = pathPart.indexOf('/');
    if (slashIndex === -1) return fileUrl;

    const bucket = pathPart.substring(0, slashIndex);
    const filePath = pathPart.substring(slashIndex + 1);

    // Create a signed URL valid for 7 days
    const { data } = await supabase.storage
      .from(bucket)
      .createSignedUrl(filePath, 60 * 60 * 24 * 7); // 7 days

    return data?.signedUrl || fileUrl;
  } catch (error) {
    console.error('Failed to create signed URL:', error);
    return fileUrl;
  }
}

/**
 * Format payment method for display
 */
function formatPaymentMethod(method: string): string {
  switch (method) {
    case 'paypal': return 'PayPal';
    case 'nowpayments': return 'Crypto (NOWPayments)';
    case 'crypto': return 'Crypto';
    case 'direct': return 'Direct Payment';
    default: return method;
  }
}

/**
 * Send all 3 post-payment chat messages
 */
export async function sendPostPaymentMessages(
  supabase: any,
  details: PaymentDetails
): Promise<{ success: boolean; errors: string[] }> {
  const errors: string[] = [];
  const gosatUserId = await getGosatUserId(supabase);
  
  if (!gosatUserId) {
    errors.push('GoSat user not found - cannot send system messages');
    return { success: false, errors };
  }

  const bestowerName = await getUserDisplayName(supabase, details.bestowerId);
  const sowerName = await getUserDisplayName(supabase, details.sowerId);
  const paymentMethodDisplay = formatPaymentMethod(details.paymentMethod);
  const dateStr = new Date().toLocaleString('en-US', { 
    dateStyle: 'medium', 
    timeStyle: 'short' 
  });

  // ═══════════════════════════════════════════════════════
  // MESSAGE 1: GoSat → Bestower (Congratulations + Receipt)
  // ═══════════════════════════════════════════════════════
  try {
    const roomId = await getDirectRoom(supabase, gosatUserId, details.bestowerId);
    if (roomId) {
      let bestowerMessage: string;

      if (details.contentType === 'music' && details.trackFileUrl) {
        // Music purchase: include secure download link
        const downloadUrl = await getSignedDownloadUrl(supabase, details.trackFileUrl);
        bestowerMessage = [
          `🎉 Congratulations, ${bestowerName}!`,
          '',
          `Your bestowal for "${details.trackTitle || details.contentTitle}" by ${details.artistName || sowerName} has been received!`,
          '',
          `💰 Amount: $${details.amount.toFixed(2)} ${details.currency}`,
          `💳 Payment: ${paymentMethodDisplay}`,
          `📅 Date: ${dateStr}`,
          `🧾 Reference: ${details.paymentReference}`,
          '',
          `🎵 Download your track:`,
          downloadUrl || details.trackFileUrl,
          '',
          `⚠️ This file is for your personal use only and cannot be shared.`,
          `This download link expires in 7 days.`,
        ].join('\n');
      } else {
        bestowerMessage = [
          `🎉 Congratulations, ${bestowerName}!`,
          '',
          `Your bestowal for "${details.contentTitle}" has been received!`,
          '',
          `💰 Amount: $${details.amount.toFixed(2)} ${details.currency}`,
          `💳 Payment: ${paymentMethodDisplay}`,
          `📅 Date: ${dateStr}`,
          `🧾 Reference: ${details.paymentReference}`,
          '',
          `Thank you for your generosity! Your contribution helps bring this vision to life. 🌱`,
        ].join('\n');
      }

      await sendSystemMessage(supabase, roomId, bestowerMessage, {
        type: 'post_payment_bestower_congratulations',
        bestowal_id: details.bestowalId,
        content_type: details.contentType,
        user_id: details.bestowerId,
      });
      console.log('✅ Message 1 sent: Bestower congratulations');
    } else {
      errors.push('Could not create direct room with bestower');
    }
  } catch (err: any) {
    console.error('❌ Message 1 failed:', err.message);
    errors.push(`Bestower message failed: ${err.message}`);
  }

  // ═══════════════════════════════════════════════════════
  // MESSAGE 2: GoSat → Sower (Payment Received)
  // ═══════════════════════════════════════════════════════
  try {
    const roomId = await getDirectRoom(supabase, gosatUserId, details.sowerId);
    if (roomId) {
      const sowerMessage = [
        `💰 You received a bestowal!`,
        '',
        `🎉 Great news, ${sowerName}! A bestower has contributed to your ${details.contentType === 'music' ? 'track' : details.contentType}.`,
        '',
        `📦 ${details.contentType === 'music' ? 'Track' : 'Item'}: "${details.contentTitle}"`,
        `👤 From: ${bestowerName}`,
        `💵 Your earnings: $${details.sowerEarnings.toFixed(2)} (after platform fees)`,
        `💳 Payment method: ${paymentMethodDisplay}`,
        `📅 Date: ${dateStr}`,
        '',
        `Breakdown:`,
        `- Your share: $${details.sowerEarnings.toFixed(2)} (85%)`,
        details.whispererAmount && details.whispererAmount > 0 
          ? `- Whisperer commission: $${details.whispererAmount.toFixed(2)}`
          : null,
        `- Tithing: $${details.tithingAmount.toFixed(2)} (10%)`,
        `- Admin fee: $${details.adminFee.toFixed(2)} (5%)`,
        '',
        `Your balance has been updated. View your earnings in your dashboard.`,
        '',
        `Blessings,`,
        `s2g gosat`,
      ].filter(Boolean).join('\n');

      await sendSystemMessage(supabase, roomId, sowerMessage, {
        type: 'post_payment_sower_notification',
        bestowal_id: details.bestowalId,
        content_type: details.contentType,
        user_id: details.sowerId,
      });
      console.log('✅ Message 2 sent: Sower payment notification');
    } else {
      errors.push('Could not create direct room with sower');
    }
  } catch (err: any) {
    console.error('❌ Message 2 failed:', err.message);
    errors.push(`Sower message failed: ${err.message}`);
  }

  // ═══════════════════════════════════════════════════════
  // MESSAGE 3: GoSat HQ Chat (Internal Audit)
  // ═══════════════════════════════════════════════════════
  try {
    const hqRoomId = await getGosatHQRoom(supabase);
    if (hqRoomId) {
      const hqMessage = [
        `📊 New ${details.contentType} payment processed`,
        '',
        `${details.contentType === 'music' ? '🎵 Track' : '📦 Item'}: ${details.contentTitle}`,
        `👤 Buyer: ${bestowerName}`,
        `🌱 Sower: ${sowerName}`,
        `💰 Amount: $${details.amount.toFixed(2)} ${details.currency}`,
        `💳 Method: ${paymentMethodDisplay}`,
        `🧾 Ref: ${details.paymentReference}`,
        `📅 ${dateStr}`,
      ].join('\n');

      await sendSystemMessage(supabase, hqRoomId, hqMessage, {
        type: 'post_payment_hq_audit',
        bestowal_id: details.bestowalId,
        content_type: details.contentType,
        bestower_id: details.bestowerId,
        sower_id: details.sowerId,
        amount: details.amount,
      });
      console.log('✅ Message 3 sent: GoSat HQ audit');
    } else {
      errors.push('Could not get GoSat HQ room');
    }
  } catch (err: any) {
    console.error('❌ Message 3 failed:', err.message);
    errors.push(`HQ message failed: ${err.message}`);
  }

  return { success: errors.length === 0, errors };
}
