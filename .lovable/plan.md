## Goal
Add two buttons to Birch's generated-artifact UI:
- **Tier 1 — "Post to my Grove feed"** → real post into the existing tribal feed.
- **Tier 2 — "Share"** → device-native share sheet via Web Share API, with desktop fallback.
Tier 3 (autonomous external auto-posting) is explicitly out of scope.

## Where the real feed actually lives

Searched the codebase. The "Grove feed" you see at `/grove` (`useGroveFeed.tsx`) is an aggregator of **chat_rooms / premium_rooms / radio**, not a posts table — companion-generated images/videos do not belong there.

The actual TikTok-style tribal feed that mixes **everyone's media posts + seeds + products + radio + community videos** is `TribalAliveFeedPage.tsx` ("SeedFlow", route surfaces media via the **`memry_posts`** table — see line 218: `supabase.from('memry_posts').select('id, user_id, content_type, media_url, thumbnail_url, caption, content_category, created_at')`).

So `memry_posts` is the correct, real post row for a free-form companion-generated image or video with a caption. Same author (`user_id = auth.uid()`), real row, appears in the real SeedFlow feed alongside everything else — no parallel/fake system.

Assumption to confirm if wrong: **memry_posts is the right target**, not `seeds` (seeds are structured fundraising entities, not casual posts) and not `community_videos` (that's the moderated long-form video pipeline). If you'd rather target `community_videos` for videos specifically, say so and I'll branch the routing by media type.

## File-level changes

### 1. `src/lib/companions/postToGrove.ts` (new)
Thin helper, single export:
```
postArtifactToGrove({ mediaUrl, mediaType: 'image'|'video', caption, thumbnailUrl? }) → { postId }
```
- Resolves `auth.uid()`.
- Inserts a row into `memry_posts`:
  - `user_id` = caller
  - `content_type` = `'image' | 'video'` (matches existing values used by SeedFlow)
  - `content_category` = `'companion_birch'` (so we can later filter/attribute companion-origin posts in the AI usage dashboard if useful — no UI impact)
  - `media_url` = generated asset URL
  - `thumbnail_url` = cover image when posting a video
  - `caption` = `plan.caption`
- Returns the new post id. Throws on failure; caller toasts.

No new table, no new edge function, no migration — `memry_posts` already exists with RLS letting an authed user insert their own row.

### 2. `src/lib/share/nativeShare.ts` (new)
Single export:
```
shareArtifact({ mediaUrl, mediaType, caption, filename }) → 'shared'|'downloaded'|'cancelled'
```
Behaviour:
1. Fetch the asset URL as a `Blob`, wrap in `File`.
2. If `navigator.canShare?.({ files: [file] })` → call `navigator.share({ files, text: caption })`. Resolve `'shared'`. Swallow `AbortError` as `'cancelled'`.
3. Else (desktop Chrome/Firefox without file-share support):
   - Trigger a download of the file (anchor with `download` attr + object URL, revoke after).
   - Copy `caption` to clipboard via `navigator.clipboard.writeText`.
   - Return `'downloaded'` so caller can toast: *"Saved to downloads + caption copied — paste it into Instagram/WhatsApp/TikTok."*
4. If both share and clipboard unavailable → throw, caller toasts a fallback message.

No dependency on any new package; pure browser APIs.

### 3. `src/components/companions/BirchGenerationPanel.tsx` (edit)
The user said "exact UI placement: where the Generate buttons currently are". The Generate buttons live in the bottom action bar (lines ~150-188). Plan:

- Track the latest generated artifact in component state: `lastArtifact: { url, type: 'image'|'video', thumbnail?: string } | null` — set inside `generateCover` (image), the `videoState.status === 'completed'` effect (video). (We deliberately skip voiceover for now — audio-only posting/sharing is a separate request.)
- When `lastArtifact` is non-null, render a **second row** inside the existing `<div className="rounded-md border border-primary/30 bg-primary/5 p-3 space-y-2">` directly under the Generate row:
  - `[ 📤 Post to my Grove feed ]   [ ↗ Share ]`
  - Both `size="sm"`, `variant="default"` for Post (primary CTA — this is the real publish action) and `variant="outline"` for Share.
- Post button → calls `postArtifactToGrove(...)`, on success toast *"Posted to the grove"* with a small link/button to `/seedflow` (the route that renders `TribalAliveFeedPage`).
- Share button → calls `shareArtifact(...)`, toasts based on returned state.
- Both buttons show a `Loader2` while in-flight; disable while busy.
- Caption passed to both = `plan.caption ?? plan.voiceover_script?.slice(0,180) ?? ''`.

No changes to companion-invoke, generate-thumbnail, generate-video, generate-voiceover edge functions. No DB migration. No new routes.

### 4. (No change) `src/pages/TribalAliveFeedPage.tsx`
Already reads `memry_posts` and maps it into the feed — newly inserted rows will surface automatically with no edits.

## Out of scope (deliberate)
- Tier 3 autonomous cross-posting to IG/TikTok/FB Graph APIs.
- Voiceover-only posts (no caller asked).
- Editing the caption before posting/sharing (could be a v2 — right now it uses `plan.caption` verbatim).
- Any change to AI usage dashboard, promo logic, or generation cost constants.

## Open questions before I build
1. Confirm `memry_posts` is the right target (vs. `seeds` or `community_videos`).
2. Confirm the Post CTA should jump to `/seedflow` on success, not stay in place.
3. OK to skip a "review/edit caption" step for v1 and post the verbatim `plan.caption`?
