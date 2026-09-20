import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { getRadioState, subscribeRadio, type RadioTrackInfo, type RadioSegmentInfo, type RadioSlotInfo } from '@/lib/media/radioPlayback';
import SeedCard from '@/components/seeds/SeedCard';
import ShareSeedDialog from '@/components/share/ShareSeedDialog';
import StallChatSheet from '@/components/stalls/StallChatSheet';

interface Props {
  onClose: () => void;
}

/**
 * "Hear a song, gift it, bestow on it, or talk to its maker" -- opened
 * from the persistent radio pill/Cockpit button, over whatever page is
 * already on screen (same fixed-overlay convention as StallChatSheet.tsx),
 * never navigate(). Renders the actual SeedCard for the live track rather
 * than a bespoke summary, so Bestow is the real $2 bestow flow
 * (useGiftBestowal/ConfirmBestowModal, built into SeedCard already) and
 * not a second one. "Gift" opens ShareSeedDialog's Tribe tab -- sending
 * the seed to a tribe member at no cost is the actual free-gift mechanism
 * this app already has. "Chat with the sower" resolves the same
 * get_or_create_direct_room room StallInteriorView's own "Message the
 * sower" button uses, then opens the same StallChatSheet.
 */
export default function NowPlayingSheet({ onClose }: Props) {
  const { user } = useAuth();
  const [track, setTrack] = useState<RadioTrackInfo | null>(getRadioState().track);
  const [segment, setSegment] = useState<RadioSegmentInfo | null>(getRadioState().segment);
  const [slot, setSlot] = useState<RadioSlotInfo | null>(getRadioState().slot);
  const [giftOpen, setGiftOpen] = useState(false);
  const [chatRoomId, setChatRoomId] = useState<string | null>(null);
  const [chatOpen, setChatOpen] = useState(false);
  const [resolvingChat, setResolvingChat] = useState(false);

  useEffect(() => subscribeRadio(() => {
    const s = getRadioState();
    setTrack(s.track);
    setSegment(s.segment);
    setSlot(s.slot);
  }), []);

  const openChat = async () => {
    if (!user || !track || resolvingChat) return;
    setResolvingChat(true);
    try {
      const { data, error } = await supabase.rpc('get_or_create_direct_room', {
        user1_id: user.id,
        user2_id: track.sowerUserId,
      });
      if (error || !data) throw error ?? new Error('no room');
      setChatRoomId(data as string);
      setChatOpen(true);
    } catch {
      // Best-effort -- the chat button simply does nothing on failure,
      // same silent-fail shape ShareSeedDialog's own room creation uses.
    } finally {
      setResolvingChat(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-[10020] bg-black/70" onClick={onClose} />
      <div className="fixed inset-x-0 bottom-0 top-[8vh] z-[10021] flex flex-col rounded-t-2xl bg-[#0E1B15] border-t border-amber-500/25 shadow-2xl sm:inset-x-auto sm:top-1/2 sm:bottom-auto sm:left-1/2 sm:h-auto sm:max-h-[85vh] sm:w-full sm:max-w-md sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-2xl sm:border">
        <div className="flex items-center justify-between border-b border-amber-500/15 px-5 py-3 shrink-0">
          <h2 className="font-serif text-lg text-amber-200 tracking-wide">Grove Station</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="text-amber-100/60 hover:text-amber-100 transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto p-4">
          {!track && !segment ? (
            <p className="py-10 text-center text-sm text-amber-100/60">Nothing live right now.</p>
          ) : segment ? (
            // Grove Station DJ Slots: a talk/opening/advert/jingle/handover
            // segment has no product behind it -- DJ + show title + segment
            // image, per spec, not the full Bestow/Gift SeedCard treatment.
            <div className="space-y-4 text-center">
              {segment.imageUrl && (
                <img src={segment.imageUrl} alt="" className="w-full rounded-xl object-cover max-h-64" />
              )}
              <div>
                <div className="font-serif text-xl text-amber-100">{slot?.title || 'Grove Station'}</div>
                <div className="text-sm text-amber-100/70 capitalize mt-1">{segment.kind} — {slot?.djName ?? 'a DJ'}</div>
                {segment.notes && <p className="text-sm text-amber-100/60 mt-3 whitespace-pre-wrap">{segment.notes}</p>}
              </div>
            </div>
          ) : track ? (
            <SeedCard
              id={track.id}
              kind="music"
              title={track.title}
              subtitle={`Live on Grove Station — ${track.sowerName}`}
              ownerId={track.sowerUserId}
              ownerName={track.sowerName}
              ownerUsername={track.sowerUsername}
              cover={track.cover}
              price={track.price}
              openPath={track.sowerUsername ? `/stall/${track.sowerUsername}#stall-kind=music&seed=${track.id}` : '/grove-station'}
              isProductRow
              productId={track.id}
              tapBehavior="inline"
              onGift={() => setGiftOpen(true)}
              onMessageOverride={openChat}
            />
          ) : null}
        </div>
      </div>
      {track && giftOpen && (
        <ShareSeedDialog
          open
          onOpenChange={setGiftOpen}
          seedId={track.id}
          title={track.title}
          subtitle={`by ${track.sowerName}`}
          image={track.cover}
          openPath={track.sowerUsername ? `/stall/${track.sowerUsername}#stall-kind=music&seed=${track.id}` : '/grove-station'}
          initialTab="tribe"
        />
      )}
      {chatOpen && (
        <StallChatSheet roomId={chatRoomId} onClose={() => setChatOpen(false)} />
      )}
    </>
  );
}
