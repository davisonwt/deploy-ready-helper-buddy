/**
 * bestowalChat — opens the 1-on-1 chat between sower & bestower and posts
 * the standard "thank you" notes. All bestowal-related delivery (digital
 * files, ebooks, music, etc.) flows through this same thread so both sides
 * have a single source of truth.
 *
 * Called from QuickBestowModal immediately when payment is initiated, and
 * also re-called by the bestowal webhook → `complete-product-bestowal` /
 * `binance-pay-webhook` flow once the payment confirms (delivery step).
 */
import { supabase } from '@/integrations/supabase/client';

export interface PostBestowalNotesArgs {
  bestowalId: string;
  bestowerUserId: string;
  sowerUserId: string;
  seedTitle: string;
  amount: number;
  note?: string;
}

export async function postBestowalChatNotes(args: PostBestowalNotesArgs): Promise<string | null> {
  const { bestowalId, bestowerUserId, sowerUserId, seedTitle, amount, note } = args;

  if (!bestowerUserId || !sowerUserId || bestowerUserId === sowerUserId) return null;

  const { data: roomId, error: rpcErr } = await supabase.rpc('get_or_create_direct_room', {
    user1_id: sowerUserId,
    user2_id: bestowerUserId,
  });

  if (rpcErr || !roomId) {
    console.warn('Could not open direct chat for bestowal notes:', rpcErr);
    return null;
  }

  const sysMeta = {
    is_system: true,
    type: 'bestowal_note',
    bestowal_id: bestowalId,
    seed_title: seedTitle,
    amount,
  };

  // 1) Bestower-side message ("I have supported you, thank you for sowing your seed")
  await supabase.from('chat_messages').insert({
    room_id: roomId,
    sender_id: bestowerUserId,
    content:
      `🌱 I have supported your seed “${seedTitle}” with ${amount.toFixed(2)} USDC. ` +
      `Thank you for sowing this into the tribe.${note ? `\n\n“${note}”` : ''}`,
    message_type: 'text',
    system_metadata: sysMeta,
  } as any);

  // 2) Sower-side thank-you (posted from sower so it lands in the same thread feed)
  await supabase.from('chat_messages').insert({
    room_id: roomId,
    sender_id: sowerUserId,
    content:
      `🙏 Thank you for bestowing on “${seedTitle}”. Your support helps this seed grow. ` +
      `If there are any digital fruits attached to this seed (music, ebook, document, video) ` +
      `they will be delivered here in this chat.`,
    message_type: 'text',
    system_metadata: { ...sysMeta, type: 'bestowal_thanks' },
  } as any);

  return roomId as string;
}
