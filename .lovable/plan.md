

## Lunar Garden Hub — Step-by-Step Integration into Existing Calendar Pages

This is a large feature. We'll build it incrementally across multiple steps, integrated into the existing beads, journal/diary, and wheels. Here's the full roadmap broken into concrete steps.

---

### Step 1: Crops Data Layer + Soil pH + Companion Planting Database

**Create `src/data/gardenCrops.ts`** — static data file with all crops, pH ranges, companions, moon preferences, and categories.

Each crop entry includes:
- Name, emoji, category (Fruit, Leafy, Root, Herb, Brassica, Legume)
- `phRange: { min, max }` with notes (e.g., "prefers acidic")
- `companions: { good: string[], bad: string[] }` from Margaret Roberts' principles
- `moonPreference`: which moon phase / zodiac element best for planting (Leaf, Root, Fruit, Flower)
- `frostSensitivity`: hardy / tender / semi-hardy

All 25+ crops from the prompt with their exact pH values. Companion pairs: basil+tomatoes, leeks+carrots, marigolds as protectors, etc.

---

### Step 2: Moon Phase Engine

**Create `src/utils/lunarEngine.ts`** — biodynamic moon phase + zodiac calculator using astronomical algorithms (no API dependency).

- `getMoonPhase(date)` → New, Waxing Crescent, First Quarter, Waxing Gibbous, Full, Waning Gibbous, Last Quarter, Waning Crescent
- `getMoonZodiac(date)` → which zodiac sign the moon is in
- `getBiodynamicElement(zodiac)` → Earth(Root), Water(Leaf), Air(Flower), Fire(Fruit)
- `getGardenAdvice(date)` → "Best for Root crops", "Good Leaf day", etc.

Uses synodic month calculation (29.53 days cycle) anchored to a known new moon epoch.

---

### Step 3: Bead Popup Integration — Garden Section

**Edit `src/components/watch/BeadPopup.tsx`** — add a collapsible "Garden Guide" section below Sacred History.

Shows for each day:
- Moon phase icon + name + biodynamic element
- "Best for: Root / Leaf / Fruit / Flower" badge
- If user has selected crops → pH reminders ("Your tomatoes prefer pH 5.5–7.0")
- Companion tip of the day
- Soil amendment reminder on Root days

Styled with a green/garden theme (`bg-emerald-50/80`) to distinguish from Sacred History (amber) and Journal (blue).

---

### Step 4: Journal/Diary Integration — Garden Log Tab

**Edit `src/components/journal/JournalDayPage.tsx`** — add a "Garden Log" section/tab.

- Moon phase display for the journal day
- Quick-log buttons: "Planted", "Watered", "Harvested", "Amended Soil", "Pest Check"
- Photo notes for garden progress
- Auto-shows companion reminders if user logs planting a crop
- pH check reminder badge on relevant days

---

### Step 5: Wheel Calendar Integration — Moon Phase Ring

**Edit `src/components/watch/EnochianWheelCalendar.tsx`** — add a subtle moon phase indicator.

- Small moon phase icon next to each bead or in the wheel's inner ring
- Current moon phase displayed in the center alongside the sacred date info
- Biodynamic element color coding on the day wheel segments

---

### Step 6: Garden Setup & User Preferences (Supabase)

**Database migration** — create `garden_profiles` and `user_crops` tables:

```sql
create table public.garden_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  soil_ph numeric,
  hardiness_zone text,
  latitude numeric,
  longitude numeric,
  hemisphere text default 'northern',
  created_at timestamptz default now()
);

create table public.user_crops (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  crop_key text not null,
  planted_date text,
  notes text,
  created_at timestamptz default now()
);
```

**Garden setup modal** accessible from beads/journal — pick location, enter soil pH (optional), select crops from the pre-populated list.

---

### Step 7: Task System with Moon Overlays

**Create `src/components/garden/GardenTaskCard.tsx`** — daily task cards.

- Auto-generated tasks based on moon phase + user's crops + season
- Task icons with moon overlay (e.g., plant icon + moon crescent)
- Checkboxes, snooze, photo notes
- pH check reminders on Root days
- Companion planting suggestions when planting

---

### Step 8: "Ask Luna" Floating AI Chat

**Create `src/components/garden/AskLunaChat.tsx`** — floating chat bubble.

- Uses Supabase edge function + AI integration
- Context-aware: knows user's crops, location, soil pH, current moon phase
- Responds with companion planting advice, pH tips, timing suggestions
- Friendly biodynamic coach persona with Margaret Roberts references

---

### Step 9: Streak Counter + Badges + Polish

- Garden streak counter (consecutive days with garden activity)
- Inspired-by badges (Seedtime, Gardenize, Margaret Roberts)
- Push notification integration for moon phase alerts
- Beautiful animations and mobile-first polish

---

### Summary of Build Order

| Step | What | Files |
|------|-------|-------|
| 1 | Crops data (pH, companions, moon prefs) | `src/data/gardenCrops.ts` |
| 2 | Moon phase engine | `src/utils/lunarEngine.ts` |
| 3 | Bead popup garden section | `BeadPopup.tsx` edit |
| 4 | Journal garden log tab | `JournalDayPage.tsx` edit |
| 5 | Wheel moon indicator | `EnochianWheelCalendar.tsx` edit |
| 6 | Garden setup + Supabase tables | DB migration + setup UI |
| 7 | Task cards with moon overlays | New component |
| 8 | Ask Luna AI chat | Edge function + component |
| 9 | Streaks, badges, notifications | Polish pass |

I'll implement these step by step, starting with Steps 1-3 (data + moon engine + bead integration), then continue through the rest. Each step will be tested before moving on.

