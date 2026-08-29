# spec-service-seeds.md — Services as seeds, and the /sow chooser

Status: decided 2026-08-29. Companion to spec-sowing-forms.md (which owns the
music single/album forms and the SeedPuzzle/SeedPreviewCard pattern — reuse, don't fork).

## 1. The idea

In S2G a **seed** is anything a member puts into the ground to earn from. Today
"Sow a seed" means "upload a creation" and the service income paths (Wheel, Hand,
Pillow, Heart) live off to the side as "Become a…" flows. A plumber or someone
with a bakkie to hire must feel like they are in the same app as a musician.

Two layers, kept strictly apart:

| Layer | What it is | How often | Where it lives |
|---|---|---|---|
| **Role** | "I am a Wandering Hand" — a one-time unlock: terms, self-operation declaration, badge on profile | Once per role | Profile / Wandering Directory |
| **Seed** | One specific thing offered: this plumbing service, this tractor, this spare room | Many per role | My Garden, same list as songs |

A Wheel with a tractor and a trailer has two seeds. A Pillow with a cottage and a
farmhouse has two seeds. A Hand offering plumbing and welding has two seeds.

**Whisperer is a role only, never a seed.** Whisperers earn a % on other people's
seeds. They stay in the role/earnings layer and are *not* in the sow chooser.

## 2. Legal position (recorded)

Lawyer, Aug 2026: the owner offers their own vehicle / home / farm in their own
name and operates it themselves (drives it, hosts it, does the work) — no
licences required. The role unlock therefore includes a required declaration:

> "I own this and I operate it myself. I am not sub-letting, sub-contracting or
> renting on someone else's behalf."

Stored with a timestamp on the role row. No other gating.

## 3. `/sow` becomes a chooser

`/sow` is no longer a form. It is a full-page chooser: **"What are you sowing?"**

Groups (in this order), each a row of large cards using the Learn & Share
category colours/icons:

1. **Creations** — Music (single / album), Art, Books. Digital seeds, each
   with a gated file + preview (spec-sowing-forms.md's pattern). All live.
2. **Services & time** — Hand · Wheel · Pillow → this spec. (Heart is not
   a service seed — see section 4.)
3. **Produce & goods** — Field · Hearth · Forge, all physical goods
   sharing **one form**, `/sow/product`, with a "What kind of goods?"
   picker: Field = farm produce, Hearth = home-made (crafts, cakes, jams,
   candles — **not creations**), Forge = custom-made, General = shop
   stock. `kind = field | hearth | forge | product`. All live.
4. **Orchards** — Community · Production → existing orchard flows.

Clicking a service card:
- Role not yet unlocked → role unlock screen (section 4), then straight into
  the seed form.
- Role unlocked → seed form directly (section 5).

Old routes (`/sow/music` etc.) keep working. Old upload form stays live until
each kind is replaced, per the existing rule.

## 4. Role unlock

**Decided 2026-08-29 after report.** The Directory currently reads four
disconnected tables (`community_drivers`, `service_providers`, `stay_listings`,
`tribal_hearts_profiles`); the first three have no registration UI or writer
anywhere in the app, `/register-wandering` is a dead link, and the Directory's
Heart tab never fetches. So:

- New table `wandering_roles` (`user_id`, `role` enum `wheel|hand|pillow`,
  `display_name`, `base_town`, `lat`, `lng` nullable, `status` default
  `'active'`, `declared_self_operated_at`, `accepted_terms_at`, timestamps;
  unique on `(user_id, role)`). RLS: owner read/write own rows; everyone can
  read `status = 'active'`.
- Directory reads Wheel/Hand/Pillow from `wandering_roles`. Old three tables
  are left in place, unread, and get a "deprecated" comment; drop in a later
  cleanup once nothing references them.
- **Heart is not a service seed** — Wandering Heart is matchmaking on
  `tribal_hearts_profiles` with its own onboarding (`/tribal-hearts`). No
  rate, no booking, no Books, no seed form, no `kind = 'heart'`.
- `/register-wandering` becomes the role-unlock screen below (route it), with
  `?role=` preselecting.

Fields:
- Role (implied by the card clicked)
- Display name for this role (defaults to profile name)
- Base town / area (free text + optional lat/lng if profile already has it)
- Self-operation declaration checkbox (section 2) — required
- Terms checkbox — required

Effects: role row created/activated, `declared_self_operated_at` set, badge shows
on profile, member appears in the Wandering Directory under that role.

## 5. Service seed forms

Same pattern as music: single page, required fields feed the SeedPuzzle
preview, "Plant seed" enabled when the required pieces are in. Required pieces
are always 6 so SeedPuzzle is unchanged. Optional fields live under "More
options" and never block Plant.

### Hand (build first)
Required (puzzle order): photo · title · category · rate · service area · description
- category: plumbing, electrical, mechanic, building, carpentry, welding,
  gardening, cleaning, IT/repairs, tutoring, other (free text)
- rate: amount + unit — per hour / per job / call-out fee + quote
- service area: "I come to you within N km of {base town}" / "you come to me"
Optional: availability days, second photo, years of experience, tools/equipment
supplied yes/no

### Wheel
Required: photo · title · vehicle type · rate · with-driver/self-drive · description
- vehicle type: car, bakkie, minibus, truck, trailer, tractor, implement,
  construction (excavator etc.), other
- rate: amount + unit — per hour / per day / per km / per job
Optional: make/model/year, capacity (seats / tonnes / litres), second & third
photo, licence class held (informational only), availability days

### Pillow
Required: photo · title · property type · nightly rate · sleeps · description
- property type: room, cottage, flat, house, farmhouse, campsite, other
Optional: bedrooms, bathrooms, amenities (checkboxes: wifi, kitchen, parking,
pool, braai, pet-friendly, self-catering, meals available), house rules, check-in
/ check-out times, up to 6 photos, blocked dates (simple date list, no calendar
sync)

Common to all three: every seed has `location` (town/area, inherited from the
role, editable) and `kind` (`hand | wheel | pillow`).

## 6. Data model

**Decided 2026-08-29 after report: (a).** Service seeds are rows in
`products`. Migration:

- `ALTER TABLE products ALTER COLUMN file_url DROP NOT NULL` (the only NOT NULL
  column that makes no sense for a service).
- New column `kind text` — `music | ebook | hand | wheel | pillow`
  (CHECK constraint). Backfill existing rows from `type`. **Do not reuse
  `wandering_role`** — that column is the uploader's personal badge and is
  read by TribalAliveFeed, DJMusicUpload and video upload; it means something
  else.
- New column `service_details jsonb` for the kind-specific fields in section
  5 (rate, unit, service area, vehicle type, sleeps, amenities, etc.).
- `price` stays the headline number (rate amount); `service_details.rate_unit`
  says per hour/day/night/job/km.

ProductCard: add kind icons to GradientPlaceholder and show "Book" instead of
"Bestow" for service kinds. My Garden, Catalog and Books need no query
changes (confirmed in the report).

Whichever it is, the seed must appear in:
- My Garden (section 8)
- The grower-facing feeds/search under the matching Wandering section
- Books as a sale when a booking is paid (books.ts is the sole writer)
- Catalog counts (fixes the "Catalog only counts product sales" item too)

Migrations first (SQL or Management API), functions after. Every commit pushed.

## 7. Booking = a purchase kind

A grower books a service seed the same way they buy a song: PayPal, primary
path paypal-webhook, safety nets unchanged, 15% S2G on top, whisperer share
out of the sower's amount. New purchase kind: `booking`.

Flow:
1. Grower opens seed → "Request booking": picks date(s)/time, quantity (hours /
   days / nights / jobs), adds a note. Price calculated from rate × quantity +
   15%.
2. Sower gets a chat message + Unread tile → Accept / Decline (24h auto-expire).
3. On Accept the grower gets a chat message with a Pay button → existing PayPal
   order path.
4. On finalize: the existing 3 chat messages (sower thank-you, S2G thank-you,
   receipt) plus a booking confirmation card in the chat with the date(s) and
   the sower's contact button (ChatApp, no email/phone shared — same rule as
   Wandering Heart).
5. Funds follow the existing unified payout schedule. **No escrow / hold for v1**
   — pre-payment, same as production orchards per the lawyer. Release-escrow is
   not used. Revisit if disputes appear.

Acceptance: a booking gives 2 `processed_webhooks` rows, Books entries, and no
immediate payout — same test as the other purchase kinds.

## 8. My Garden

One list of all the member's seeds regardless of kind, newest first, with a kind
filter row (All · Music · Hand · Wheel · Pillow · Orchards) using the
Learn & Share colours. Each card shows kind badge, title, price/rate, and for
services a small "N bookings" count. "Sow a seed" button on this page goes to
the `/sow` chooser.

Bestowals tile on the dashboard keeps its current behaviour; bookings count as
bestowals received.

## 9. Build order

1. `/sow` chooser page (replaces the current `/sow` landing; music links to
   `/sow/music`).
2. Role unlock (reusing existing directory tables).
3. Hand seed form + My Garden unified list + kind filter.
4. Booking purchase kind, tested with a $1 Hand booking end to end.
5. Wheel, then Pillow forms (booking already works).
6. Grower-side: seed detail page with "Request booking" for each kind.

Do not start step 1 until the music album form has passed acceptance (Amber's
album). Steps 1–3 can be done while album fixes are in review.

## 10. Out of scope for v1

Calendar sync, maps/geo search beyond town + radius text, insurance,
ID/licence verification, escrow, reviews/ratings, multi-day pricing tiers,
deposits, cancellation refunds (handle manually via admin for now).
