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
 * Call right after a storage upload succeeds, BEFORE doing anything that makes
 * the file reachable by anyone else (signing a URL, calling getPublicUrl and
 * persisting it, inserting/updating a row that references it).
 *
 * Only proceed past this call when verdict === 'allow'. Every caller already
 * guards that way, which is what lets the policy live here instead of in 37
 * call sites.
 *
 * WHAT 'allow' NOW MEANS. The header used to say a network or scanner failure
 * was treated the same as an explicit block. That is no longer true, and the
 * change is deliberate:
 *
 *   scanner says "prohibited"  -> 'block'      (unchanged)
 *   scanner says "not sure"    -> 'uncertain'  (unchanged)
 *   scanner could not answer   -> 'allow', flagged for review
 *
 * Only the third case changed. moderate-media makes that call itself and
 * records the row with needs_review = true; this helper adds the same trade
 * for the one case the function cannot cover, being unreachable entirely.
 * Nobody is blocked because the scanner could not answer.
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

  // Reached only when moderate-media could not be reached AT ALL -- it answers
  // 200 with a verdict even when it fails internally. So this is our own
  // infrastructure being down, which is still not evidence about the image and
  // still not the member's problem. Accept it. (Decided by Davison on
  // 2026-09-18, after this was the last surface still refusing uploads.)
  //
  // Known cost, stated rather than hidden: nothing wrote a media_moderation
  // row, and the browser must never be able to write one -- only the service
  // role may insert, and giving the client a way to stamp an object 'allow'
  // would be a trivial bypass of the entire scanner. Until a row exists,
  // media_is_allowed() is false, so on a private bucket the upload is visible
  // to its owner and to gosats but not yet to other members.
  //
  // So: one last attempt is fired without being awaited. It does not delay the
  // member, and if the function comes back within the next few seconds the row
  // lands by itself and the object becomes readable with no further action.
  void (async () => {
    await new Promise((r) => setTimeout(r, 5000));
    try {
      await supabase.functions.invoke('moderate-media', {
        body: { bucket, path, kind, subjectType: 'storage_object' },
      });
    } catch {
      // Nothing more to do from the browser. The object is uploaded and
      // unscanned; it needs moderate-media to be reachable again.
      console.error('moderate-media unreachable; object left unscanned', { bucket, path });
    }
  })();

  return { verdict: 'allow', reason: 'scanner_unreachable' };
}

/** Same contract, for the one no-bucket case: a base64 avatar about to be written to a DB column. */
export async function moderateBase64Upload(
  base64: string,
  mimeType: string,
): Promise<ModerationResult> {
  // Same trade as moderateStorageUpload, and it was missed when that one was
  // changed on 2026-09-17: this path stayed fully fail-closed, so an avatar
  // could still be refused because the scanner was unreachable.
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const { data, error } = await supabase.functions.invoke('moderate-media', {
        body: { base64, mimeType, kind: 'image', subjectType: 'avatar' },
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

  // An avatar has no storage object and no media_is_allowed() gate -- it is a
  // column on profiles -- so accepting here costs nothing beyond the image
  // being unscanned, which is exactly what the review queue is for.
  return { verdict: 'allow', reason: 'scanner_unreachable' };
}
