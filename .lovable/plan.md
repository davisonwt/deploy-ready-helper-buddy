

## Plan: Ensure Approved Radio Slots Go Live at Correct Time Slots

### Problem Analysis

After reviewing the codebase, I found several issues that prevent approved radio slots from correctly going live at their scheduled times:

1. **`canGoLive` logic is broken** (`useGroveStation.jsx`, line 591-595): It only checks `status === 'scheduled'` but does NOT check `approval_status === 'approved'`. It also only compares `hour_slot` to the current hour, ignoring `start_time`/`end_time` fields.

2. **Schedule grid shows unapproved slots** (`RadioScheduleGrid.jsx`): Fetches ALL slots for today regardless of approval status, so pending/rejected slots appear as valid scheduled shows.

3. **Current show fallback ignores approval status** (`useGroveStation.jsx`, lines 48-110): The fallback queries that find the current or next show do not filter by `approval_status = 'approved'`, so a pending or rejected slot could become the "current show."

4. **`fetchSchedule` shows unapproved slots** (`useGroveStation.jsx`, line 130-180): All slots for a date are fetched and formatted into the 24-hour grid without filtering by approval status.

---

### Changes

#### 1. Fix `canGoLive` in `useGroveStation.jsx` (line 591-595)
- Add `approval_status === 'approved'` check
- Use `start_time`/`end_time` for time window matching instead of just `hour_slot`

#### 2. Filter `fetchCurrentShow` fallbacks in `useGroveStation.jsx`
- **Fallback A** (line 49-76): Add `.eq('approval_status', 'approved')` to the live slot query
- **Fallback B** (line 81-110): Add `.eq('approval_status', 'approved')` to the upcoming slot query

#### 3. Filter `fetchSchedule` in `useGroveStation.jsx` (line 134-153)
- Add `.eq('approval_status', 'approved')` so only approved slots appear in the schedule grid

#### 4. Filter `RadioScheduleGrid.jsx` direct fetch (line 80-99)
- Add `.eq('approval_status', 'approved')` to the today's schedule query so the grid only shows approved shows

#### 5. Filter `fetchTodaySchedule` in `RadioScheduleGrid.jsx`
- Same filter to ensure the grid only displays approved slots

---

### Technical Details

**`canGoLive` fix:**
```javascript
canGoLive: userDJProfile && schedule.some(slot =>
  slot.dj_name === userDJProfile.dj_name &&
  slot.approval_status === 'approved' &&
  slot.status === 'scheduled' &&
  new Date().getHours() === slot.hour_slot
)
```

**Fallback queries** — add to each:
```javascript
.eq('approval_status', 'approved')
```

This ensures:
- Only admin-approved slots appear in schedules
- Only approved slots can trigger go-live
- The "current show" is always an approved show
- Listeners only see approved content on the station

