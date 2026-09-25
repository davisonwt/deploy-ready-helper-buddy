// Pure byte-level audio duration probe -- no ffmpeg/ffprobe (not available
// in the edge runtime, which is an isolate-based Deno runtime with no
// shell/binary execution). Extends the exact frame-parsing this repo
// already ships in audioTrim.ts (which sums MPEG frame durations while
// walking toward a trim point) into a full-file walk that reports the
// real total duration instead. WAV and MP3 (Layer III) only, matching
// audioTrim.ts's own restriction -- refusing an unsupported format is
// safer than guessing at a duration a wrong parse would produce.

export function probeAudioDurationSeconds(input: Uint8Array): number | null {
  if (isWav(input)) return probeWavDuration(input);
  if (isMp3(input)) return probeMp3Duration(input);
  return null;
}

function isWav(b: Uint8Array): boolean {
  return b.length > 12 &&
    b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 && // "RIFF"
    b[8] === 0x57 && b[9] === 0x41 && b[10] === 0x56 && b[11] === 0x45; // "WAVE"
}

function isMp3(b: Uint8Array): boolean {
  const start = mp3DataStart(b);
  return start !== null && start + 4 <= b.length && findFrameSync(b, start) === start;
}

function mp3DataStart(b: Uint8Array): number | null {
  if (b.length < 10) return null;
  if (b[0] === 0x49 && b[1] === 0x44 && b[2] === 0x33) { // "ID3"
    const size = ((b[6] & 0x7f) << 21) | ((b[7] & 0x7f) << 14) | ((b[8] & 0x7f) << 7) | (b[9] & 0x7f);
    return 10 + size;
  }
  return 0;
}

function findFrameSync(b: Uint8Array, from: number): number | null {
  for (let i = from; i < b.length - 1; i++) {
    if (b[i] === 0xff && (b[i + 1] & 0xe0) === 0xe0) return i;
  }
  return null;
}

const MPEG1_BITRATES_L3 = [0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320, -1];
const MPEG2_BITRATES_L3 = [0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160, -1];
const MPEG1_SAMPLE_RATES = [44100, 48000, 32000, -1];
const MPEG2_SAMPLE_RATES = [22050, 24000, 16000, -1];
const MPEG25_SAMPLE_RATES = [11025, 12000, 8000, -1];

interface FrameInfo {
  length: number;
  durationSeconds: number;
}

function parseFrame(b: Uint8Array, offset: number): FrameInfo | null {
  if (offset + 4 > b.length) return null;
  const b1 = b[offset + 1];
  const b2 = b[offset + 2];

  const versionBits = (b1 >> 3) & 0x03;
  const layerBits = (b1 >> 1) & 0x03;
  if (layerBits !== 0x01) return null; // Layer III only

  const bitrateIndex = (b2 >> 4) & 0x0f;
  const sampleRateIndex = (b2 >> 2) & 0x03;
  const padding = (b2 >> 1) & 0x01;

  let sampleRate: number;
  let bitrate: number;
  let samplesPerFrame: number;
  if (versionBits === 0x03) {
    sampleRate = MPEG1_SAMPLE_RATES[sampleRateIndex];
    bitrate = MPEG1_BITRATES_L3[bitrateIndex];
    samplesPerFrame = 1152;
  } else if (versionBits === 0x02) {
    sampleRate = MPEG2_SAMPLE_RATES[sampleRateIndex];
    bitrate = MPEG2_BITRATES_L3[bitrateIndex];
    samplesPerFrame = 576;
  } else if (versionBits === 0x00) {
    sampleRate = MPEG25_SAMPLE_RATES[sampleRateIndex];
    bitrate = MPEG2_BITRATES_L3[bitrateIndex];
    samplesPerFrame = 576;
  } else {
    return null;
  }
  if (sampleRate <= 0 || bitrate <= 0) return null;

  const length = Math.floor((samplesPerFrame / 8) * (bitrate * 1000) / sampleRate) + padding;
  if (length <= 0) return null;

  return { length, durationSeconds: samplesPerFrame / sampleRate };
}

function probeMp3Duration(b: Uint8Array): number | null {
  const start = mp3DataStart(b);
  if (start === null) return null;

  let offset = start;
  let elapsed = 0;
  let frameCount = 0;
  while (offset < b.length) {
    const sync = findFrameSync(b, offset);
    if (sync === null) break;
    const frame = parseFrame(b, sync);
    if (!frame) {
      if (frameCount === 0) return null;
      break;
    }
    offset = sync + frame.length;
    elapsed += frame.durationSeconds;
    frameCount++;
  }
  return frameCount > 0 ? elapsed : null;
}

function readU16LE(b: Uint8Array, o: number): number {
  return b[o] | (b[o + 1] << 8);
}

function readU32LE(b: Uint8Array, o: number): number {
  return b[o] | (b[o + 1] << 8) | (b[o + 2] << 16) | (b[o + 3] << 24);
}

function probeWavDuration(b: Uint8Array): number | null {
  let offset = 12;
  let byteRate = 0;
  let dataSize = -1;

  while (offset + 8 <= b.length) {
    const id = String.fromCharCode(b[offset], b[offset + 1], b[offset + 2], b[offset + 3]);
    const size = readU32LE(b, offset + 4);
    const bodyStart = offset + 8;
    if (id === 'fmt ') {
      byteRate = readU32LE(b, bodyStart + 8);
    } else if (id === 'data') {
      dataSize = size;
      break;
    }
    offset = bodyStart + size + (size % 2);
  }

  if (byteRate <= 0 || dataSize < 0) return null;
  return dataSize / byteRate;
}

// Streaming variant for large files (a whole 2-hour show is up to 150 MB):
// walks the same frames/chunks as the buffer probes above, holding only a
// small carry-over window in memory instead of the whole file. The edge
// runtime's memory ceiling is below 2x a whole-show file, so the buffer
// path would not survive one. Results match the buffer probes above; the
// equivalence is checked by audioDuration.stream.test.ts.

export async function probeAudioDurationFromStream(stream: ReadableStream<Uint8Array>): Promise<number | null> {
  const reader = stream.getReader();
  let pending = new Uint8Array(0);
  let consumed = 0; // absolute offset of pending[0]
  let done = false;

  const pull = async (): Promise<boolean> => {
    if (done) return false;
    const { value, done: d } = await reader.read();
    if (d || !value) { done = true; return false; }
    const next = new Uint8Array(pending.length + value.length);
    next.set(pending, 0);
    next.set(value, pending.length);
    pending = next;
    return true;
  };
  const dropBefore = (abs: number) => {
    const local = abs - consumed;
    if (local <= 0) return;
    if (local >= pending.length) {
      consumed += pending.length;
      pending = new Uint8Array(0);
    } else {
      pending = pending.slice(local);
      consumed = abs;
    }
  };
  // Makes absolute bytes [abs, abs+n) available; false if the file ends first.
  const ensure = async (abs: number, n: number): Promise<boolean> => {
    while (true) {
      if (abs < consumed) return false;
      if (abs - consumed + n <= pending.length) return true;
      if (abs - consumed > pending.length) dropBefore(Math.min(abs, consumed + pending.length));
      if (!(await pull())) return false;
    }
  };

  try {
    while (pending.length < 16 && (await pull())) { /* sniff window */ }
    const head = pending;
    if (isWav(head)) {
      let offset = 12;
      let byteRate = 0;
      while (await ensure(offset, 8)) {
        const b = pending;
        const o = offset - consumed;
        const id = String.fromCharCode(b[o], b[o + 1], b[o + 2], b[o + 3]);
        const size = readU32LE(b, o + 4) >>> 0;
        const bodyStart = offset + 8;
        if (id === 'fmt ') {
          if (!(await ensure(bodyStart, 12))) return null;
          byteRate = readU32LE(pending, bodyStart - consumed + 8);
        } else if (id === 'data') {
          return byteRate > 0 ? size / byteRate : null;
        }
        offset = bodyStart + size + (size % 2);
        dropBefore(Math.min(offset, consumed + pending.length));
      }
      return null;
    }

    if (!(await ensure(0, 10))) return null;
    const start = mp3DataStart(pending);
    if (start === null) return null;

    let offset = start;
    let elapsed = 0;
    let frameCount = 0;
    let first = true;
    while (true) {
      dropBefore(offset);
      // Find a sync at or after `offset`, pulling more bytes as needed.
      let sync: number | null = null;
      while (sync === null) {
        if (!(await ensure(offset, 2))) break;
        const local = offset - consumed;
        const found = findFrameSync(pending, local);
        if (found !== null) {
          sync = consumed + found;
        } else {
          offset = consumed + pending.length - 1; // a sync may straddle the chunk edge
          dropBefore(offset);
          if (!(await pull())) break;
        }
      }
      if (sync === null) break;
      if (first) {
        if (sync !== start) return null; // not an MP3 (same rule as isMp3)
        first = false;
      }
      const haveHeader = await ensure(sync, 4);
      const frame = haveHeader ? parseFrame(pending, sync - consumed) : null;
      if (!frame) {
        if (frameCount === 0) return null;
        break;
      }
      offset = sync + frame.length;
      elapsed += frame.durationSeconds;
      frameCount++;
    }
    return frameCount > 0 ? elapsed : null;
  } finally {
    try { await reader.cancel(); } catch { /* already closed */ }
  }
}
