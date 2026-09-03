// Settlement consent (non-custodial model, legal 2026-09-03). Blocks a
// SALE on an already-existing listing whose sower hasn't accepted yet --
// the "first sale" half of the requirement (new listings are blocked at
// insert time by a DB trigger; see 20260903160000_settlement_consents.sql).
// Checked here, before any order row is created and before the buyer is
// asked to pay, rather than at finalize time -- rejecting after a real
// payment has already been taken would strand the buyer's money.
//
// deno-lint-ignore no-explicit-any
type SupabaseLike = any;

// Fails OPEN (treats as accepted, never blocks the sale) on any unexpected
// error -- a transient DB read hiccup here must never take down checkout
// for every buyer of every sower. The trigger on products/orchards INSERT
// (20260903160000_settlement_consents.sql) is the hard, correctness-critical
// block for new listings; this is the softer "first sale on something
// pre-existing" check, and a false negative here (wrongly letting a sale
// through before checking) is far cheaper than a false positive that takes
// down checkout entirely.
export async function hasAcceptedSettlementConsent(service: SupabaseLike, userId: string): Promise<boolean> {
  try {
    const { data: versionRow, error: versionErr } = await service
      .from("app_settings")
      .select("value")
      .eq("key", "settlement_consent_version")
      .maybeSingle();
    if (versionErr) throw versionErr;
    const version = Number(versionRow?.value) || 1;

    const { data, error } = await service
      .from("settlement_consents")
      .select("id")
      .eq("user_id", userId)
      .eq("version", version)
      .maybeSingle();
    if (error) throw error;
    return !!data;
  } catch (err) {
    console.error("hasAcceptedSettlementConsent: check failed, failing open (not blocking the sale)", userId, err);
    return true;
  }
}
