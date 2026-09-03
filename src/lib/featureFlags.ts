// Build-time feature flags, read from Vite env vars (must carry the VITE_
// prefix to reach the client bundle). Off by default when unset -- every
// flag here should fail toward the safer/older behavior, never silently
// turn a feature on because a var was never configured.

/**
 * S2G Balance (custodial on-platform balance): topping up, paying from a
 * balance, on-demand withdrawal. Turned OFF 2026-09-03 -- Sow2Grow moved
 * to a non-custodial model per legal's decision (see spec-payments.md).
 * The balance_ledger tables, RPCs, wallet page, and checkout branch are
 * all left fully intact so this can be flipped back on later; this flag
 * is the only thing that changes.
 */
export const S2G_BALANCE_ENABLED = import.meta.env.VITE_S2G_BALANCE_ENABLED === 'true';
