
Goal: make every 364yhvh entry point consistently say “364yhvh”, and turn the 364yhvh area into a proper scripture/spiritual hub with 4 options: Ed’s Beads, Wheel, Studies, and Schedule.

What I found
- The dashboard section nav is already labeled `364yhvh` in `src/components/dashboard/sectionConfig.ts`.
- The old label still exists in other places, which is why you still see “364yhvh Days”:
  - `src/components/layout/AppSidebar.tsx`
  - `src/components/layout/MobileBottomTabs.tsx`
  - `src/components/Layout.jsx`
  - `src/components/YHVHDaysPanel.tsx`
- The current 364yhvh dashboard section (`src/components/dashboard/sections/YhvhDaysSection.tsx`) only has 2 tabs: Days and Studies.
- Your study-with-questions area already exists at route `/scriptural-study` in `src/pages/ScripturalStudyQA.tsx`.
- The current “Wheel” route (`/wheels-in-itself`) just redirects back to `/enochian-calendar-design`, so it is not a true separate experience right now.
- There is already reusable radio/session UI we can reuse for “Schedule”:
  - `src/components/dashboard/sections/RadioSection.tsx`
  - `src/components/radio/RadioSessionFeed.tsx`

Implementation plan
1. Rename every old “364yhvh Days” label to `364yhvh`
- Update sidebar, mobile more menu, legacy top/menu buttons, and panel title text.
- This fixes the specific “you did not rename the button” issue everywhere, not just in one navbar.

2. Turn `YhvhDaysSection` into a 4-option hub
- Replace the current 2-tab switcher with a 4-option spiritual hub:
  - Ed’s Beads
  - Wheel
  - Studies
  - Schedule
- Keep the current beautiful heading style, but change the body so the first view matches the structure you described.

3. Organize the four options clearly
- Ed’s Beads
  - Link to `/enochian-calendar-design`
  - Keep this as the bead-based sacred calendar entry point
- Wheel
  - Keep a separate option visible in the hub
  - Either route to the same calendar page in wheel mode or update the calendar page to support a direct wheel view
- Studies
  - Include the existing “Scriptural Study Q&A” here
  - Also include the videos/study media entry here so all scripture study content lives together
- Schedule
  - Add a spiritual sessions area for live and pre-recorded listening/viewing tied to bead/diary/scripture content

4. Bring the study-with-questions section into 364yhvh
- Add a clear “Scriptural Study Q&A” card inside the Studies area.
- This points to the existing `/scriptural-study` page, so it is no longer hidden or hard to find on S2G.
- If needed, also add a short description so users understand this is the question-based study section.

5. Add a dedicated Schedule section for scripture/spiritual sessions
- Reuse the existing radio/session card patterns so users can see:
  - live sessions
  - upcoming sessions
  - pre-recorded / replay sessions
- Theme this as part of 364yhvh instead of generic radio.
- Include buttons like Join Live / Listen / View Schedule.
- If appropriate, link through to `/grove-station?schedule=...` for playback while presenting it inside the 364yhvh hub as spiritual content.

6. Make Wheel a real selectable destination
- Since `/wheels-in-itself` currently redirects away, I’ll align this so the Wheel option actually opens the wheel experience intentionally.
- Best path: support a view-mode parameter/state on the calendar page so:
  - Ed’s Beads opens bead mode
  - Wheel opens wheel mode

Files to update
- `src/components/dashboard/sections/YhvhDaysSection.tsx`
- `src/components/layout/AppSidebar.tsx`
- `src/components/layout/MobileBottomTabs.tsx`
- `src/components/Layout.jsx`
- `src/components/YHVHDaysPanel.tsx`
- likely `src/components/calendar/SacredCalendarFeed.tsx` or routing logic for direct wheel mode
- possibly a small new reusable subsection component for the 364yhvh Schedule area, using existing session UI patterns

Expected result
- Every button/menu says `364yhvh`
- Clicking 364yhvh takes users into a scripture/spiritual hub
- The hub clearly offers:
  - Ed’s Beads
  - Wheel
  - Studies
  - Schedule
- The existing Scriptural Study Q&A becomes easy to find under Studies
- Schedule becomes the place to discover live and pre-recorded spiritual sessions connected to the bead/diary/study side of the app

Technical note
- I will not create a brand-new study system; I will connect the existing `/scriptural-study` feature into the 364yhvh hub.
- I will reuse existing radio/session display patterns for Schedule so the feature fits the app and ships faster.
- For Wheel, I will avoid leaving the current redirect behavior in place so that option feels real and intentional.
