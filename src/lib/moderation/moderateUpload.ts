import { supabase } from '@/integrations/supabase/client';

export type ModerationVerdict = 'allow' | 'block' | 'uncertain';

export interface ModerationResult {
  verdict: ModerationVerdict;
  reason?: string;
}

// Only the scanner-error case gets the literal "try again in a minute"
// copy the spec asked for -- a real content-policy block needs its own,
// unambiguous message, not one that implies a transient glitch.
//
// video/* and audio/* no longer reach 'scanner_error' at all under normal
// operation (moderate-media allows them straight through per the
// 2026-09-10 founder policy -- see moderate-media/index.ts) -- this stays
// kind-aware for the rare mismatched-type edge case and so it says the
// right noun for whichever caller does still hit it (image scans remain
// fail-closed).
export function scannerErrorMessage(kind: 'image' | 'video' | 'file' = 'file'): string {
  const noun = kind === 'image' ? 'image' : kind === 'video' ? 'video' : 'file';
  return `We couldn't verify this ${noun} right now — please try again in a minute.`;
}
export const SCANNER_ERROR_MESSAGE = scannerErrorMessage('image');
export const CONTENT_BLOCKED_MESSAGE =
  'This file was not accepted: no nudity or sexual content is allowed on Sow2Grow.';

export function moderationRejectionMessage(reason?: string, kind: 'image' | 'video' | 'file' = 'file'): string {
  return reason === 'scanner_error' ? scannerErrorMessage(kind) : CONTENT_BLOCKED_MESSAGE;
}

/**
 * Call right after a storage upload succeeds, BEFORE doing anything that
 * makes the file reachable by anyone else (signing a URL, calling
 * getPublicUrl and persisting it, inserting/updating a row that
 * references it). Only proceed past this call when verdict === 'allow' --
 * every other outcome (including a network/scanner failure, which this
 * treats the same as an explicit block) means the file must stay exactly
 * as invisible as it was right after upload. See moderate-media/index.ts
 * for why: an unscanned file must never become visible.
 */
export async function moderateStorageUpload(
  bucket: string,
  path: string,
  kind: 'image' | 'video' = 'image',
): Promise<ModerationResult> {
  // Two attempts: a single dropped request should not cost a member their
  // upload. The function itself answers 200 with a verdict even when it
  // fails internally (it fails OPEN now -- see moderate-media's header), so
  // reaching the catch below means the function could not be reached at all.
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const { data, error } = await supabase.functions.invoke('moderate-media', {
        body: { bucket, path, kind, subjectType: 'storage_object' },
      });
      if (!error) {
        const verdict = data?.verdict;
        if (verdict === 'allow' || verdict === 'block' || verdict === 'uncertain') {
          return { verdict, reason: data?.reason };
        }
      }
    } catch {
      // fall through to the retry
    }
    if (attempt === 0) await new Promise((r) => setTimeout(r, 1200));
  }

  // Deliberately still closed, and the ONLY remaining case that is.
  //
  // Everything the scanner itself can get wrong -- quota, timeout, bad
  // response -- now fails open inside the function, which records an
  // 'allow' row flagged for review. That row is what makes the image
  // readable: storage RLS is media_is_allowed(), i.e. `verdict = 'allow'`
  // on the most recent row.
  //
  // Here the function never ran, so no row exists and none can be written
  // from the client -- only the service role may insert into
  // media_moderation, and giving the browser a way to mark an object
  // 'allow' would be a trivial bypass of the whole scanner. Accepting here
  // would hand the member a listing whose cover is visible only to
  // themselves, with nothing queued for review. A clear error beats that.
  return { verdict: 'block', reason: 'scanner_error' };
}

/** Same contract, for the one no-bucket case: a base64 avatar about to be written to a DB column. */
export async function moderateBase64Upload(
  base64: string,
  mimeType: string,
): Promise<ModerationResult> {
  try {
    const { data, error } = await supabase.functions.invoke('moderate-media', {
      body: { base64, mimeType, kind: 'image', subjectType: 'avatar' },
    });
    if (error) return { verdict: 'block', reason: 'scanner_error' };
    const verdict = data?.verdict;
    if (verdict === 'allow' || verdict === 'block' || verdict === 'uncertain') {
      return { verdict, reason: data?.reason };
    }
    return { verdict: 'block', reason: 'scanner_error' };
  } catch {
    return { verdict: 'block', reason: 'scanner_error' };
  }
}
