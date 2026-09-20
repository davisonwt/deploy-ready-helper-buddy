// radio-now-playing -- metadata only, for the now-playing card and for the
// client player's own currentTime seek. Never returns a file URL of any
// kind; the audio itself only ever comes from radio-stream.
//
// Auth required (any signed-in member) -- same manual bearer-verification
// shape get-seed-file uses, since this also needs to run as service role
// while still knowing who's asking (not that identity gates anything here
// today; consistent with the rest of this app requiring sign-in for the
// Cockpit/radio surfaces at all).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { computeCurrentTrack, fetchRadioTracks } from "../_shared/radioSchedule.ts";
import { resolveSlotOverride, resolveSongTrack } from "../_shared/radioSlots.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const anonKey = (JSON.parse(Deno.env.get("SUPABASE_PUBLISHABLE_KEYS") ?? "{}")["default"] || Deno.env.get("SUPABASE_ANON_KEY"));
    const serviceRoleKey = (JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") ?? "{}")["default"] || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"));
    if (!supabaseUrl || !anonKey || !serviceRoleKey) {
      return json({ error: "server_misconfigured" }, 500);
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return json({ error: "unauthorized" }, 401);
    }
    const token = authHeader.slice("Bearer ".length);
    const authClient = createClient(supabaseUrl, anonKey, { auth: { persistSession: false } });
    const { data: userData, error: userError } = await authClient.auth.getUser(token);
    if (userError || !userData?.user) return json({ error: "unauthorized" }, 401);

    const service = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });
    const now = Date.now();

    // A scheduled Grove Station slot overrides autopilot for as long as its
    // rundown has real segments left to cover; once it runs out (or no
    // slot is scheduled at all) this returns null and autopilot proceeds
    // exactly as it always has -- no special-casing needed below.
    const override = await resolveSlotOverride(service, now);
    const tracks = await fetchRadioTracks(service);

    if (override) {
      if (override.segment.kind === "song" && override.segment.trackProductId) {
        const track = await resolveSongTrack(service, override.segment.trackProductId);
        if (track) {
          return json({
            playing: true,
            serverNow: now,
            poolSize: tracks.length,
            track: {
              id: track.id,
              title: track.title,
              sowerUserId: track.sowerUserId,
              sowerName: track.sowerName,
              sowerUsername: track.sowerUsername,
              cover: track.cover,
              durationSeconds: track.durationSeconds,
              price: track.price,
            },
            offsetSeconds: override.segment.offsetSeconds,
            slot: {
              id: override.slotId,
              djName: override.djName,
              djUsername: override.djUsername,
              title: override.showTitle,
              mode: override.mode,
              adPrice: override.adPrice,
            },
          });
        }
        // Referenced product vanished (deleted/unpublished after the
        // rundown was built) -- fall through to autopilot rather than
        // serve a broken card.
      } else if (override.segment.audioPath) {
        // Non-song segment (opening/talk/advert/jingle/handover): no
        // product, so no `track` -- a distinct `segment` card instead
        // (DJ + show title + segment image), per spec. `track: null` is a
        // genuinely new state for this endpoint; the front-end
        // (radioPlayback.ts / NowPlayingSheet.tsx) was updated in the same
        // deploy to render it.
        let imageUrl: string | null = null;
        if (override.segment.imagePath) {
          const { data: signedImage } = await service.storage
            .from("dj-rundown-segments")
            .createSignedUrl(override.segment.imagePath, 3600);
          imageUrl = signedImage?.signedUrl ?? null;
        }
        return json({
          playing: true,
          serverNow: now,
          poolSize: tracks.length,
          track: null,
          offsetSeconds: override.segment.offsetSeconds,
          slot: {
            id: override.slotId,
            djUserId: override.djUserId,
            djName: override.djName,
            djUsername: override.djUsername,
            title: override.showTitle,
            mode: override.mode,
            adPrice: override.adPrice,
          },
          segment: {
            id: override.segment.id,
            kind: override.segment.kind,
            durationSeconds: override.segment.durationSeconds,
            imageUrl,
            notes: override.segment.notes,
          },
        });
      }
    }

    const current = computeCurrentTrack(tracks, now);

    if (!current) {
      return json({ playing: false, serverNow: now, poolSize: tracks.length });
    }

    return json({
      playing: true,
      serverNow: now,
      poolSize: tracks.length,
      track: {
        id: current.track.id,
        title: current.track.title,
        sowerUserId: current.track.sowerUserId,
        sowerName: current.track.sowerName,
        sowerUsername: current.track.sowerUsername,
        cover: current.track.cover,
        durationSeconds: current.track.durationSeconds,
        price: current.track.price,
      },
      offsetSeconds: current.offsetSeconds,
    });
  } catch (err) {
    console.error("radio-now-playing error", err);
    return json({ error: err instanceof Error ? err.message : String(err) }, 500);
  }
});

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
