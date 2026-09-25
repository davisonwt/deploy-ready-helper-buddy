// deno test supabase/functions/_shared/audioDuration.stream.test.ts
import { assertEquals, assertAlmostEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { probeAudioDurationSeconds, probeAudioDurationFromStream } from "./audioDuration.ts";

function streamOf(bytes: Uint8Array, chunk: number): ReadableStream<Uint8Array> {
  let i = 0;
  return new ReadableStream({
    pull(c) {
      if (i >= bytes.length) { c.close(); return; }
      c.enqueue(bytes.slice(i, i + chunk));
      i += chunk;
    },
  });
}

function wav(seconds: number, listChunkBytes = 0): Uint8Array {
  const sampleRate = 8000, channels = 1, bits = 16;
  const byteRate = sampleRate * channels * bits / 8;
  const dataSize = byteRate * seconds;
  const list = listChunkBytes > 0 ? 8 + listChunkBytes : 0;
  const b = new Uint8Array(12 + 24 + list + 8 + dataSize);
  const dv = new DataView(b.buffer);
  b.set([0x52, 0x49, 0x46, 0x46], 0); dv.setUint32(4, b.length - 8, true);
  b.set([0x57, 0x41, 0x56, 0x45], 8);
  let o = 12;
  if (list) { b.set([0x4c, 0x49, 0x53, 0x54], o); dv.setUint32(o + 4, listChunkBytes, true); o += list; }
  b.set([0x66, 0x6d, 0x74, 0x20], o); dv.setUint32(o + 4, 16, true);
  dv.setUint16(o + 8, 1, true); dv.setUint16(o + 10, channels, true);
  dv.setUint32(o + 12, sampleRate, true); dv.setUint32(o + 16, byteRate, true);
  dv.setUint16(o + 20, channels * bits / 8, true); dv.setUint16(o + 22, bits, true);
  o += 24;
  b.set([0x64, 0x61, 0x74, 0x61], o); dv.setUint32(o + 4, dataSize, true);
  return b;
}

// MPEG-1 Layer III, 128 kbps, 44.1 kHz, no padding: 417-byte frames.
function mp3(frames: number, id3Bytes = 0, trailingJunk = 0): Uint8Array {
  const frameLen = 417;
  const head = id3Bytes > 0 ? 10 + id3Bytes : 0;
  const b = new Uint8Array(head + frames * frameLen + trailingJunk);
  if (head) {
    b.set([0x49, 0x44, 0x33, 4, 0, 0], 0);
    b[6] = (id3Bytes >> 21) & 0x7f; b[7] = (id3Bytes >> 14) & 0x7f;
    b[8] = (id3Bytes >> 7) & 0x7f; b[9] = id3Bytes & 0x7f;
  }
  for (let f = 0; f < frames; f++) b.set([0xff, 0xfb, 0x90, 0x64], head + f * frameLen);
  return b;
}

const cases: Array<[string, Uint8Array]> = [
  ["wav 3s", wav(3)],
  ["wav with LIST chunk", wav(2, 5001)],
  ["mp3 plain", mp3(500)],
  ["mp3 with ID3", mp3(321, 70000)],
  ["mp3 with trailing junk", mp3(100, 0, 33)],
  ["not audio", new TextEncoder().encode("hello, this is not audio at all")],
];

for (const [name, bytes] of cases) {
  for (const chunk of [1, 3, 7, 416, 418, 4096, 1 << 20]) {
    Deno.test(`${name}, ${chunk}-byte chunks`, async () => {
      const expected = probeAudioDurationSeconds(bytes);
      const got = await probeAudioDurationFromStream(streamOf(bytes, chunk));
      if (expected === null) assertEquals(got, null);
      else assertAlmostEquals(got!, expected, 1e-9);
    });
  }
}

Deno.test("2-hour 128 kbps MP3 measures 2 hours", async () => {
  const frames = Math.round(7200 / (1152 / 44100));
  const got = await probeAudioDurationFromStream(streamOf(mp3(frames), 65536));
  assertAlmostEquals(got!, 7200, 0.05);
});
