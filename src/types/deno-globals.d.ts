/**
 * Ambient `Deno` for the BROWSER typecheck only.
 *
 * `tsconfig.app.json` excludes `supabase/**` — but `exclude` only filters the
 * initial file list, not anything reached through an import. Two tests pull
 * server modules into the app program on purpose, to check that the client
 * and server halves of the fee maths cannot drift apart:
 *
 *   src/test/platform-fee-drift.test.ts
 *     -> supabase/functions/_shared/paypal/fees.ts
 *   src/test/orchard-uplift.test.ts
 *     -> supabase/functions/_shared/orchardUpliftRules.ts
 *
 * Those are good tests and should keep running. But `fees.ts` reads its
 * thresholds from `Deno.env`, and `Deno` does not exist in the DOM lib, so
 * `tsc -p tsconfig.app.json` reported "Cannot find name 'Deno'" — one error
 * that could not be fixed from either side without making something worse:
 * deleting the test loses the drift check, and declaring `Deno` inside
 * `fees.ts` itself would collide with Deno's own global when that function is
 * deployed.
 *
 * So it is declared here instead, narrowed to the single API the imported
 * server code actually uses. This file changes nothing at runtime and is not
 * shipped; it only stops the browser typecheck from tripping over a global
 * that is genuinely present wherever that code really runs.
 */
declare const Deno: {
  env: {
    get(key: string): string | undefined;
  };
};
