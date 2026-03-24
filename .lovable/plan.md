

# Communications Hub Redesign — "Live & Active Hub"

## Overview
Transform the Communications Hub from a static, card-heavy layout into a TikTok/Discord-inspired infinite-scroll feed that surfaces all live and recent activity (radio, classrooms, SkillDrop, training, community chat) in one addictive vertical stream — while keeping private messaging separate and secure.

## Architecture

```text
┌──────────────────────────────────────────────────┐
│  Top Nav Pills (unchanged)                        │
│  [ChatApp] [Classrooms] [SkillDrop] [Training]   │
│  [Radio]                                          │
├──────────────────────┬───────────────────────────┤
│                      │  Slim Sidebar (desktop)    │
│  UNIFIED FEED        │  - Your DMs (compact)     │
│  "What's Happening   │  - Notifications          │
│   Now 🌱"            │  - Quick Bestow           │
│                      │                           │
│  [Live Radio Card]   │                           │
│  [Classroom Card]    │                           │
│  [Community Chat]    │                           │
│  [Pre-recorded]      │                           │
│  [SkillDrop replay]  │                           │
│  ... infinite scroll │                           │
│                      │                           │
├──────────────────────┴───────────────────────────┤
│  FAB: + New Chat / New Room                       │
└──────────────────────────────────────────────────┘
```

## Key Design Decisions

**Feed card types** — Each card is ~60-70% screen height on mobile:
- **Live Radio** — Animated waveform, now-playing track, LIVE badge, listener count, Join + Bestow buttons
- **Classroom/SkillDrop/Training** — Session thumbnail, host avatar, participant count, Join button, price badge if paid
- **Pre-recorded/Replay** — Same card style but with "Replay" badge instead of "LIVE", fully scrollable and joinable
- **Community Chat** — Compact preview of latest messages, tap to enter
- **Private DMs/Groups** — Do NOT appear in the feed; only accessible via sidebar "Your Chats" or the existing Chats/Circles/Community sub-tabs within ChatApp

**Privacy model:**
- 1-on-1 chats = private, never in feed
- Group chats = invite-only, never in feed  
- Community rooms = public, shown in feed
- Paid sessions = shown in feed with clear price badge; payment gate on join

**Sparkle/cherry aesthetic:**
- Cherry 🍒 reaction emojis that float up when tapped
- Leaf ✨ sparkle animation when new rooms appear at top
- Soft glow pulse on LIVE badges
- Blue-teal gradient cards with glassmorphism

## Implementation Steps

### Step 1 — Create `LiveFeedCard` component
New component `src/components/chat/LiveFeedCard.tsx` — a unified card that renders differently based on `type` (radio, classroom, skilldrop, training, community). Includes:
- Host avatar (top-left), LIVE/Replay/Upcoming badge (top-right)
- Participant count with real-time updates
- Large visual area (waveform for radio, thumbnail for sessions)
- Title + host name + description
- Bottom action bar: Join, Bestow/Buy, React (cherry emoji)
- Price badge overlay if session requires payment

### Step 2 — Create `UnifiedFeed` component
New component `src/components/chat/UnifiedFeed.tsx` — replaces the current ChatApp as the default view in the ChatApp tab. Aggregates:
- Active radio slots (from `radio_schedule` where status = 'live' or recent replays)
- Active classrooms (from `classroom_sessions` where status = 'active')
- Active SkillDrop sessions (from `skilldrop_sessions`)
- Active training sessions (from `training_sessions`)
- Community chat rooms (from `chat_rooms` where room_type = 'community')
- Pre-recorded/completed sessions available for replay

Uses Supabase Realtime to push new live items to the top with sparkle animation. Pull-to-refresh support.

### Step 3 — Create `PrivateChatsDrawer` component
New component for the sidebar/drawer that holds private messaging:
- Compact DM list (avatar + name + last message preview)
- Group chats (invite-only)
- Notification badges
- Quick "Send Love" bestowal shortcut
- On mobile: accessible via a chat bubble FAB or swipe gesture

### Step 4 — Refactor `ChatApp.tsx`
Replace the current Chats/Circles/Community tab layout with:
- Default view = `UnifiedFeed` (the live scroll feed)
- "My Chats" button/icon opens `PrivateChatsDrawer` (slide-in panel or bottom sheet on mobile)
- Circles and Community sub-navigation remain accessible but integrated into the feed context

### Step 5 — Refactor `UnifiedDashboard.tsx`
- Slim down the Activity Feed sidebar (currently 350px) to ~280px
- Replace `ActivityFeed` content with the new notifications + DM list
- On mobile, hide sidebar entirely; use FAB for chat access

### Step 6 — Add micro-animations
- Cherry 🍒 emoji burst on reaction tap (CSS keyframe animation)
- Sparkle ✨ entrance animation for new feed items
- Soft pulse glow on LIVE badges
- Smooth card entrance with staggered fade-in

### Step 7 — Payment gate on feed cards
- Cards for paid sessions show price clearly (e.g. "S2G 2.30" badge)
- Tapping "Join" on a paid session triggers the existing bestowal/payment flow
- Free sessions show "Free" badge in green

## Files Changed

| File | Action |
|------|--------|
| `src/components/chat/LiveFeedCard.tsx` | New — unified feed card component |
| `src/components/chat/UnifiedFeed.tsx` | New — infinite scroll feed aggregating all live/replay content |
| `src/components/chat/PrivateChatsDrawer.tsx` | New — slide-in panel for private DMs and group chats |
| `src/components/chat/ChatApp.tsx` | Major refactor — default to UnifiedFeed, move chats to drawer |
| `src/components/chat/UnifiedDashboard.tsx` | Update sidebar width, integrate notifications |
| `src/components/chat/ActivityFeed.tsx` | Refactor into slimmer notification-focused widget |
| `src/components/chat/SparkleEffects.tsx` | New — cherry/leaf/sparkle micro-animation components |

## What Stays the Same
- Top navigation pills (ChatApp, Classrooms, SkillDrop, Training, Radio) — unchanged
- All existing functionality (voice recorder, song requests, rate show, now playing purchase, Jitsi calls)
- Private messaging security (RLS, invite-only groups, SECURITY DEFINER RPCs)
- Dark blue-teal theme and glassmorphism aesthetic
- Back to Dashboard button

