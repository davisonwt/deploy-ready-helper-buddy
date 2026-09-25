// Measures a stored WAV/MP3 by streaming it from Storage rather than
// downloading it whole: a 2-hour show file (up to 150 MB) held in memory
// twice over would exceed the edge runtime's memory limit.

import { probeAudioDurationFromStream } from "./audioDuration.ts";

export type StoredAudioResult =
  | { ok: true; seconds: number }
  | { ok: false; reason: "missing" | "unreadable" };

// deno-lint-ignore no-explicit-any
export async function probeStoredAudio(service: any, bucket: string, path: string): Promise<StoredAudioResult> {
  const { data: signed, error: signError } = await service.storage.from(bucket).createSignedUrl(path, 300);
  if (signError || !signed?.signedUrl) return { ok: false, reason: "missing" };
  const res = await fetch(signed.signedUrl);
  if (!res.ok || !res.body) {
    await res.body?.cancel();
    return { ok: false, reason: "missing" };
  }
  const seconds = await probeAudioDurationFromStream(res.body);
  return seconds === null ? { ok: false, reason: "unreadable" } : { ok: true, seconds };
}
