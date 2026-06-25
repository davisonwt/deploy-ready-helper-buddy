**Phase 1 (in progress): Read-only audit**

A subagent is scanning the codebase for every reference to Stripe, Cryptomus, Binance Pay, Solana, and VAPID/web-push. The report will cover, per subsystem:
- All file paths that reference it
- Whether any route in `src/App.tsx` points to it
- Whether anything outside its own files imports it
- Whether any UI surfaces it to real users
- Edge function status and whether anything in `src/` invokes them
- A verdict: LIVE / PARTIALLY WIRED / DEAD
- Special notes for VAPID (payments vs legitimate web-push) and Binance (payment provider vs wallet balance)

**Phase 2 (awaiting your approval, after the report):**

Once the audit lands, I'll come back with a concrete removal plan that lists, per subsystem:
- Exact files to delete
- Exact import lines to remove from surviving files
- Edge functions to delete via `supabase--delete_edge_functions`
- Secrets that become orphaned (I will NOT auto-delete secrets — I'll list them for you to remove manually)
- Migrations, docs, and tests: I'll flag these but NOT touch docs/migrations without explicit go-ahead (per your scope-lock rule)

**I will not touch anything that is LIVE or PARTIALLY WIRED without checking with you first.** VAPID in particular is likely legitimate web-push, not payments — I'll flag it separately and leave it alone unless you say otherwise.

Approve this plan to let me proceed to Phase 2 once the report arrives. If the report shows everything is dead and removal is mechanical, I'll execute. If anything is ambiguous, I'll stop and ask before deleting.