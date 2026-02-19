

# Add Live Voice Recording to Voice/Talk Segments

## What Changes

When a DJ adds a "Voice / Talk" segment, they will see **two options**:
1. **Record with Mic** -- a record button that captures audio directly from the browser microphone, with a live timer showing time remaining (max 2 minutes per recording)
2. **Upload File** -- the existing drag-and-drop upload (kept as a fallback)

After recording, the audio appears inline with a playback preview and options to re-record or delete.

## How It Works

1. DJ clicks "Voice / Talk" to add a segment
2. Inside the segment card, a prominent **Record** button appears alongside the existing upload option
3. Pressing Record starts capturing audio via the browser microphone
4. A pulsing red indicator and countdown timer show recording is active
5. DJ presses **Stop** to finish -- the audio blob is stored on the segment
6. The recorded audio shows as a playable preview with a re-record option
7. On final submission, the audio blob is uploaded to Supabase storage (`chat-documents` bucket)

---

## Technical Details

### File Modified: `src/components/radio/TimelineBuilder.tsx`

**1. Import the existing `useVoiceMemo` hook**
- Reuse `startRecording`, `stopRecording`, `isRecording`, `recordingTime`, `formatRecordingTime` from `src/hooks/useVoiceMemo.jsx`

**2. Add recording state to Voice/Talk segments**
- Track which segment is actively recording (`recordingSegmentId`)
- Store the recorded audio blob on the segment object (new `audioBlob` field on `TimelineSegment`)

**3. Replace the Voice/Talk segment UI (lines 281-291)**
- Show a two-option layout:
  - **Record button**: Mic icon that toggles start/stop recording
  - **Upload zone**: Existing file drop zone (smaller, secondary)
- When recording: show pulsing red dot, elapsed time, and countdown
- After recording: show inline audio player (`<audio>` element with `URL.createObjectURL(blob)`), re-record button, and delete button

**4. Update `TimelineSegment` interface (line 22)**
- Add optional `audioBlob?: Blob` field to hold the recorded audio before upload

**5. Recording flow**
- On "Record" click: call `navigator.mediaDevices.getUserMedia({ audio: true })`, create a `MediaRecorder`, collect chunks
- On "Stop" click: assemble blob, create object URL for preview, store blob on segment
- The existing `useVoiceMemo` hook logic will be adapted inline (since it's tightly coupled to participant IDs for upload, we will use its recording pattern but handle the blob locally)

### No new files needed -- all changes are within `TimelineBuilder.tsx`.

