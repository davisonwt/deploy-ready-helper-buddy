

# Dashboard Modernization Plan

## What We're Doing
Upgrading the main dashboard to a cleaner, more modern layout while keeping all existing features and the 2-hour color-changing theme system. The goal is better spacing, glassmorphism consistency, staggered animations, and a more thumb-friendly mobile experience.

## What Stays the Same
- The 12-theme color rotation system (every 2 hours) -- untouched
- All existing data fetching (stats, calendar, followers, bestowals, etc.)
- All existing sub-components (StatsCards, TopSowersTeaser, SeedEngagementWidget, WalletSetupPrompt, SowerBalanceCard, LiveTimezoneDisplay, StatsFloatingButton, SecurityQuestionsAlert)
- Bottom mobile navigation (MobileTabBar) -- untouched
- All routing and links

## What Changes

### 1. Welcome Card Upgrade
- Add a gradient ring around the avatar (using the current theme accent color)
- Add a "USDC" badge pill next to payment method text
- Slightly larger avatar on desktop (80px) with better border glow
- Add backdrop-blur(12px) consistently

### 2. Hebrew Date Display Polish
- Use the theme accent color for the primary date line instead of hardcoded gold (#b48f50)
- Add `tracking-wide` letter spacing for elegance
- Slightly larger font for the Year/Month/Day line

### 3. Quick Actions Grid Rework
- Convert the "Create & Manage" section from mixed layouts to a clean 2x2 grid on mobile, 4-column on desktop
- Each button: icon on top, label below, consistent 16px border-radius, 44px minimum touch target
- Add hover glow effect using the theme's shadow color
- Add hover `translateY(-4px)` lift animation
- Simplify the "Browse Orchards" card to match the other buttons' style (remove the nested circle buttons -- move those sub-links into a simple row below)

### 4. Explore Section
- Keep the 3-column grid but ensure consistent card heights
- Add subtle scale(1.05) hover with glow

### 5. Stats Grid Theme Integration
- Update StatsCards to use the current dashboard theme colors (accent, cardBg, cardBorder) via CSS custom properties instead of hardcoded amber/orange gradients
- Pass `currentTheme` as a prop so numbers use the dynamic accent color

### 6. Leaderboard Card Theme Integration
- Same as stats: update TopSowersTeaser to accept theme prop and use dynamic colors instead of hardcoded amber

### 7. Staggered Page Load Animations
- Wrap each dashboard section in a `motion.div` with staggered `delay` (0.1s increments)
- Fade-in + slight upward slide for each section

### 8. Live Activities Bar (Bottom)
- Convert the existing `StatsFloatingButton` (currently top-right corner) into a slim bottom bar (72px) positioned above the mobile nav
- Show "Live Activities" count on the left, "Your Progress" on the right
- Collapsible upward on tap (sheet-style)
- Ensure it never overlaps scrollable content (add bottom padding to main content)

### 9. Skeleton Loading States
- Replace the simple spinner loading screen with skeleton placeholder cards that match the dashboard layout

### 10. Accessibility
- Ensure all interactive elements have focus rings
- Add `prefers-reduced-motion` media query support to disable animations
- Semantic HTML improvements (section, nav, main landmarks)

---

## Technical Details

### Files Modified
1. **`src/pages/DashboardPage.jsx`** -- Main restructure: staggered animations, theme-aware Quick Actions grid, skeleton loading, bottom bar integration, date display polish
2. **`src/components/dashboard/StatsCards.tsx`** -- Accept optional `theme` prop, use dynamic colors when provided
3. **`src/components/dashboard/TopSowersTeaser.tsx`** -- Accept optional `theme` prop, use dynamic colors when provided
4. **`src/components/dashboard/StatsFloatingButton.tsx`** -- Redesign into a bottom "Live Activities" bar with collapsible sheet

### Files Created
- **`src/components/dashboard/DashboardSkeleton.tsx`** -- Skeleton loading component matching the dashboard layout

### No Database Changes
This is purely a frontend/UI update. No migrations or backend changes needed.

### Key Patterns Followed
- Theme colors applied via inline `style` props (matching existing pattern throughout DashboardPage)
- framer-motion for all animations (already a dependency)
- Glassmorphism: `backdrop-blur-xl`, semi-transparent backgrounds, subtle borders (matching existing `glass-panel` pattern)
- Mobile-first: 1-column on mobile, expanding on larger screens
- 44px minimum touch targets on all interactive elements

