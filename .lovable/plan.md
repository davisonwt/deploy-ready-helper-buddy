## Goals

1. Rename Seeds slider heading → "Seed" (singular).
2. Add left/right arrows on the seed card to swipe through ALL uploaded images for that seed (currently only `images[0]` shows).
3. Make the Go Live overlay actually show the seed's media (images, video, audio, document) on the right-hand side instead of a blank panel — so guests can see/hear what the host is talking about.
4. Add a "whisperer bestowal %" field to seeds/orchards so the sower can declare what cut a tribe member earns when they host a live session and a bestowal happens during it.
5. Upgrade the Go Live overlay into a proper hosted live-room with: video OR faceless mode (image / typing canvas), inline chat, guest video tiles, host mute/unmute control. Make this the standard for Classroom / Skill Drop / Training / Radio too.

---

## Plan

### 1. Singular heading + image carousel inside the card

**`src/pages/DashboardPage.jsx`** (line 1111)
- Change `title="Seeds"` → `title="Seed"`.

**`src/components/garden/seedCardBuilders.js`**
- Add an `images: string[]` field on every card (seed/orchard/music/book/video) — pass the full array, not just `[0]`.

**`src/components/garden/SeedSlider.jsx`** + **`src/components/garden/LivingSeedCard.tsx`**
- Add `images?: string[]` prop on `LivingSeedCard`.
- Inside the card, when `images.length > 1`, render small left/right chevrons over the image area and a tiny dot row, controlling a local `imgIdx` state. Falls back to single image when only 1 exists.

### 2. Whisperer bestowal % on seeds

**New migration** (`supabase/migrations/...add_whisperer_share.sql`)
- `ALTER TABLE public.orchards ADD COLUMN whisperer_share_pct numeric NOT NULL DEFAULT 10 CHECK (whisperer_share_pct >= 0 AND whisperer_share_pct <= 50);`
- Same column on `seeds` if it's a separate table (verify during build).

**Sower edit / create form** (`src/pages/CreateOrchardPage` / seed editor)
- Add a slider/number input "Whisperer share % — what tribe members earn when they host a live session on your seed" (default 10%, max 50%).
- Save into `whisperer_share_pct`.

**Display on the seed card and live overlay**
- Show a small chip "🎤 Whisperer earns X%" so anyone considering going live sees the reward.

**Bestowal payout split**
- When a bestowal is created during a live session (presence on this seed_id is active and host ≠ sower), credit `amount * whisperer_share_pct/100` to the host's wallet, the rest to the sower. Implement in the existing bestowal edge function (`process-bestowal` or equivalent — locate during build).

### 3. Live room overlay — show the seed's media + chat + guest tiles

Currently `LivingSeedCard` opens a full-screen iframe to Jitsi only. Replace with a 2-column overlay (matches the layout of `LiveSeedPage.jsx`):

```text
┌──────── Live Header (Live · title · whisperer% · Close) ────────┐
│                                  │                              │
│   Jitsi iframe (host + guests)   │   Seed media panel:          │
│   - host can mute/unmute via     │   • image carousel           │
│     Jitsi moderator controls     │   • inline video player      │
│   - "Faceless mode" button:      │   • inline audio player      │
│     overlays an image OR a       │   • document viewer (pdf)    │
│     typing canvas on the host's  │   ──────────────────────     │
│     video track                  │   Inline chat (Supabase      │
│                                  │   realtime broadcast on      │
│                                  │   channel `live:<seedId>`)   │
└──────────────────────────────────┴──────────────────────────────┘
```

**Implementation**

- Promote the overlay JSX in `LivingSeedCard.tsx` into a new component `src/components/live/LiveRoomOverlay.tsx` taking `{ seed, room, onClose }`.
- Fetch seed media on open (`orchards` row + related uploads) so the right panel renders.
- Use existing `useTribalLiveOrchard` broadcast for chat messages (new `event: 'chat'`).
- Add a "Faceless" toggle: host picks an image or opens a typed canvas; uses Jitsi's `setVideoInputDevice` + a hidden `<canvas>` captured via `captureStream()` and fed into Jitsi via `executeCommand('setVirtualBackground'...)` — fall back to a simple "Image only" overlay rendered above the iframe if Jitsi command refuses.
- Host moderator controls: pass `userInfo` + `JWT`-less moderator flag (`config.startAsModerator`) and expose mute/unmute buttons by calling `executeCommand('muteParticipant', participantId)` on a participant list pulled from `participantsChanged`.

### 4. Apply the same overlay to other live entry points

Reuse `LiveRoomOverlay` from:
- `src/pages/LiveSeedPage.jsx` (replace its current 2-column iframe block).
- Classroom/Drop-Skill/Training launchers in `src/components/video/JitsiButtons.tsx` and `src/pages/ClubhousePage.jsx`.
- Radio: `src/components/radio/RadioLiveSessionManager.jsx` — pass `audioOnly: true` so the seed-media panel still shows but the iframe starts video-muted.

This makes the same controlled live experience the standard everywhere.

---

## Files touched

- `src/pages/DashboardPage.jsx` — heading rename
- `src/components/garden/seedCardBuilders.js` — pass `images` array
- `src/components/garden/SeedSlider.jsx` — forward `images`
- `src/components/garden/LivingSeedCard.tsx` — image carousel + use new overlay
- `src/components/live/LiveRoomOverlay.tsx` — new
- `src/pages/LiveSeedPage.jsx` — adopt overlay
- `src/components/video/JitsiButtons.tsx`, `src/pages/ClubhousePage.jsx`, `src/components/radio/RadioLiveSessionManager.jsx` — adopt overlay
- `src/pages/CreateOrchardPage.jsx` (and seed editor) — whisperer % input
- `supabase/migrations/<timestamp>_whisperer_share.sql` — new column
- `supabase/functions/process-bestowal/index.ts` (or actual function name found during build) — split payout when host present

## Open question

Default whisperer share — confirm **10% (max 50%)** as the seeded default, or pick a different number?
