// Reproduces the live crash on AdminRadioPage.jsx: "cannot add
// postgres_changes callbacks for realtime:schema-db-changes after
// subscribe()" (Error ID dlyhyo). Root cause: RadioScheduleGrid.jsx's
// realtime effect used to call `supabase.channel('schema-db-changes')`
// with a hardcoded, non-unique name. AdminRadioPage renders TWO
// <RadioScheduleGrid> instances on one page (compact + full) -- against a
// stub client that behaves like supabase-js (channels cached by topic,
// `.on()` after `.subscribe()` throws), the second instance's effect
// reused the first instance's already-subscribed channel and crashed.
// Same class of bug, same stub-client technique, as room-realtime.test.ts.

import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { RadioScheduleGrid } from '../components/radio/RadioScheduleGrid';

class StubChannel {
  topic: string;
  subscribed = false;
  constructor(topic: string) { this.topic = topic; }
  on(type: string) {
    if (this.subscribed) {
      throw new Error(`tried to push '${type}' to '${this.topic}' after subscribe()`);
    }
    return this;
  }
  subscribe() { this.subscribed = true; return this; }
}

class StubClient {
  registry = new Map<string, StubChannel>();
  channel(name: string) {
    // supabase-js returns the existing instance for a topic still registered
    const existing = this.registry.get(name);
    if (existing) return existing;
    const c = new StubChannel(name);
    this.registry.set(name, c);
    return c;
  }
  removeChannel(c: StubChannel) { this.registry.delete(c.topic); return 'ok'; }
  from() {
    const builder: any = {
      select: () => builder,
      eq: () => builder,
      order: () => Promise.resolve({ data: [], error: null }),
    };
    return builder;
  }
}

const stubClient = new StubClient();
vi.mock('@/integrations/supabase/client', () => ({
  get supabase() { return stubClient; },
}));

describe('RadioScheduleGrid realtime channel', () => {
  it('two instances on one page (AdminRadioPage\'s actual usage) do not collide on channel identity', () => {
    expect(() => {
      render(
        <>
          <RadioScheduleGrid compact showLegend={false} />
          <RadioScheduleGrid />
        </>,
      );
    }).not.toThrow();

    // Each instance got its own topic -- the whole point of the fix.
    const radioTopics = [...stubClient.registry.keys()].filter((t) => t.startsWith('radio-schedule-changes-'));
    expect(radioTopics).toHaveLength(2);
    expect(new Set(radioTopics).size).toBe(2);
    for (const topic of radioTopics) {
      expect(stubClient.registry.get(topic)!.subscribed).toBe(true);
    }
  });
});
