# Spec: Messaging — direct chats, community chats, live rooms

Status: decided 2026-08-29, not started. Replaces Circles entirely.

## Principle

Three kinds of conversation, nothing else. Every chat has a name, a banner
image, and the same message composer. Bestowals and gifts are possible from
inside any chat, and the money side (receipts, thank-yous) is delivered into
chats rather than emailed.

| Tier | Who's in it | Created by | Name | Purpose |
|---|---|---|---|---|
| Direct | exactly two people | either person, by inviting one other | auto: "Amber & Davison" | private talk, calls, video calls, media; bestowal thank-yous + receipts land here |
| Community | any number | any member, by inviting people | member-chosen, required | share seeds sown, images, voice notes, 45 s song samples, ideas, daily life |
| Sow2Grow community | everyone | system | "Sow2Grow" | the one room every account joins at registration; the bottom-bar **Chat** button opens it |
| Live room | host + co-hosts + audience | host | host-chosen | Classroom / SkillDrop / Training / Radio: broadcast with shared screen, co-hosts, in-stream bestowals |

Circles: deleted outright. No migration of members or content.

## Immediate fix (do first, separately)

The dashboard **Unread** tile links to `/chatapp?filter=unread`, which does
not render the messages it counts. Unread must open an inbox: list of rooms
with unread messages, newest first, each row showing room name, last
message preview, unread count; tap opens the room. The unread count must use
the `IS DISTINCT FROM` fix already applied in `DashboardTribeStats` (system
messages have `sender_id NULL`).

## Direct chats

- Inviting one person creates (or reuses) the direct room between the two.
  One room per pair, ever. Bestowal messaging already uses
  `get_or_create_direct_room`; keep that as the single constructor.
- Name is derived, not stored: the two display names joined with " & ",
  ordered alphabetically. If a display name changes, the room name follows.
- Capabilities: text, images, video, voice notes, 45 s song sample from the
  sender's own seeds, voice call, video call (Jitsi is already integrated
  for calls; reuse). Bestow / gift button in the composer targets the other
  person or any seed they've shared in the room.
- System messages (Sow2Grow thank-you, receipt card) render in the same
  room with the S2G identity, never as a separate inbox.

## Community chats

- Any member creates one, names it (required, 3–60 chars), sets a banner,
  invites members. Creator is admin; can add/remove members, rename, change
  banner, delete.
- Same composer and capabilities as direct. Bestow / gift targets the
  author of the message being replied to, or any seed shared in the room.
- The Sow2Grow community room is a community chat owned by the system:
  every new account is added on registration; existing accounts are
  backfilled once. Nobody can leave it or be removed (mute is allowed).
  Bottom-bar **Chat** opens it.

## Live rooms

Own spec later (`spec-live-rooms.md`). Scope recorded here so it isn't lost:

- Four kinds: Classroom, SkillDrop, Training, Radio. Host goes live; the
  room has a shared screen surface (type, images, video, music playback).
- Host can invite guests to co-host (video + audio).
- Audience can bestow on any product being whispered about in the stream,
  or send a free-will gift, without leaving the stream. These go through
  the same order lifecycle as every other bestowal (`gift` / `basket` kinds)
  and produce the same receipts. Gifting and bestowals are open on every
  live session, all four kinds, always.

### Host preparation: the rundown

Every live session is built before it goes live. The host opens the
session, uploads the material they'll use, and arranges it into an ordered
rundown. Going live plays the rundown in order; the host talks, pauses,
skips or reorders as they go.

- **Materials library** per host: songs, intro/outro tunes, slides, PDFs,
  videos, images, pre-recorded voice segments. Uploaded once, reused across
  sessions. Materials that are the host's own seeds are linked to the seed
  so the audience can bestow on them from the stream.
- **Rundown segments**, each with a planned duration and a type:
  `tune` (plays a track), `talk` (host speaks; optional notes on screen),
  `whisper` (advertise another member's seed: shows the seed card, audience
  can bestow on it, the host earns the whisperer share), `slide` / `video`
  / `document` (screen surface shows it), `guest` (co-host segment),
  `break`. The rundown shows running total against the slot length.
- **Radio**: sessions are booked in **2-hour slots** on a station schedule.
  A typical rundown: intro tune → host introduces themselves → songs in
  order, with talk and whisper segments between them → closing. The slot
  timer is visible to the host; overrun is warned, not cut.
- **Classroom / SkillDrop / Training**: same builder; materials skew to
  slides, documents and videos; segments skew to `talk` / `slide` /
  `guest`. Sessions can be scheduled (with a sign-up list) or started
  on the spot.
- The rundown is saved and reusable: a host can clone last week's show.
- Recording, replay and clips: decide in the live spec.

Sequencing: after Amber's album is out and the three commitments are
served. Not before.

## Look

- Every room has a banner image at the top (uploaded; default per tier if
  none). Direct rooms default to a blend of the two avatars.
- Message bubbles are not grey rectangles. Direction: leaf / seed-pod
  shapes, sender colour drawn from the sender's avatar, system messages in
  the S2G amber. Receipts are cards (already built:
  `BestowalReceiptMessage`). Voice notes show a waveform. Song samples show
  cover art + 45 s scrubber and a Bestow button.
- Read-only prototype in Claude Design before any React is written.

## Data

Existing tables are reused: `chat_rooms`, `chat_participants`,
`chat_messages`. Additions:

- `chat_rooms.kind` enum: `direct` | `community` | `system_community` |
  `live`
- `chat_rooms.name` (null for direct; derived), `chat_rooms.banner_url`,
  `chat_rooms.created_by`
- `chat_participants.role`: `admin` | `member`
- `chat_participants.muted_at`
- Circles tables and routes: dropped, after a one-time export to a backup
  bucket for safety.

Unique constraint: at most one `direct` room per unordered pair of user ids.

## Order of work

1. Unread inbox fix (small, today).
2. Direct chat: naming, banner, composer capabilities, bestow button.
3. Sow2Grow community room + registration hook + backfill.
4. Member-created community chats.
5. Delete Circles.
6. Visual pass (banners, bubbles) — prototype first.
7. Live rooms spec.

## Decisions on the open questions (2026-08-29)

- **Channels and threads from day one** in the Sow2Grow community room.
  Channels are named sub-rooms (e.g. #new-seeds, #music, #pharmacy,
  #bookkeeping); every message can start a thread. Member-created
  community chats get threads too; channels are optional there.
- **Moderation**: a message can be removed only by its own author or by a
  gosat. Nobody else, including a community chat's creator/admin. Reuse
  `moderate-content` for automated flagging; removal stays human.
- **Calls in community chats**: yes. Anyone in the community can start a
  voice or video call; any member can join while it's running. A community
  call can be promoted by its starter into a live session (Classroom /
  SkillDrop / Training / Radio), at which point it becomes a live room
  with the shared screen surface and in-stream bestowals, still joinable
  by everyone in that community. This is the bridge between tiers 2 and 3.
