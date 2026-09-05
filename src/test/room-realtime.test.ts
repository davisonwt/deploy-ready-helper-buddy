// Reproduces the live crash "cannot add postgres_changes callbacks for
// realtime:room:<id> after subscribe()" against a stub client that behaves
// like supabase-js: channels are cached by topic, and .on() after
// .subscribe() throws. Then proves subscribeRoomRealtime() cannot trigger it,
// including under a StrictMode-style double run.

import { describe, it, expect } from 'vitest';
import { subscribeRoomRealtime, type RoomRealtimeHandlers } from '../lib/chat/roomRealtime';

class StubChannel {
  topic: string;
  subscribed = false;
  handlers: { type: string; filter: any }[] = [];
  constructor(topic: string) { this.topic = topic; }
  on(type: string, filter: any, _cb: (p: any) => void) {
    if (this.subscribed) {
      throw new Error(`tried to push '${type}' to '${this.topic}' after subscribe()`);
    }
    this.handlers.push({ type, filter });
    return this;
  }
  subscribe() { this.subscribed = true; return this; }
}

class StubClient {
  registry = new Map<string, StubChannel>();
  removed: string[] = [];
  channel(name: string) {
    // supabase-js returns the existing instance for a topic still registered
    const existing = this.registry.get(name);
    if (existing) return existing;
    const c = new StubChannel(name);
    this.registry.set(name, c);
    return c;
  }
  removeChannel(c: StubChannel) { this.registry.delete(c.topic); this.removed.push(c.topic); return 'ok'; }
}

const noopHandlers: RoomRealtimeHandlers = {
  onMessageInsert: () => {},
  onRoomDeleted: () => {},
  onRoomUpdated: () => {},
  onTyping: () => {},
};

describe('room realtime channels', () => {
  it('reproduces the crash with the old pattern: fixed topic reused after subscribe', () => {
    const client = new StubClient();
    const roomId = 'abc';
    const first = client.channel(`room:${roomId}`).on('postgres_changes', {}, () => {}).subscribe();
    expect(first.subscribed).toBe(true);
    // effect re-runs without cleanup -> same instance -> .on() throws
    expect(() => client.channel(`room:${roomId}`).on('postgres_changes', {}, () => {}))
      .toThrow(/after subscribe\(\)/);
  });

  it('registers every handler before subscribe, on unique topics', () => {
    const client = new StubClient();
    const { roomChannel, typingChannel } = subscribeRoomRealtime(client, 'room-1', noopHandlers);
    expect(roomChannel.topic).toMatch(/^room:room-1:/);
    expect(typingChannel.topic).toMatch(/^typing:room-1:/);
    expect(roomChannel.handlers.map((h) => h.filter.table)).toEqual(['chat_messages', 'chat_rooms', 'chat_rooms']);
    expect(typingChannel.handlers.map((h) => h.filter.table)).toEqual(['typing']);
    expect(roomChannel.subscribed).toBe(true);
    expect(typingChannel.subscribed).toBe(true);
  });

  it('survives a StrictMode double run and a re-run without cleanup', () => {
    const client = new StubClient();
    const a = subscribeRoomRealtime(client, 'room-1', noopHandlers);
    // StrictMode: effect runs, cleanup, runs again
    a.cleanup();
    const b = subscribeRoomRealtime(client, 'room-1', noopHandlers);
    // A buggy caller that forgot cleanup still cannot collide: fresh topics
    const c = subscribeRoomRealtime(client, 'room-1', noopHandlers);
    expect(new Set([a.roomChannel.topic, b.roomChannel.topic, c.roomChannel.topic]).size).toBe(3);
    expect(client.removed).toEqual([a.roomChannel.topic, a.typingChannel.topic]);
  });

  it('cleanup removes both channels once, even if called twice', () => {
    const client = new StubClient();
    const s = subscribeRoomRealtime(client, 'room-2', noopHandlers);
    s.cleanup();
    s.cleanup();
    expect(client.removed).toHaveLength(2);
    expect(client.registry.size).toBe(0);
  });
});
