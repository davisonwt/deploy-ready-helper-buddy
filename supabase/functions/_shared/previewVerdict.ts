// A preview clip inherits the moderation verdict of the file it was cut from.
//
// seed-previews is private and read through media_is_allowed(): any object
// created after 2026-09-01 needs an explicit 'allow' row in media_moderation
// or nobody but its owner and admins can hear it. generate-preview never
// wrote one, so from the cutoff on no visitor could hear any preview (79 of
// 118 active previews, measured 2026-09-25).
//
// A preview is a 45-second trim of a source file that is itself moderated,
// so its verdict is the source's: 'allow' only if the source's latest
// verdict is 'allow'. A blocked or uncertain source keeps its clip blocked.
//
// Audio is never scanned (founder policy 2026-09-10, moderate-media:
// verdict 'allow', reason 'unscanned_audio_policy'). When a source audio
// file has no verdict yet -- album tracks never went through moderate-media,
// and a single's preview can be generated before its verdict lands -- the
// same row moderate-media would have written is recorded for the source
// first. Nothing here ever allows a file moderate-media would not.

// deno-lint-ignore no-explicit-any
type Service = any;

const AUDIO_EXT = /\.(wav|mp3)$/i;
const MODEL_VERSION = "sightengine:nudity-2.1,face-attributes";

export async function latestVerdict(service: Service, bucket: string, path: string): Promise<{ verdict: string; reason: string | null } | null> {
  const { data } = await service
    .from("media_moderation")
    .select("verdict, reason")
    .eq("bucket_id", bucket)
    .eq("object_path", path)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data ?? null;
}

/** Records moderate-media's audio-policy verdict for an audio source that has none. */
export async function ensureAudioPolicyVerdict(service: Service, bucket: string, path: string, uploaderId: string): Promise<void> {
  if (!AUDIO_EXT.test(path)) return;
  if (await latestVerdict(service, bucket, path)) return;
  await service.from("media_moderation").insert({
    bucket_id: bucket, object_path: path, subject_type: "storage_object", subject_ref: null,
    uploader_user_id: uploaderId, verdict: "allow", minor_suspected: false,
    reason: "unscanned_audio_policy", scores: null, model_version: MODEL_VERSION, needs_review: false,
  });
}

/** Gives a preview clip its source's verdict. Returns whether the clip is now playable by visitors. */
export async function inheritPreviewVerdict(
  service: Service,
  source: { bucket: string; path: string },
  previewPath: string,
  uploaderId: string,
): Promise<boolean> {
  await ensureAudioPolicyVerdict(service, source.bucket, source.path, uploaderId);
  const src = await latestVerdict(service, source.bucket, source.path);
  if (!src || src.verdict !== "allow") return false;
  const existing = await latestVerdict(service, "seed-previews", previewPath);
  if (existing?.verdict === "allow") return true;
  const { error } = await service.from("media_moderation").insert({
    bucket_id: "seed-previews", object_path: previewPath, subject_type: "storage_object", subject_ref: null,
    uploader_user_id: uploaderId, verdict: "allow", minor_suspected: false,
    reason: `inherited_from_source:${src.reason ?? "allow"}`, scores: null, model_version: MODEL_VERSION, needs_review: false,
  });
  if (error) console.error("inheritPreviewVerdict: insert failed", previewPath, error.message);
  return !error;
}
