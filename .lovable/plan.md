

# Free AI Voice Assistant for Radio Slots (No External Accounts Needed)

## The Idea
Instead of ElevenLabs (paid), we use two free tools you already have:

1. **Lovable AI** (already configured) -- polishes your rough notes into a clean radio script
2. **Browser's Built-in Text-to-Speech** (Web Speech API) -- reads the script aloud so you can hear how it sounds, then you record yourself reading the polished version with one click

Plus the **Download button** so you can edit recordings on your PC.

## How It Works for the DJ

### Option A: AI Script Helper (new)
1. Click "AI Voice" on a voice segment
2. Type rough notes like "welcome listeners, mention tonight's theme is gospel praise, shout out to Sister Mary"
3. Click "Polish Script" -- AI turns it into a smooth radio script
4. Click "Listen" -- your browser reads it aloud so you hear the flow
5. Edit the script if needed
6. Click "Record This" -- starts mic recording with the script visible as a teleprompter
7. Done! Clean recording in one take because you're reading a polished script

### Option B: Download for External Editing (new)
1. Record your voice as usual
2. Click "Download" to save the file to your PC
3. Edit in Audacity, remove background noise, etc.
4. Use "Upload File" to bring back the polished version

### Option C: Record with Mic / Upload File (existing, unchanged)

## What's Free and Why
- **Script polishing**: Uses Lovable AI (LOVABLE_API_KEY already configured, included in your plan)
- **Voice preview**: Uses your browser's built-in speech engine -- completely free, no API, no account
- **Recording**: Uses your existing mic recording code
- **Download**: Just a download link on the existing audio blob

## Technical Details

### Files Created
1. **`supabase/functions/generate-radio-script/index.ts`** -- Edge function that takes rough DJ notes and returns a polished radio script using Lovable AI

### Files Modified
1. **`src/components/radio/TimelineBuilder.tsx`**:
   - Add "Download" button to the recorded voice preview (next to Re-record and Delete)
   - Add "AI Voice" as a third option in the default controls (3-column grid)
   - Add AI Voice panel with: script textarea, "Polish Script" button, "Listen" preview button, "Record This" teleprompter mode
2. **`supabase/config.toml`** -- Register the new `generate-radio-script` edge function

### Edge Function: generate-radio-script
- Takes: `{ notes: string, showTheme?: string }`
- Uses Lovable AI (google/gemini-3-flash-preview) to convert rough notes into natural radio speech
- Returns: `{ script: string }`
- No streaming needed -- just a quick polish request

### UI Changes to VoiceSegmentControls

**Default state** (currently 2-column grid) becomes 3-column:
- Record with Mic (existing)
- Upload File (existing)  
- AI Voice (new) -- sparkle icon

**AI Voice panel** (shown when "AI Voice" is clicked):
- Textarea for rough notes/bullet points
- "Polish Script" button -- calls the edge function
- Polished script display (editable)
- "Listen" button -- browser reads it aloud using Web Speech API
- "Record This" button -- starts mic recording with script visible as teleprompter overlay
- Back button to return to default options

**Recorded state** adds Download button:
- Re-record (existing)
- Download (new) -- downloads the .webm file
- Delete (existing)

### No New Dependencies
- Web Speech API is built into all modern browsers
- Lovable AI is already configured
- No new npm packages needed
