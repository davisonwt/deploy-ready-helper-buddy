// Backfill scan for everything already sitting in the moderation-target
// buckets (and profiles.avatar_url) BEFORE this feature existed.
//
// NOT a migration. NOT run automatically. Does NOT hide, remove, or
// delete anything by itself -- it only calls moderate-media (which writes
// verdict rows to media_moderation) and prints a summary. Per the
// grandfather clause in 20260902114500_media_moderation_grandfather_existing.sql,
// pre-cutover content stays visible regardless of what verdict this script
// logs; a block/uncertain row here only means it now shows up in the
// gosat Trust & Safety queue (src/components/admin/TrustSafetyQueue.tsx)
// for a human to actually act on.
//
// Usage:
//   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... deno run --allow-net --allow-env scripts/backfill-media-moderation.ts
//
// Requires the service-role backfill path added to moderate-media/index.ts
// in this same change -- flag that to a human reviewer, it's new surface
// on a function otherwise gated to real user sessions. This script sends
// the service role key as the moderate-media Bearer token specifically to
// hit that path; it never touches any other privileged operation.
//
// NOT independently verified against a live run: the Storage REST list
// endpoint shape (recursive folder walk) and the /storage/v1/object/info
// owner lookup are written from the documented API shape, not exercised
// against this project's real buckets (no access to a service-role key
// from this environment). Do a small manual test -- e.g. temporarily
// narrow TARGET_BUCKETS to one small bucket -- before trusting the full
// run's counts.

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error("Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.");
  Deno.exit(1);
}

const TARGET_BUCKETS = [
  "premium-room", "seed-previews", "orchard-images", "tribal-hearts-photos",
  "tribal-hearts-media", "chat-files", "chat-media", "music-tracks", "videos",
  "session-documents", "radio-session-assets", "journal-media",
  // chat_files (underscore) has no real content -- see SESSION-STATE.md.
];

interface Counts { total: number; allow: number; block: number; uncertain: number; minorSuspected: number; errors: number; }
const counts: Counts = { total: 0, allow: 0, block: 0, uncertain: 0, minorSuspected: 0, errors: 0 };

// This project doesn't have a generic read-SQL RPC exposed to the client
// role today -- listing objects instead goes through Storage's own list
// API per bucket (paginated), which needs no new SQL surface at all.
async function* listAllObjects(bucket: string): AsyncGenerator<{ path: string }> {
  let offset = 0;
  const limit = 1000;
  while (true) {
    const res = await fetch(`${SUPABASE_URL}/storage/v1/object/list/${bucket}`, {
      method: "POST",
      headers: { apikey: SERVICE_ROLE_KEY!, Authorization: `Bearer ${SERVICE_ROLE_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ prefix: "", limit, offset, sortBy: { column: "name", order: "asc" } }),
    });
    if (!res.ok) {
      console.error(`  ! could not list ${bucket}: ${res.status} ${await res.text()}`);
      return;
    }
    const items: any[] = await res.json();
    // Storage's list API is not recursive -- folders show up as entries
    // with no metadata. Every upload path in this codebase nests at least
    // one folder deep (userId/..., roomId/..., etc.), so walk one level
    // down for anything that looks like a folder rather than a file.
    for (const item of items) {
      if (item.id === null && item.name) {
        yield* listAllObjectsUnder(bucket, item.name);
      } else if (item.name) {
        yield { path: item.name };
      }
    }
    if (items.length < limit) break;
    offset += limit;
  }
}

async function* listAllObjectsUnder(bucket: string, prefix: string): AsyncGenerator<{ path: string }> {
  let offset = 0;
  const limit = 1000;
  while (true) {
    const res = await fetch(`${SUPABASE_URL}/storage/v1/object/list/${bucket}`, {
      method: "POST",
      headers: { apikey: SERVICE_ROLE_KEY!, Authorization: `Bearer ${SERVICE_ROLE_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ prefix, limit, offset, sortBy: { column: "name", order: "asc" } }),
    });
    if (!res.ok) return;
    const items: any[] = await res.json();
    for (const item of items) {
      const full = `${prefix}/${item.name}`;
      if (item.id === null) {
        yield* listAllObjectsUnder(bucket, full);
      } else {
        yield { path: full };
      }
    }
    if (items.length < limit) break;
    offset += limit;
  }
}

async function scanOne(body: Record<string, unknown>, label: string) {
  counts.total++;
  try {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/moderate-media`, {
      method: "POST",
      headers: { Authorization: `Bearer ${SERVICE_ROLE_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    const verdict = data?.verdict as string | undefined;
    if (verdict === "allow") counts.allow++;
    else if (verdict === "uncertain") counts.uncertain++;
    else counts.block++;
    if (data?.reason === "minor_sexual_content") counts.minorSuspected++;
    console.log(`  ${verdict ?? "error"} — ${label}`);
  } catch (e) {
    counts.errors++;
    console.error(`  ! ${label}: ${e instanceof Error ? e.message : e}`);
  }
}

// Uploader for a backfilled object isn't known here without a second
// lookup per bucket's own metadata table (varies per bucket) -- rather
// than guess wrong, this uses the storage object's own `owner` column,
// resolved via a lightweight per-object metadata fetch. Falls back to a
// placeholder uuid (clearly not a real user) if that's ever unavailable,
// which is fine: the row still logs and shows up in the queue, it's just
// attributed to "unknown" rather than blocking the scan.
const UNKNOWN_UPLOADER = "00000000-0000-0000-0000-000000000000";

async function ownerOf(bucket: string, path: string): Promise<string> {
  try {
    const res = await fetch(
      `${SUPABASE_URL}/storage/v1/object/info/${bucket}/${encodeURIComponent(path)}`,
      { headers: { apikey: SERVICE_ROLE_KEY!, Authorization: `Bearer ${SERVICE_ROLE_KEY}` } },
    );
    if (!res.ok) return UNKNOWN_UPLOADER;
    const data = await res.json();
    return data?.owner ?? UNKNOWN_UPLOADER;
  } catch {
    return UNKNOWN_UPLOADER;
  }
}

async function main() {
  for (const bucket of TARGET_BUCKETS) {
    console.log(`\n== ${bucket} ==`);
    for await (const obj of listAllObjects(bucket)) {
      const kind = /\.(mp4|mov|webm|avi)$/i.test(obj.path) ? "video" : "image";
      const uploaderUserId = await ownerOf(bucket, obj.path);
      await scanOne({ bucket, path: obj.path, kind, subjectType: "storage_object", uploaderUserId }, `${bucket}/${obj.path}`);
    }
  }

  console.log(`\n== profiles.avatar_url ==`);
  const avatarsRes = await fetch(
    `${SUPABASE_URL}/rest/v1/profiles?select=user_id,avatar_url&avatar_url=not.is.null`,
    { headers: { apikey: SERVICE_ROLE_KEY!, Authorization: `Bearer ${SERVICE_ROLE_KEY}` } },
  );
  const profiles: any[] = avatarsRes.ok ? await avatarsRes.json() : [];
  for (const p of profiles) {
    const avatarUrl: string = p.avatar_url;
    if (typeof avatarUrl !== "string" || !avatarUrl.startsWith("data:")) {
      // Not a base64 data URI (e.g. an orchard-images URL from
      // QuickProfileSetup.jsx) -- that's a storage object, already
      // covered by the orchard-images bucket scan above, not this branch.
      continue;
    }
    const commaIdx = avatarUrl.indexOf(",");
    const mimeMatch = avatarUrl.slice(5, commaIdx).match(/^([^;]+)/);
    await scanOne(
      { base64: avatarUrl.slice(commaIdx + 1), mimeType: mimeMatch?.[1] ?? "image/jpeg", kind: "image", subjectType: "avatar", uploaderUserId: p.user_id },
      `avatar:${p.user_id}`,
    );
  }

  console.log("\n===== SUMMARY =====");
  console.log(`Total scanned:      ${counts.total}`);
  console.log(`Allow:              ${counts.allow}`);
  console.log(`Block:              ${counts.block}`);
  console.log(`Uncertain:          ${counts.uncertain}`);
  console.log(`Minor suspected:    ${counts.minorSuspected}`);
  console.log(`Errors:             ${counts.errors}`);
  console.log("\nNothing has been hidden or removed. Block/uncertain/minor-suspected");
  console.log("rows are now in the Trust & Safety queue (admin dashboard -> Moderation)");
  console.log("for a human to review and act on.");
}

await main();
