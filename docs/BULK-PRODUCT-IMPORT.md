# Bulk product import (CSV)

Where: stall owner's **Products** tab (`/stall/build?tab=products`, "My
S2G Products") → **Import Products (CSV)** button. Same wizard as "Bulk
upload seeds" (`/dashboard/sower/upload`).

Template: `docs/templates/bulk-product-import-template.csv`

## CSV columns

Column names are matched loosely (case/spacing/punctuation-insensitive,
synonyms accepted) — any order is fine.

| Column | Required | Notes |
|---|---|---|
| `product_name` (or `name`, `title`, `item`) | Yes | Base product name. |
| `variant` | No | Appended to the name: `"{product_name} {variant}"`, e.g. "Prozen Caps 30 Capsules". |
| `price_zar` | One of `price_zar` / `price` required | Raw ZAR figure. Converted to USD automatically at import time using the platform's live exchange rate (the same rate every other price on the site converts through) — you'll see a toast with the exact rate used, and the converted USD price is shown, editable, in the review table before you publish anything. |
| `price` | — | Use instead of `price_zar` if you already have a USD figure — stored as-is, no conversion. |
| `description` | No | |
| `category` | No | Free text, e.g. `pharmacy`, `general`. |
| `sku` | No | |
| `stock` (or `qty`, `quantity`) | No | |
| `commission` (or `whisperer`) | No | Whisperer commission %, 0–100. |
| `image_filename` (or `image`, `photo`, `filename`) | No | The exact filename of the image for this product — see matching rule below. |

## Image matching rule

1. Crop/export your product photos as separate image files, named to
   match each row's `image_filename` column **exactly** (extension is
   ignored when matching, so `prozen-caps-30.jpg` matches a row whose
   `image_filename` is `prozen-caps-30` or `prozen-caps-30.jpg` either
   way; matching is otherwise case-insensitive but the rest of the name
   must be identical).
2. In the wizard's **Images** step, use **"Match all images at once"** —
   select every image file, or the whole folder, in one go. Each file is
   matched to whichever row's `image_filename` equals its own filename.
3. Anything that doesn't match (wrong filename, or a row with no
   `image_filename` at all) is left for manual assignment in the same
   step — a row already given an image this way is never overwritten by
   the batch matcher.

## What gets created

One `products` row per valid CSV row:
- `title` = the combined name above
- `price` = the converted (or direct) USD figure
- `category`, `sku`, `stock`, `whisperer_commission_percent` = as given
- `kind` = `'product'`, `type` = `'product'`, `delivery_type` = `'physical'`
- `image_urls` / `cover_image_url` = the matched/assigned image(s)

This is a normal product row — no separate catalog or import-specific
table. It renders on the standard `SeedCard` (full action rail, working
"Bestow & Get This Seed — $X" button through the existing basket/
checkout path) and flows into the existing bookkeeping/revenue views
exactly like any product sown one at a time.

## Rows with issues

A row missing a name or a price (and no convertible `price_zar`) is
flagged in the review step and **skipped at publish time**, not
silently guessed at. Fix it in the review table (every field is
editable there) before publishing.
