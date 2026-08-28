// Post-finalize bestowal messaging.
//
// Called once an order reaches a terminal "completed" state — never from the
// client, and from every path that can reach that state (PayPal's
// _shared/paypal/capture.ts, NOWPayments' nowpayments-webhook). Delivers
// three chat_messages into the buyer's inbox per sower involved in the
// order: a thank-you from the sower, a thank-you from Sow2Grow, and a
// receipt. Best-effort — a failure here must never fail the payment
// finalize step that already moved real money, so every entry point catches
// and logs instead of throwing.
//
// Idempotent per (kind, recordId, sowerKey), but not uniformly: the two
// thank-you messages are posted at most once ever (skipped if a receipt for
// this key already exists), while the receipt itself is an upsert — updated
// in place if one exists, inserted if not. That's deliberate: a finalize
// step running twice (webhook + client recovery racing, a retried
// NOWPayments IPN) must never double-post a thank-you, but a backfill
// re-run after a receipt-format fix should always leave the correct numbers
// behind rather than silently skip an order that already has a stale one.

// deno-lint-ignore no-explicit-any
type SupabaseLike = any;

export type FinalizeMessagingKind = "basket" | "content" | "gift" | "orchard" | "topup";

interface SeedLine {
  title: string;
  amount: number;
}

interface SowerLeg {
  sowerUserId: string;
  sowerName: string;
  thankYouMessage: string | null;
  buyerId: string;
  seedLines: SeedLine[];
  sowerAmount: number;
  s2gFee: number;
  whispererAmount: number | null;
  whispererName: string | null;
  /** Seed price + S2G's fee, added on top — before any processor fee. */
  gross: number;
  /** The processor's own cut, charged to the buyer on top of `gross`. */
  processorFee: number;
}

interface ResolvedOrder {
  buyerId: string;
  provider: string;
  orderRef: string;
  date: string;
  legs: SowerLeg[];
}

/** Entry point. Never throws — logs and returns on any failure. */
export async function deliverFinalizeMessages(
  supabase: SupabaseLike,
  kind: FinalizeMessagingKind,
  recordId: string,
): Promise<void> {
  try {
    if (kind === "topup") {
      await deliverTopupMessages(supabase, recordId);
      return;
    }
    const order = await resolveOrder(supabase, kind, recordId);
    if (!order) return;
    for (const leg of order.legs) {
      await deliverLeg(supabase, kind, recordId, order, leg);
    }
  } catch (err) {
    console.error("deliverFinalizeMessages failed", kind, recordId, err);
  }
}

// ---------------------------------------------------------------------------
// Order resolution per kind
// ---------------------------------------------------------------------------

async function resolveOrder(
  supabase: SupabaseLike,
  kind: FinalizeMessagingKind,
  recordId: string,
): Promise<ResolvedOrder | null> {
  if (kind === "basket") return resolveBasketOrder(supabase, recordId);
  if (kind === "content") return resolveContentOrder(supabase, recordId);
  return resolveBestowalOrder(supabase, recordId); // gift | orchard
}

async function resolveBasketOrder(supabase: SupabaseLike, basketOrderId: string): Promise<ResolvedOrder | null> {
  const { data: basketOrder } = await supabase
    .from("basket_orders")
    .select("id, user_id, provider, provider_order_id, completed_at, created_at, subtotal, processor_fee")
    .eq("id", basketOrderId)
    .maybeSingle();
  if (!basketOrder) return null;

  const { data: links } = await supabase
    .from("basket_order_bestowals")
    .select("bestowal_id")
    .eq("basket_order_id", basketOrderId);
  const bestowalIds = (links ?? []).map((l: any) => l.bestowal_id);
  if (bestowalIds.length === 0) return null;

  const { data: rows } = await supabase
    .from("product_bestowals")
    .select(`
      id, sower_id, whisperer_id, amount, s2g_fee, sower_amount, whisperer_amount, status,
      products:product_id ( title ),
      sowers:sower_id ( user_id, display_name )
    `)
    .in("id", bestowalIds)
    .eq("status", "completed");
  if (!rows || rows.length === 0) return null;

  // No FK from product_bestowals.whisperer_id to whisperers — PostgREST
  // can't auto-embed that relationship, so resolve display names separately.
  const whispererIds = [...new Set((rows as any[]).map((r) => r.whisperer_id).filter(Boolean))];
  const whispererNames = new Map<string, string>();
  if (whispererIds.length > 0) {
    const { data: whisperers } = await supabase
      .from("whisperers")
      .select("id, display_name")
      .in("id", whispererIds);
    for (const w of (whisperers ?? []) as any[]) {
      if (w.display_name) whispererNames.set(w.id, w.display_name);
    }
  }

  const legsByOwner = new Map<string, SowerLeg>();
  for (const r of rows as any[]) {
    const sowerUserId = r.sowers?.user_id;
    if (!sowerUserId) continue; // orphaned sower row — skip rather than guess
    let leg = legsByOwner.get(sowerUserId);
    if (!leg) {
      leg = {
        sowerUserId,
        sowerName: r.sowers?.display_name ?? "",
        thankYouMessage: null,
        buyerId: basketOrder.user_id,
        seedLines: [],
        sowerAmount: 0,
        s2gFee: 0,
        whispererAmount: null,
        whispererName: null,
        gross: 0,
        processorFee: 0,
      };
      legsByOwner.set(sowerUserId, leg);
    }
    leg.seedLines.push({ title: r.products?.title ?? "Seed", amount: Number(r.amount || 0) });
    leg.sowerAmount += Number(r.sower_amount || 0);
    leg.s2gFee += Number(r.s2g_fee || 0);
    leg.gross += Number(r.amount || 0);
    if (r.whisperer_id && r.whisperer_amount) {
      leg.whispererAmount = (leg.whispererAmount ?? 0) + Number(r.whisperer_amount || 0);
      leg.whispererName = whispererNames.get(r.whisperer_id) ?? leg.whispererName;
    }
  }

  // The processor fee is charged once on the whole order's subtotal, not
  // per line — basket_orders has no per-product breakdown of it. Prorate it
  // across sowers by each one's share of the order's subtotal, so a
  // multi-sower basket's receipts sum back to what was actually charged.
  const orderSubtotal = Number(basketOrder.subtotal || 0);
  const orderProcessorFee = Number(basketOrder.processor_fee || 0);
  for (const leg of legsByOwner.values()) {
    leg.processorFee = orderSubtotal > 0
      ? round2(orderProcessorFee * (leg.gross / orderSubtotal))
      : 0;
  }

  await fillSowerNamesAndNotes(supabase, legsByOwner);

  return {
    buyerId: basketOrder.user_id,
    provider: basketOrder.provider ?? "unknown",
    orderRef: basketOrder.provider_order_id ?? basketOrder.id,
    date: basketOrder.completed_at ?? basketOrder.created_at,
    legs: [...legsByOwner.values()],
  };
}

async function resolveContentOrder(supabase: SupabaseLike, purchaseId: string): Promise<ResolvedOrder | null> {
  const { data: cp } = await supabase
    .from("content_purchases")
    .select("id, buyer_id, seller_id, content_type, content_id, base_amount, platform_fee_amount, processor_fee_amount, buyer_total_amount, provider, provider_order_id, completed_at, created_at")
    .eq("id", purchaseId)
    .eq("payment_status", "completed")
    .maybeSingle();
  if (!cp) return null;

  const title = await resolveContentTitle(supabase, cp.content_type, cp.content_id);
  const legsByOwner = new Map<string, SowerLeg>();
  legsByOwner.set(cp.seller_id, {
    sowerUserId: cp.seller_id,
    sowerName: "",
    thankYouMessage: null,
    buyerId: cp.buyer_id,
    seedLines: [{ title, amount: Number(cp.base_amount || 0) + Number(cp.platform_fee_amount || 0) }],
    sowerAmount: Number(cp.base_amount || 0),
    s2gFee: Number(cp.platform_fee_amount || 0),
    whispererAmount: null,
    whispererName: null,
    gross: Number(cp.base_amount || 0) + Number(cp.platform_fee_amount || 0),
    processorFee: Number(cp.processor_fee_amount || 0),
  });
  await fillSowerNamesAndNotes(supabase, legsByOwner);

  return {
    buyerId: cp.buyer_id,
    provider: cp.provider ?? "unknown",
    orderRef: cp.provider_order_id ?? cp.id,
    date: cp.completed_at ?? cp.created_at,
    legs: [...legsByOwner.values()],
  };
}

async function resolveBestowalOrder(supabase: SupabaseLike, bestowalId: string): Promise<ResolvedOrder | null> {
  const { data: b } = await supabase
    .from("bestowals")
    .select(`
      id, bestower_id, orchard_id, buyer_total_amount, base_amount, processor_fee_amount,
      distribution_data, provider, provider_order_id, updated_at, created_at, payment_status,
      orchards:orchard_id ( title, user_id )
    `)
    .eq("id", bestowalId)
    .maybeSingle();
  if (!b || (b.payment_status !== "completed" && b.payment_status !== "distributed")) return null;

  const sowerUserId = (b.distribution_data as any)?.sower_user_id ?? b.orchards?.user_id;
  if (!sowerUserId) return null;

  const sowerAmount = Number((b.distribution_data as any)?.sower_amount ?? b.base_amount ?? 0);
  const buyerTotal = Number(b.buyer_total_amount || 0);
  const processorFee = Number(b.processor_fee_amount || 0);
  const gross = round2(buyerTotal - processorFee); // seed + S2G fee, before the processor's own cut
  const s2gFee = Math.max(0, gross - Number(b.base_amount || 0));

  const legsByOwner = new Map<string, SowerLeg>();
  legsByOwner.set(sowerUserId, {
    sowerUserId,
    sowerName: "",
    thankYouMessage: null,
    buyerId: b.bestower_id,
    seedLines: [{ title: b.orchards?.title ?? "Bestowal", amount: gross }],
    sowerAmount,
    s2gFee,
    whispererAmount: null,
    whispererName: null,
    gross,
    processorFee,
  });
  await fillSowerNamesAndNotes(supabase, legsByOwner);

  return {
    buyerId: b.bestower_id,
    provider: b.provider ?? "unknown",
    orderRef: b.provider_order_id ?? b.id,
    date: b.updated_at ?? b.created_at,
    legs: [...legsByOwner.values()],
  };
}

async function resolveContentTitle(supabase: SupabaseLike, contentType: string, contentId: string): Promise<string> {
  const lookups: Record<string, { table: string; col: string }> = {
    library_item: { table: "s2g_library_items", col: "title" },
    premium_room_access: { table: "premium_rooms", col: "title" },
    live_session_media: { table: "live_session_media", col: "file_name" },
    music_track: { table: "dj_music_tracks", col: "track_title" },
  };
  const l = lookups[contentType];
  if (!l) return "Purchase";
  const { data } = await supabase.from(l.table).select(l.col).eq("id", contentId).maybeSingle();
  return (data as any)?.[l.col] ?? "Purchase";
}

async function fillSowerNamesAndNotes(supabase: SupabaseLike, legs: Map<string, SowerLeg>): Promise<void> {
  const ids = [...legs.keys()];
  if (ids.length === 0) return;
  const { data: profiles } = await supabase
    .from("profiles")
    .select("user_id, display_name, first_name, bestowal_thank_you_message")
    .in("user_id", ids);
  for (const p of (profiles ?? []) as any[]) {
    const leg = legs.get(p.user_id);
    if (!leg) continue;
    if (!leg.sowerName) leg.sowerName = p.display_name || p.first_name || "the sower";
    leg.thankYouMessage = p.bestowal_thank_you_message || null;
  }
  for (const leg of legs.values()) {
    if (!leg.sowerName) leg.sowerName = "the sower";
  }
}

// ---------------------------------------------------------------------------
// Delivery
// ---------------------------------------------------------------------------

async function deliverLeg(
  supabase: SupabaseLike,
  kind: FinalizeMessagingKind,
  recordId: string,
  order: ResolvedOrder,
  leg: SowerLeg,
): Promise<void> {
  if (leg.buyerId === leg.sowerUserId) return; // shouldn't happen, but never message oneself

  const { data: roomId, error: roomErr } = await supabase.rpc("get_or_create_direct_room", {
    user1_id: leg.sowerUserId,
    user2_id: leg.buyerId,
  });
  if (roomErr || !roomId) {
    console.error("deliverLeg: could not open direct room", kind, recordId, leg.sowerUserId, roomErr);
    return;
  }

  const existingReceiptId = await findReceiptId(supabase, roomId, kind, recordId, leg.sowerUserId);
  const seedTitles = leg.seedLines.map((l) => l.title).join(", ");

  if (!existingReceiptId) {
    // 1) Thank-you from the sower.
    const sowerContent = leg.thankYouMessage
      ? `${leg.thankYouMessage}\n\n— ${leg.sowerName}`
      : `🙏 Thank you for supporting "${seedTitles}"! Your bestowal helps this seed grow.\n\n— ${leg.sowerName}`;
    await supabase.from("chat_messages").insert({
      room_id: roomId,
      sender_id: leg.sowerUserId,
      content: sowerContent,
      message_type: "text",
      system_metadata: { is_system: false, type: "sower_thanks", source: kind, source_id: recordId, sower_key: leg.sowerUserId },
    });

    // 2) Thank-you from Sow2Grow.
    await supabase.from("chat_messages").insert({
      room_id: roomId,
      sender_id: null,
      content: `🌱 Thank you for bestowing through Sow2Grow! Your receipt is right below.`,
      message_type: "text",
      system_metadata: {
        is_system: true, sender_name: "Sow2Grow", type: "platform_thanks",
        source: kind, source_id: recordId, sower_key: leg.sowerUserId,
      },
    });
  }

  // 3) Receipt — inserted once, then kept up to date on every re-run (a
  // backfill after a receipt-format fix should correct what's already
  // there, not skip it).
  const receiptRow = {
    content: `Receipt for "${seedTitles}"`,
    message_type: "bestowal_receipt",
    system_metadata: {
      is_system: true,
      sender_name: "Sow2Grow",
      type: "bestowal_receipt",
      source: kind,
      source_id: recordId,
      sower_key: leg.sowerUserId,
      order_ref: order.orderRef,
      date: order.date,
      provider: order.provider,
      currency: "USD",
      seed_lines: leg.seedLines,
      sower_name: leg.sowerName,
      sower_amount: round2(leg.sowerAmount),
      s2g_fee: round2(leg.s2gFee),
      whisperer_amount: leg.whispererAmount != null ? round2(leg.whispererAmount) : null,
      whisperer_name: leg.whispererName,
      subtotal: round2(leg.gross),
      processor_fee: round2(leg.processorFee),
      buyer_total: round2(leg.gross + leg.processorFee),
    },
  };
  if (existingReceiptId) {
    await supabase.from("chat_messages").update(receiptRow).eq("id", existingReceiptId);
  } else {
    await supabase.from("chat_messages").insert({ room_id: roomId, sender_id: null, ...receiptRow });
  }
}

async function deliverTopupMessages(supabase: SupabaseLike, topupId: string): Promise<void> {
  const { data: topup } = await supabase
    .from("topups")
    .select("id, user_id, amount, fee_amount, currency, provider, credited_at, created_at, status")
    .eq("id", topupId)
    .maybeSingle();
  if (!topup || topup.status !== "completed") return;

  const roomId = await ensureS2gSystemRoom(supabase, topup.user_id);
  if (!roomId) return;

  const existingReceiptId = await findReceiptId(supabase, roomId, "topup", topupId, "platform");

  if (!existingReceiptId) {
    await supabase.from("chat_messages").insert({
      room_id: roomId,
      sender_id: null,
      content: `🌱 Thank you for topping up your Sow2Grow wallet! Your receipt is right below.`,
      message_type: "text",
      system_metadata: { is_system: true, sender_name: "Sow2Grow", type: "platform_thanks", source: "topup", source_id: topupId, sower_key: "platform" },
    });
  }

  const topupAmount = round2(Number(topup.amount || 0));
  const processorFee = round2(Number(topup.fee_amount || 0));
  const receiptRow = {
    content: `Receipt for wallet top-up`,
    message_type: "bestowal_receipt",
    system_metadata: {
      is_system: true,
      sender_name: "Sow2Grow",
      type: "bestowal_receipt",
      source: "topup",
      source_id: topupId,
      sower_key: "platform",
      order_ref: topupId,
      date: topup.credited_at ?? topup.created_at,
      provider: topup.provider ?? "unknown",
      currency: topup.currency ?? "USD",
      seed_lines: [],
      sower_name: null,
      sower_amount: null,
      s2g_fee: null,
      whisperer_amount: null,
      whisperer_name: null,
      subtotal: topupAmount,
      processor_fee: processorFee,
      buyer_total: round2(topupAmount + processorFee),
      topup_amount: topupAmount,
    },
  };
  if (existingReceiptId) {
    await supabase.from("chat_messages").update(receiptRow).eq("id", existingReceiptId);
  } else {
    await supabase.from("chat_messages").insert({ room_id: roomId, sender_id: null, ...receiptRow });
  }
}

async function ensureS2gSystemRoom(supabase: SupabaseLike, buyerId: string): Promise<string | null> {
  const { data: existing } = await supabase
    .from("chat_rooms")
    .select("id")
    .eq("is_system_room", true)
    .eq("created_by", buyerId)
    .contains("metadata", { kind: "s2g_receipts" })
    .maybeSingle();
  if (existing?.id) return existing.id;

  const { data: room, error: roomErr } = await supabase
    .from("chat_rooms")
    .insert({
      name: "🌻 Sow2Grow",
      description: "Receipts and confirmations from Sow2Grow.",
      room_type: "direct",
      created_by: buyerId,
      is_system_room: true,
      metadata: { kind: "s2g_receipts" },
    })
    .select("id")
    .single();
  if (roomErr) {
    console.error("ensureS2gSystemRoom failed", buyerId, roomErr);
    return null;
  }

  await supabase.from("chat_participants").insert([{ room_id: room.id, user_id: buyerId, is_active: true }]);
  return room.id;
}

async function findReceiptId(
  supabase: SupabaseLike,
  roomId: string,
  kind: string,
  recordId: string,
  sowerKey: string,
): Promise<string | null> {
  const { data } = await supabase
    .from("chat_messages")
    .select("id")
    .eq("room_id", roomId)
    .eq("message_type", "bestowal_receipt")
    .contains("system_metadata", { source: kind, source_id: recordId, sower_key: sowerKey })
    .maybeSingle();
  return data?.id ?? null;
}

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}
