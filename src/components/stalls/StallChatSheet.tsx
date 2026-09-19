import { X, Loader2 } from 'lucide-react';
import { ChatRoom } from '@/components/chat/ChatRoom';

interface Props {
  /** Resolved room id, or null while get_or_create_direct_room is still in flight. */
  roomId: string | null;
  onClose: () => void;
}

/**
 * The stall interior's "message the sower" sheet -- opens IN PLACE over
 * StallInteriorView (fixed overlay, local boolean state upstream, no
 * router), same layering convention as StallJoinSheet.tsx, but sized as a
 * real chat panel rather than a one-line action sheet: near-fullscreen on
 * mobile, a large modal on desktop.
 *
 * Renders the actual /conversations chat UI, not a second one --
 * ChatRoom has no dependency on being hosted by ConversationsPage (plain
 * roomId/onBack props, own data fetching). ChatRoom's own header/toolbar
 * default OFF (see ChatRoom.tsx's showHeader/showToolbar/allowDeleteRoom),
 * so this sheet supplies its own close button and opts into showToolbar
 * only -- recording/call/mute, never ChatRoom's own back/title row
 * (redundant here) or Delete Room.
 */
export default function StallChatSheet({ roomId, onClose }: Props) {
  return (
    <>
      <div className="fixed inset-0 z-[10000] bg-black/70" onClick={onClose} />
      <div className="fixed inset-x-0 bottom-0 top-[8vh] z-[10001] flex flex-col rounded-t-2xl bg-[#0E1B15] border-t border-amber-500/25 shadow-2xl sm:inset-x-auto sm:top-1/2 sm:bottom-auto sm:left-1/2 sm:h-[85vh] sm:w-full sm:max-w-2xl sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-2xl sm:border">
        <div className="flex items-center justify-between border-b border-amber-500/15 px-4 py-3 shrink-0">
          <span className="font-serif text-sm font-semibold text-amber-50">Message the sower</span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-8 w-8 items-center justify-center rounded-full text-amber-300 hover:bg-amber-500/10"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="min-h-0 flex-1">
          {roomId ? (
            <ChatRoom roomId={roomId} onBack={onClose} showToolbar recordGesture="hold" />
          ) : (
            <div className="flex h-full items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-amber-300" />
            </div>
          )}
        </div>
      </div>
    </>
  );
}
