import { describe, it, expect } from 'vitest';
import {
  liveLocationHost,
  checkLiveLocationLink,
  liveLocationVisibleForStatus,
  LIVE_LOCATION_REJECTED,
} from '@/lib/bookings/liveLocationLink';

describe('liveLocationHost - accepts what a share action actually produces', () => {
  it.each([
    ['https://maps.app.goo.gl/AbCdEfGh123', 'maps.app.goo.gl'],
    ['https://maps.apple.com/?ll=-33.9,18.4', 'maps.apple.com'],
    ['https://wa.me/27821234567', 'wa.me'],
    ['https://api.whatsapp.com/send?phone=27821234567', 'api.whatsapp.com'],
    ['https://www.google.com/maps/@-33.9,18.4,15z', 'www.google.com'],
    ['https://maps.google.com/maps?q=-33.9,18.4', 'maps.google.com'],
  ])('accepts %s', (url, host) => {
    expect(liveLocationHost(url)).toBe(host);
  });
});

describe('liveLocationHost - rejects the rest', () => {
  it.each([
    ['http://maps.app.goo.gl/x', 'plain http'],
    ['https://evil.example/track', 'unknown host'],
    ['https://maps.app.goo.gl@evil.example/x', 'userinfo impersonating a good host'],
    ['https://maps.app.goo.gl:pw@evil.example/x', 'userinfo with a password'],
    ['https://www.google.com/url?q=https://evil.example', 'google open redirect'],
    ['https://google.com/search?q=cape+town', 'google outside /maps'],
    ['https://maps.app.goo.gl.evil.example/x', 'suffix on a good host'],
    ['https://notmaps.app.goo.gl/x', 'prefix on a good host'],
    ['javascript:alert(1)', 'javascript scheme'],
    ['https://maps.app.goo.gl/x\nhttps://evil.example', 'embedded newline'],
    ['', 'empty'],
  ])('rejects %s (%s)', (url) => {
    expect(liveLocationHost(url)).toBeNull();
  });

  it('rejects null and undefined', () => {
    expect(liveLocationHost(null)).toBeNull();
    expect(liveLocationHost(undefined)).toBeNull();
  });

  it('rejects a URL longer than 2048 characters', () => {
    expect(liveLocationHost(`https://maps.app.goo.gl/${'a'.repeat(2100)}`)).toBeNull();
  });
});

describe('checkLiveLocationLink', () => {
  it('trims a pasted link before judging it', () => {
    const result = checkLiveLocationLink('  https://maps.app.goo.gl/AbCdEfGh123  ');
    expect(result).toEqual({
      ok: true,
      url: 'https://maps.app.goo.gl/AbCdEfGh123',
      host: 'maps.app.goo.gl',
    });
  });

  it('explains the rejection in a sentence, not a constraint name', () => {
    const result = checkLiveLocationLink('https://evil.example/track');
    expect(result.ok).toBe(false);
    expect(result.ok === false && result.message).toBe(LIVE_LOCATION_REJECTED);
  });
});

describe('liveLocationVisibleForStatus - matches the RLS window', () => {
  it.each(['on_my_way', 'arrived', 'in_transit'])('visible during %s', (status) => {
    expect(liveLocationVisibleForStatus(status)).toBe(true);
  });

  it.each(['requested', 'accepted', 'collected', 'completed', 'delivered', 'no_show', 'cancelled', 'expired'])(
    'hidden at %s',
    (status) => {
      expect(liveLocationVisibleForStatus(status)).toBe(false);
    },
  );

  it('hidden when the status is unknown', () => {
    expect(liveLocationVisibleForStatus(null)).toBe(false);
    expect(liveLocationVisibleForStatus(undefined)).toBe(false);
  });
});
