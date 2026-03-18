

## Scrollable 7-Bead Window — "Beads in Your Hands"

### Concept
Instead of showing the entire strand of 30-33 beads vertically, we show a **fixed window of 7 beads** centered on the current day. The user can **drag/scroll up and down** to pull beads through the viewport — like sliding prayer beads through your fingers. The current day bead stays centered by default, with 3 future beads above and 3 past beads below.

### Visual Design
```text
    ╔══════════════╗
    ║   ○ Day 27   ║  ← future (faded)
    ║   ○ Day 28   ║  ← future
    ║   ○ Day 29   ║  ← future (approaching)
    ║  ◉ Day 30 ◉  ║  ← TODAY (glowing, centered)
    ║   ● DOT 1    ║  ← past (if applicable)
    ║   ● Day 1    ║  ← past
    ║   ● Day 2    ║  ← past (faded)
    ╚══════════════╝
         ↕ drag to scroll
```

### Behavior
- **Auto-centers** on today's bead on load
- **Touch drag / mouse scroll / trackpad** moves beads up and down smoothly
- Beads at the edges of the 7-bead window **fade out** slightly, creating depth
- The center bead (position 4 of 7) is always slightly larger and brighter
- A subtle **string/cord line** runs through the center connecting all beads
- Optional: momentum/snap scrolling so beads settle into position

### Technical Approach

**All 12 MonthStrand components** will be wrapped in a reusable scroll container:

1. **Create `BeadScrollWindow` wrapper component** — a fixed-height container (~7 bead heights) with `overflow-y: auto` and `scroll-snap-type: y mandatory`. Each bead gets `scroll-snap-align: center`.

2. **Apply to each MonthStrand** — Instead of rendering all beads in a plain `flex-col`, wrap the bead list inside `BeadScrollWindow`. The component will:
   - Calculate initial scroll position to center on the current day bead
   - Use `useRef` + `scrollTo` on mount to auto-center
   - Apply opacity gradient: beads at edges fade (opacity 0.4), center bead full opacity
   - Keep the 1cm gap between future/past beads

3. **Tactile feel enhancements**:
   - CSS `scroll-snap-type: y mandatory` with `scroll-snap-align: center` on each bead for snappy feel
   - Slight scale transform: center bead `scale(1.15)`, edge beads `scale(0.85)`
   - Top/bottom fade overlays (gradient masks) to create the "tunnel" effect

4. **Files to edit**:
   - `src/components/watch/EnochianWheelCalendar.tsx` — Create `BeadScrollWindow` component, then wrap the bead rendering in each of the 12 `MonthXStrand` components with it. The window height will be approximately `7 * (bead size + gap)` ≈ 350px.

### What stays the same
- All bead styling, colors, animations, click handlers, popups
- The future/past split with the 1cm gap
- Blood drop animation on bottom bead
- All DOT day logic

