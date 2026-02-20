

# Extend Voice Recording for Radio Pre-Recording

## Problem
1. **Lost work**: Browser-based recordings are stored only in memory as Blobs. When the page reloads (e.g., from a code deploy), all in-progress recordings are lost. Recordings need to be saved to the server incrementally so progress is preserved.
2. **2-minute recording cap**: Both the `TimelineBuilder` voice recorder and `useVoiceMemo` hook enforce a hard 120-second (2 min) limit. For pre-recording radio show segments, DJs need to record for the full duration of their segment (which can be up to 120 *minutes*).

## Plan

### 1. Remove the 2-minute hard cap on Timeline Builder voice recordings
- In `src/components/radio/TimelineBuilder.tsx`, change `MAX_RECORDING_SECONDS = 120` to be dynamic, based on the segment's `durationMinutes` value (converted to seconds).
- Update the countdown timer and progress bar to reflect the segment's actual duration instead of a fixed 2 minutes.
- The auto-stop will trigger when the recording reaches the segment's configured duration (e.g., a 15-minute voice segment stops at 15 minutes).

### 2. Auto-save recordings to Supabase Storage as they're captured
- Instead of holding all audio chunks in browser memory until submission, upload the completed recording Blob to Supabase Storage immediately when the user stops recording (or when auto-stop triggers).
- Store the recording in the `chat-files` bucket under a path like `radio-voice-segments/{userId}/{segmentId}-{timestamp}.webm`.
- Save the resulting storage URL on the segment object (`fileUrl`) so it persists even if the page reloads.
- This prevents data loss from page refreshes or code deploys.

### 3. Update the useVoiceMemo hook for consistency
- In `src/hooks/useVoiceMemo.jsx`, increase `MAX_RECORDING_TIME` from 120 seconds to a configurable parameter (default remains 120s for chat voice memos, but radio contexts can pass a higher limit).

### 4. Update UI feedback
- The recording progress bar and countdown text in the `VoiceSegmentControls` component will show the actual segment duration limit instead of always "2:00 left".
- Add a subtle warning when approaching the segment time limit (e.g., last 30 seconds).

## Technical Details

**Files to modify:**
- `src/components/radio/TimelineBuilder.tsx` -- Make `MAX_RECORDING_SECONDS` dynamic per segment, auto-upload on stop
- `src/hooks/useVoiceMemo.jsx` -- Accept configurable max duration parameter

**Key changes in TimelineBuilder.tsx:**
- `MAX_RECORDING_SECONDS` becomes a function: `getMaxSeconds(segment) => segment.durationMinutes * 60`
- `stopRecording` callback: after creating the Blob, upload it to Supabase Storage and store the URL on the segment
- `formatCountdown` uses the segment-specific max instead of a constant
- Progress bar width calculation uses segment-specific max

**Key changes in useVoiceMemo.jsx:**
- `startRecording` accepts an optional `maxDuration` parameter (defaults to 120 seconds)
- Timer and auto-stop use the passed duration instead of the constant

