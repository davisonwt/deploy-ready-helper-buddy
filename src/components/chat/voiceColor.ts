/**
 * Voice color + recency helpers for Community Chat.
 * Pure functions — no data fetching, no side effects.
 *
 * `getVoiceColor` is a deterministic hash so the same user_id always
 * resolves to the same color across sessions and rooms.
 *
 * `classifyVoiceState` mirrors the thresholds used by 1-on-1 Live's
 * PresenceAura (active ≤2min, recent ≤15min, idle otherwise). The
 * honest signal for "active" here is the recency of that participant's
 * most recent message — no real presence channel exists yet.
 */

// 8 muted variants drawn from the sage / honey / teal / coral family.
// Each entry: { ring, tint, glow } — all designed to read against #0E1B15.
export const VOICE_PALETTE = [
  { ring: '#4FA876', tint: 'rgba(79, 168, 118, 0.18)',  glow: 'rgba(79, 168, 118, 0.55)'  }, // sage
  { ring: '#F2C14E', tint: 'rgba(242, 193, 78, 0.16)',  glow: 'rgba(242, 193, 78, 0.55)'  }, // honey
  { ring: '#5DB6B0', tint: 'rgba(93, 182, 176, 0.17)',  glow: 'rgba(93, 182, 176, 0.55)'  }, // teal
  { ring: '#E58F73', tint: 'rgba(229, 143, 115, 0.17)', glow: 'rgba(229, 143, 115, 0.55)' }, // coral
  { ring: '#9CB87A', tint: 'rgba(156, 184, 122, 0.17)', glow: 'rgba(156, 184, 122, 0.55)' }, // moss
  { ring: '#C9A36B', tint: 'rgba(201, 163, 107, 0.16)', glow: 'rgba(201, 163, 107, 0.55)' }, // wheat
  { ring: '#7AA8D6', tint: 'rgba(122, 168, 214, 0.17)', glow: 'rgba(122, 168, 214, 0.55)' }, // dusk-blue
  { ring: '#B58FC2', tint: 'rgba(181, 143, 194, 0.17)', glow: 'rgba(181, 143, 194, 0.55)' }, // mauve
] as const;

export type VoiceColor = typeof VOICE_PALETTE[number];

function hashString(s: string): number {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export function getVoiceColor(userId: string | null | undefined): VoiceColor {
  if (!userId) return VOICE_PALETTE[0];
  return VOICE_PALETTE[hashString(userId) % VOICE_PALETTE.length];
}

export type VoiceState = 'active' | 'recent' | 'idle';

export function classifyVoiceState(lastSignalAt: string | Date | null | undefined): VoiceState {
  if (!lastSignalAt) return 'idle';
  const t = typeof lastSignalAt === 'string' ? new Date(lastSignalAt).getTime() : lastSignalAt.getTime();
  const ageMs = Date.now() - t;
  if (ageMs <= 2 * 60 * 1000) return 'active';
  if (ageMs <= 15 * 60 * 1000) return 'recent';
  return 'idle';
}

export function initialFrom(name: string | null | undefined): string {
  return (name?.trim()?.[0] || '?').toUpperCase();
}
