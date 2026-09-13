# Gathering Room — scope

Read-only design pass over the current live stack (`LiveStage.tsx`,
`LiveStageOverlay.tsx`, `SeedCard.tsx`'s Go Live, `useLiveStage.ts`,
`useTribalLiveOrchard.ts`, `daily-config.ts`/`JitsiRoom.tsx` (Daily.co
despite the name), `create-daily-meeting-token`, `grove-session-harvest`).
No code changed to produce this.

## 1. What already exists

| Piece | State today |
|---|---|
| **Board/document** | `LiveStage.tsx`'s `stage.mode` (camera / image / whiteboard / video), broadcast-only over `stage:${seedId}` (Supabase Realtime, no DB row) — lost on refresh, and a late joiner sees nothing until the host's next action. "Whiteboard" is plain host-typed text (`<textarea>` → pre-wrap), not a PDF. "Image" cycles the seed's own attached images, not a host-chosen mid-session upload. No video-clip mode with synced playback, no seed-card-with-Bestow pinning (Bestow exists, but as a fixed footer CTA tied to `nowPlaying`, not a pin-any-seed action). |
| **In-room music** | Only for `isRadio` sessions: a host dropdown pulling `orchards` (`category ilike '%music%'`, has `audio_url`) — **not** the real music library (`dj_music_tracks`, `MusicLibraryTable.tsx`/`PlaylistBrowser.tsx`, Grove Station's own DJ system). Playback is `<audio autoPlay>` per client independently — not a shared/synced track mixed into the Daily call, no host volume control, two viewers can drift out of sync or one can simply not have it loaded yet. |
| **Voice/video notes** | Real and reusable: `useMediaRecorder` (capped-duration audio/video capture → Blob) + `uploadLiveRoomMedia` (private storage). Wired only into `OneOnOneRoom.tsx`'s 1:1 chat today — not present in `LiveStageOverlay` at all. |
| **Raise-hand queue** | `useLiveStage.ts`'s `hands: HandRaise[]` — an unordered, broadcast-only array (push order happens to equal arrival order, but nothing persists it or shows a visible position/#). Approve is one ad hoc host click with no cap (see §2's 8-tile note) and no "voice note instead" fallback. A more fully-built `LiveCallQueue.jsx` + `useVoiceMemo` hook already exists but is **fully orphaned** (zero imports) — built for the older 1:1 `call_sessions` system, never wired to `LiveStage`. Worth mining, not worth keeping as-is. |
| **Recording** | None. `useTribalLiveOrchard.endLive()` posts a `transcript` field to `grove-session-harvest`, but nothing ever captures one — that function is a post-session AI follow-up pipeline (thank-yous, relationship-score updates, sower coaching via `grove_relationship_scores`/`grove_message_queue`), not a recorder. Daily.co's own cloud-recording isn't enabled anywhere in `create-daily-meeting-token`. |

Also confirmed during the 2026-09-13 pre-flight: this whole engine is **Daily.co**, not Jitsi — `JitsiRoom.tsx`/`useDailyIframeSrc` are legacy-named post-migration. Domain limits (`GET /v1/`): `default_max_user_producers: 8`, `default_max_meeting_producers: 2200`, room `enable_chat: false` (app's own broadcast chat is used instead) — the 8-tile cap in §2 lines up exactly with Daily's own per-meeting producer default, not an arbitrary number.

## 2. Smallest design, on top of the existing Go Live path

Everything below extends `useLiveStage`'s `stage:${seedId}` channel rather than replacing it, plus **one new persisted row** (`gathering_sessions`, §5) so a late joiner or a host who refreshes sees *current* state instead of nothing. Broadcast stays the low-latency path; the row is written through (debounced) on every host change and read once on mount.

- **Board** — `stage.mode` gains `pdf` and `clip` alongside today's `text`/`image`/`camera`. PDF: page rendered client-side (pdf.js, already a dependency — see `StoryPdfViewer.tsx`), host's page-turn broadcasts + writes `board_state.page`. Clip: a short uploaded video, host's play/pause/seek broadcasts + writes `board_state.t`; every viewer's `<video>` syncs to it (same "apply on broadcast, correct on drift" shape `stage_mode` already uses). Images: host can upload a NEW image mid-session (`SeedDropZone`-style), not just cycle the seed's own gallery. Seed card: host "pins" any of their own seeds (`SeedCard` compact render, existing `ConfirmBestowModal`/`QuickBestowModal` flow — no new Bestow code). Viewer zoom is pure client-side (pinch/scroll transform on the rendered board), no server involvement. A small "Now: `<title>`" label reads whichever of these is active.
- **Music** — host picks a track from `dj_music_tracks` (real library, not the `orchards` guess). Mixed into the Daily call as a **shared custom audio track** (daily-js `startCustomTrack`) rather than each client playing its own `<audio>` — this is the one genuinely hard piece; host-set volume is a local gain node feeding that track before it's published, so everyone hears the same level from the same source. This primitive is reused as-is for the voice-note autoplay below — one thing to build, two features.
- **Raise-hand queue** — same `hands` array, now rendered as a numbered, ordered list (arrival order is already correct; just surface the position). Two actions per hand: **bring on stage** (today's `approveHand`, now refusing once `approved.length >= 8`) and **record a voice note instead** — host taps it, that member gets a `useMediaRecorder` prompt, the clip uploads and is attached to their queue entry; when they reach position #1 it auto-plays to the whole room via the same shared-audio-track mechanism as Music, then auto-advances the queue.
- **8 on-stage tiles** — `approved.length` capped at 8, matching Daily's own `default_max_user_producers`; "bring on stage" disables past the cap with a reason, same UI pattern `goLiveDisabled`'s `title` already uses.
- **Save recording as seed** — on "End live", if any voice-note/clip was captured during the session (or the host records one closing clip on the spot), offer a save-to-stall modal that reuses the existing sow/insert path (`insertProduct`-shaped) pre-filled with the session's title/date — same storage + DB pattern as any other seed, not a new upload pipeline.

## 3. Visual skin — the tent room

Same painted-hotspot pattern `StallInteriorView.tsx` already uses (percentage `x/y/w/h` boxes over an `object-contain` image via `useContainImageRect`) — a new skin on an existing mechanism, not a new one. Front image = door (tap to enter, mirrors `StallVisitPage`'s front→interior pattern). Stage image, painted regions:

| Region | Maps to |
|---|---|
| Screen | The board (§2) |
| Chairs | Up to 8 on-stage tiles |
| Gramophone | Music picker trigger |
| 4 pew plaques | Viewer buttons: Raise hand · Queue · Gift · Share |
| (unpainted) right column | Chat, same as today's `LiveStageOverlay` right panel |

Portrait phone: board goes full-width when active (chairs/gramophone/plaques collapse out of the way, same "board takes over, chrome recedes" idea as `LiveStage`'s existing camera-mode fullscreen), chairs become a small horizontal tile row pinned above chat when the board isn't fullscreen. Assets land at 1216w, same width convention as existing stall interior art — no new image pipeline needed.

## 4. Reused for whisperer Go Live and Grove Station

- **Whisperer Go Live**: already the right shape — `LiveStage`/`LiveStageOverlay` already separate `isHost` from `sowerUserId` (a whisperer can host for someone else's seed, earning `whispererSharePct`). The board's seed-card-pin (§2) is that same seed, pre-pinned at session start — no new prop plumbing.
- **Grove Station**: the bigger lift. Grepped and confirmed `GroveStationPage.jsx` does **not** use `LiveStage`/`useTribalLiveOrchard`/Daily at all today — its "on air" model (`radio_live_sessions`, `radio_djs`, `radio_schedule`) is a fully separate system. Reuse here means Grove Station's on-air sessions switching transport to this same engine, with the gramophone becoming the DJ's actual now-playing (already sourced from `dj_music_tracks`/`PlaylistBrowser.tsx`) feeding the same shared-audio-track primitive from §2. Real integration work — likely its own follow-up doc once §2–§5 are built and proven, not part of the batches below.

## 5. Tables / migrations

- **`gathering_sessions`** (new) — one row per live gathering: `id`, `seed_id`, `host_id`, `board_state jsonb`, `music_state jsonb`, `queue_state jsonb`, `created_at`, `ended_at`. Source of truth for a late joiner/reconnect; broadcast stays the live-update path. RLS: host inserts/updates their own row; any authenticated viewer can `select` a session whose `seed_id` is currently live (mirrors `stalls_read_published`'s shape).
- **No new storage bucket** — board images/PDFs/clips and recorded voice notes reuse the existing private `chat-media`/`premium-room`-style bucket + signed-URL pattern already used by `uploadLiveRoomMedia` and the sow forms.
- **No new table for save-as-seed** — lands in `products`/`orchards` exactly like any other seed via the existing insert path.
- **Queue and music state live in `gathering_sessions.queue_state`/`music_state` jsonb**, not their own tables — this is ephemeral session state, not data anyone needs to query relationally later; a dedicated table would be more schema than the feature needs.

## 6. Build plan — 5 independent, individually shippable batches

Each batch is testable the same way the 2026-09-13 pre-flight was: a real Playwright spec against the real `TEST_BASE_URL` with `TEST_USER`/`TEST_USER2` from `.env.test`, two browser contexts.

1. **Board persistence + text/image modes.** Add `gathering_sessions` (text/image board state only), late-joiner hydration. Test: host sets board content, `TEST_USER2` joins *after*, sees current state immediately (not just future changes).
2. **PDF + video-clip board modes, host-synced.** Extend `board_state` with page/playback position. Test: host scrubs a PDF page / clip position, guest's view matches within the sync tolerance.
3. **Seed-card-on-board + Bestow, viewer zoom.** Pin any of host's own seeds to the board; existing Bestow flow untouched. Test: host pins a seed, guest bestows from the board.
4. **Music picker as a shared Daily custom audio track, host volume.** The hard primitive, built once. Test: host plays a `dj_music_tracks` track, both browsers' Daily call carries the same audio (checkable via Daily's own track/participant state).
5. **Ordered queue + voice-note-instead + auto-play-at-#1 + 8-tile cap + save-recording-as-seed.** Reuses batch 4's audio primitive. Test: same shape as this session's pre-flight (raise hand → reach #1 → voice note auto-plays → queue advances → bring-on-stage refuses past 8 → End live offers save-as-seed → new seed appears in host's stall).

§3 (tent-room skin) is a parallel, asset-gated track layered over 1–5 once images land — same "build plain, skin later" order `StallInteriorView` itself followed. §4's Grove Station reuse starts only after 1–5 are proven live.
