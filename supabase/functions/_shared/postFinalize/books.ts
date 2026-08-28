// Post-finalize bookkeeping sync.
//
// Called from the same trigger points as postFinalize/messaging.ts (never
// from the client). Mirrors sower_earnings_v into books_income and
// buyer_purchases_v into expenses automatically — no manual entry — for
// every user who has an active Books workspace (a `companies` row with
// books_enabled = true, created via BooksPage's "Open my books" flow).
// A user with no workspace yet gets nothing logged; there's nowhere to
// attach it to, and this never creates a workspace on someone's behalf.
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

import { resolveContentTitle } from "./messaging.ts";

// deno-lint-ignore no-explicit-any
type SupabaseLike = any;

export type BooksSyncKind = "basket" | "content" | "gift" | "orchard" | "topup";

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
      products:product_id ( title ),
      sowers:sower_id ( user_id )
    `)
    .in("id", bestowalIds)
    .eq("status", "completed");

  const orderSubtotal = Number(basketOrder.subtotal || 0);
  const orderProcessorFee = Number(basketOrder.processor_fee || 0);
  const paidAt = basketOrder.completed_at ?? basketOrder.created_at;

  for (const r of (rows ?? []) as any[]) {
    const sowerUserId = r.sowers?.user_id;
    const title = r.products?.title ?? "Seed";
    const lineAmount = Number(r.amount || 0);
    const processorFee = orderSubtotal > 0 ? round2(orderProcessorFee * (lineAmount / orderSubtotal)) : 0;

    if (sowerUserId) {
      await upsertIncome(supabase, sowerUserId, {
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
      // A pre-existing DB trigger (trg_books_sync_product_sale) also fires
      // on this same product_bestowals insert -- independently discovered
      // during the 2026-08-26 incident repair. It books the platform fee
      // (and, when one applies, the whisperer commission) as separate
      // expense rows against a *gross* income figure; upsertIncome above
      // just overwrote that income row to the sower's net take-home
      // instead (already fee- and whisperer-net, matching this session's
      // established convention). Left in place, the trigger's fee/
      // whisperer expense rows would double-count against the now-net
      // income. Remove them -- they're redundant, not wrong on their own,
      // just incompatible with the net-income model this module uses.
      await supabase
        .from("expenses")
        .delete()
        .in("source_table", ["product_bestowals_fee", "product_bestowals_whisperer"])
        .eq("source_id", r.id);
    }

    await upsertExpense(supabase, basketOrder.user_id, {
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

  await upsertIncome(supabase, cp.seller_id, {
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

  await upsertExpense(supabase, cp.buyer_id, {
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
      orchards:orchard_id ( title, user_id )
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
    await upsertIncome(supabase, sowerUserId, {
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

  await upsertExpense(supabase, b.bestower_id, {
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

  // No sower/seed involved — self-funding. Expense only.
  await upsertExpense(supabase, t.user_id, {
    description: "Wallet top-up",
    amount: round2(Number(t.amount || 0) + Number(t.fee_amount || 0)),
    category: "Other",
    merchant: "Sow2Grow",
    spent_on: t.credited_at ?? t.created_at,
    source_table: "topups",
    source_id: t.id,
  });
}

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

async function findBooksCompany(supabase: SupabaseLike, ownerUserId: string): Promise<Company | null> {
  const { data } = await supabase
    .from("companies")
    .select("id")
    .eq("owner_user_id", ownerUserId)
    .eq("books_enabled", true)
    .limit(1)
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

async function upsertIncome(supabase: SupabaseLike, sowerUserId: string, params: IncomeParams): Promise<void> {
  const company = await findBooksCompany(supabase, sowerUserId);
  if (!company) return; // no Books workspace to attach this to yet

  const row = {
    business_id: company.id,
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

async function upsertExpense(supabase: SupabaseLike, buyerUserId: string, params: ExpenseParams): Promise<void> {
  const company = await findBooksCompany(supabase, buyerUserId);
  if (!company) return; // no Books workspace to attach this to yet

  const row = {
    business_id: company.id,
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
