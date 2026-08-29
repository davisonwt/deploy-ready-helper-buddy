# spec-wandering-doors.md — Category doors for the mall

Status: decided 2026-08-29. Builds on spec-storefronts.md (§4a presets) and
spec-service-seeds.md. Artwork direction: the "Wandering Pillows / Hands /
Wheel / Field / Hearth" banner set — dark photo, gold or accent serif title,
one-line promise, a row of four to five sub-category chips, one big button.

## 1. The idea

Each Wandering kind gets a **door**: one landing page that is the mall
entrance for that trade. Behind the door is the grid of shops and seeds of
that kind. Today the Wandering Directory is one flat list of everything;
the doors replace it as the front, with the directory grid underneath each.

Routes: `/wandering/pillow`, `/wandering/hand`, `/wandering/wheel`,
`/wandering/field`, `/wandering/hearth`, `/wandering/forge`,
`/wandering/heart`. `/wandering` is the hall — a grid of the six door
cards (image 1 layout).

Whisperer is **not** a door. It's a service a sower hires for their seed.
Its page lives at `/whisperers` (exists) and is linked from the sower side
(Dashboard, `/sow` chooser footer: "Find a Whisperer for your seed"), not
from the shopper's hall.

## 2. A door page

Top to bottom:

1. **Banner** — the kind's artwork, title, promise line, two-sentence
   description. From `src/lib/store/presets.ts` (spec-storefronts §4a) —
   same source as the shop presets, so door and shops match.
2. **Chips** — the kind's sub-categories. Clicking a chip filters the grid.
   Chips are the same list the shop preset uses.
3. **The big button** — "Explore stays" / "Book a service" / "Book a ride
   or job" / "Shop the field" / "Visit the hearth" — scrolls to the grid.
   Text per kind lives in the preset.
4. **Near you** — if the viewer has a location, shops/seeds within 50 km
   first, then the rest. `wandering_roles.lat/lng` and
   `companies.location_lat/lng` already exist; fall back to `base_town`
   text match when there are no coordinates.
5. **The grid** — for kinds with service seeds live (Hand, Wheel, Pillow,
   Heart as they ship): seed cards (ProductCard with the shop badge) from
   `products where kind = <kind> and status = 'active'`. Until a kind's
   seed form exists, the grid shows the **role holders** from
   `wandering_roles` (or `tribal_hearts_profiles` for Heart) as member
   cards with Chat — same data the Directory shows today.
6. **Become one** — a quiet card at the bottom: "Offer your skills as a
   Wandering Hand" → `/register-wandering?role=hand` (Heart →
   `/tribal-hearts`). Logged-out viewers see "Join the tribe" with
   referral capture, same as `/learn-share` and `/store`.

Public route, no auth. `?ref=` captured app-wide already.

## 3. The hall — `/wandering`

Six door cards in a 3×2 grid (image 1). Each card: banner crop, title,
promise, the chips row, the button. Footer: "One tribe. Many gifts. Endless
growth." and the app's domain — **sow2growapp.com everywhere**, retire
`sow2grow.online` from artwork.

The Dashboard's Wandering Directory tile and the Learn & Share category
chips link here. The old `WanderingDirectoryPage` stays reachable at
`/wandering-directory` until every kind has a door, then redirects to
`/wandering`.

## 4. Artwork

Assets live in `src/assets/wandering/<kind>-banner.jpg` (1600×900) and
`<kind>-card.jpg` (800×450), plus `<kind>-icon.svg` (the circular badge).
Supplied by davison from the banner set. Spelling check before commit:
**Wandering**, not Wondering.

Hands chips: Plumbers · Electricians · Mechanics · Builders · Carpenters
· & more. **No Dentists / Doctors** until the lawyer answers the
licensed-professional question.

## 5. Build order

1. `presets.ts` (shared with storefronts §4a) with copy, chips, button
   text, asset paths for all seven kinds.
2. `/wandering` hall + `/wandering/:kind` door, grid showing role holders
   (what the Directory shows today) — this replaces the Directory's front.
3. Near-you sorting.
4. As each service-seed form ships (service-seeds step 3+), its door's grid
   switches from role holders to seed cards.
5. Redirect `/wandering-directory` → `/wandering` once all doors exist.

Do step 1–2 after service-seeds step 3 (the Hand form), so the first door
opens onto real Hand seeds, not just names.

## 6. Out of scope

Map view, reviews/ratings, door-level promotions, per-town sub-doors,
Whisperer door (deliberately none).
