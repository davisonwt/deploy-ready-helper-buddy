# spec-books.md — Multiple sets of books per member

Status: decided 2026-08-29 after a read-only report. Companion to
spec-service-seeds.md (service seeds get a books link the same way).

## 1. The idea

A member with two businesses keeps two sets of books. In S2G a **set of books
is a `companies` row** — that table already scopes `books_income` and
`expenses` via `business_id`, already allows more than one row per
`owner_user_id`, and carries none of the FK weight that `sowers` does
(`sowers` stays DB-enforced 1:1 with a user; do not touch it).

Every seed (product, service seed, orchard) belongs to exactly one set of
books. Every Books entry inherits the seed's set. Payouts stay **one pool per
user** in v1 (see §6).

Vocabulary in the UI: "Books" for the feature, "a set of books" for one
`companies` row. Never "company" or "workspace" in member-facing copy.

## 2. Schema (migration first, apply via SQL or Management API, verify)

`companies` — add:
- `registration_no text`, `vat_no text`, `address text` (nullable; SA
  business identity fields the auditing firm will want)
- `is_default boolean not null default false`
- partial unique index: one `is_default = true` per `owner_user_id`

Backfill:
- Every user with a `sowers` row and no `companies` row gets one, `name` =
  their sower display name, `is_default = true`, `books_enabled` as today's
  default.
- Every user with exactly one `companies` row: set `is_default = true`.
- Users with >1 rows today (invisible orphans from double `createWorkspace`
  calls): oldest becomes default; keep the rest, they'll show in the switcher.

`products.company_id` — already exists, unused. Backfill every row to the
owner's default set (`sowers.user_id → companies.owner_user_id where
is_default`). Then `NOT NULL` + FK to `companies.id`. New inserts must set it
(§4).

`orchards.company_id` — add, backfill from `orchards.user_id` → default set,
NOT NULL + FK.

`books_income` / `expenses` — unchanged (`business_id` already there).

## 3. Businesses live in the profile; Books switches between them

**A business is set up in the sower's profile**, not inside Books. Profile
page gets a "My businesses" section listing every `companies` row the user
owns, with "Add a business" → name, currency (defaults from the default
business), optional registration no / VAT no / address. The first business
is created automatically from the sower profile at backfill / on sower
signup and is the default. Each business is one `companies` row; **adding a
business automatically opens its own set of books** — there is no separate
"create books" step anywhere. "Make default" lives here too.

`useBooksBusiness.ts` stops doing `.limit(1)`. It returns
`{ businesses, current, setCurrent }`. `current` defaults to `is_default`,
persisted in localStorage per user. It never creates rows — the profile does.

BooksPage header: a switcher (`Louw Music ▾`) listing the user's businesses,
plus a "Manage businesses" link to the profile section. Every Books tab
(Income, Expenses, Catalog, exports) reads `current.id`. Nothing on
BooksPage may query without a `business_id`.

## 4. Linking a seed to a set

`/sow` forms (music single/album now, service seeds and orchards when built):
a "Books" field, shown **only when the user has more than one set**, in "More
options", defaulting to the default set. Never blocks Plant. With one set the
field is hidden and `company_id` is set silently.

The old `UploadForm.tsx` path and any other `products` writer (DJMusicUpload,
bulk upload, video upload) must set `company_id` to the default set until
they're retired — grep every `.from('products').insert` and fix each.

After planting, the set can be changed from the seed's own settings **only
until its first sale** (`product_bestowals` row exists). After that it's
locked — moving revenue between sets after the fact is what an auditor
doesn't want to see. Show why it's locked.

Role unlock (spec-service-seeds §4) picks a set; its seeds inherit it.

## 5. Catalog and backfill

`books_backfill_products(_business_id)` currently pulls every product in the
caller's account scope into whichever business calls it. Change it to pull
only `products where company_id = _business_id`. Keep the `get_my_account_scope()`
ownership check. Same fix for any orchard equivalent.

`books.ts` (sole writer): resolve `business_id` from the product/orchard's
`company_id`, never from the user. Whisperer 1% income and referral income
go to the recipient's **default** set (personal income, not per-business).

## 6. Payouts (v1)

Unchanged: `owed_payout_balances()` keys by `recipient_user_id`, one PayPal
payout per user across all sets. Books shows a per-set breakdown of what was
paid out (payout entry split by the sets its bestowals came from), so the
member can allocate the bank receipt. Revisit per-set payouts only if a
member needs separate PayPal accounts per business.

## 7. Admin view

Admin Books page: pick any member → their sets → totals per set. This is the
auditing-firm use case (600 clients). Read-only. Reuses the same tabs with
`business_id` from the picker.

## 8. Build order

1. Migration + backfill (§2). Verify counts: every product and orchard has a
   `company_id`; every user with a sower has exactly one default set.
2. `books.ts` and `books_backfill_products` resolve by `company_id` (§5).
   Run backfill for the default set of each active sower; confirm Catalog and
   totals are unchanged for davison/Ed/Amber/Rodney.
3. Switcher + create set + settings (§3).
4. Books field on `/sow/music` and `company_id` on every remaining products
   writer (§4), plus the lock-after-first-sale rule.
5. Per-set payout breakdown (§6).
6. Admin view (§7).

Steps 1–2 are safe to do now: with one set per user they change nothing
visible. Steps 3–4 after Amber's album is accepted.

## 9. Out of scope for v1

Per-set payouts, per-set PayPal accounts, VAT calculation, multi-currency
inside one set, sharing a set with another login (account_links already
exists for that and stays as is), moving a seed between sets after its first
sale.
