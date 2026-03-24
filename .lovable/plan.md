

# Social Feed Transformation — All Major Pages

## The Core Idea

You're right — the "website feel" comes from full-width cards, big headers, and static layouts across every page. The fix is the same pattern we applied to the Dashboard: replace static blocks with **vertical feed cards**, **sticky compact headers**, and **contextual content that flows**.

This is a huge scope (7+ major pages), so we should phase it to keep things stable.

---

## Phase 1 — Radio Mode (the biggest win)

RadioMode.tsx (521 lines) is the heaviest offender. Your detailed breakdown is spot-on. Here's the plan:

**Sticky Player Bar** (top, always visible)
- Now-playing track title + animated waveform + pause/play + volume slider
- "LIVE" pulse badge + listener count + "Join Conversation" button — all in one slim bar
- Blurred album art / host avatar as subtle background

**Interaction Tray** (tabbed, below player)
- Tab 1: **Chat** — merged "Send Message to Hosts" + "Live Chat" into one thread
- Tab 2: **Queue** — upcoming tracks + "Request Song" via FAB (+) button
- Tab 3: **People** — listeners with avatars, host presence badge, "Raise Hand"

**Scheduled Slots as Feed Cards** (below the tray)
- Vertical scroll of upcoming/replay slots as compact cards (like LiveFeedCard)
- Swipeable — audio cross-fades as you scroll between sessions
- "Host is Present" glowing badge for simulive (pre-recorded + live host)
- Price badge if paid, "Free" badge if not

**FAB Menu** — floating "+" for Request Song, Dedication, Voice Note

**What gets removed**: redundant "Now Playing" duplicate sections, scattered message boxes, giant text blocks for song requests

---

## Phase 2 — Communications Hub / ChatApp

Already partially done with UnifiedFeed. Refinements:
- Make LiveFeedCard truly full-height (60-70% viewport) with audio cross-fade on scroll
- Add "Host is Present" badge for simulive sessions
- Merge the sidebar Activity Feed into a notification bell dropdown instead of a permanent panel
- Slim the overall layout — remove the 280px sidebar on mobile entirely

---

## Phase 3 — My Garden (profile/content pages)

Currently ProfilePage.jsx is 1,290 lines of stacked cards. Transform into:
- Sticky profile header (avatar + name + stats strip)
- Tabbed feed below: Seeds | Sessions | Music | Journal — each tab renders as a vertical scroll of compact cards
- Actions (edit profile, upload) move to a FAB or header icons

---

## Phase 4 — 364yhvh Days (Calendar)

Sow2GrowCalendarPage.tsx (314 lines) — currently a dense astronomical display. Transform into:
- Sticky "Today" bar (day number, month, season, sabbath indicator)
- Feed of daily notes, feast days, and spiritual content as scrollable cards
- The bead calendar visualization becomes a collapsible "hero" at the top
- Birth date revealer becomes a card in the feed

---

## Phase 5 — S2G Memry

Already TikTok-style (2,086 lines). Minimal changes needed — it's the most "social feed" page already. Just ensure consistent card styling with the rest of the app.

---

## Phase 6 — Let It Rain & GoSat's

These are dropdown menus leading to sub-pages (Tithing, Gifting, Admin). Lower priority — they're functional utilities, not browsing experiences. Light touch: compact headers, card-based layouts instead of full-page forms.

---

## Implementation Order

We build **Phase 1 (Radio)** first since it's the page you've described in most detail and has the most impact. Each phase is independent — we ship one, verify, then move to the next.

### Files for Phase 1 (Radio)

| File | Action |
|------|--------|
| `src/components/radio/StickyRadioPlayer.tsx` | New — persistent player bar with waveform, controls, join button |
| `src/components/radio/RadioInteractionTray.tsx` | New — tabbed Chat/Queue/People drawer |
| `src/components/radio/RadioSessionFeed.tsx` | New — vertical scroll of session cards with cross-fade |
| `src/components/communication/RadioMode.tsx` | Major refactor — replace 521-line static layout with the 3 new components |
| `src/components/chat/LiveFeedCard.tsx` | Minor — add "Host is Present" badge and audio cross-fade support |

### Estimated scope per phase
- Phase 1 (Radio): ~5 files, major refactor
- Phase 2 (ChatApp): ~3 files, refinements
- Phase 3 (My Garden): ~4 files, major refactor
- Phase 4 (Calendar): ~3 files, moderate refactor
- Phase 5 (Memry): ~1 file, minor tweaks
- Phase 6 (Let It Rain/GoSat): ~2-3 files, light touch

