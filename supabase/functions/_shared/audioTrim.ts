// Pure byte-level audio trimming — no decode/re-encode, no ffmpeg (not
// available in the edge runtime). WAV is trimmed by slicing raw PCM at a
// sample boundary; MP3 is trimmed at a frame boundary — each MPEG frame is
// independently decodable, so cutting between frames produces a valid,
// playable file without touching the compressed audio itself.
//
// Deliberately narrow: WAV and MP3 (Layer III — what "an mp3" almost always
// is) only. Anything else returns null rather than guessing at a format it
// can't correctly parse — a wrong trim would ship a corrupt or silent
// "preview", which is worse than refusing one.

export interface TrimResult {
  bytes: Uint8Array;
  mimeType: string;
  extension: string;
}

export function trimAudio(input: Uint8Array, seconds: number): TrimResult | null {
  if (isWav(input)) return trimWav(input, seconds);
  if (isMp3(input)) return trimMp3(input, seconds);
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

/** Skips a leading ID3v2 tag, if present. Returns the byte offset audio frames start at. */
function mp3DataStart(b: Uint8Array): number | null {
  if (b.length < 10) return null;
  if (b[0] === 0x49 && b[1] === 0x44 && b[2] === 0x33) { // "ID3"
    // Synchsafe 7-bit-per-byte size, bytes 6-9.
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

/** Parses one MPEG Layer III frame header at `offset`. Returns null on anything malformed/unsupported. */
function parseFrame(b: Uint8Array, offset: number): FrameInfo | null {
  if (offset + 4 > b.length) return null;
  const b1 = b[offset + 1];
  const b2 = b[offset + 2];

  const versionBits = (b1 >> 3) & 0x03; // 00=2.5, 10=2, 11=1
  const layerBits = (b1 >> 1) & 0x03; // 01=III
  if (layerBits !== 0x01) return null; // only Layer III supported

  const bitrateIndex = (b2 >> 4) & 0x0f;
  const sampleRateIndex = (b2 >> 2) & 0x03;
  const padding = (b2 >> 1) & 0x01;

  let sampleRate: number;
  let bitrate: number;
  let samplesPerFrame: number;
  if (versionBits === 0x03) { // MPEG1
    sampleRate = MPEG1_SAMPLE_RATES[sampleRateIndex];
    bitrate = MPEG1_BITRATES_L3[bitrateIndex];
    samplesPerFrame = 1152;
  } else if (versionBits === 0x02) { // MPEG2
    sampleRate = MPEG2_SAMPLE_RATES[sampleRateIndex];
    bitrate = MPEG2_BITRATES_L3[bitrateIndex];
    samplesPerFrame = 576;
  } else if (versionBits === 0x00) { // MPEG2.5
    sampleRate = MPEG25_SAMPLE_RATES[sampleRateIndex];
    bitrate = MPEG2_BITRATES_L3[bitrateIndex];
    samplesPerFrame = 576;
  } else {
    return null; // reserved version
  }
  if (sampleRate <= 0 || bitrate <= 0) return null;

  const length = Math.floor((samplesPerFrame / 8) * (bitrate * 1000) / sampleRate) + padding;
  if (length <= 0) return null;

  return { length, durationSeconds: samplesPerFrame / sampleRate };
}

function trimMp3(b: Uint8Array, seconds: number): TrimResult | null {
  const start = mp3DataStart(b);
  if (start === null) return null;

  let offset = start;
  let elapsed = 0;
  let frameCount = 0;
  while (offset < b.length && elapsed < seconds) {
    const sync = findFrameSync(b, offset);
    if (sync === null) break;
    const frame = parseFrame(b, sync);
    if (!frame) {
      // Not a real frame boundary (e.g. matched sync bits inside frame data
      // of an unsupported variant) — stop rather than risk a corrupt cut.
      if (frameCount === 0) return null;
      break;
    }
    offset = sync + frame.length;
    elapsed += frame.durationSeconds;
    frameCount++;
  }
  if (frameCount === 0) return null;

  // ID3v2 header (if any) carries cover art / tags we don't want in a tiny
  // preview file — start the output at the first real audio frame.
  return {
    bytes: b.subarray(start, Math.min(offset, b.length)),
    mimeType: 'audio/mpeg',
    extension: 'mp3',
  };
}

function readU32LE(b: Uint8Array, o: number): number {
  return b[o] | (b[o + 1] << 8) | (b[o + 2] << 16) | (b[o + 3] << 24);
}

function writeU32LE(view: DataView, o: number, v: number): void {
  view.setUint32(o, v, true);
}

function trimWav(b: Uint8Array, seconds: number): TrimResult | null {
  let offset = 12; // past "RIFF" size "WAVE"
  let fmtChunk: Uint8Array | null = null;
  let dataStart = -1;
  let dataSize = -1;
  let byteRate = 0;
  let blockAlign = 1;

  while (offset + 8 <= b.length) {
    const id = String.fromCharCode(b[offset], b[offset + 1], b[offset + 2], b[offset + 3]);
    const size = readU32LE(b, offset + 4);
    const bodyStart = offset + 8;
    if (id === 'fmt ') {
      fmtChunk = b.subarray(offset, bodyStart + size);
      byteRate = readU32LE(b, bodyStart + 8);
      blockAlign = b[bodyStart + 12] | (b[bodyStart + 13] << 8);
    } else if (id === 'data') {
      dataStart = bodyStart;
      dataSize = size;
      break; // data is conventionally last; nothing after it matters for a preview
    }
    offset = bodyStart + size + (size % 2); // chunks are word-aligned
  }

  if (!fmtChunk || dataStart < 0 || byteRate <= 0 || blockAlign <= 0) return null;

  const maxBytes = Math.min(dataSize, Math.floor(seconds * byteRate));
  const trimmedLen = maxBytes - (maxBytes % blockAlign); // whole sample frames only
  if (trimmedLen <= 0) return null;

  const pcm = b.subarray(dataStart, dataStart + trimmedLen);
  const out = new Uint8Array(12 + fmtChunk.length + 8 + trimmedLen);
  const view = new DataView(out.buffer);

  out.set([0x52, 0x49, 0x46, 0x46], 0); // "RIFF"
  writeU32LE(view, 4, out.length - 8);
  out.set([0x57, 0x41, 0x56, 0x45], 8); // "WAVE"
  out.set(fmtChunk, 12);

  const dataHeaderOffset = 12 + fmtChunk.length;
  out.set([0x64, 0x61, 0x74, 0x61], dataHeaderOffset); // "data"
  writeU32LE(view, dataHeaderOffset + 4, trimmedLen);
  out.set(pcm, dataHeaderOffset + 8);

  return { bytes: out, mimeType: 'audio/wav', extension: 'wav' };
}
