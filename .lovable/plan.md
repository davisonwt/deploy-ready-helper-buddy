# Videos investigation — read-only findings

No code changes proposed. This is the report you asked for.

## 1) Active UI entry points that write to `community_videos`

Two real, reachable entry points exist today. Both write to `community_videos` (not `video_content`).

**A. `/community-videos` — primary entry point**
- Route: `src/routes/AppRoutes.tsx` → `<Route path="/community-videos" … CommunityVideosPage />`
- Inbound nav link: `src/components/layout/ResponsiveLayout.tsx` ("Community" item → `/community-videos`)
- Page: `src/pages/CommunityVideosPage.jsx` shows an **"Upload Video"** button (visible only when signed in) that opens `VideoUploadModal`.
- Modal: `src/components/community/VideoUploadModal.jsx` → calls `useCommunityVideos().uploadVideo(...)`.
- Hook: `src/hooks/useCommunityVideos.jsx` line 164 → `.from('community_videos').insert({ uploader_id, uploader_profile_id, … })`.

**B. `/upload` — secondary entry point, currently orphaned in nav**
- Route: `src/routes/AppRoutes.tsx` → `<Route path="/upload" … VideoUploadPage />`
- Page: `src/pages/VideoUploadPage.tsx` → renders `<VideoUpload />`.
- Component: `src/components/video/VideoUpload.tsx` line 158 → `supabase.from('community_videos').insert({...})`.
- No nav/menu/button in the app links to `/upload`. Reachable only by typing the URL.

**Nothing currently writes to `video_content`.** That table is referenced only by `ContentModeration.tsx` (admin) and `useCommunityVideos`'s admin moderation queries — no upload UI populates it.

## 2) Was a Videos upload entry point recently removed?

No. Both routes above are still in `AppRoutes.tsx` and `lazyPages.ts`, and the "Community" nav link in `ResponsiveLayout.tsx` still points at `/community-videos`. Today's dead-code/payments cleanup did not touch `VideoUploadPage`, `VideoUpload.tsx`, `CommunityVideosPage`, `VideoUploadModal`, or `useCommunityVideos`. The reason `community_videos` is empty for the founder's account is not deletion — it's that the founder never used `/community-videos`; they used the seed-attached video field on `SeedSubmissionPage` instead (see #3a).

## 3) The three-way distinction

**(a) Video clip attached to a seed — what the founder actually used.**
File: `src/pages/SeedSubmissionPage.jsx`. The seed form has a "Click to upload video (MP4 - Max 50MB)" input that uploads to the `videos` storage bucket under `seeds/`, then stores the URL in `seeds.video_url` (and mirrored into the linked `orchards` row's `video_url`). It does **not** create any `community_videos` row. This is why the Tribe Feed / Homestead seed card shows the player and "Bestow & Get This Seed" — it's a seed, not a standalone video.

**(b) AI-generated marketing video for a seed — separate, working.**
Files: `src/components/ai/AIVideoGenerator.jsx`, `VideoMarketingDashboard.jsx`, plus the `video_jobs` table. This pipeline produces marketing assets tied to a seed/orchard. Independent of (a) and (c); does not populate `community_videos` either.

**(c) Standalone "Videos" library (My Garden / Dashboard "Videos" section).**
Reads from `community_videos` via `useMyContent` / `fetchTribeOrchards`. The upload entry points that feed this table are the two listed in #1 (`/community-videos` upload modal, and the orphaned `/upload`). It is a **real, intended feature with a working upload path** — not vestigial. The founder's "0 videos" is simply because no `community_videos` row was ever inserted for their account; the file they uploaded went to `seeds.video_url` via the seed form, which is a different surface entirely.

## Plain-English summary

- The standalone Videos feature is **not broken or missing** — `/community-videos` works, has a visible "Upload Video" button, writes to `community_videos`, and is linked from the "Community" nav.
- The founder's "home video" went into a **seed**, not into the standalone Videos library, because they used the seed submission form's video field. That is working as designed for path (a).
- My Garden / Dashboard's "Videos" section will only ever show items uploaded through `/community-videos` (or `/upload`), never seed-attached `video_url` clips. If the intent is for seed-attached videos to ALSO appear there, that is a new requirement and would need a separate decision — I am **not** proposing that change here.

## What I need from you before any code change

Pick one:
1. **Leave as-is** — the feature is intact; founder simply needs to use `/community-videos` for standalone uploads.
2. **Make seed-attached videos also appear in My Garden's Videos section** — requires extending `useMyContent` to union `seeds.video_url` rows into the videos list (no schema change).
3. **Remove the orphaned `/upload` route** — it's reachable only by URL; safe to delete since `/community-videos` is the canonical path.
4. Some combination of the above.
