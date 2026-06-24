# Pilot: 1-on-1 Live Explainer Video (Remotion + Kokoro voiceover)

Build ONE explainer video as a style/pacing/voice pilot before committing to the other 5 pages.

## What gets built

A ~50-second 1920x1080 MP4 explainer for the 1-on-1 Live page, embedded as a looping (paused-by-default, click-to-play) hero video on `/live-rooms`.

## Voiceover pipeline (NOT ElevenLabs)

1. Write the narration script (4 numbered beats, ~110 words, ~50s at Kokoro default speed).
2. Call the **existing `generate-voiceover` edge function** from a small one-off Node script in the sandbox using the project's anon key + a logged-in session token. Voice: `af_bella` (warm female, fits Sow2Grow tone — happy to swap to `af_sarah` or `am_michael` if preferred).
3. The function returns a public URL in the `ai-generations` bucket. Download the MP3 to `remotion/public/audio/1on1-live-vo.mp3`.
4. Remotion `<Audio src={staticFile('audio/1on1-live-vo.mp3')} />` drives the timeline; visual scene durations are tuned to the actual audio length (measured with ffprobe after generation).

If the edge function rejects the call (tier cap, auth), fallback is to call the same Replicate Kokoro model directly from a sandbox script using the project's Replicate key — same audio, no UX change.

## Narration script (draft, ~50s)

> "Going live one-on-one on Sow2Grow takes four taps.
> **One** — from the ChatApp launcher, tap *1-on-1 Live*.
> **Two** — tap *New room*, then pick the tribe member you want to invite.
> **Three** — your private room opens. Send a message, drop a voice note, or share a quick video clip.
> **Four** — ready to talk face to face? Tap the call button to start a real voice or video call.
> That's it. Your tribe, your room, your moment."

## Remotion composition

`remotion/` project, 1920x1080 @ 30fps, ~1500 frames (50s). Five `<TransitionSeries>` segments:

| # | Beat | Frames | Visual |
|---|------|--------|--------|
| 0 | Hook / title | 0-120 | "Going live, 1-on-1" — Fraunces display, teal underline sweep, ember dot pulse |
| 1 | Step 1 — Open launcher | 120-420 | Big numeral **1**, mock ChatApp launcher card with "1-on-1 Live" button highlighted, tap-ripple animation |
| 2 | Step 2 — New room + invite | 420-780 | Numeral **2**, "New room" button → tribe member chip slides in with avatar placeholder |
| 3 | Step 3 — Chat in room | 780-1140 | Numeral **3**, three message bubbles stagger in: text, voice-note waveform, video thumbnail |
| 4 | Step 4 — Start the call | 1140-1440 | Numeral **4**, ember call button scales up, ripples outward, "Live" badge appears |
| 5 | Outro | 1440-1500 | "Your tribe. Your room." — Fraunces, teal/ember tokens |

**Design tokens (locked to existing 1-on-1 Live page identity):**
- Background `#0B1420`
- Teal primary `#1FB6A8`
- Ember accent `#FF8A5B`
- Fraunces (display, numbered markers, titles)
- Inter (body, captions)
- Subtle teal radial-gradient background drift across the whole video
- One consistent entrance: spring scale + translateY, damping 18 stiffness 180
- Scene transitions: `fade` with springTiming(damping 200, 18 frames)

## Embedding in the app

- Save final MP4 to `src/assets/explainer-1on1-live.mp4`
- Add a small `<ExplainerVideo />` component (HTML5 `<video controls preload="metadata" poster=...>`) and place it on `src/pages/LiveRoomsPage.tsx` under the hero banner, above the room list. Poster image = a still rendered from frame 60.
- No autoplay (respects user / mobile data); ember "Watch how it works (50s)" affordance.

## Cost & time estimate

- Voiceover: 1 Kokoro call ≈ **$0.01** + ~5-15s generation time.
- Remotion render: 1500 frames at 1080p, concurrency 1 (sandbox constraint), realistic ~6-9 minutes wall clock. Fits the 10-min `code--exec` cap with margin. If it threatens to overrun, drop to 720p for the pilot.
- Total credits impact: trivial (~$0.01 + sandbox compute).

## Risks / things I'll flag if they happen

- Kokoro pronunciation of "Sow2Grow" — if it mangles it, I'll respell phonetically ("Sow to Grow") in the script only, UI copy unchanged.
- Render timeout — mitigation above (720p fallback).
- Audio/visual drift — after generating VO, measure with ffprobe and adjust scene `durationInFrames` before final render.

## Out of scope for this pilot

- The other 5 pages (Community, Classroom, SkillDrop, Training, Premium Rooms) — wait for your approval on the 1-on-1 pilot first.
- Captions/subtitles — can add in v2 if you want them.
- Multi-language VO — single English pilot only.

## Files that will be created/changed (build phase only)

- `remotion/` (new project: package.json, tsconfig, src/Root.tsx, src/MainVideo.tsx, src/scenes/Scene0..5.tsx, src/components/*, public/audio/1on1-live-vo.mp3, scripts/render-remotion.mjs)
- `src/assets/explainer-1on1-live.mp4` (rendered output)
- `src/assets/explainer-1on1-live-poster.jpg` (still frame)
- `src/components/explainers/ExplainerVideo.tsx` (new, ~30 lines)
- `src/pages/LiveRoomsPage.tsx` (one import + one JSX block)

Nothing else touched. No DB changes, no edge function changes, no routing changes.