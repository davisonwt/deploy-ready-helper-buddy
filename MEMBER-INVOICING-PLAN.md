# Member invoicing and estimates

Design only, written 2026-09-06 against the live schema and code. No code, migrations or deploys come with it.

The brief, in one line: a tradesperson captures the job as one-tap notes on their phone, turns the notes into an estimate, the customer accepts, one tap makes it an invoice, the customer pays in USDC or PayPal, the money settles through S2G's rails and books itself. North star: an invoice in about ten seconds, and everything that can be automatic is automatic.

What already exists and is reused rather than rebuilt:

| Existing piece | Where | Role here |
|---|---|---|
| A set of books | `companies` (`books_enabled`, `country`, `currency`, `vat_no`, `registration_no`, `address`) | The business that invoices. Every invoicing row hangs off `business_id`. |
| Saved items | `books_items` (`kind`, `unit_price`, `currency`, `source`, `active`) | Saved services and materials with remembered rates. Gains a `unit` and a `default_taxable`. |
| Auto bookkeeping | `books_income`, `expenses`, written only by `_shared/postFinalize/books.ts` | A paid invoice becomes a `books_income` row the same way a sale does. |
| S2G revenue | `revenue_ledger` via `record_revenue()` | The platform fee on a paid invoice is one `invoice_fee` row. |
| Pay-in rails | `create-*-order` functions, `_shared/solanaPayIn.ts`, `_shared/paypal/capture.ts` `finalizeCompletedOrder`, `paypal-webhook`, `check-solana-payment`, `sweep-solana-payments` | A new order kind `invoice` rides the same intent, capture, finalize and reconcile path. |
| Fee rules | `_shared/platformFee.ts` (15% on top), `_shared/paypal/fees.ts` (processor fee on the payer) | Applied unchanged. |
| Notifications | chat system messages (`_shared/postFinalize/messaging.ts`), `user_notifications`, `send-resend-email` | Reminders to members go to chat; reminders to outside customers go by email. |
| Scheduling | `pg_cron` + `invoke_money_job` | Recurring invoices and reminders. |
| Old `invoices` table | `invoices` (client_name, amount, status draft/sent/paid; 0 rows; `InvoicesTab.tsx`) | Replaced by the new model. Dropped in phase 1 since it is empty. |

---

## 1. Who it is for and the access model

**Who.** Any member with a set of books who sells time or work: plumber, electrician, doctor, builder, handyman, tutor, cleaner. The customer can be anyone with an email address. They do not need an S2G account to receive, accept or pay.

**Free versus paid.**

| Free, for every member with a set of books | Paid, with an active invoicing subscription |
|---|---|
| Saved items and rates (already in Books) | Quick notes and voice capture |
| Read every estimate and invoice ever issued | Create estimates and invoices |
| Receive payment on an invoice already sent | Recurring invoices, deposit invoices, reminders |
| Customer-facing pay page (always public) | Tax profiles and per-customer defaults |

The rule is that a lapsed subscription never blocks money coming in or the member reading their own records. It only blocks making new documents.

**The gating seam.** One SQL function is the single source of truth and everything else asks it:

`public.has_invoicing_access(_user_id uuid) RETURNS boolean` SECURITY DEFINER, STABLE. Phase 1 returns true when a row exists in a new table `feature_subscriptions` with `feature = 'invoicing'`, `status = 'active'`, and `current_period_end > now()`, or when the member holds a role in `user_roles` of `admin` or `gosat`. The price, the period and how the subscription is bought are not decided here; the table has `price_usd` and `period` columns so the checkout that creates the row can set them later.

| `feature_subscriptions` | |
|---|---|
| `id`, `user_id`, `feature` (text, CHECK `invoicing` for now) | |
| `status` | `trial`, `active`, `past_due`, `cancelled` |
| `current_period_start`, `current_period_end` | |
| `price_usd`, `period` (`month`, `year`), `source` (`bestowal`, `manual`, `trial`) | |
| `source_ref` | the bestowals row or topup that paid for it, once that exists |
| `created_at`, `updated_at` | |

How it is enforced: RLS on every writable invoicing table uses `has_invoicing_access(auth.uid())` in its INSERT and UPDATE policies for the document-creating actions; SELECT stays owner-only without the check. The client calls the same function through RPC to decide what to show. A gosat can grant a trial by inserting a `trial` row from the console; that is the only way to get access until the subscription checkout is built.

---

## 2. Data model

All money columns are USD, matching every other money table; the member's display currency comes from `companies.currency` and `exchange_rates`, exactly as Books does today. Section 9 raises billing in local currency.

### Tables

| Table | Purpose | Key columns |
|---|---|---|
| `customers` | Who gets billed. Any email; optionally linked to a member. | `id`, `business_id` → companies, `name`, `email`, `phone`, `address`, `member_user_id` (nullable → profiles.user_id), `default_tax_profile_id`, `notes`, `archived_at` |
| `job_notes` | The one-tap and voice captures. Raw, cheap, many. | `id`, `business_id`, `customer_id` (nullable), `job_ref` (free text, groups notes for one job), `kind` (`labour`, `material`, `callout`, `travel`, `other`), `text`, `quantity`, `unit`, `unit_price`, `books_item_id` (nullable), `source` (`tap`, `voice`, `typed`), `voice_transcript`, `voice_confidence`, `captured_at`, `used_in_estimate_id` (nullable) |
| `books_items` (existing) | Saved services and materials. | add `unit` (`hour`, `day`, `each`, `metre`, `km`, `job`), `default_taxable boolean`, `last_used_at`; `kind` gains `service` and `material` |
| `tax_profiles` | Per-business tax setup. | `id`, `business_id`, `name`, `rate_percent`, `label` (e.g. "VAT"), `registration_no`, `prices_include_tax boolean`, `is_default`, `country` |
| `estimates` | The offer. | `id`, `business_id`, `customer_id`, `number` (per business, `EST-0001`), `status`, `currency_display`, `subtotal`, `tax_total`, `total`, `deposit_percent`, `valid_until`, `notes_to_customer`, `public_token` (unguessable, for the customer link), `sent_at`, `accepted_at`, `declined_at`, `converted_invoice_id`, `created_at`, `updated_at` |
| `invoices` (replaces the old table) | The bill. | `id`, `business_id`, `customer_id`, `estimate_id` (nullable), `parent_invoice_id` (nullable, the deposit's parent), `number` (`INV-0001`), `status`, `kind` (`standard`, `deposit`, `balance`, `recurring`), `subtotal`, `tax_total`, `total`, `amount_paid`, `amount_due` (generated), `due_at`, `public_token`, `sent_at`, `paid_at`, `voided_at`, `void_reason`, `recurring_schedule_id` (nullable), `created_at`, `updated_at` |
| `line_items` | Lines on either document. | `id`, `estimate_id` or `invoice_id` (exactly one), `position`, `description`, `quantity`, `unit`, `unit_price`, `taxable boolean`, `tax_rate_percent` (snapshot), `line_total`, `books_item_id` (nullable), `job_note_id` (nullable) |
| `invoice_payments` | The link from money to invoice. One row per payment attempt that reached a rail. | `id`, `invoice_id`, `amount`, `rail` (`solana`, `paypal`), `environment`, `status` (`pending`, `completed`, `failed`, `refunded`), `provider_order_id`, `payment_reference` (signature or capture id), `payer_email`, `payer_user_id` (nullable), `fee_amount` (S2G's), `processor_fee`, `created_at`, `completed_at` |
| `recurring_schedules` | Repeat billing. | `id`, `business_id`, `customer_id`, `template_invoice_id`, `interval` (`weekly`, `monthly`, `quarterly`, `yearly`), `next_run_at`, `end_at`, `auto_send boolean`, `status` (`active`, `paused`, `ended`), `last_run_at` |
| `reminder_rules` | When to nudge. | `id`, `business_id`, `days_before_due int[]`, `days_after_due int[]`, `channel` (`email`, `chat`, `both`), `enabled` |
| `reminders_sent` | What was sent, so nothing is sent twice. | `id`, `invoice_id`, `rule_offset`, `channel`, `sent_at`, `result` |
| `document_events` | Append-only audit of every transition and send. | `id`, `document_kind`, `document_id`, `event`, `from_state`, `to_state`, `actor` (`member`, `customer`, `system`), `actor_ref`, `notes`, `created_at` |

Reused without change: `revenue_ledger`, `books_income`, `expenses`, `solana_payment_intents` (gains order kind `invoice`), the PayPal capture path, `companies`, `profiles_public` for member customers.

### States and the only allowed transitions

**Estimate**

| From | To | Who or what |
|---|---|---|
| draft | sent | member taps Send; `sent_at` set, customer link emailed or chatted |
| sent | accepted | customer taps Accept on the public page; `accepted_at`, `document_events` actor customer |
| sent | declined | customer taps Decline, with an optional reason |
| sent | expired | cron, when `valid_until` passes without an answer |
| accepted | converted | member taps Make invoice, or the system converts immediately if the member chose auto-convert on accept; `converted_invoice_id` set |
| draft | (deleted) | member; only drafts can be deleted, everything else is kept |

Nothing else. A declined or expired estimate can be duplicated into a new draft; it is never edited back to sent.

**Invoice**

| From | To | Who or what |
|---|---|---|
| draft | sent | member taps Send, or the recurring runner with `auto_send` |
| sent | partially_paid | finalize, when a completed payment leaves `amount_due > 0` (deposit paid, or a partial) |
| sent, partially_paid | paid | finalize, when `amount_paid >= total`; `paid_at` set |
| sent, partially_paid | overdue | cron, when `due_at` passes with `amount_due > 0`; a later payment moves it on to partially_paid or paid |
| overdue | partially_paid, paid | finalize, same rules |
| draft, sent, overdue | void | member, with a reason; only when `amount_paid = 0`. A paid or partly paid invoice is never voided, it is refunded (section 4) and stays paid with a refund record |

`amount_due = total − amount_paid` is a generated column, never written.

Line items are editable only while the parent is `draft`. Sending freezes them; a change after sending means void and reissue, which keeps numbering honest.

---

## 3. Notes to line items

**Capture.** One screen, thumb-reachable, no forms. Four big buttons at the top: Labour, Material, Callout, Other. A row of the member's most-used saved items under them. A microphone button. A free-text field last.

| Tap | What happens |
|---|---|
| Labour | opens a number pad preset to hours, default rate from the member's default labour item; save is one more tap |
| A saved item | inserts `quantity 1` at the remembered rate; tap again to bump quantity |
| Material | text plus price, unit defaults to `each` |
| Callout | the saved callout rate, quantity 1, done |
| Microphone | records until released, transcribes, parses, shows the parsed line for one confirming tap |

Every capture is one `job_notes` row with `source` set. Notes are grouped by `job_ref`, which defaults to the current customer plus today's date and can be renamed. Notes are never required to have a customer; a member can capture first and assign later.

**Voice.** Simplest reliable path: the phone's own speech recognition through the browser's Web Speech API, which is free, needs no key, and works offline-ish on Android Chrome and iOS Safari. The transcript is then parsed locally by a small rule set: a number followed by `h`, `hr`, `hrs`, `hours` is labour; `R` or `$` followed by a number is a price; a number followed by `m`, `metres`, `km` is a quantity with a unit; anything left is the description; a saved item name found in the text sets `books_item_id` and the rate. Confidence is stored; a low-confidence parse asks for confirmation instead of guessing.

What it depends on and its cost: the Web Speech API is not available in every browser and on iOS it requires user interaction to start. Where it is missing, the fallback is server-side transcription through the `OPENAI_API_KEY` secret that already exists, sending the audio clip to Whisper. That costs money per minute and adds one to three seconds of latency, so it is the fallback, not the default. `generate-voiceover` already exists for the other direction and is not reused. Decision for phase 3 in section 9.

**Storage.** Notes are rows, not documents. Voice clips are not stored; only the transcript and confidence are. A note that was pulled into an estimate keeps `used_in_estimate_id` so it cannot be pulled twice by accident, and still shows in history.

**Building the estimate.** Make estimate → the notes for this job appear as a checklist, all ticked → one tap creates a draft estimate with one line per note: description from the note text, quantity, unit, unit price, taxable from the saved item's default or the tax profile. Lines are editable in place. Merge two labour notes into one line by long-press. Totals recompute on every keystroke: subtotal, tax per taxable line at the snapshot rate, total, and the deposit amount if a deposit percent is set. The whole path from "job done" to "estimate sent" is: Make estimate, glance, Send. That is the ten seconds.

---

## 4. Payment and settlement

**Order kind.** A new kind `invoice` joins `basket`, `content`, `gift`, `orchard`, `topup`, `booking`: added to the `solana_payment_intents.order_kind` CHECK, to `PaypalOrderKind`, to `capture-paypal-order`'s kind map, and to the `finalize` switch in `_shared/paypal/capture.ts`, where `finalizeInvoicePayment()` is the new branch. The three safety nets that exist for every other kind apply automatically: `paypal-webhook`, `reconcile-paypal-orders` and `sweep-solana-payments`.

**Creating the payment.** A new function `create-invoice-payment` takes `{ invoiceId, publicToken, rail, amount? }`. It validates the token against the invoice, refuses a voided or paid invoice, defaults `amount` to `amount_due`, and permits a smaller amount only when the invoice allows partial payment. It inserts an `invoice_payments` row at `pending` and then does exactly what the other order functions do: `createSolanaIntent` with `orderKind: 'invoice'` for USDC, or a PayPal order with `custom_id = invoice:<payment id>` for PayPal. The processor fee follows `computeBuyerFee`: the payer pays it on top, as everywhere else.

**Fees.** S2G's platform fee is 15% on top of the invoice total, shown on the pay page as a separate line so the member's invoice total is what the member wrote. The customer pays `total × 1.15` plus the processor fee. On finalize the member's share is `total`, S2G's is the 15%. This is the same "sower's price plus S2G's fee carried by the payer" rule as every sale.

**Finalize.** `finalizeInvoicePayment(paymentId, reference)` in one transaction: mark the `invoice_payments` row completed with the reference; add its amount to `invoices.amount_paid`; move the invoice to `partially_paid` or `paid` and write `document_events`; call `record_revenue('invoice_fee', fee, environment, 'invoice_payments', paymentId, rail, reference)` so S2G's cut is in the ledger the moment it is earned (`record_revenue` gains `invoice_fee` in its kind list and `invoice_payments` with `status = 'completed'` as a released source); write the member's earning the same way a sale does so it enters `owed_payout_balances()` and the weekly payout on the member's chosen rail; call `syncBooksEntries` for kind `invoice` so `books_income` gets one row with `income_type = 'invoice'` and `source_table = 'invoice_payments'`. The member is paid out through the existing pipeline, not directly from the customer's transfer.

**Paid in seconds.** The member's invoice screen subscribes to Realtime on `invoices` and `invoice_payments` for their business, the same way `ChatRoom` subscribes to a room. When the Solana checker or the PayPal webhook flips the row, the screen updates without a refresh, and the customer's pay page does the same for its own invoice. For USDC that is typically under ten seconds after the wallet approves; for PayPal it is the webhook's arrival, usually under a minute.

**Partial payments and deposits.** A deposit invoice is a normal invoice with `kind = 'deposit'` and `total = parent total × deposit_percent`, created by one tap from an accepted estimate together with the balance invoice (`kind = 'balance'`, sent later). Any invoice can allow partial payment with a checkbox; each completed `invoice_payments` row adds up and the status follows the rules above.

**Refunds.** Never through a payer's card or wallet from the app in phase 1: a refund is a gosat action from the console, sent with the existing payout primitives (`sendUsdcPayout` for USDC, PayPal Payouts for PayPal) to the payer, recorded as an `invoice_payments` row with `status = 'refunded'`, and a `refund_cost` row in the revenue ledger for S2G's returned fee. The invoice stays `paid` with a visible refund line. Automated refunds are section 9.

**Customers without an S2G account.** The pay page is public, keyed by the invoice's `public_token`, and shows the invoice, the fee line, and two buttons. USDC: the page shows the Solana Pay QR and link from the intent; any wallet can pay it, and `sweep-solana-payments` confirms it server-side every two minutes without any session, so a guest never needs to sign in. PayPal: the PayPal button completes on PayPal's side and `paypal-webhook` finalizes server-side, again without a session. The only thing a guest cannot do is press the in-page Phantom pay button, which today calls `check-solana-payment` with a session; the page hides that button for guests and relies on the QR plus the sweep. `create-invoice-payment` itself accepts the public token instead of a session. A customer who is a member gets the same page plus their chat receipt.

---

## 5. Tax

**Per-member configuration.** A business has one or more `tax_profiles`; one is default. A profile is a name, a label, a rate and whether saved prices already include tax. Every line item snapshots `taxable` and `tax_rate_percent` at creation, so a later rate change never rewrites an old document.

**Sensible defaults, offered, never assumed.** When a business first opens invoicing, the app proposes a profile from `companies.country`:

| Country | Proposed profile |
|---|---|
| ZA | VAT 15%, label "VAT", registration from `companies.vat_no` if present |
| GB | VAT 20% |
| EU members | that country's standard VAT rate |
| US, AU, NZ, CA, others | no tax profile proposed; a "no tax" default and a prompt to add one |

The proposal is a pre-filled form the member confirms. Nothing is applied silently. A business with no VAT registration in ZA can keep "no tax", which is the correct behaviour for a small trader under the threshold.

**On the documents.** Tax-inclusive or exclusive display follows the profile. The estimate and invoice show subtotal, each tax line by label and rate, and total, with the registration number in the footer when set. The customer pay page shows the same figures plus S2G's fee line below the total, clearly marked as the platform fee, so the member's invoice total is never confused with what the payer is charged.

**The liability caveat, stated plainly.** S2G computes what the member configured. It does not decide whether the member must charge tax, at what rate, or whether the fee S2G takes is itself taxable in the member's country. Getting that wrong is the member's liability, and S2G's own liability on its fee is a question for counsel. Deferred to the build phase as decisions: whether S2G's 15% is shown to ZA customers with VAT on top, whether invoices in other countries need any statutory wording, and whether to offer a per-country rate table at all or only the ZA default plus "add your own".

---

## 6. Screens, mobile first

| Screen | Route | What it does | Reuses |
|---|---|---|---|
| Quick capture | `/books/capture` | Section 3's one-thumb capture with the microphone. Works with no customer chosen. | Books layout, `books_items` chips, the toast pattern |
| Saved items | `/books/catalog` (existing tab) | Add `unit`, `default_taxable`, a "use as labour default" toggle; most-used ordering. | `CatalogTab.tsx`, `CatalogItemDetailDialog.tsx` |
| Estimate builder | `/books/estimates/:id` | Line list, live totals, deposit percent, valid-until, Send. | Line editor shared with the invoice builder |
| Invoice view, member | `/books/invoices/:id` | Status, lines, payments received with references, Send, Make deposit invoice, Void, Duplicate, live "paid" flip. | Same line editor, Realtime pattern from `roomRealtime.ts` |
| Customer page | `/pay/:publicToken` | Public. Estimate: Accept or Decline. Invoice: pay by USDC or PayPal, fee line, receipt with signature or capture id once paid. | `SolanaPaymentPanel`, the PayPal button from the checkout, receipt copy from `BestowalReceiptMessage` |
| Invoicing dashboard | `/books/invoicing` | Three counts on top: outstanding, overdue, paid this month; the list under it filtered by status; a big Make estimate button. | `BooksDashboardTab.tsx` cards |
| Customers | `/books/customers` | List, add, edit, archive; link to a member by search. | `searchPublicProfiles` for the member link |
| Recurring and reminders | `/books/invoicing/settings` | Schedules list; reminder rule editor; tax profiles. | `BooksSettingsTab.tsx` |

Every one of these has a way back to `/books`, per the repo rule. The Books page gains an Invoicing tab that is the dashboard above.

---

## 7. What makes it beat the top ten

| Feature | Why a non-settling app cannot match it |
|---|---|
| Paid in seconds, on the screen | The money and the record are in the same system. The invoice flips to paid when the chain or PayPal confirms, not when the member remembers to mark it. |
| On-chain receipt | A USDC payment gives the customer a signature they can verify on any explorer, printed on the receipt. No invoicing app that only sends PDFs can do that. |
| Books itself | Every paid invoice is already a `books_income` row and already in the payout pipeline. There is no export to an accountant's tool and no reconciliation step. |
| One rail for everything the member sells | Songs, products, bookings and invoices all pay into the same wallet on the same weekly schedule with the same 15% rule. One statement. |
| Self-booking to invoice | A `bookings` row for a service seed can become the first note of a job, so the request, the visit and the bill are one thread. |
| Ten-second invoice | Notes captured during the job, saved rates, one-tap conversion. The competition starts from a blank form. |
| Deposit in one tap | Accepted estimate → deposit invoice and balance invoice together, with the balance sent automatically when the deposit is paid. |
| Reminders the member never writes | Rules per business, sent by chat to members and by email to outsiders, logged so nothing repeats. |
| No account for the customer | Public token page, QR for any wallet, PayPal without a login. |

---

## 8. Build order

Each phase ships alone and is verified before the next. Migrations are applied server-side or by the owner; every proof query lives under `scripts/studio/`. Test accounts A and B are non-admin; A is the tradesperson, B the customer.

| Phase | Delivers | Migrations | Proof |
|---|---|---|---|
| **1. Smallest useful slice** | Customers, a basic invoice with line items from saved items, Send by email or chat, the public pay page on the USDC rail only, finalize into paid, the fee in the ledger, the income in Books, the gating function. | `feature_subscriptions` + `has_invoicing_access()`; `customers`, `invoices` (new shape; drop the empty old table), `line_items`, `invoice_payments`, `document_events`; `books_items.unit / default_taxable`; `solana_payment_intents.order_kind` gains `invoice`; `record_revenue` gains `invoice_fee` and the `invoice_payments` source. | Unit: totals and fee math twin. SQL fixture: transitions refuse every disallowed move; finalize on a completed payment is idempotent. Playwright: A (granted a trial) makes an invoice for B, B opens `/pay/:token` without signing in and sees the QR; a devnet intent marked paid by the sweep flips the invoice to paid, the ledger holds one `invoice_fee`, Books holds one income row. |
| **2. Estimates and notes** | Quick capture (tap and typed), job grouping, Make estimate, customer Accept/Decline page, one-tap conversion, deposit and balance invoices. | `job_notes`, `estimates`, `line_items.estimate_id`, `invoices.kind / parent_invoice_id / estimate_id`. | Playwright: A captures three notes, makes an estimate, B accepts on the public page, A converts, a deposit invoice at 50% appears with the right totals. |
| **3. Voice** | Microphone capture with the local parser; Whisper fallback behind a flag. | none | Unit: the parser on a fixed set of phrases ("2 hours labour", "4m copper pipe R380", "callout"). Playwright: the capture screen accepts a typed transcript through the same parser. Voice itself is checked by hand on Android and iOS. |
| **4. PayPal rail and tax** | PayPal on the pay page, `tax_profiles`, country proposals, tax lines on documents. | `tax_profiles`, `line_items.taxable / tax_rate_percent`, `PaypalOrderKind` `invoice`. | Playwright: a ZA business gets the 15% VAT proposal, confirms it, an invoice shows the VAT line and the fee line separately; PayPal sandbox capture flips the invoice to paid through the webhook. |
| **5. Recurring and reminders** | Schedules, the runner, reminder rules, sent log, overdue marking. | `recurring_schedules`, `reminder_rules`, `reminders_sent`; two cron jobs through `invoke_money_job`: `invoicing-runner` hourly, `invoicing-overdue` daily. | SQL fixture: a schedule due now creates exactly one invoice and advances; a reminder due today is sent once and not again; an invoice past due flips to overdue. |
| **6. Subscription checkout** | The paid gate becomes buyable. | `feature_subscriptions.source_ref`; a `feature_subscription` order path on the existing rails. | Playwright: A buys a month on devnet, `has_invoicing_access` turns true, lapses after `current_period_end`. |
| **7. Refund console** | Gosat refund of a paid invoice payment with ledger cost. | `invoice_payments.status = refunded`, `refund_cost` rows. | Fixture: refund reverses the fee in the ledger and leaves the invoice paid with a refund line. |

Phase 1 first because it proves the whole money path end to end on one rail with the fewest tables. Phases 2 and 3 are the brief's speed story and can follow within days. Phase 4 adds PayPal because it needs sandbox work and the tax decisions in section 9.

---

## 9. Open questions

1. **Voice transcription.** Web Speech API by default is free but browser-dependent; Whisper through the existing `OPENAI_API_KEY` costs per minute. Accept the browser default with the paid fallback, or paid only for consistency?
2. **Guest customers.** Confirmed feasible on both rails through the server-side confirmers. Do guests get an emailed receipt through `send-resend-email`, whose sending domain is still unverified, or only the on-page receipt?
3. **Tax per country.** ZA VAT 15% proposal only, or a rate table for the EU and GB as well? And is S2G's 15% fee shown with VAT to ZA customers? Counsel's answer decides both.
4. **Subscription price and gating.** Price, period, trial length, and whether admins and gosats are exempt as drafted. The seam is ready; only the checkout and the numbers are missing.
5. **Local currency billing.** Documents are stored in USD and displayed in the member's currency today. Should an invoice be denominated in ZAR with the USD amount fixed at send time, so the customer sees a stable ZAR figure? That changes what the pay page charges and needs a rate snapshot column.
6. **Who pays the platform fee on an invoice.** Drafted as the customer, on top, matching every sale. If the owner prefers the member to absorb it for invoices, the pay page and the finalize split change, nothing else.
