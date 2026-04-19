
# Tribal Hearts — Ambassador-Only Dating Garden

A safe, warm, heterosexual-only dating haven layered on top of the existing Sow2Grow tribe. Reuses ChatApp, S2G Agents (Gentoo + Debian), Ambassador gating, and the garden aesthetic.

## Scope (single build)

### 1. Database (new tables, all RLS-protected)

- **`tribal_hearts_profiles`** — one per opted-in member
  - `user_id` (PK, FK profiles), `gender` ('male'|'female'), `seeking` (auto-set opposite), `birthdate`, `age_verified` (bool), `photo_verified` (bool), `bio`, `values[]`, `interests[]`, `lifestyle` (jsonb), `location_country`, `location_region`, `timezone`, `distance_pref_km`, `status` ('active'|'paused'|'hidden'), `last_active_at`
- **`tribal_hearts_answers`** — 10–15 onboarding Q&A rows used by AI to draft bio
- **`tribal_hearts_matches`** — `member_a_id`, `member_b_id` (always stored male/female pair), `compatibility_score`, `match_reasons` (jsonb), `a_response`, `b_response`, `status` ('pending'|'mutual'|'declined'), `chat_room_id` (set when mutual), `created_at`
- **`tribal_hearts_blocks`** — block / report records
- **`tribal_hearts_safety_flags`** — AI moderation flags on chat content (links to `chat_messages`)

**Hard constraint at DB level**: a check constraint + trigger on `tribal_hearts_matches` ensures one row is male, the other is female (strict heterosexual rule enforced server-side, not just UI).

**RLS**: members see only their own profile + matches; admins see safety flags. Profile photos served via existing storage; no email/phone columns ever exposed.

### 2. Edge functions

- **`tribal-hearts-onboard`** — takes the 10–15 answers, calls Lovable AI (`google/gemini-3-flash-preview`) with tool-calling to produce a structured `{bio, values[], interests[], lifestyle{}}` draft. Member edits before saving.
- **`tribal-hearts-matcher`** — daily + on-demand. Pulls active opposite-gender profiles, scores by shared values/interests/lifestyle/timezone/distance, writes top N pending matches. Reuses pattern from existing `agent-bestowal-matcher`.
- **`tribal-hearts-icebreaker`** — Debian generates a respectful opening message when both sides accept.
- **`tribal-hearts-moderate`** — runs on new chat messages within hearts-linked rooms, flags unsafe content (PII sharing, harassment) and writes to `tribal_hearts_safety_flags`. Uses AI gateway with structured output.

### 3. Access gating

- Reuse `useAgentAccess` pattern → new `useTribalHeartsAccess` hook that requires Ambassador OR `s2g_agent_free_access`. Non-ambassadors see a warm upsell card pointing to `/tribe-ambassador`.
- 18+ check: blocks profile creation if `birthdate` < 18 yrs.

### 4. UI — new route `/tribal-hearts`

```text
TribalHeartsPage
├── HeartsHeader (garden gradient, hearts + petals motif)
├── SafetyBanner ("All chats, voice & video stay safely inside Sow2Grow 😊")
├── Tabs:
│   ├── Garden     → MatchGarden (suggested matches as flower cards)
│   ├── Chats      → links to existing PrivateChatsDrawer filtered to hearts rooms
│   ├── My Profile → ProfileBuilder + edit
│   └── Safety     → block list, pause matching, report history, guidelines
```

Components:
- **HeartsOnboardingWizard** — 10–15 question guided flow (values, faith, lifestyle, what you're looking for, timezone, distance). On finish → calls `tribal-hearts-onboard`, shows AI-drafted profile, member edits with "Improve with Gentoo" button.
- **MatchCard** — flower-styled card: photo (verified badge if applicable), first name, age, country, top 3 shared values, "Accept 🌸" / "Pass 🍃" buttons. NO email/phone fields anywhere.
- **MutualMatchModal** — celebratory bloom animation, "Start chatting safely in the ChatApp" CTA → opens existing `UnifiedConversation` with the auto-created room.
- **PauseMatchingToggle**, **BlockButton**, **ReportButton** — one-tap safety controls.
- **AgentNudgeBubble** — small Gentoo/Debian voice lines ("We found 3 wonderful matches who share your values…").

### 5. Sidebar entry

Add nav item to `AppSidebar.tsx` between "Ambassador" and "GoSat's":
- Label: **Tribal Hearts**, desc: "Garden of connections", icon: `Heart`, gradient warm rose→garden green. Only renders when ambassador access is detected (otherwise hidden — keeps dashboard clean for non-ambassadors).

### 6. ChatApp integration (no duplication)

- When a match becomes mutual, the matcher creates a normal `chat_rooms` row with metadata `{ source: 'tribal_hearts', match_id }`.
- `PrivateChatsDrawer` already shows it. We add a small heart badge + persistent safety footer "Stay inside Sow2Grow — voice & video are right here" in rooms where `metadata.source === 'tribal_hearts'`.
- Voice/video already exist (Jitsi). Nothing new — just surfaced inside the room header.
- **`tribal-hearts-moderate`** runs via `chat_messages` insert trigger → edge function for hearts rooms only.

### 7. Agent voice lines

Hardcoded warm copy in `src/lib/heartsAgentLines.ts` (no AI cost) for nudges and empty states. Used by `AgentNudgeBubble`. Examples per the spec.

### 8. Memory

Save `mem://features/tribal-hearts` describing the feature scope, gating rules, strict-hetero DB constraint, in-house-only comms rule, and the four edge functions. Update `mem://index.md` Memories list.

## Out of scope (intentionally)
- Payments — Ambassador subscription already handles the $5/mo gate.
- Photo verification automation — we add the `photo_verified` flag + admin review path; full liveness check can come later.
- Push notifications — uses existing chat notification rails.

## Files to create
- 5 migrations (tables, RLS, hetero-pair trigger, moderation trigger)
- 4 edge functions (`tribal-hearts-onboard`, `tribal-hearts-matcher`, `tribal-hearts-icebreaker`, `tribal-hearts-moderate`)
- `src/pages/TribalHearts.tsx` + route in `App.tsx`
- `src/components/hearts/` (HeartsHeader, SafetyBanner, HeartsOnboardingWizard, MatchGarden, MatchCard, MutualMatchModal, AgentNudgeBubble, SafetyTab, ProfileBuilder)
- `src/hooks/useTribalHeartsAccess.ts`, `useTribalHeartsProfile.ts`, `useTribalHeartsMatches.ts`
- `src/lib/heartsAgentLines.ts`
- Sidebar entry update in `AppSidebar.tsx`
- Tiny ChatApp room badge + safety footer for hearts rooms
- `mem://features/tribal-hearts` + index update
