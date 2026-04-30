/**
 * Tribal Hearts — Web Audio synthesis for warm, organic sound design.
 * No external assets. All sounds generated on-device for perfect sync.
 *
 * Sounds:
 *   - drum:    deep warm djembe-like skin drum (low resonant thump)
 *   - chime:   crystalline kalimba-like chime (warm metallic ring)
 *   - sparkle: short high tinkle (ember spark)
 *   - whoosh:  filtered noise sweep (heart movement)
 *   - hum:     low ambient tribal drone (looped during bonding)
 *   - heartbeat: soft low double-thump
 */

let _ctx: AudioContext | null = null;
let _master: GainNode | null = null;
let _enabled = true;
let _intensity: 'subtle' | 'balanced' | 'rich' = 'balanced';

function ctx(): AudioContext {
  if (!_ctx) {
    const AC = (window as any).AudioContext || (window as any).webkitAudioContext;
    _ctx = new AC();
    _master = _ctx.createGain();
    _master.gain.value = 0.6;
    _master.connect(_ctx.destination);
  }
  if (_ctx.state === 'suspended') _ctx.resume().catch(() => {});
  return _ctx;
}

function master(): GainNode {
  ctx();
  return _master!;
}

const intensityMul = () => (_intensity === 'subtle' ? 0.55 : _intensity === 'rich' ? 1.15 : 1);

// --- Individual sound generators ---

function drum(at = 0, freq = 70, dur = 0.55, gain = 0.55) {
  if (!_enabled) return;
  const c = ctx();
  const t = c.currentTime + at;
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(freq * 2, t);
  osc.frequency.exponentialRampToValueAtTime(freq, t + 0.08);
  osc.frequency.exponentialRampToValueAtTime(freq * 0.6, t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(gain * intensityMul(), t + 0.015);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(g).connect(master());
  osc.start(t);
  osc.stop(t + dur + 0.05);
}

function chime(at = 0, freq = 880, dur = 1.6, gain = 0.18) {
  if (!_enabled) return;
  const c = ctx();
  const t = c.currentTime + at;
  // Two partials for warm bell tone
  [1, 2.01, 3.05].forEach((mul, i) => {
    const osc = c.createOscillator();
    const g = c.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq * mul, t);
    const peak = gain * intensityMul() * (i === 0 ? 1 : 0.35 / i);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g).connect(master());
    osc.start(t);
    osc.stop(t + dur + 0.05);
  });
}

function sparkle(at = 0, gain = 0.12) {
  if (!_enabled) return;
  const c = ctx();
  const t = c.currentTime + at;
  // Random high tinkles
  for (let i = 0; i < 4; i++) {
    const f = 1800 + Math.random() * 2200;
    const dur = 0.18 + Math.random() * 0.18;
    const start = t + i * 0.04;
    const osc = c.createOscillator();
    const g = c.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(f, start);
    osc.frequency.exponentialRampToValueAtTime(f * 0.7, start + dur);
    g.gain.setValueAtTime(0.0001, start);
    g.gain.exponentialRampToValueAtTime(gain * intensityMul(), start + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
    osc.connect(g).connect(master());
    osc.start(start);
    osc.stop(start + dur + 0.02);
  }
}

function whoosh(at = 0, dur = 0.6, gain = 0.18) {
  if (!_enabled) return;
  const c = ctx();
  const t = c.currentTime + at;
  // Brown-ish noise via buffer
  const len = Math.floor(c.sampleRate * dur);
  const buf = c.createBuffer(1, len, c.sampleRate);
  const data = buf.getChannelData(0);
  let last = 0;
  for (let i = 0; i < len; i++) {
    const w = (Math.random() * 2 - 1) * 0.2;
    last = (last + w) * 0.96;
    data[i] = last * 3;
  }
  const src = c.createBufferSource();
  src.buffer = buf;
  const filter = c.createBiquadFilter();
  filter.type = 'bandpass';
  filter.Q.value = 1.2;
  filter.frequency.setValueAtTime(400, t);
  filter.frequency.exponentialRampToValueAtTime(1200, t + dur);
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(gain * intensityMul(), t + dur * 0.4);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(filter).connect(g).connect(master());
  src.start(t);
  src.stop(t + dur + 0.05);
}

let _humStop: (() => void) | null = null;

function startHum(dur = 4.5, gain = 0.12) {
  if (!_enabled) return () => {};
  const c = ctx();
  const t = c.currentTime;
  const osc1 = c.createOscillator();
  const osc2 = c.createOscillator();
  osc1.type = 'sine';
  osc2.type = 'sine';
  osc1.frequency.value = 110;
  osc2.frequency.value = 165; // perfect fifth
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(gain * intensityMul(), t + 0.5);
  g.gain.setValueAtTime(gain * intensityMul(), t + dur - 0.4);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc1.connect(g);
  osc2.connect(g);
  g.connect(master());
  osc1.start(t);
  osc2.start(t);
  osc1.stop(t + dur + 0.1);
  osc2.stop(t + dur + 0.1);
  const stop = () => {
    try {
      g.gain.cancelScheduledValues(c.currentTime);
      g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + 0.3);
      osc1.stop(c.currentTime + 0.4);
      osc2.stop(c.currentTime + 0.4);
    } catch {}
  };
  _humStop = stop;
  return stop;
}

function stopHum() {
  _humStop?.();
  _humStop = null;
}

function heartbeat(at = 0, gain = 0.45) {
  drum(at, 60, 0.4, gain);
  drum(at + 0.18, 55, 0.35, gain * 0.7);
}

// --- Public API ---

export const TribalAudio = {
  unlock() {
    ctx();
  },
  enable() {
    _enabled = true;
  },
  disable() {
    _enabled = false;
    stopHum();
  },
  isEnabled: () => _enabled,
  setIntensity(i: 'subtle' | 'balanced' | 'rich') {
    _intensity = i;
  },
  drum,
  chime,
  sparkle,
  whoosh,
  heartbeat,
  startHum,
  stopHum,

  /** Full bonding sequence — synced to the 4.5s animation timeline */
  playBondingSequence() {
    if (!_enabled) return;
    ctx();
    startHum(4.6, 0.1);
    // Phase 1: Hearts appear (0.4-1.0s)
    chime(0.45, 660, 1.4, 0.14); // left heart wood-warm
    chime(0.65, 880, 1.4, 0.13); // right heart metallic
    whoosh(0.7, 0.5, 0.1);
    // Phase 2: Approach (1.0-2.6s) — rising sparkle ticks
    [1.2, 1.5, 1.75, 1.95, 2.1, 2.25, 2.38, 2.48].forEach((t, i) =>
      sparkle(t, 0.06 + i * 0.012)
    );
    // Phase 3: Merge (2.6s drum hit, 2.8s chime+sparkle bloom)
    drum(2.6, 65, 0.7, 0.6);
    chime(2.78, 1320, 2.0, 0.22);
    sparkle(2.85, 0.18);
    sparkle(3.05, 0.12);
    // Phase 4: Heartbeat celebration (3.6s, 4.1s)
    heartbeat(3.6, 0.4);
    heartbeat(4.1, 0.35);
    // Phase 5: hum auto-fades
  },

  /** Spark sent — soft whoosh + sparkle trail + tiny success chime */
  playSparkSent() {
    if (!_enabled) return;
    whoosh(0, 0.5, 0.12);
    sparkle(0.15, 0.1);
    chime(0.5, 1320, 0.8, 0.1);
  },

  /** Spark button breathing pulse — very subtle low hum */
  playPulse() {
    if (!_enabled) return;
    drum(0, 50, 0.6, 0.06);
  },

  /** Card placed — soft wooden tap */
  playPlace() {
    if (!_enabled) return;
    drum(0, 110, 0.18, 0.18);
  },
};

export function useTribalHeartsAudio() {
  return TribalAudio;
}
