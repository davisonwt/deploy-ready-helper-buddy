

# Study Upload Hub in 364yhvh Studies Tab

## What We're Building

A full study upload and sharing system inside the **Studies** tab of 364yhvh. Sowers can upload studies (documents, voice notes, videos, or combinations), S2G auto-generates a cover image if none is provided, and each study automatically appears in the Social Feed with a short description, bestow button, and free gift button.

## How It Works

1. **Upload Study** -- A new "Upload Study" button in the Studies tab opens a dedicated upload form where users provide:
   - Title and description
   - Main files: documents (.pdf, .docx), voice notes (.mp3, .wav, .m4a), videos (.mp4, .webm), or any combination
   - Optional custom cover image
   - Bestowal value (optional -- can be free)
   - Tags/category

2. **Auto-Generate Cover Image** -- If the user doesn't upload their own cover, an edge function (`generate-study-cover`) calls Lovable AI's image generation model (`google/gemini-2.5-flash-image`) to create a beautiful cover based on the study title and description. The generated image is uploaded to Supabase Storage and saved as the `cover_image_url`.

3. **Auto-Post to Social Feed** -- After upload, a database trigger (or post-insert logic in the upload handler) creates a `memry_posts` entry with:
   - The study's cover image
   - A short description (first ~200 chars or a "1-min read" summary)
   - Link to the full study
   - A "Bestow" button if the study has a price
   - A "Gift" button always visible so tribe members can send free gifts to the sower

4. **Study Feed Card in Social Feed** -- A new `StudyFeedCard` component renders these posts with the study cover, sower info, short description, and action buttons (Bestow / Gift).

## Technical Plan

### Step 1: Database -- Add `type = 'study'` support to `s2g_library_items`
- The existing `s2g_library_items` table already has all needed columns (title, description, type, cover_image_url, price, file_url, user_id, is_public)
- We'll use `type = 'study'` for these items
- Add a migration to create a `study_feed_posts` entry or reuse `memry_posts` pattern for the social feed auto-post

### Step 2: Edge Function -- `generate-study-cover`
- Accepts: title, description, study_id
- Uses Lovable AI image generation to create a cover
- Uploads to `premium-room` storage bucket
- Updates the `s2g_library_items` row with the generated `cover_image_url`

### Step 3: Study Upload Form Component
- New `StudyUploadForm.tsx` component specifically for studies
- Supports multi-file upload (docs + audio + video)
- Cover image upload (optional) with "auto-generate" fallback
- Bestowal value input
- After successful upload, calls `generate-study-cover` if no cover was provided, then creates a social feed post

### Step 4: Social Feed Integration
- After upload, insert a post into the feed (via `memry_posts` or similar table) with:
  - Cover image as media
  - Short description / 1-min read excerpt
  - `product_id` linking to the study
  - `content_type = 'study'`
- New `StudyFeedCard` in `InlineMemryFeed` that renders bestow + gift buttons

### Step 5: Update YhvhDaysSection Studies Tab
- Add "Upload a Study" button at the top of the Studies tab
- Show a list/feed of recent community studies below the existing cards
- Each study card shows cover, title, short description, sower name

### Files to Create
- `src/components/studies/StudyUploadForm.tsx` -- upload form
- `src/components/feed/cards/StudyFeedCard.tsx` -- social feed card with bestow/gift
- `supabase/functions/generate-study-cover/index.ts` -- AI cover generation
- `src/pages/StudyUploadPage.tsx` -- route wrapper

### Files to Edit
- `src/components/dashboard/sections/YhvhDaysSection.tsx` -- add upload button + study feed
- `src/components/feed/cards/InlineMemryFeed.tsx` -- handle `content_type = 'study'` posts
- `src/App.tsx` -- add `/upload-study` route
- Database migration for any needed columns/triggers

### Flow Summary
```text
User opens Studies tab
  -> "Upload Study" button
  -> StudyUploadForm (title, files, cover, bestowal)
  -> Files uploaded to Supabase Storage
  -> Row inserted into s2g_library_items (type='study')
  -> If no cover: call generate-study-cover edge function
  -> Auto-post to social feed with cover + description
  -> Tribe sees study in Social Feed with Bestow / Gift buttons
```

