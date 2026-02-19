

# Fix Build Error + Add Audio Content Mapping to Segments

## Problem 1: Build Error
Line 536 in `RadioSlotApplicationWizard.jsx` has a JSX fragment without a wrapping element — `case 3:` returns `{/* Documents Section */}` directly without a parent `<div>`. This needs a wrapping element.

## Problem 2: No Audio Mapping on Segments
Currently each segment only stores type/title/duration/emoji/color. DJs cannot attach their uploaded teachings, music tracks, or ads to specific segments. This is the key missing piece for pre-recorded show planning.

---

## Changes

### 1. Fix the build error in `RadioSlotApplicationWizard.jsx`
- Add missing wrapping `<div className="space-y-4">` around the `case 3:` return block (the Documents/Content step).

### 2. Extend `SegmentItem` interface (in `SegmentTemplateSelector.tsx`)
Add optional fields:
- `mapped_track_id?: string` — ID of a DJ music track or S2G seed
- `mapped_track_title?: string` — display name of the mapped track
- `mapped_track_url?: string` — audio file URL for playback
- `mapped_track_duration?: number` — track length in seconds (so DJ can compare to segment duration)

### 3. Add audio picker to each segment row (in `SegmentTimelineBuilder.tsx`)
For each segment in the list, add:
- A small "Attach Audio" button (music note icon) that opens a dropdown/modal
- The picker queries:
  - DJ's own tracks from `dj_music_tracks` table (their uploaded teachings, music, ads)
  - S2G community music from `seeds` table where `type = 'music'`
- Shows track title, duration, and type for each option
- Once selected, the track info is stored on the segment item
- Display the attached track name + duration beneath the segment title
- Visual indicator: if track duration exceeds segment duration, show a warning (orange text)
- "Remove" button to detach audio from a segment

### 4. Update the database `radio_slot_segments` table usage
The `mapped_track_id` column already exists in the migration. The segment data saved during wizard submission will now include the track mapping.

---

## Technical Details

### Files to modify:
1. **`src/components/radio/RadioSlotApplicationWizard.jsx`** — fix missing wrapper div on line 536
2. **`src/components/radio/SegmentTemplateSelector.tsx`** — extend `SegmentItem` interface with track fields
3. **`src/components/radio/SegmentTimelineBuilder.tsx`** — add audio picker UI per segment row

### New component:
4. **`src/components/radio/SegmentAudioPicker.tsx`** — a small popover/dialog that:
   - Fetches DJ's tracks from `dj_music_tracks` + community music from `seeds`
   - Displays searchable list with title, artist, duration, type badge
   - Returns selected track info to parent segment

### Data flow:
- DJ adds segments (template or manual) -> each segment row shows an "Attach Audio" button
- DJ clicks it -> popover shows their uploaded tracks + community music
- DJ picks a track -> segment displays track name + duration comparison
- On wizard submit -> segments with `mapped_track_id` are saved to `radio_slot_segments`
- During pre-recorded playback, `LiveStreamPlayer` reads segments in order and auto-plays mapped tracks

