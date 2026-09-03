// Server-side mirror of src/lib/featureFlags.ts. Off by default when
// unset -- an edge function must refuse a 'balance' request even if the
// client bundle somehow still offers it (a stale cached page, a crafted
// request), so this is checked independently of the client-side flag,
// never trusted from the request body.
export function isS2GBalanceEnabled(): boolean {
  return (Deno.env.get("S2G_BALANCE_ENABLED") ?? "").toLowerCase() === "true";
}
