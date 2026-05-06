
## Goal

Turn the current black-screen Jitsi iframe into a TikTok/Discord/Zoom-style **Stage** where:
- Host is always pinned in a big "Host" tile.
- Guests appear in small "Guest Boxes" alongside (up to 6 visible).
- A new **Presentation Panel** on the left lets the host show images, slides, or type on a whiteboard — so when guests join, they see either the host's face OR the host's presentation.
- Anyone can request to join the call as voice‑only or video — the host approves/declines and can mute/unmute / bump them back to chat.

This becomes the universal pattern for every Go Live surface: seeds (`LivingSeedCard`), Classroom, DropSkill, Training, Radio, Clubhouse.

## What Changes (User-Facing)

**1. Left "Stage" replaces the plain Jitsi iframe**

```text
┌──────────────────────────────────────────┬──────── Right panel ────────┐
│  [HOST TILE — big]      🎤 Speaking      │  🌱 SEED MEDIA              │
│  ┌────────────────┐                      │  coffee mugs x6             │
│  │   host video   │   Presentation tab   │  (image carousel 1/3)       │
│  │   or whiteboard│   [📷 Image]         │                             │
│  │   or slide     │   [✍️  Whiteboard]    │  💬 LIVE CHAT               │
│  │                │   [📺 Video]         │  davison.taljaard           │
│  └────────────────┘                      │  hi davison!                │
│  Guests:                                 │                             │
│  ┌──┐ ┌──┐ ┌──┐ ┌──┐ ┌──┐ ┌──┐ +3      │  [Ask the host…]  ➤         │
│  │g1│ │g2│ │g3│ │g4│ │g5│ │g6│         │                             │
│  └──┘ └──┘ └──┘ └──┘ └──┘ └──┘         │  ─────────────              │
│  Hand raises (waiting): @nina, @sam      │  🙋 Request to join         │
│                                          │   ( 🎤 Voice ) ( 🎥 Video ) │
└──────────────────────────────────────────┴─────────────────────────────┘
```

**2. Guest "Request to join" flow**
- Every viewer sees two buttons in the right panel: **🎤 Join with voice** and **🎥 Join with video**.
- A request hits the host's "Hand raises" tray with Approve / Decline.
- On approve, the guest's Jitsi participant is unmuted/un-video-muted and pinned into a guest box.
- Host can mute / unmute / remove any guest from their tile menu (⋯).

**3. Host Presentation Panel (the "whiteboard/images" area)**
- Tabs above the host tile:
  - **🎥 Camera** — host's webcam (default).
  - **📷 Image** — picks any image from the seed's `images[]` and broadcasts it as the stage. Left/right arrows page through.
  - **✍️ Whiteboard** — a `<textarea>` + simple draw `<canvas>` the host types/draws on; rendered to all guests via Supabase broadcast (`event: 'stage'`) — no extra deps.
  - **📺 Video / Audio** — plays the seed's `mediaUrl` to all guests in sync (broadcast `play/pause/seek` events).
- Faceless mode (already there) becomes one preset of this panel.

**4. Moderation**
- Host‑only controls: mute participant, mute everyone, kick, lock stage, end live.
- Guests can never speak unless approved — enforced by Jitsi `executeCommand('muteParticipant', id)` immediately on join, then unmuted only when host approves.
- All comms remain inside the room; no email/phone surfaced (already a project rule).

## Technical Implementation

### New component: `src/components/live/LiveStage.tsx`
Single source of truth for the stage UI. Takes:
```ts
{
  seedId, title, subtitle, images, mediaUrl, mediaKind,
  jitsiRoom, isHost, whispererSharePct,
  onClose
}
```
Internally:
- Mounts the Jitsi External API (`new JitsiMeetExternalAPI(...)`) into a hidden DOM node — we use Jitsi for audio/video transport but render our own grid via `executeCommand('pinParticipant', id)` + custom CSS layout (Jitsi tile mode hidden, we display our own `<div>` per participant by pulling video tracks via `getIFrameRef` + `videoConferenceJoined` / `participantJoined` / `participantLeft` listeners).
- For simplicity in v1: keep the Jitsi iframe visible but `setTileView(true)` and overlay our own header + presentation tabs + guest hand-raise tray on top — fastest path to the layout in the screenshot.

### Stage broadcast channel: `stage:${seedId}`
Supabase Realtime broadcast events:
- `stage_mode` → `{ mode: 'camera' | 'image' | 'whiteboard' | 'video', imageUrl?, text?, drawDataUrl?, mediaTime? }`
- `raise_hand` → `{ user_id, name, avatar, want: 'voice' | 'video' }`
- `approve_hand` / `deny_hand` → `{ user_id }`
- `kick` / `force_mute` → `{ user_id }`

Only the host writes mode/approve/kick; everyone can write `raise_hand`.

### Jitsi command map (host‑only)
- approve voice: `executeCommand('toggleParticipantsPane'); executeCommand('overwriteConfig', { startAudioMuted: 99 });` then `executeCommand('askToUnmute', participantId)`
- approve video: same + `executeCommand('startVideo', participantId)` (custom — done by sending a side broadcast the guest's client listens for and toggles its own track).
- mute one: `executeCommand('muteParticipant', participantId)`
- kick: `executeCommand('kickParticipant', participantId)`

### Files touched
- **NEW** `src/components/live/LiveStage.tsx` — the unified stage.
- **NEW** `src/components/live/HostPresentation.tsx` — Camera / Image / Whiteboard / Video tabs.
- **NEW** `src/components/live/GuestBoxes.tsx` — small participant tiles + hand‑raise tray.
- **NEW** `src/hooks/useLiveStage.ts` — wraps the `stage:${seedId}` broadcast channel + hand-raise queue.
- **EDIT** `src/components/garden/LivingSeedCard.tsx` — replace the inline `<iframe>` overlay (lines 422‑436) with `<LiveStage … />`. Keep the right panel (Seed Media + Live Chat) untouched.
- **EDIT** `src/pages/LiveSeedPage.jsx` — use `<LiveStage>`.
- **EDIT** `src/components/video/JitsiButtons.tsx` — Classroom / Radio / Orchard buttons open `<LiveStage>` instead of `startJitsiCall(...)`.
- **EDIT** `src/components/radio/LiveVideoCallInterface.tsx` — swap `JitsiRoom` for `<LiveStage isHost={isHost} />`.
- **EDIT** `src/pages/ClubhousePage.jsx` — same swap.

### DB
No new tables. Hand‑raises live only in the realtime channel for the duration of the call.

### Open question
Default cap on **simultaneous guests on stage** — propose **6 visible boxes + an overflow drawer** (matches the screenshot grid and avoids Jitsi performance cliffs on mobile). OK?
