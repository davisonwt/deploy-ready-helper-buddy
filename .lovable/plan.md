

# Integrate Chat, Voice & Video Calls into the Feed

## The Problem
Right now, to message or call a tribal member, you have to navigate away from the dashboard/feed to `/communications-hub`. This breaks the flow.

## The Solution: Feed-Embedded Quick Chat FAB

Add a **floating "Quick Connect" button** directly on the main dashboard feed (`SocialFeedDashboard`) that opens the existing `PrivateChatsDrawer` as an overlay -- no page navigation needed. This gives instant access to:
- **Text chats** (existing conversations + start new)
- **Voice calls** (one-tap audio call from user list)
- **Video calls** (one-tap video call from user list)

All without ever leaving the feed.

## What Changes

### 1. Add PrivateChatsDrawer to SocialFeedDashboard
- Import `PrivateChatsDrawer` into `SocialFeedDashboard.tsx`
- Add a state variable `chatDrawerOpen`
- Render the drawer as an overlay (it already handles its own slide-in animation)

### 2. Add a Quick Connect FAB on the Feed
- Add a floating action button (similar to the one in `ChatApp.tsx`) pinned to the bottom-right of the feed
- Style: pill-shaped, themed, with a `MessageCircle` icon and "Chat" label
- Position it above the `BottomActionBar` (z-index layering) so it doesn't overlap
- Tapping it opens `PrivateChatsDrawer` right there on the feed

### 3. Update BottomActionBar Chat Link
- Change the "Chat" button in the bottom bar from navigating to `/communications-hub` to instead toggling the same drawer open
- This requires lifting the drawer state or using a callback prop
- Alternative (simpler): keep bottom bar as-is for full hub access, and add the FAB as the quick-access shortcut

### 4. Conversation View Inline
- When a user selects a conversation from the drawer, `UnifiedConversation` already renders inside the drawer as a full overlay
- Voice/video call buttons are already wired in the drawer's user list
- No additional work needed for the actual chat/call experience

## Technical Details

**Files modified:**
- `src/components/dashboard/SocialFeedDashboard.tsx` -- add drawer + FAB
- No new components needed; reuses existing `PrivateChatsDrawer`

**The FAB:**
```text
┌─────────────────────────────┐
│  Dashboard Feed (scrollable)│
│                             │
│  [Memry cards, sections...] │
│                             │
│                    ┌──────┐ │
│                    │💬 Chat│ │  ← FAB (above bottom bar)
│                    └──────┘ │
│  ┌─ Bottom Action Bar ────┐ │
│  │ Plant  Chat  Radio Browse│
│  └─────────────────────────┘│
└─────────────────────────────┘
```

**User flow:**
1. Scrolling the feed, tap the Chat FAB
2. Drawer slides in with your conversations + "Start New" button
3. Tap a person → chat opens inline in the drawer
4. Tap phone/video icon → call starts immediately
5. Close drawer → back to feed, never left the page

