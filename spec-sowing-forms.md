# Spec: Sowing forms — planting, not paperwork

Status: decided 2026-08-29, not started. Replaces `UploadForm.tsx`, the
product upload page and every other "add a seed" form with one system.

## The rule (from CLAUDE.md)

Forms should feel like planting, not paperwork. Concretely:

- Ask only what this kind of seed needs. Never show a field that cannot
  apply to what the sower is making.
- Ask the important thing first (the seed itself, then the price), the
  admin last, the profile stuff never (it lives on the profile).
- Show the result while they type: a live preview card of the listing as a
  grower will see it.
- Six fields is a good form. Ten is the ceiling. Anything beyond goes into
  "More options", collapsed, optional.
- One button at the end: **Plant seed**. Progress shows how close they are.
- Errors are plain and specific: "Cover image must be at least 600×600" not
  "Invalid file".

## Step 0 — What are you sowing?

One screen, big tiles, no other fields:

| Tile | Lands on | Table |
|---|---|---|
| 🎵 Music | single track or album | `products` (type music) |
| 🎨 Artwork / image | | `products` (type art) |
| 📄 Document / e-book | | `products` (type document) |
| 📦 Physical product | | `products` (type physical) |
| 🛠 Service | | `products` (type service) |
| 🌳 Orchard | community or production | `orchards` |

The choice is remembered for next time (most sowers make one kind of thing)
and can be changed with one tap.

## Shared pieces (built once, used by every form)

- **Seed drop zone** — drag or tap. On drop we read what we can and
  pre-fill: duration and bitrate for audio, dimensions for images, page
  count for PDFs. The 45-second preview for audio is generated here, not
  in a later phase (closes spec-seed-protection Phase 1 at the same time).
- **Cover drop zone** — optional for documents, required for music and art.
  Auto-crop to square; show the crop.
- **Price with live split** — one number field. Under it, always visible:
  "Buyer pays $2.30 · you receive $2.00 · Sow2Grow $0.30". Uses
  `priceBreakdown()`; never a second copy of the maths. A "Free" toggle
  replaces the License Type dropdown.
- **One picker for "where does this belong"** — genre for music, medium for
  art, topic for documents, category for physical/service. Single select,
  searchable, with the sower's last choice at the top. Free-text tags are
  removed entirely; the trust-tag block is removed from every seed form.
- **Preview card** — right column on desktop, sticky bottom sheet on mobile.
  Renders the real listing component with the current values.
- **Progress + Plant** — "4 of 6 planted" above the button; the button is
  disabled with a one-line reason until the required six are in, then
  turns into **Plant seed**. On success: confetti, the new listing, and a
  "Share it" action into the Sow2Grow community room.

## Look and companions

- **Banner** — every form page opens with a full-width banner like the
  1-on-1 Live page (image left, title and one-line promise right). One
  banner per seed kind ("Sow a song", "Sow your art", …), generated once by
  Willow and stored; not regenerated per visit.
- **Willow for covers** — the cover drop zone has a second action: "Let
  Willow make one". Willow takes title, genre/medium and description and
  returns three options; the sower picks one or uploads their own. Nothing
  is planted without a cover, but nobody is blocked for lack of one.
- **Acorn as the second door** — Step 0 offers "Tell Acorn about it" next
  to the tiles. Acorn interviews the sower in chat ("What did you make?
  Drop the file here. What should it cost?") and fills the same form
  underneath; the preview card updates as they talk, and Plant seed
  appears when the six required fields are in. Same validation, same
  tables, no second code path for saving.
- **Hawthorn for price** — a "Suggest a price" link beside the price field.
  Hawthorn returns a number and one sentence of reasoning; the split
  recalculates live. The sower can always type their own.
- **Cypress before publish** — optional "Check my wording" on the
  description, returns suggested edits inline. Never blocks planting.
- Companion actions are async and cancellable; the form must be fully
  usable with every companion turned off.

## The forms

### Music — single

1. File (drop) 2. Cover 3. Title 4. Price 5. Genre 6. Description (2 lines
suggested, more allowed). More options: explicit flag, release date,
whisperer commission %.

### Music — album

Same as single, then a track list: drop several files at once, we order
them by filename, sower drags to reorder, one price for the album with
per-track prices optional. Uses the existing `isAlbum()` helper and the
album cart, no new tables.

### Artwork / image

1. Image 2. Title 3. Price 4. Medium 5. Description. More options: prints
available (turns on the physical fields), edition size, dimensions.

### Document / e-book

1. File (PDF/EPUB) 2. Cover (optional; we render page 1 if none) 3. Title
4. Price 5. Topic 6. Description. More options: sample pages count for the
preview (default 10%).

### Physical product

1. Photos (up to 6) 2. Title 3. Price 4. Category 5. Description
6. Delivery: pickup / local delivery / ships nationwide, with a flat
shipping price if shipping. More options: stock quantity, variants
(size/colour), quote-required instead of instant.

### Service

1. Title 2. What's included (description) 3. Price or "quote required"
4. Category 5. Where (remote / on-site with area) 6. Booking: instant or
request. More options: duration, availability.

### Orchard

1. Name 2. Community or production 3. Goal amount 4. Pocket price (the
15% fee is inside it; show "each pocket: $X, you keep $Y") 5. Story
(description) 6. Cover. More options: deadline, minimum pockets to start.

## What moves elsewhere

- **Wandering identity badge** → onboarding + profile. Asked once.
- **Trust tags (Verified identity, Insured, …)** → sower profile, gated by
  the credentials upload that already exists. Shown on listings
  automatically once earned.
- **Free-text "Tags (comma-separated)"** → gone. Search uses title,
  description, genre/category.
- **License Type dropdown** → the Free toggle plus, for music only, a
  "personal use / commercial" choice under More options.
- **Delivery for digital seeds** → not asked; digital is always delivered
  in-app.

## Data

No new tables. Each form writes the same `products` / `orchards` rows the
current forms write; the difference is what's asked, not what's stored.
The 45 s preview object goes to the existing `previews` path. The one
picker maps onto the existing category columns.

## Order of work

1. **Prototype in Claude Design first**: Step 0 and the music-single form,
   with the live preview card and the price split. Iterate on it until it
   feels like planting. No React until this is signed off.
2. Build the shared pieces.
3. Music single, then album (Amber's album is the acceptance test).
4. Document, artwork.
5. Physical product, service (these two carry the delivery/booking
   complexity, so last).
6. Orchard.
7. Retire the old forms; move badge and trust tags to profile/onboarding.

## Acceptance

A sower who has never used the site can plant a music single in under two
minutes on a phone, sees exactly what a buyer will pay and what they will
receive before pressing Plant, and never sees a field that doesn't apply to
a song.
