// Post-finalize bookkeeping sync.
//
// Called from the same trigger points as postFinalize/messaging.ts (never
// from the client). Mirrors sower_earnings_v into books_income and
// buyer_purchases_v into expenses automatically — no manual entry — for
// every user who has an active Books workspace (a `companies` row with
// books_enabled = true, created via BooksPage's "Open my books" flow, or
// via the spec-books.md backfill that gives every sower a default one).
// A business with Books not turned on gets nothing logged; there's nowhere
// to attach it to, and this never turns Books on for anyone.
//
// spec-books.md §5 — a set of books is a `companies` row, and every seed
// (product, orchard) belongs to exactly one. Income from a seed sale
// resolves business_id from THAT seed's own company_id — never from "the
// user's Books workspace" — since a member with two businesses may have
// sown the seed into either one. Anything with no specific seed behind it
// (a buyer's own expense record; a P2P gift with no orchard; whisperer and
// referral income, neither of which is logged into Books anywhere yet, but
// carries the same rule for whenever that's built) is personal, not
// per-business, and goes to the recipient's/buyer's *default* set instead.
//
// Runs at the same per-row granularity as the two views rather than
// reading them: both views embed `WHERE ... = auth.uid()` directly in
// their SQL body, not a table RLS policy, so a service-role caller (which
// bypasses table RLS but not a hardcoded auth.uid() predicate inside a
// view) would see zero rows from either. Re-derives the same numbers from
// the base tables instead — one row per product_bestowals line for a
// basket, one row per content_purchases/bestowals/topups record otherwise,
// exactly matching buyer_purchases_v's/sower_earnings_v's own granularity
// and source_id values.
//
// Idempotent per (source_table, source_id): upserts by that pair, so a
// re-run (finalize firing twice, a backfill) corrects rather than
// duplicates.
//
// This module is the *only* writer of auto-derived books_income/expenses
// rows. Two DB triggers (trg_books_sync_product_sale, trg_books_sync_gift)
// independently did the same job for product_bestowals/bestowals — found
// during the 2026-08-26 incident repair, both broken (a books_income/
// expenses unique-constraint gap the trigger's own ON CONFLICT assumed,
// plus an expenses.category CHECK violation). trg_books_sync_product_sale
// has been dropped outright rather than patched (see the
// 20260829150000 migration) now that this module covers everything it
// did. trg_books_sync_gift was left alone — untouched, out of scope for
// that decision.

import { resolveContentTitle } from "./messaging.ts";

// deno-lint-ignore no-explicit-any
type SupabaseLike = any;

export type BooksSyncKind = "basket" | "content" | "gift" | "orchard" | "topup" | "booking";

interface Company {
  id: string;
}

/** Entry point. Never throws — logs and returns on any failure. */
export async function syncBooksEntries(
  supabase: SupabaseLike,
  kind: BooksSyncKind,
  recordId: string,
): Promise<void> {
  try {
    if (kind === "basket") return await syncBasketOrder(supabase, recordId);
    if (kind === "content") return await syncContentPurchase(supabase, recordId);
    if (kind === "topup") return await syncTopup(supabase, recordId);
    if (kind === "booking") return await syncBooking(supabase, recordId);
    return await syncBestowal(supabase, recordId); // gift | orchard
  } catch (err) {
    console.error("syncBooksEntries failed", kind, recordId, err);
  }
}

async function syncBasketOrder(supabase: SupabaseLike, basketOrderId: string): Promise<void> {
  const { data: basketOrder } = await supabase
    .from("basket_orders")
    .select("id, user_id, provider, subtotal, processor_fee, completed_at, created_at")
    .eq("id", basketOrderId)
    .maybeSingle();
  if (!basketOrder) return;

  const { data: links } = await supabase
    .from("basket_order_bestowals")
    .select("bestowal_id")
    .eq("basket_order_id", basketOrderId);
  const bestowalIds = (links ?? []).map((l: any) => l.bestowal_id);
  if (bestowalIds.length === 0) return;

  const { data: rows } = await supabase
    .from("product_bestowals")
    .select(`
      id, bestower_id, sower_id, product_id, amount, s2g_fee, sower_amount, status,
      products:product_id ( title, company_id ),
      sowers:sower_id ( user_id )
    `)
    .in("id", bestowalIds)
    .eq("status", "completed");

  const orderSubtotal = Number(basketOrder.subtotal || 0);
  const orderProcessorFee = Number(basketOrder.processor_fee || 0);
  const paidAt = basketOrder.completed_at ?? basketOrder.created_at;
  const buyerCompany = await findDefaultBooksCompany(supabase, basketOrder.user_id);

  for (const r of (rows ?? []) as any[]) {
    const sowerUserId = r.sowers?.user_id;
    const title = r.products?.title ?? "Seed";
    const lineAmount = Number(r.amount || 0);
    const processorFee = orderSubtotal > 0 ? round2(orderProcessorFee * (lineAmount / orderSubtotal)) : 0;

    // Income belongs to the product's own set of books, not "the sower's"
    // — a member with two businesses may have sown this into either one.
    const sellerCompany = await findCompanyIfBooksEnabled(supabase, r.products?.company_id ?? null);
    await upsertIncome(supabase, sellerCompany?.id ?? null, {
      income_type: "sale",
      description: title,
      amount: round2(Number(r.sower_amount || 0)),
      platform_fee: round2(Number(r.s2g_fee || 0)),
      payment_method: basketOrder.provider,
      buyer_reference: await resolveBuyerName(supabase, basketOrder.user_id),
      source_table: "product_bestowals",
      source_id: r.id,
      occurred_at: paidAt,
    });

    // The buyer's own spending record is personal — their default set.
    await upsertExpense(supabase, buyerCompany?.id ?? null, {
      description: title,
      amount: round2(lineAmount + processorFee),
      category: "Other",
      merchant: sowerUserId ? await resolveSowerName(supabase, sowerUserId) : "Sow2Grow",
      spent_on: paidAt,
      source_table: "product_bestowals",
      source_id: r.id,
    });
  }
}

async function syncContentPurchase(supabase: SupabaseLike, purchaseId: string): Promise<void> {
  const { data: cp } = await supabase
    .from("content_purchases")
    .select("id, buyer_id, seller_id, content_type, content_id, base_amount, platform_fee_amount, processor_fee_amount, buyer_total_amount, provider, completed_at, created_at")
    .eq("id", purchaseId)
    .eq("payment_status", "completed")
    .maybeSingle();
  if (!cp) return;

  const title = await resolveContentTitle(supabase, cp.content_type, cp.content_id);
  const paidAt = cp.completed_at ?? cp.created_at;

  // content_purchases spans premium rooms / library items / live-session
  // media, none of which are `products` or `orchards` rows — no company_id
  // exists anywhere on these, so this income isn't attributable to a
  // specific business. Seller's default set, same as a P2P gift.
  const sellerCompany = await findDefaultBooksCompany(supabase, cp.seller_id);
  await upsertIncome(supabase, sellerCompany?.id ?? null, {
    income_type: "sale",
    description: title,
    amount: round2(Number(cp.base_amount || 0)),
    platform_fee: round2(Number(cp.platform_fee_amount || 0)),
    payment_method: cp.provider,
    buyer_reference: await resolveBuyerName(supabase, cp.buyer_id),
    source_table: "content_purchases",
    source_id: cp.id,
    occurred_at: paidAt,
  });

  const buyerCompany = await findDefaultBooksCompany(supabase, cp.buyer_id);
  await upsertExpense(supabase, buyerCompany?.id ?? null, {
    description: title,
    amount: round2(Number(cp.buyer_total_amount || 0)),
    category: "Other",
    merchant: await resolveSowerName(supabase, cp.seller_id),
    spent_on: paidAt,
    source_table: "content_purchases",
    source_id: cp.id,
  });
}

async function syncBestowal(supabase: SupabaseLike, bestowalId: string): Promise<void> {
  const { data: b } = await supabase
    .from("bestowals")
    .select(`
      id, bestower_id, orchard_id, buyer_total_amount, base_amount, processor_fee_amount,
      distribution_data, provider, updated_at, created_at, payment_status,
      orchards:orchard_id ( title, user_id, company_id )
    `)
    .eq("id", bestowalId)
    .maybeSingle();
  if (!b || (b.payment_status !== "completed" && b.payment_status !== "distributed")) return;

  const sowerUserId = (b.distribution_data as any)?.sower_user_id ?? b.orchards?.user_id;
  const sowerAmount = Number((b.distribution_data as any)?.sower_amount ?? b.base_amount ?? 0);
  const buyerTotal = Number(b.buyer_total_amount || 0);
  const processorFee = Number(b.processor_fee_amount || 0);
  const subtotal = round2(buyerTotal - processorFee);
  const s2gFee = Math.max(0, subtotal - Number(b.base_amount || 0));
  const title = b.orchards?.title ?? "Bestowal";
  const paidAt = b.updated_at ?? b.created_at;
  const incomeType = b.orchard_id ? "sale" : "gift";

  if (sowerUserId) {
    // An orchard sale belongs to that orchard's own set of books; a bare
    // P2P gift (no orchard) has no seed behind it — recipient's default set.
    const sellerCompany = b.orchard_id
      ? await findCompanyIfBooksEnabled(supabase, b.orchards?.company_id ?? null)
      : await findDefaultBooksCompany(supabase, sowerUserId);
    await upsertIncome(supabase, sellerCompany?.id ?? null, {
      income_type: incomeType,
      description: title,
      amount: round2(sowerAmount),
      platform_fee: round2(s2gFee),
      payment_method: b.provider,
      buyer_reference: await resolveBuyerName(supabase, b.bestower_id),
      source_table: "bestowals",
      source_id: b.id,
      occurred_at: paidAt,
    });
  }

  const buyerCompany = await findDefaultBooksCompany(supabase, b.bestower_id);
  await upsertExpense(supabase, buyerCompany?.id ?? null, {
    description: title,
    amount: round2(buyerTotal),
    category: "Other",
    merchant: sowerUserId ? await resolveSowerName(supabase, sowerUserId) : "Sow2Grow",
    spent_on: paidAt,
    source_table: "bestowals",
    source_id: b.id,
  });
}

async function syncTopup(supabase: SupabaseLike, topupId: string): Promise<void> {
  const { data: t } = await supabase
    .from("topups")
    .select("id, user_id, amount, fee_amount, provider, credited_at, created_at, status")
    .eq("id", topupId)
    .maybeSingle();
  if (!t || t.status !== "completed") return;

  // No sower/seed involved — self-funding. Expense only, buyer's default set.
  const buyerCompany = await findDefaultBooksCompany(supabase, t.user_id);
  await upsertExpense(supabase, buyerCompany?.id ?? null, {
    description: "Wallet top-up",
    amount: round2(Number(t.amount || 0) + Number(t.fee_amount || 0)),
    category: "Other",
    merchant: "Sow2Grow",
    spent_on: t.credited_at ?? t.created_at,
    source_table: "topups",
    source_id: t.id,
  });
}

/**
 * A paid booking, spec-service-seeds.md §7 step 3-4. finalizeBooking
 * (_shared/paypal/capture.ts) already created ONE `product_bestowals` row
 * for this booking — this looks that row up (by product_id + bestower_id
 * + the shared payment_reference, since bookings carries no direct FK to
 * it) and syncs from THAT row, keyed `source_table='product_bestowals'`
 * exactly like syncBasketOrder would have written had this gone through
 * the basket path — so it can never double-count against a real basket
 * purchase, and reuses the exact same upsert-by-source-key idempotency.
 */
async function syncBooking(supabase: SupabaseLike, bookingId: string): Promise<void> {
  const { data: booking } = await supabase
    .from("bookings")
    .select("id, product_id, grower_user_id, sower_user_id, status, total, payment_reference, updated_at, created_at")
    .eq("id", bookingId)
    .maybeSingle();
  if (!booking || booking.status !== "paid" || !booking.payment_reference) return;

  const { data: bestowal } = await supabase
    .from("product_bestowals")
    .select("id, sower_amount, s2g_fee")
    .eq("product_id", booking.product_id)
    .eq("bestower_id", booking.grower_user_id)
    .eq("payment_reference", booking.payment_reference)
    .maybeSingle();
  if (!bestowal) return; // finalizeBooking hasn't created it yet (or lookup failed) — nothing to sync

  const { data: product } = await supabase
    .from("products")
    .select("title, company_id")
    .eq("id", booking.product_id)
    .maybeSingle();
  const title = product?.title ?? "Booking";
  const paidAt = booking.updated_at ?? booking.created_at;

  const sellerCompany = await findCompanyIfBooksEnabled(supabase, product?.company_id ?? null);
  await upsertIncome(supabase, sellerCompany?.id ?? null, {
    income_type: "sale",
    description: title,
    amount: round2(Number(bestowal.sower_amount || 0)),
    platform_fee: round2(Number(bestowal.s2g_fee || 0)),
    payment_method: "paypal",
    buyer_reference: await resolveBuyerName(supabase, booking.grower_user_id),
    source_table: "product_bestowals",
    source_id: bestowal.id,
    occurred_at: paidAt,
  });

  const buyerCompany = await findDefaultBooksCompany(supabase, booking.grower_user_id);
  await upsertExpense(supabase, buyerCompany?.id ?? null, {
    description: title,
    amount: round2(Number(booking.total || 0)),
    category: "Other",
    merchant: await resolveSowerName(supabase, booking.sower_user_id),
    spent_on: paidAt,
    source_table: "product_bestowals",
    source_id: bestowal.id,
  });
}

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

/**
 * A user's default set of books — for anything with no specific seed to
 * attribute it to: a buyer's own expense record, a P2P gift with no
 * orchard, content_purchases income (no products/orchards row exists for
 * those content types), and — whenever either is actually logged into
 * Books, neither is yet — whisperer and referral income. All personal,
 * not per-business, per spec-books.md §5.
 */
async function findDefaultBooksCompany(supabase: SupabaseLike, ownerUserId: string): Promise<Company | null> {
  const { data } = await supabase
    .from("companies")
    .select("id")
    .eq("owner_user_id", ownerUserId)
    .eq("is_default", true)
    .eq("books_enabled", true)
    .maybeSingle();
  return data ?? null;
}

/**
 * The specific business a product/orchard sale belongs to — its own
 * company_id, never "the sower's Books workspace": a member with two
 * businesses may have sown this particular seed into either one.
 */
async function findCompanyIfBooksEnabled(supabase: SupabaseLike, companyId: string | null): Promise<Company | null> {
  if (!companyId) return null;
  const { data } = await supabase
    .from("companies")
    .select("id")
    .eq("id", companyId)
    .eq("books_enabled", true)
    .maybeSingle();
  return data ?? null;
}

async function resolveBuyerName(supabase: SupabaseLike, userId: string): Promise<string> {
  const { data } = await supabase.from("profiles").select("display_name, first_name").eq("user_id", userId).maybeSingle();
  return data?.display_name || data?.first_name || userId;
}

async function resolveSowerName(supabase: SupabaseLike, userId: string): Promise<string> {
  const { data } = await supabase.from("profiles").select("display_name, first_name").eq("user_id", userId).maybeSingle();
  return data?.display_name || data?.first_name || "the sower";
}

interface IncomeParams {
  income_type: "sale" | "gift";
  description: string;
  amount: number;
  platform_fee: number;
  payment_method: string | null;
  buyer_reference: string;
  source_table: string;
  source_id: string;
  occurred_at: string;
}

async function upsertIncome(supabase: SupabaseLike, businessId: string | null, params: IncomeParams): Promise<void> {
  if (!businessId) return; // no set of books to attach this to (none exists, or Books isn't enabled on it)

  const row = {
    business_id: businessId,
    income_type: params.income_type,
    description: params.description,
    amount: params.amount,
    platform_fee: params.platform_fee,
    currency: "USD",
    payment_method: params.payment_method,
    buyer_reference: params.buyer_reference,
    source_table: params.source_table,
    source_id: params.source_id,
    occurred_at: params.occurred_at,
  };

  const { data: existing } = await supabase
    .from("books_income")
    .select("id")
    .eq("source_table", params.source_table)
    .eq("source_id", params.source_id)
    .maybeSingle();

  if (existing?.id) {
    await supabase.from("books_income").update(row).eq("id", existing.id);
  } else {
    await supabase.from("books_income").insert(row);
  }
}

interface ExpenseParams {
  description: string;
  amount: number;
  category: string;
  merchant: string;
  spent_on: string;
  source_table: string;
  source_id: string;
}

async function upsertExpense(supabase: SupabaseLike, businessId: string | null, params: ExpenseParams): Promise<void> {
  if (!businessId) return; // no set of books to attach this to (none exists, or Books isn't enabled on it)

  const row = {
    business_id: businessId,
    description: params.description,
    amount: params.amount,
    currency: "USD",
    category: params.category,
    merchant: params.merchant,
    spent_on: params.spent_on,
    source: "sow2grow_purchase",
    source_table: params.source_table,
    source_id: params.source_id,
  };

  const { data: existing } = await supabase
    .from("expenses")
    .select("id")
    .eq("source_table", params.source_table)
    .eq("source_id", params.source_id)
    .maybeSingle();

  if (existing?.id) {
    await supabase.from("expenses").update(row).eq("id", existing.id);
  } else {
    await supabase.from("expenses").insert(row);
  }
}

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}
