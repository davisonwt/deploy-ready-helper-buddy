

## Restructure Memry Feed: Horizontal Per-Creator Browsing

### Current Layout
- TikTok-style vertical scroll: one post at a time, full-screen, scroll up/down between individual posts from mixed creators

### Proposed Layout
- **Vertical scroll** = switch between different sowers/growers/creators
- **Horizontal scroll** = browse all seeds/lives/adverts from that specific creator
- Each "row" is one creator, showing their content as a horizontal carousel

### Architecture

```text
┌──────────────────────────────┐
│  Creator A (avatar + name)   │
│  ┌─────┐ ┌─────┐ ┌─────┐    │  ← swipe left/right
│  │Seed1│ │Seed2│ │Seed3│    │
│  └─────┘ └─────┘ └─────┘    │
├──────────────────────────────┤  ← scroll down
│  Creator B (avatar + name)   │
│  ┌─────┐ ┌─────┐            │  ← swipe left/right
│  │Seed1│ │Seed2│            │
│  └─────┘ └─────┘            │
├──────────────────────────────┤  ← scroll down
│  Creator C ...               │
└──────────────────────────────┘
```

### Implementation Plan

**File: `src/pages/MemryPage.tsx`**

1. **Group posts by creator** — after fetching all posts, group them into a `Map<userId, { profile, posts[] }>` sorted by most recent post per creator

2. **Replace the single-post vertical scroller** with a vertical list of creator rows. Each row contains:
   - Creator header (avatar, name, follow button)
   - Horizontal swipeable carousel of their posts (full-width cards, snap-scroll)
   - Each card retains the current media display, action buttons (like, comment, share, bookmark), inline chat strip, and bestow button

3. **Each horizontal card** remains full-viewport-width and uses CSS scroll-snap (`scroll-snap-type: x mandatory`, `scroll-snap-align: start`) for smooth swiping between that creator's content

4. **Vertical scrolling** uses the same snap approach (`scroll-snap-type: y mandatory`) so each creator row fills the screen height

5. **Keep all existing interactions** — likes, comments, bookmarks, follow, DM, bestow, inline chat — they just render within each horizontal card instead of the single-post view

6. **Post counter** — show "2/5" indicator per creator so users know how many seeds that creator has

### Technical Details

- Group logic: `Object.values(posts.reduce((acc, post) => { acc[post.user_id] = acc[post.user_id] || { profile: post.profiles, posts: [] }; acc[post.user_id].posts.push(post); return acc; }, {}))` sorted by latest `created_at`
- Horizontal scroll container: `overflow-x-auto scroll-snap-type-x-mandatory flex` with each item `scroll-snap-align-start w-screen flex-shrink-0`
- Vertical scroll container: `overflow-y-auto scroll-snap-type-y-mandatory h-screen` with each row `scroll-snap-align-start h-screen`
- The right-side action buttons and bottom info panel remain absolutely positioned within each card

### Files to Edit
- **src/pages/MemryPage.tsx** — main restructure (grouping logic + dual-axis scroll layout)

