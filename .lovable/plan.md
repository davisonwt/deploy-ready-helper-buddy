

## Fix Month 12 Dot Days: Show Only 1 Dot Day This Year

### Problem
Month 12 in the Ed's Beads calendar always shows both DOT 1 (Helo-Yaseph) and DOT 2 (Asfa'el) after day 28. This year (6028) there is only 1 day out of time, so the correct bead order should be: **28 → DOT 1 → 29 → 30 → 31**.

### Current Structure (hardcoded)
The bead array in `EnochianWheelCalendar.tsx` (~line 3884-3923) always pushes both DOT1 and DOT2 beads after day 28, regardless of the year.

### Plan

**File: `src/utils/customCalendar.ts`**
- Add an exported function `getDaysOutOfTimeCount(year: number): number` that returns 1 or 2 based on the year. For year 6028, return **1**. This centralizes the logic so all calendar views can use it.

**File: `src/components/watch/EnochianWheelCalendar.tsx`**
- Import `getDaysOutOfTimeCount` from customCalendar
- Around line 3884, get the dot count: `const dotsThisYear = getDaysOutOfTimeCount(year)`
- Wrap the DOT1 push (line 3886) in `if (dotsThisYear >= 1)`
- Wrap the DOT2 push (line 3906) in `if (dotsThisYear >= 2)`
- This ensures only 1 dot bead appears this year, placed correctly between day 28 and day 29

**File: `src/components/watch/RemnantsWheelCalendar.tsx`**
- Apply the same conditional logic to the Wheel 1 (Man's Count) and YHVH Count dot day rendering, so DOT2 is hidden when only 1 dot day exists this year.

**File: `src/components/Sow2GrowCalendar.tsx`**
- Update the "Days Out of Time" section at the bottom to also respect the dot count.

### Bead Order After Fix (Month 12)
```text
Day 1 ... Day 28 → DOT 1 → Day 29 → Day 30 → Day 31
```

