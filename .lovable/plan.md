

# Colorful Social Feed Dashboard Redesign

## What You Have Now
Each section uses the same aurora theme with uniform `theme.cardBg` cards. They work but look like a standard settings page rather than an immersive social feed.

## What We Will Build
Transform every section into a vibrant, card-based social feed -- each with its own unique color palette and gradient cards (like the 364yhvh Days screenshot). Every card is a gateway to the correct endpoint. Nothing existing is removed.

## Terminology Suggestion
Replace "member/user" with **"Keeper"** -- encompasses Sower, Grower, Harvester, Bestower. "S2G Keepers" / "Your Tribe: 42 Keepers". Alternative: "Vine" (as in connected to the vine).

---

## Section-by-Section Design

### 1. Dashboard (Home)
**Color palette**: Deep blue-to-indigo gradients
- **Welcome banner** with display name
- **Community stats row**: Total S2G Keepers count, Your Tribe count, New Tribe Keepers this week
- **Quick stat gradient cards** (2x2 grid): Unread Messages (blue), Community Updates (purple), Active Orchards (teal), Followers (indigo)
- **Calendar quick view** card
- **Alerts** (SecurityQuestions, Sabbath) remain

### 2. ChatApp
**Color palette**: Teal-to-cyan gradients (communication feel)
- **5 vibrant gradient cards** (like 364yhvh's Ed's Beads style):
  - **Chats** (teal gradient) -- "1-on-1 & Group circles" → `/communications`
  - **Classrooms** (cyan-to-blue gradient) -- shows live/upcoming count → `/explore-sessions?type=classroom`
  - **SkillDrop** (blue-to-purple gradient) -- shows active sessions → `/explore-sessions?type=skilldrop`
  - **Training** (purple-to-pink gradient) -- shows upcoming count → `/explore-sessions?type=training`
  - **Radio** (pink-to-red gradient) -- shows live status → `/grove-station`
- Each card: rounded-2xl, bold gradient background, icon in frosted circle, title + subtitle, tap to navigate

### 3. S2G Memry
**Color palette**: Warm orange-to-pink (discovery/creative feel)
- **Gradient cards for each sub-category**:
  - **Individuals** (orange) → `/memry?filter=individuals`
  - **Companies** (coral) → `/memry?filter=companies`
  - **Ads** (pink) → `/memry?filter=ads`
  - **Home Videos** (rose) → `/memry?filter=videos`
  - **Whisperers** (magenta) → `/community-whisperers`
  - **Drivers** (amber) → `/community-drivers`
  - **Services** (gold) → `/community-services`
- **"Open Full Feed"** link to `/memry` preserved
- BrowseSection and ExploreSection remain below

### 4. 364yhvh Days (Already Close to Image 1)
**Color palette**: Purple-to-gold gradients (as in screenshot)
- **Keep existing**: calendar card, weather, top sowers, engagement, timezone
- **Add vibrant gradient gateway cards** matching image:
  - **Ed's Beads** (pink-magenta gradient) → `/enochian-calendar-design`
  - **Wheels in Itself** (orange gradient) → `/wheels-in-itself`
  - **Scriptural Study Q&A** (amber-brown gradient) → `/scriptural-study`
- Existing widgets (weather, top sowers, etc.) remain below the gateway cards

### 5. My Garden (Matching Image 2)
**Color palette**: Deep forest green gradients
- **Quick action buttons row** (4 across): New Orchard, Drop Music, New Seed, Quick Rain -- each in bordered green cards
- **Daily Mystery Seed** banner (light green gradient card)
- **"My Content" collapsible section** with count badge:
  - My S2G Orchards (count + today's fruits)
  - My S2G Seeds (items + earned)
  - My S2G Music Library (tracks + plays)
  - My S2G Library (e-books)
- Wallet + Stats remain

### 6. Let It Rain (Matching Image 3)
**Color palette**: Warm brown-to-amber gradients (already close)
- **Keep existing** Quick Bestow buttons and Ways to Bestow cards
- **Upgrade cards to gradient style**: each card gets a unique warm gradient (amber, coral, brown-rose, gold) instead of flat `theme.cardBg`
- Add frosted icon circles matching the screenshot style

### 7. GoSat's (Matching Image 4, GoSat-only)
**Color palette**: Dark brown with vibrant accent cards
- **Quick Access grid** (2x2): Dashboard (orange), Radio (red-coral), Wallets (pink), Seeds (teal) -- bold gradient cards
- **Management Tools** list: Admin Dashboard, AOD Station Radio, Organization Wallets -- gradient row cards with chevrons
- Role-gating preserved (restricted access message for non-GoSats)

---

## Technical Approach

### Files Modified
- `DashboardOverviewSection.tsx` -- add community keeper stats, gradient stat cards
- `ChatAppSection.tsx` -- replace sub-section list with gradient gateway cards
- `MemrySection.tsx` -- add sub-category gradient cards
- `YhvhDaysSection.tsx` -- add gateway gradient cards (Ed's Beads, Wheels, etc.)
- `MyGardenSection.tsx` -- add quick actions row, mystery seed, collapsible My Content
- `LetItRainSection.tsx` -- upgrade cards to gradient backgrounds
- `GosatsSection.tsx` -- add quick access grid, upgrade to gradient cards

### Shared Pattern
Each gradient card follows a reusable pattern:
```tsx
<Link to={href} className="block rounded-2xl p-5 transition-all hover:scale-[1.02]"
  style={{ background: 'linear-gradient(135deg, #color1, #color2)' }}>
  <div className="flex items-center gap-4">
    <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center">
      <Icon className="w-6 h-6 text-white" />
    </div>
    <div>
      <h3 className="font-bold text-white">{title}</h3>
      <p className="text-sm text-white/70">{subtitle}</p>
    </div>
  </div>
</Link>
```

### Data Needs
- Community keeper count: query `profiles` table count
- Tribe count: query `followers` where `following_id = user.id`
- New tribe keepers: followers created in last 7 days (already fetched)
- Live session counts for ChatApp cards: reuse existing hooks

### What Is Preserved
- All 7 sections in the nav bar
- StickyProfileBar, BottomActionBar, StatsFloatingButton
- IntersectionObserver scroll-tracking
- Aurora theme rotation per section
- All existing sub-components (weather, wallet, stats, radio, etc.)
- All navigation routes

