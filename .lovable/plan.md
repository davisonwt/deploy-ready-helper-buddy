

# AI Voice Assistant + Download/Re-upload for Radio Slots

## Overview
Adding two capabilities to the Voice/Talk segments in the Timeline Builder:
1. **Download button** so DJs can edit recordings externally and re-upload polished versions
2. **AI Voice Generator** — DJ types a script, AI polishes it, then ElevenLabs generates a clean voice note

## What Changes

### 1. Download Button (Simple Addition)
When a voice recording exists, add a "Download" button next to "Re-record" and "Delete" in the `VoiceSegmentControls` component. This lets DJs save the `.webm` file to their PC for editing in Audacity, Adobe Audition, etc., then use the existing "Upload File" option to bring back the polished version.

### 2. ElevenLabs Connector Setup
ElevenLabs is available as a connector. We'll connect it to get the `ELEVENLABS_API_KEY` secret, which powers text-to-speech generation.

### 3. AI Script Polish Edge Function
A new edge function `generate-radio-script` that:
- Takes rough bullet points or notes from the DJ
- Uses Lovable AI (already has `LOVABLE_API_KEY`) to polish them into a natural radio script
- Returns the clean script text for review before voice generation

### 4. ElevenLabs TTS Edge Function
A new edge function `generate-voice-note` that:
- Takes the polished script text
- Calls ElevenLabs TTS API with a professional voice (e.g., "Brian" — warm male, or "Sarah" — clear female)
- Returns the audio as binary data
- DJ can preview, accept, or regenerate

### 5. AI Voice Panel in Timeline Builder
When a DJ adds a Voice/Talk segment, they'll see three options instead of two:
- **Record with Mic** (existing)
- **Upload File** (existing)
- **AI Voice** (new) — opens a small panel where the DJ:
  1. Types or pastes their script/bullet points
  2. Picks a voice (from a short curated list)
  3. Clicks "Generate" — AI polishes the text, then generates audio
  4. Previews the result
  5. Accepts it (saves to Supabase Storage like recordings do) or regenerates

---

## Technical Details

### Files Created
1. **`supabase/functions/generate-radio-script/index.ts`** — Edge function using Lovable AI to polish DJ notes into radio scripts
2. **`supabase/functions/generate-voice-note/index.ts`** — Edge function calling ElevenLabs TTS, returns binary audio

### Files Modified
1. **`src/components/radio/TimelineBuilder.tsx`** — Add Download button to `VoiceSegmentControls`, add "AI Voice" as a third option in the default controls grid (3 columns instead of 2), add AI Voice generation panel with script input, voice selector, and generate/preview flow
2. **`supabase/config.toml`** — Register the two new edge functions with `verify_jwt = false`

### Secrets Required
- `ELEVENLABS_API_KEY` — via the ElevenLabs connector

### Edge Function Flow

```text
DJ types notes
     |
     v
generate-radio-script (Lovable AI)
     |
     v
Polished script shown for review/edit
     |
     v
generate-voice-note (ElevenLabs TTS)
     |
     v
Audio preview in browser
     |
     v
Accept --> Save to Supabase Storage --> Attached to segment
```

### Voice Options (Curated Short List)
- Brian (warm male narrator)
- Sarah (clear female)
- George (deep male)
- Lily (soft female)

DJs pick from this list. No complex configuration needed.

### No Database Changes
All audio files use the existing `chat-files` storage bucket under `radio-voice-segments/`. No new tables needed.

