// Decides whether a payout-earnings request is a dry run or a real send.
//
// Pure function, no Deno or Supabase imports, so the unit suite
// (src/test/payout-run-mode.test.ts) can import it directly.
//
// Rules (audit 2026-09-05, P0-1):
//   - An empty body, a body that is not valid JSON, or a body that is not a
//     JSON object (arrays, strings, numbers, null) is REJECTED. The caller
//     must answer 400 and do nothing. Before this, an unreadable body was
//     silently treated as {} -- and {} meant "real run", so a pasted key
//     with a stray line break was enough to move money.
//   - A real send happens ONLY when the object carries exactly
//     "confirm": "send" (case-sensitive) AND does not also ask for a dry
//     run. Anything else -- {}, {"dry_run": true}, {"dry_run": false},
//     {"confirm": "SEND"} -- is a dry run. The safe outcome is the default.
//   - {"confirm": "send", "dry_run": true}: dry run wins. A caller that
//     says both is confused, and the cheaper reading of a confused caller
//     is "preview", never "send".

export type RunMode =
  | { ok: true; mode: "dry" | "send" }
  | { ok: false; error: "invalid_body" };

export function parseRunMode(rawBody: string | null | undefined): RunMode {
  if (typeof rawBody !== "string" || rawBody.trim() === "") {
    return { ok: false, error: "invalid_body" };
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawBody);
  } catch {
    return { ok: false, error: "invalid_body" };
  }
  if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
    return { ok: false, error: "invalid_body" };
  }
  const body = parsed as Record<string, unknown>;
  const confirmed = body.confirm === "send";
  const askedDry = body.dry_run === true;
  return { ok: true, mode: confirmed && !askedDry ? "send" : "dry" };
}
