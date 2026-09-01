import { supabase } from '@/integrations/supabase/client';

export type ModerationVerdict = 'allow' | 'block' | 'uncertain';

export interface ModerationResult {
  verdict: ModerationVerdict;
  reason?: string;
}

// Only the scanner-error case gets the literal "try again in a minute"
// copy the spec asked for -- a real content-policy block needs its own,
// unambiguous message, not one that implies a transient glitch.
export const SCANNER_ERROR_MESSAGE =
  "We couldn't verify this image right now — please try again in a minute.";
export const CONTENT_BLOCKED_MESSAGE =
  'This file was not accepted: no nudity or sexual content is allowed on Sow2Grow.';

export function moderationRejectionMessage(reason?: string): string {
  return reason === 'scanner_error' ? SCANNER_ERROR_MESSAGE : CONTENT_BLOCKED_MESSAGE;
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
  try {
    const { data, error } = await supabase.functions.invoke('moderate-media', {
      body: { bucket, path, kind, subjectType: 'storage_object' },
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
