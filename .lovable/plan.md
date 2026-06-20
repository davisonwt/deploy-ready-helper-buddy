# Phase 2 — Real Image, Video, Voiceover via Replicate (plan only)

## 0. Provider & gating context (no changes)

- `REPLICATE_API_TOKEN` is already in Supabase Function secrets — reuse it from every function below (no Lovable AI gateway, no Connector Gateway; we call `api.replicate.com` directly with `Authorization: Token ${REPLICATE_API_TOKEN}`).
- Effective tier comes from `public.get_effective_tier(uuid)` returning `'sower' | 'keeper' | 'ambassador' | 'council'`. There is no separate "whisperer" tier — that's a UX label for sower-side personas. So "sowers/whisperers only" = **tier ∈ {'sower','keeper','ambassador','council'}**, i.e. any authenticated, profiled user. The real gate that matters is "not anon, and has a row in `profiles`," not the tier name.
- The existing per-month consumption is `check_and_consume_companion_quota(_user, _slug)` — we reuse the same quota table for video/voiceover so abuse is bounded by tier just like Companions are.

---

## 1. IMAGE FIX — `supabase/functions/generate-thumbnail/index.ts`

**Problem:** calls `https://api.openai.com/v1/images/generations` with `model: 'dall-e-3'`. DALL-E 3 was retired from the OpenAI Images API; this function returns 5xx in prod.

**Replacement model — FLUX.1 [schnell] on Replicate**
- Owner/name: `black-forest-labs/flux-schnell` (official model — use the model-scoped endpoint, no version hash required).
- License: Apache 2.0, commercial use OK.
- Cost: ≈ $0.003 per 1024×1024 image (Replicate published rate).
- Latency: ~1–2 s; synchronous-feeling.

**Endpoints**
- Create: `POST https://api.replicate.com/v1/models/black-forest-labs/flux-schnell/predictions`
- Header: `Prefer: wait` (up to 60 s) so we can return the URL in a single call and skip polling for fast image models.
- Body:
  ```json
  {
    "input": {
      "prompt": "<imagePrompt>",
      "aspect_ratio": "16:9",
      "num_outputs": 1,
      "output_format": "webp",
      "output_quality": 90,
      "go_fast": true,
      "megapixels": "1"
    }
  }
  ```
- Response: `{ id, status: "succeeded", output: ["https://replicate.delivery/.../out-0.webp"], ... }`. `output[0]` is the image URL (valid ~1 h).

**File-level changes in `generate-thumbnail/index.ts`**
1. Drop `OPENAI_API_KEY` branch entirely; require `REPLICATE_API_TOKEN`.
2. Keep auth, rate limit, daily-usage, and `confirmed` gates as-is.
3. Replace the OpenAI fetch block with the Replicate call above.
4. **Persist the image** to Supabase Storage before saving to `ai_creations`, because `replicate.delivery` URLs expire in ~1 h:
   - New bucket `ai-generations` (public read; see §6 storage plan).
   - `fetch(output[0]) → arrayBuffer() → supabase.storage.from('ai-generations').upload('thumbnails/{user_id}/{uuid}.webp', ...)` then `getPublicUrl(...)`.
5. Insert into `ai_creations` with `image_url = publicUrl`, `metadata.model = 'flux-schnell'`, `metadata.replicate_id`, `metadata.original_url` (for debugging).
6. Keep the "images count as 2 usages" rule.

---

## 2. VIDEO — rebuild `supabase/functions/generate-video/index.ts`

**Recommendation: Wan 2.2 (i2v-fast)** for "advertising videos for sowers," because:
- Apache 2.0, commercial use OK.
- The fast i2v variant produces 5 s 480p/720p clips in ~60–90 s on Replicate, ~$0.08–$0.12/clip. That's the right cost/quality knee for marketing reels.
- Image-to-video is more useful than pure text-to-video for sellers — they already have product photos / orchard shots; we animate those.
- Pair with a text-to-video fallback (`wan-video/wan-2.2-t2v-fast`) for the "I have no image yet" path.

**Models to pin (official models, no version hash needed — use model-scoped endpoint)**
- Image-to-video: `wan-video/wan-2.2-i2v-fast`
- Text-to-video: `wan-video/wan-2.2-t2v-fast`

(LTX-Video alternative: `lightricks/ltx-video` — faster but lower fidelity; we keep it as a config swap, not the default.)

**Endpoints**
- Upload starting frame (optional): `POST https://api.replicate.com/v1/files` (multipart, field `content`). Returns `{ urls: { get } }` — use as `input.image`.
- Create prediction: `POST https://api.replicate.com/v1/models/wan-video/wan-2.2-i2v-fast/predictions`
- Body (i2v):
  ```json
  {
    "input": {
      "image": "<https url>",
      "prompt": "<motion description>",
      "num_frames": 81,
      "fps": 16,
      "resolution": "480p"
    }
  }
  ```
- Body (t2v): drop `image`.
- Polling: `GET https://api.replicate.com/v1/predictions/{id}` until `status ∈ {succeeded, failed, canceled}`. **Do not use** the `urls.get` from the create response — same URL works but we keep it consistent.

**Approximate cost & time per clip**
- Wan 2.2 i2v-fast @ 480p, 5 s: ~$0.08, ~60–90 s wall.
- Wan 2.2 t2v-fast @ 480p, 5 s: ~$0.10, ~75–120 s wall.

**File-level changes**
1. Keep the existing `{ generation_id, prompt }` contract; **extend** to `{ generation_id, prompt, image_url?, duration_seconds?, resolution? }`.
2. Replace the dummy version hash + hard-coded `num_frames: 24, fps: 8, 512x512` block with the Wan 2.2 call above, switching i2v vs t2v based on presence of `image_url`.
3. Branch: if `image_url` is a Supabase Storage URL, pass it directly; if it's a local upload from the UI, first POST to `/v1/files` and use the returned URL. (Phase 2: just require a public URL — UI can pre-upload to `ai-generations` bucket.)
4. **Same persistence rule as images**: when `succeeded`, download `output` (string URL for Wan) → upload to `ai-generations/videos/{user_id}/{uuid}.mp4` → store the public URL in `ai_creations.metadata.video_url` and `metadata.status='completed'`. Replicate's CDN URL expires.
5. Polling loop: replace the existing one with a max-wait of 8 min, backoff 3 s → 8 s, and update `ai_creations.metadata.progress` on each tick so the frontend's existing `VideoGeneration.tsx` poll sees progress.
6. Daily limit: keep `dailyLimit = 3` for video specifically; also call `check_and_consume_companion_quota(user.id, 'birch')` so video generations decrement Birch's monthly quota the same way chat does.
7. Surface Replicate's `error` field verbatim on failure (truncated) into `metadata.error` so the UI can show it instead of a generic message.

---

## 3. VOICEOVER — new `supabase/functions/generate-voiceover/index.ts`

**Recommendation: Kokoro-82M** (Apache 2.0, multi-voice, multilingual, very cheap; Chatterbox is also fine but English-only and a touch heavier).
- Model: `jaaari/kokoro-82m` on Replicate (community model — pin a version hash; latest as of writing is `f559560eb822dc509045f3921a1921234918b91739db4bf3daab2169b71c7a13`; the implementer will re-check the latest stable version at build time).
- License: Apache 2.0 model weights; the Replicate wrapper is Apache 2.0 as well.
- Cost: ~$0.0005 per second of audio on Replicate's T4 billing (essentially negligible for typical 30 s voiceovers).
- Latency: ~5–15 s for a 30 s clip.

**Endpoint**
- `POST https://api.replicate.com/v1/predictions` with `{ version: "<hash>", input: { text, voice, speed } }` and `Prefer: wait` (Kokoro is fast enough to often complete inside the 60 s wait window).
- Voices: `af_bella`, `af_nicole`, `am_adam`, `bf_emma`, etc. — surfaced to the UI as a fixed enum.

**File-level layout (`supabase/functions/generate-voiceover/index.ts`)**
1. Same skeleton as the new `generate-thumbnail`: CORS, auth via JWT, rate limit, `get_ai_usage_today`, `check_and_consume_companion_quota(user.id, 'birch')` (voiceover is part of the reel-keeper budget; alternatively a new `'voice'` quota slug if we want to track separately).
2. Validate body: `{ generation_id, text (≤ 2000 chars), voice (enum), speed? (0.5–2.0) }` with Zod.
3. Insert/find the `ai_creations` row with `content_type: 'voice_over'` (already an enum value; `VideoGeneration.tsx` even uses it today by accident — we now use it correctly).
4. Call Replicate with `Prefer: wait`. If the wait timed out, fall back to polling like video.
5. On success, fetch the resulting `.wav`/`.mp3` URL → upload to `ai-generations/voiceovers/{user_id}/{uuid}.mp3` → write `metadata.audio_url`, `metadata.duration_s`, `metadata.voice`, `metadata.model='kokoro-82m@{hash}'`.
6. Add `supabase/config.toml` entry: `[functions.generate-voiceover] verify_jwt = false` (matches the other AI functions; we validate the JWT manually like in `generate-video`).

---

## 4. WIRING — Birch goes from plans-only to "Generate this"

**Goal:** chat stays free-flowing and cheap; the costly generation is always a deliberate user click, never an implicit side-effect of chatting.

**Pattern (two-step, structured handoff)**

1. **Step 1 — chat draft (already works).** `CompanionDrawer` → `companion-invoke` → Gemini returns markdown with a shot list / voiceover script. No money spent on Replicate.

2. **Step 2 — extract a structured "reel plan".** Update Birch's `SYSTEM_PROMPTS` entry in `supabase/functions/companion-invoke/index.ts` so that when the user signals readiness ("looks good", "let's make it", or the UI passes an explicit `finalize: true` flag), Birch returns its final answer with a fenced JSON block:
   ```json
   {
     "reel_plan": {
       "scenes": [{ "shot": "...", "duration_s": 5, "image_prompt": "..." }],
       "voiceover_script": "...",
       "voice": "af_bella",
       "music_mood": "warm acoustic"
     }
   }
   ```
   The drawer parses any fenced ```json reel_plan``` block out of the assistant message and stashes it in component state as `pendingPlan`.

3. **Step 3 — explicit Generate buttons in the drawer.** Add a compact action bar in `src/components/companions/CompanionDrawer.tsx`, only rendered for `meta.slug === 'birch'` and only when `pendingPlan` exists:
   - **`[🖼 Generate cover image]`** → calls `generate-thumbnail` with `customPrompt = pendingPlan.scenes[0].image_prompt`, `confirmed: true`. Shows result inline.
   - **`[🎬 Generate 5s reel]`** → after the cover image lands (or a user-uploaded image), pre-creates an `ai_creations` row, then calls `generate-video` with `{ generation_id, prompt: pendingPlan.scenes[0].shot, image_url: <cover url> }`. The existing polling logic in `VideoGeneration.tsx` is lifted into a small `useGenerationPolling(generation_id)` hook so the drawer can reuse it.
   - **`[🎙 Generate voiceover]`** → calls `generate-voiceover` with `{ text: pendingPlan.voiceover_script, voice: pendingPlan.voice }`. Renders an `<audio controls>` inline.

   Each button is **single-click-and-disabled-until-done**, shows the Replicate-side cost label ("~$0.08", "~$0.003", "~$0.01"), and writes the artifact URL back into the message thread as an assistant follow-up so the conversation history reflects what was created.

4. **No silent generation.** `companion-invoke` itself never calls `generate-video` / `generate-voiceover` / `generate-thumbnail`. Tool-calling stays read-only for Phase 2 — write/expensive actions are user-gated buttons only. This is what keeps Phase 1's "scoped to caller" guarantee honest and keeps cost predictable.

5. **Same pattern reusable for Willow.** Willow already returns images via `companion-invoke`'s image-modality path (cheap, in-band). For higher-quality cover art, expose the same `[🖼 Generate hi-res]` button to call `generate-thumbnail` (FLUX) explicitly.

---

## 5. ENTITLEMENT — who can hit these functions

**Current reality**
- Roles (`public.app_role`): `admin`, `moderator`, `user`, `gosat`, `radio_admin`, `courier`. No `sower`/`whisperer` role — those are UX terms, not DB roles.
- Tiers (`get_effective_tier`): `sower | keeper | ambassador | council`. Every authenticated profile is at least `sower`.

**Gate (applies identically to all three functions)** — implemented inside each edge function, not in a shared middleware (we don't have one):
1. Require a real JWT (existing pattern: `supabase.auth.getUser(token)`); 401 if missing.
2. Confirm `profiles` row exists for `user.id` (the `get_effective_tier` call already implies this — if it returns `'sower'` for a missing profile we additionally `SELECT 1 FROM profiles WHERE user_id = ...` to fail closed).
3. Per-tier daily caps (config object at top of each function):
   - `sower`: 5 images / 1 video / 2 voiceovers per day
   - `keeper`: 15 / 3 / 10
   - `ambassador`: 40 / 8 / 25
   - `council`: unlimited (skip cap, still log)
4. Also gate by `check_and_consume_companion_quota(user.id, 'birch')` so the monthly Companion entitlement budget covers the costly actions too — prevents a sower from blowing through generations on day 1.
5. **Admins/gosat bypass** caps but everything is still logged to `s2g_companion_runs` (extend it with `kind: 'image'|'video'|'voice'` and `cost_usd_estimate` so we can audit Replicate spend per user).

---

## 6. Cross-cutting infra changes (small)

- **Storage bucket migration**: `ai-generations` (public read, authenticated insert). Paths: `thumbnails/{uid}/...`, `videos/{uid}/...`, `voiceovers/{uid}/...`. RLS: owner can delete; service role can write.
- **`supabase/config.toml`**: register `generate-voiceover` (mirror `generate-video`'s `verify_jwt = false`).
- **Secrets check**: only `REPLICATE_API_TOKEN` is needed. We will *remove* the `OPENAI_API_KEY` dependency from `generate-thumbnail`; if no other function uses it, surface a note to the user that the secret can be deleted from Project Settings.
- **`s2g_companion_runs`** column additions (migration): `kind text`, `artifact_url text`, `cost_usd_estimate numeric(10,4)`, `replicate_prediction_id text`. Strictly additive, all nullable.

---

## 7. Files touched (summary, no code yet)

Edits:
- `supabase/functions/generate-thumbnail/index.ts` — swap DALL-E for FLUX schnell + persist.
- `supabase/functions/generate-video/index.ts` — swap fake version hash for Wan 2.2 i2v/t2v + persist + tier caps.
- `supabase/functions/companion-invoke/index.ts` — Birch system prompt emits `reel_plan` JSON block when finalizing; no new tool calls.
- `src/components/companions/CompanionDrawer.tsx` — parse `reel_plan`, render Generate buttons for Birch (and reuse for Willow hi-res).
- `src/components/ai/VideoGeneration.tsx` — extract polling into `src/hooks/useGenerationPolling.ts` so the drawer can reuse it; UI unchanged.
- `supabase/config.toml` — add `[functions.generate-voiceover]`.

New:
- `supabase/functions/generate-voiceover/index.ts` — Kokoro-82M wrapper.
- `src/hooks/useGenerationPolling.ts` — extracted polling.
- One migration: `ai-generations` storage bucket + `s2g_companion_runs` extra columns.

Untouched in Phase 2: tier roles, Companions tier mapping, Phase 1 tool-loop logic, every other companion.

---

## 8. Open question for you before I implement

Voiceover quota: do you want it counted **inside Birch's monthly Companion quota** (cheaper to manage, makes "a reel" feel like one unit) or as a **separate `'voice'` slug** in `check_and_consume_companion_quota` (cleaner accounting, lets a future "Hearth/voice-only" companion share the bucket)? Default assumption above is the former.
