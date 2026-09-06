# payout-earnings request bodies

Used with `curl -d @scripts/payouts/dry.json` / `-d @scripts/payouts/send.json`
so a pasted key with a line break can never turn a dry run into a real run
(P0-1 in AUDIT-2026-09-05.md). The service-role key goes in the `apikey`
header only, wrapped as `K=$(printf %s "<key>")`.
