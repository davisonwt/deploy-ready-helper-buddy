// Shared helpers for moving a `payouts` row's covered source rows
// (product_bestowals / content_purchases / bestowals / whisperer_earnings)
// through the payout lifecycle. Used by payout-earnings (dispatch) and
// paypal-webhook (PAYMENT.PAYOUTS-ITEM.* confirmation).
//
// The four source tables don't share one column vocabulary:
//   - product_bestowals has no payout_error column, and uses `paid_at`
//     (not `payout_completed_at`) for its completion timestamp.
//   - whisperer_earnings has no separate payout_status at all -- `status`
//     itself carries both the pre-payout state ('payable') and the payout
//     outcome ('processing'/'paid'), and its "not yet paid" state is
//     'payable', not 'pending' like the other three.
// This map is the one place that translates a generic
// processing/paid/pending transition into each table's real columns.

// deno-lint-ignore no-explicit-any
type SupabaseLike = any;

export interface CoveredRow {
  source_table: "product_bestowals" | "content_purchases" | "bestowals" | "whisperer_earnings";
  source_id: string;
}

interface TableConfig {
  statusCol: string;
  pendingValue: string;
  processingValue: string;
  paidValue: string;
  completedAtCol: string | null;
  errorCol: string | null;
}

const TABLE_CONFIG: Record<CoveredRow["source_table"], TableConfig> = {
  product_bestowals: {
    statusCol: "payout_status",
    pendingValue: "pending",
    processingValue: "processing",
    paidValue: "paid",
    completedAtCol: "paid_at",
    errorCol: null,
  },
  content_purchases: {
    statusCol: "payout_status",
    pendingValue: "pending",
    processingValue: "processing",
    paidValue: "paid",
    completedAtCol: "payout_completed_at",
    errorCol: "payout_error",
  },
  bestowals: {
    statusCol: "payout_status",
    pendingValue: "pending",
    processingValue: "processing",
    paidValue: "paid",
    completedAtCol: "payout_completed_at",
    errorCol: "payout_error",
  },
  whisperer_earnings: {
    statusCol: "status",
    pendingValue: "payable",
    processingValue: "processing",
    paidValue: "paid",
    completedAtCol: "processed_at",
    errorCol: null,
  },
};

async function updateCoveredRows(
  supabase: SupabaseLike,
  coveredRows: CoveredRow[],
  build: (cfg: TableConfig) => Record<string, unknown>,
): Promise<void> {
  const byTable = new Map<CoveredRow["source_table"], string[]>();
  for (const row of coveredRows) {
    const ids = byTable.get(row.source_table) ?? [];
    ids.push(row.source_id);
    byTable.set(row.source_table, ids);
  }
  for (const [table, ids] of byTable) {
    const cfg = TABLE_CONFIG[table];
    const { error } = await supabase.from(table).update(build(cfg)).in("id", ids);
    if (error) {
      console.error(`payoutLedger: failed to update ${table}`, ids, error.message);
    }
  }
}

/** Dispatch time: mark covered rows as in-flight so an overlapping run can't double-pick them. */
export function markCoveredRowsProcessing(supabase: SupabaseLike, coveredRows: CoveredRow[]): Promise<void> {
  return updateCoveredRows(supabase, coveredRows, (cfg) => ({ [cfg.statusCol]: cfg.processingValue }));
}

/** PAYMENT.PAYOUTS-ITEM.SUCCEEDED: mark covered rows paid for good. */
export function markCoveredRowsPaid(supabase: SupabaseLike, coveredRows: CoveredRow[]): Promise<void> {
  return updateCoveredRows(supabase, coveredRows, (cfg) => {
    const update: Record<string, unknown> = { [cfg.statusCol]: cfg.paidValue };
    if (cfg.completedAtCol) update[cfg.completedAtCol] = new Date().toISOString();
    return update;
  });
}

/** Batch creation failed, or PayPal denied/failed/blocked the item: revert to owed, picked up next run. */
export function markCoveredRowsPending(
  supabase: SupabaseLike,
  coveredRows: CoveredRow[],
  reason?: string,
): Promise<void> {
  return updateCoveredRows(supabase, coveredRows, (cfg) => {
    const update: Record<string, unknown> = { [cfg.statusCol]: cfg.pendingValue };
    if (cfg.errorCol && reason) update[cfg.errorCol] = reason;
    return update;
  });
}
