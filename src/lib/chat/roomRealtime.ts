// Realtime channels for one chat room, built so a React effect can never
// hit "cannot add postgres_changes callbacks for realtime:room:<id> after
// subscribe()".
//
// That error comes from supabase-js caching channels by topic:
// `supabase.channel('room:<id>')` returns the EXISTING instance if one with
// that name is still registered, and `.on()` on an already-subscribed
// instance throws. ChatRoom's effect used to call two setup functions that
// returned cleanups the effect discarded, so nothing was ever removed; the
// next run (user object identity change, StrictMode double-invoke, room
// switch) reused the subscribed channel and crashed the page.
//
// Rules enforced here:
//   1. every call gets its own unique topic (roomId + a per-call nonce),
//   2. every .on() is registered before .subscribe(),
//   3. cleanup() removes both channels, and is idempotent.

type Payload = { new?: any; old?: any };

export interface RoomRealtimeHandlers {
  onMessageInsert: (payload: Payload) => void | Promise<void>;
  onRoomDeleted: () => void;
  onRoomUpdated: (payload: Payload) => void;
  onTyping: (payload: Payload) => void;
}

/** The subset of the Supabase client these channels need (kept small for tests). */
export interface RealtimeClientLike {
  channel: (name: string, opts?: any) => any;
  removeChannel: (channel: any) => any;
}

let nonce = 0;
function uniqueTopic(prefix: string, roomId: string): string {
  nonce += 1;
  return `${prefix}:${roomId}:${Date.now().toString(36)}-${nonce}`;
}

export function subscribeRoomRealtime(
  client: RealtimeClientLike,
  roomId: string,
  handlers: RoomRealtimeHandlers,
) {
  const roomChannel = client
    .channel(uniqueTopic('room', roomId))
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `room_id=eq.${roomId}` },
      (payload: Payload) => { void handlers.onMessageInsert(payload); },
    )
    .on(
      'postgres_changes',
      { event: 'DELETE', schema: 'public', table: 'chat_rooms', filter: `id=eq.${roomId}` },
      () => handlers.onRoomDeleted(),
    )
    .on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'chat_rooms', filter: `id=eq.${roomId}` },
      (payload: Payload) => handlers.onRoomUpdated(payload),
    );

  const typingChannel = client
    .channel(uniqueTopic('typing', roomId))
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'typing', filter: `room_id=eq.${roomId}` },
      (payload: Payload) => handlers.onTyping(payload),
    );

  // Only after every handler is attached.
  roomChannel.subscribe();
  typingChannel.subscribe();

  let removed = false;
  const cleanup = () => {
    if (removed) return;
    removed = true;
    client.removeChannel(roomChannel);
    client.removeChannel(typingChannel);
  };

  return { roomChannel, typingChannel, cleanup };
}
