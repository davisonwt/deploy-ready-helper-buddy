// album-tracks -- the track list behind an album card, and what each track
// may play for this caller.
//
// An album is one product whose file_url is a manifest.json in the private
// premium-room bucket, listing its tracks as separate files (SowMusicPage
// album mode). Nothing in the client can read that manifest for a visitor,
// and the tracks have no previews of their own -- which is why the album
// card's play button played nothing: a visitor had no source at all, and
// the owner was handed the manifest JSON itself as an audio src.
//
//   { albumId, action: 'summary' } -> { album: { id, title, trackCount } }
//   { albumId, action: 'list' }
//     -> { album, entitled, tracks: [{ index, number, title, durationSeconds,
//          single: { productId, price } | null, full }] }
//   { albumId, action: 'play', index }
//     -> { url, full, seconds }   (seconds = 45 for a preview)
//
// Entitlement, same rule as get-seed-file: the full file only for the
// album's uploader, someone with a completed bestowal on the album, or --
// per track -- someone with a completed bestowal on that track's single
// product. Everyone else, signed in or not, gets a 45-second preview.
//
// A track's preview is generated once, on first play, into seed-previews at
// a fixed path, cut from only the first bytes of the source (Range request)
// so a 70MB WAV is never pulled whole. It inherits the source's moderation
// verdict (_shared/previewVerdict.ts); a blocked source stays silent.
//
// "single": a row may be bestowed on its own only when the album's sower has
// an ACTIVE music product whose title is exactly this track's title. No
// price is invented: the single's own price is returned.
//
// verify_jwt is false: logged-out visitors preview too. Identity, when
// present, is checked here against the caller's own bearer token.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { trimAudio } from "../_shared/audioTrim.ts";
import { inheritPreviewVerdict } from "../_shared/previewVerdict.ts";

const PREVIEW_SECONDS = 45;
const SIGN_TTL = 60 * 60;
const MP3_PREFIX_BYTES = 8 * 1024 * 1024;

interface ManifestTrack { name: string; size?: number; path: string; price?: number }

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = (JSON.parse(Deno.env.get("SUPABASE_PUBLISHABLE_KEYS") ?? "{}")["default"] || Deno.env.get("SUPABASE_ANON_KEY"))!;
    const serviceKey = (JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") ?? "{}")["default"] || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"))!;
    const service = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

    let callerId: string | null = null;
    const auth = req.headers.get("Authorization") ?? "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
    if (token && token !== anonKey) {
      const { data } = await createClient(supabaseUrl, anonKey, { auth: { persistSession: false } }).auth.getUser(token);
      callerId = data?.user?.id ?? null;
    }

    const body = await req.json().catch(() => ({}));
    const albumId = typeof body?.albumId === "string" ? body.albumId : "";
    const action = body?.action === "play" ? "play" : body?.action === "summary" ? "summary" : "list";
    if (!albumId) return json({ error: "albumId required" }, 400);

    const { data: album } = await service
      .from("products")
      .select("id, title, file_url, sower_id, status")
      .eq("id", albumId)
      .maybeSingle();
    if (!album || album.status !== "active" || !album.file_url?.includes("manifest.json")) {
      return json({ error: "not_an_album", message: "That seed is not an album." }, 404);
    }
    const { data: sower } = await service.from("sowers").select("user_id").eq("id", album.sower_id).maybeSingle();
    const ownerId: string | null = sower?.user_id ?? null;
    if (!ownerId) return json({ error: "no_owner" }, 404);

    const manifestPath = bucketPath(album.file_url)?.path;
    if (!manifestPath) return json({ error: "bad_manifest_path" }, 500);
    const { data: manifestBlob, error: mErr } = await service.storage.from("premium-room").download(manifestPath);
    if (mErr || !manifestBlob) return json({ error: "manifest_missing", message: "This album's track list could not be read." }, 404);
    const manifest = JSON.parse(await manifestBlob.text()) as { tracks?: ManifestTrack[] };
    const tracks = (manifest.tracks ?? []).filter((t) => t?.path);
    // The card label ("Album · N tracks") needs only the count -- no header
    // reads, no entitlement work.
    if (action === "summary") return json({ album: { id: album.id, title: album.title, trackCount: tracks.length } });

    const isOwner = callerId === ownerId;
    const boughtAlbum = !isOwner && callerId ? await hasBestowal(service, albumId, callerId) : false;
    const entitled = isOwner || boughtAlbum;

    // Exact-title singles by the same sower, active music only.
    const titles = tracks.map((t) => trackTitle(t.name));
    const { data: singles } = await service
      .from("products")
      .select("id, title, price, duration")
      .eq("sower_id", album.sower_id)
      .eq("type", "music")
      .eq("status", "active")
      .neq("id", albumId)
      .in("title", titles.length ? titles : ["\u0000"]);
    const singleByTitle = new Map<string, { id: string; price: number; duration: number | null }>();
    for (const s of singles ?? []) if (!singleByTitle.has(s.title)) singleByTitle.set(s.title, { id: s.id, price: Number(s.price), duration: s.duration });

    const boughtSingles = new Set<string>();
    if (callerId && !entitled && singleByTitle.size) {
      const { data: rows } = await service.from("product_bestowals").select("product_id")
        .eq("bestower_id", callerId).eq("status", "completed")
        .in("product_id", [...singleByTitle.values()].map((s) => s.id));
      for (const r of rows ?? []) boughtSingles.add(r.product_id);
    }

    if (action === "list") {
      const listed = await Promise.all(tracks.map(async (t, i) => {
        const title = titles[i];
        const single = singleByTitle.get(title) ?? null;
        const durationSeconds = (await wavDuration(service, t.path)) ?? single?.duration ?? null;
        return {
          index: i,
          number: i + 1,
          title,
          durationSeconds: durationSeconds !== null ? Math.floor(durationSeconds) : null,
          single: single ? { productId: single.id, price: single.price } : null,
          full: entitled || (single ? boughtSingles.has(single.id) : false),
        };
      }));
      return json({ album: { id: album.id, title: album.title, trackCount: tracks.length }, entitled, tracks: listed });
    }

    const index = Number(body?.index);
    const track = Number.isInteger(index) ? tracks[index] : undefined;
    if (!track) return json({ error: "no_such_track" }, 404);
    const single = singleByTitle.get(titles[index]) ?? null;
    const full = entitled || (single ? boughtSingles.has(single.id) : false);

    if (full) {
      const { data: signed } = await service.storage.from("premium-room").createSignedUrl(track.path, SIGN_TTL);
      if (!signed?.signedUrl) return json({ error: "sign_failed" }, 500);
      return json({ url: signed.signedUrl, full: true, seconds: null });
    }

    const previewPath = await ensurePreview(service, ownerId, albumId, index, track.path);
    if (!previewPath) {
      return json({ error: "no_preview", message: "A preview for this track isn't available." }, 422);
    }
    const allowed = await inheritPreviewVerdict(service, { bucket: "premium-room", path: track.path }, previewPath, ownerId);
    if (!allowed) return json({ error: "not_available", message: "This track can't be previewed right now." }, 403);
    const { data: signedPreview } = await service.storage.from("seed-previews").createSignedUrl(previewPath, SIGN_TTL);
    if (!signedPreview?.signedUrl) return json({ error: "sign_failed" }, 500);
    return json({ url: signedPreview.signedUrl, full: false, seconds: PREVIEW_SECONDS });
  } catch (err) {
    console.error("album-tracks error", err);
    return json({ error: err instanceof Error ? err.message : String(err) }, 500);
  }
});

function trackTitle(name: string): string {
  return name.replace(/\.[a-z0-9]+$/i, "").trim();
}

function bucketPath(url: string): { bucket: string; path: string } | null {
  try {
    const m = new URL(url).pathname.match(/\/storage\/v1\/object\/(?:public|sign)\/([^/]+)\/(.+)$/);
    return m ? { bucket: m[1], path: decodeURIComponent(m[2]) } : null;
  } catch { return null; }
}

// deno-lint-ignore no-explicit-any
async function hasBestowal(service: any, productId: string, callerId: string): Promise<boolean> {
  const { data } = await service.from("product_bestowals").select("id")
    .eq("product_id", productId).eq("bestower_id", callerId).eq("status", "completed").limit(1);
  return (data ?? []).length > 0;
}

// deno-lint-ignore no-explicit-any
async function rangeBytes(service: any, path: string, end: number): Promise<Uint8Array | null> {
  const { data: signed } = await service.storage.from("premium-room").createSignedUrl(path, 120);
  if (!signed?.signedUrl) return null;
  const res = await fetch(signed.signedUrl, { headers: { Range: `bytes=0-${end - 1}` } });
  if (!res.ok) return null;
  return new Uint8Array(await res.arrayBuffer());
}

function wavHeader(b: Uint8Array): { dataStart: number; dataSize: number; byteRate: number } | null {
  const tag = (o: number) => String.fromCharCode(b[o], b[o + 1], b[o + 2], b[o + 3]);
  if (b.length < 12 || tag(0) !== "RIFF" || tag(8) !== "WAVE") return null;
  const u32 = (o: number) => (b[o] | (b[o + 1] << 8) | (b[o + 2] << 16) | (b[o + 3] << 24)) >>> 0;
  let o = 12, byteRate = 0;
  while (o + 8 <= b.length) {
    const id = tag(o), size = u32(o + 4), body = o + 8;
    if (id === "fmt ") byteRate = u32(body + 8);
    else if (id === "data") return byteRate > 0 ? { dataStart: body, dataSize: size, byteRate } : null;
    o = body + size + (size % 2);
  }
  return null;
}

// deno-lint-ignore no-explicit-any
async function wavDuration(service: any, path: string): Promise<number | null> {
  if (!/\.wav$/i.test(path)) return null;
  const head = await rangeBytes(service, path, 128 * 1024);
  const h = head ? wavHeader(head) : null;
  return h ? h.dataSize / h.byteRate : null;
}

/** The track's 45s clip at a fixed seed-previews path, made on first use from only the bytes it needs. */
// deno-lint-ignore no-explicit-any
async function ensurePreview(service: any, ownerId: string, albumId: string, index: number, sourcePath: string): Promise<string | null> {
  const ext = /\.mp3$/i.test(sourcePath) ? "mp3" : "wav";
  const previewPath = `${ownerId}/album-${albumId}-${String(index + 1).padStart(2, "0")}.${ext}`;
  const folder = previewPath.split("/")[0];
  const { data: existing } = await service.storage.from("seed-previews").list(folder, { search: previewPath.split("/")[1] });
  if ((existing ?? []).some((o: { name: string }) => o.name === previewPath.split("/")[1])) return previewPath;

  let bytes: Uint8Array | null;
  if (ext === "wav") {
    const head = await rangeBytes(service, sourcePath, 128 * 1024);
    const h = head ? wavHeader(head) : null;
    if (!h) return null;
    bytes = await rangeBytes(service, sourcePath, h.dataStart + Math.min(h.dataSize, Math.ceil(h.byteRate * PREVIEW_SECONDS)) + 16);
  } else {
    bytes = await rangeBytes(service, sourcePath, MP3_PREFIX_BYTES);
  }
  if (!bytes) return null;
  const trimmed = trimAudio(bytes, PREVIEW_SECONDS);
  if (!trimmed) return null;
  const { error } = await service.storage.from("seed-previews")
    .upload(previewPath, trimmed.bytes, { contentType: trimmed.mimeType, upsert: true });
  if (error) { console.error("album-tracks: preview upload failed", previewPath, error.message); return null; }
  return previewPath;
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}
