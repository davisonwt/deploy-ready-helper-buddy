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

export async function hasAcceptedSettlementConsent(service: SupabaseLike, userId: string): Promise<boolean> {
  const { data: versionRow } = await service
    .from("app_settings")
    .select("value")
    .eq("key", "settlement_consent_version")
    .maybeSingle();
  const version = Number(versionRow?.value) || 1;

  const { data } = await service
    .from("settlement_consents")
    .select("id")
    .eq("user_id", userId)
    .eq("version", version)
    .maybeSingle();
  return !!data;
}
