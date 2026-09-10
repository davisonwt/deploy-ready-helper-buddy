// Synthesizes public/sounds/ringtone.wav and public/sounds/ringback.wav
// -- pure Node, no dependencies, no network access, nothing fetched from
// anywhere. Re-run with `node scripts/generate-ringtones.mjs` any time
// the sound should change.
//
// WAV, not .mp3/.ogg: no audio encoder (ffmpeg/sox) and no network
// access to fetch one were available in the environment this was
// written in, and .ogg specifically has ZERO support in Safari/iOS
// regardless of encoding -- the exact platform the ringtone bug this
// exists for is about -- so it would not have helped even if produced.
// WAV is natively, fully supported by <audio> in every browser that
// matters here (including iOS Safari) and needs no encoding step.

import { writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(__dirname, '..', 'public', 'sounds');
const SAMPLE_RATE = 44100;

function writeWavPCM16(filePath, samples) {
  const numSamples = samples.length;
  const byteRate = SAMPLE_RATE * 2; // mono, 16-bit
  const blockAlign = 2;
  const dataSize = numSamples * 2;
  const buffer = Buffer.alloc(44 + dataSize);
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write('WAVE', 8);
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16); // PCM chunk size
  buffer.writeUInt16LE(1, 20); // audio format = PCM
  buffer.writeUInt16LE(1, 22); // channels = mono
  buffer.writeUInt32LE(SAMPLE_RATE, 24);
  buffer.writeUInt32LE(byteRate, 28);
  buffer.writeUInt16LE(blockAlign, 32);
  buffer.writeUInt16LE(16, 34); // bits per sample
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataSize, 40);
  for (let i = 0; i < numSamples; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    buffer.writeInt16LE(Math.round(s * 32767), 44 + i * 2);
  }
  writeFileSync(filePath, buffer);
}

function tone(freqs, durationSec, gain) {
  const n = Math.floor(SAMPLE_RATE * durationSec);
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / SAMPLE_RATE;
    let v = 0;
    for (const f of freqs) v += Math.sin(2 * Math.PI * f * t);
    v /= freqs.length;
    out[i] = v * gain;
  }
  return out;
}

function silence(durationSec) {
  return new Float32Array(Math.floor(SAMPLE_RATE * durationSec));
}

// Linear fade in/out at each end to avoid clicks/pops at loop boundaries.
function applyFade(samples, fadeSec) {
  const fadeSamples = Math.min(Math.floor(SAMPLE_RATE * fadeSec), Math.floor(samples.length / 2));
  for (let i = 0; i < fadeSamples; i++) {
    const g = i / fadeSamples;
    samples[i] *= g;
    samples[samples.length - 1 - i] *= g;
  }
  return samples;
}

function concat(...arrays) {
  const total = arrays.reduce((a, b) => a + b.length, 0);
  const out = new Float32Array(total);
  let offset = 0;
  for (const a of arrays) {
    out.set(a, offset);
    offset += a.length;
  }
  return out;
}

mkdirSync(OUT_DIR, { recursive: true });

// Ringtone: classic dual-tone phone-bell pulses (800Hz + 1000Hz), two
// quick pulses then a pause -- loops seamlessly via <audio loop>.
const ringPulse = applyFade(tone([800, 1000], 0.35, 0.35), 0.02);
const ringGap = silence(0.15);
const ringPause = silence(1.2);
const ringtone = concat(ringPulse, ringGap, ringPulse, ringPause);
writeWavPCM16(join(OUT_DIR, 'ringtone.wav'), ringtone);

// Ring-back (caller side): single softer 440Hz tone, longer pulse,
// longer pause -- deliberately distinct cadence/pitch from the ringtone
// so the two are never confusable if somehow both were audible at once.
const backPulse = applyFade(tone([440], 1.0, 0.18), 0.05);
const backPause = silence(3.0);
const ringback = concat(backPulse, backPause);
writeWavPCM16(join(OUT_DIR, 'ringback.wav'), ringback);

console.log('Wrote', join(OUT_DIR, 'ringtone.wav'), `(${(ringtone.length / SAMPLE_RATE).toFixed(2)}s loop)`);
console.log('Wrote', join(OUT_DIR, 'ringback.wav'), `(${(ringback.length / SAMPLE_RATE).toFixed(2)}s loop)`);
