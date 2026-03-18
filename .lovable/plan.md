

## Fix Create & Manage Section: Theme Colors + Sub-link Button Sizing

Two issues to fix in `src/pages/DashboardPage.jsx`:

### 1. Button Colors — Use Theme Primary Gradient (not `secondaryButton`)
The 8 icon-chip buttons currently use `currentTheme.secondaryButton` (a subtle transparent background). They should use `currentTheme.primaryButton` with proper contrast text color, matching the rest of the dashboard's themed buttons.

**Line 934**: Change `background: currentTheme.secondaryButton` → `background: currentTheme.primaryButton` and compute contrast text color like `StatsFloatingButton` does.

### 2. Sub-links — Make Same Size as Icon-Chip Buttons
The "364YHVH Orchards" and "My S2G Tribe" links are currently small pill text links. They should be the same `h-11 rounded-xl` buttons as the 8 chips above, using the same styling.

**Lines 949-956**: Convert from `<Link>` text pills to full `<Link><Button>` chips matching the grid buttons above, placed inside the same grid (or a 2-col grid below).

### Changes — `src/pages/DashboardPage.jsx`

- **Lines 933-936**: Change button style to use `currentTheme.primaryButton` for background, compute contrast text color based on accent hex luminance
- **Lines 949-956**: Replace the small pill links with two full-sized `h-11 rounded-xl` buttons matching the icon-chip style, using the primary button gradient

