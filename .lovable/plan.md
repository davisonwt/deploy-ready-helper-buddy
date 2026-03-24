

## Idea Review: Single-Page Sectioned Dashboard with Per-Section Theming

This is a strong concept. Here's my honest assessment and a concrete plan.

### Why This Works

- **App-like feel**: No page navigation, everything lives in one scrollable feed — feels like a native mobile app, not a website
- **Per-section theming**: Each major section (Radio, Browse Orchards, Communications, etc.) gets its own color identity from the 12-theme palette, making the feed visually rich and varied
- **Sticky nav buttons at top**: Act like a "table of contents" — tap to jump, and the active button highlights in the section's theme color as you scroll into it
- **Reduces cognitive load**: Users never feel "lost" on a different page — everything is contextually available

### What Changes

Instead of navigating to `/browse-orchards`, `/grove-station`, `/communications-hub`, etc., those sections become embedded feed zones within the dashboard scroll. The top sticky bar gets section pill-buttons that:
1. Scroll-to-section on tap
2. Change color to match the section's theme as you scroll past it

### Architecture

```text
┌──────────────────────────────────────┐
│  Sticky Profile Bar                  │
├──────────────────────────────────────┤
│  Section Nav Pills (scrollable)      │
│  [Home] [Radio] [Browse] [Chat] ... │
├──────────────────────────────────────┤
│                                      │
│  ── Home Section (Theme 1) ────────  │
│  Alerts, Wallet, Stats, Calendar...  │
│                                      │
│  ── Radio Section (Theme 2) ───────  │
│  Live sessions, upcoming slots       │
│                                      │
│  ── Browse Section (Theme 3) ──────  │
│  Orchard grid, trending seeds        │
│                                      │
│  ── Chat Section (Theme 4) ────────  │
│  Recent conversations, community     │
│                                      │
│  ── My Garden Section (Theme 5) ───  │
│  Orchards, seeds, quick actions      │
│                                      │
│  ── Explore Section (Theme 6) ─────  │
│  Join team, 364 TTT, Journal         │
│                                      │
├──────────────────────────────────────┤
│  Bottom Action Bar                   │
└──────────────────────────────────────┘
```

### Implementation Plan

**1. Create section configuration system**
- Define each section (id, label, icon, theme index offset) so each section picks a different theme from the 12-theme palette based on current time + offset
- Example: Home = current theme, Radio = current + 2, Browse = current + 4, etc.

**2. Build sticky section nav bar**
- Horizontal scrollable pill buttons below the profile bar
- Each pill shows section icon + label
- On tap: smooth `scrollIntoView` to that section
- Uses `IntersectionObserver` to detect which section is in view and highlights that pill in the section's theme accent color

**3. Refactor SocialFeedDashboard into sectioned layout**
- Each section is a `<section>` with its own `ref` and background gradient from its assigned theme
- Existing feed items (alerts, wallet, stats, calendar, weather, etc.) stay in the "Home" section
- New sections embed simplified/compact versions of Radio, Browse, Chat, My Garden content
- Each section's cards use that section's theme colors for borders, accents, buttons

**4. Create compact section components**
- `RadioSectionFeed` — live/upcoming radio slots (reuse RadioSessionFeed logic)
- `BrowseSectionFeed` — trending orchards grid (reuse browse-orchards query)
- `ChatSectionFeed` — recent messages preview (reuse community-chat logic)
- `GardenSectionFeed` — user's orchards + quick actions (reuse My Garden panel logic)

**5. Smooth scroll + active state tracking**
- `IntersectionObserver` on each section root element
- When a section enters viewport > 50%, update active nav pill color to that section's theme
- Background transitions smoothly between section themes as user scrolls

**6. Keep existing routes as fallback**
- Full-page routes still work for deep links and sharing
- Dashboard sections act as previews with "See All" links to full pages where needed

### Technical Details

- **Theme assignment**: `getThemeByIndex((currentBaseIndex + sectionOffset) % 12)` gives each section a unique but harmonious theme
- **Scroll tracking**: Single `IntersectionObserver` with `threshold: 0.5` on each section ref
- **Nav pill animation**: Framer Motion `layoutId` for the active indicator sliding between pills
- **Performance**: Lazy-load section content with `React.lazy` or render-on-visible pattern so the page doesn't load everything at once

### Files to Create/Modify

| File | Action |
|------|--------|
| `src/components/dashboard/SectionNavBar.tsx` | New — sticky horizontal nav pills |
| `src/components/dashboard/DashboardSection.tsx` | New — wrapper with theme + scroll ref |
| `src/components/dashboard/sections/RadioSection.tsx` | New — compact radio feed |
| `src/components/dashboard/sections/BrowseSection.tsx` | New — compact orchard grid |
| `src/components/dashboard/sections/ChatSection.tsx` | New — recent messages |
| `src/components/dashboard/sections/GardenSection.tsx` | New — user's garden summary |
| `src/components/dashboard/SocialFeedDashboard.tsx` | Refactor — wrap existing content as "Home" section, add other sections below |
| `src/utils/dashboardThemes.ts` | Add helper for section theme assignment |

