// Lightweight failure log for sentinel's check #4 (edge function health).
// No log/analytics table is reachable via SQL from this project, and the
// Management API's log-query endpoint is confirmed unreliable (see
// sentinel/checks.ts) -- this is the fallback the build spec asked for.
// Failure-only, never on success, to keep this genuinely light. Never
// throws itself -- a broken monitoring write must never mask or replace
// the real error a function is already returning to its caller.
//
// Builds its own throwaway service-role client from env vars rather than
// taking one as a parameter -- callers vary in whether an admin/service
// client happens to be in scope at their catch block (some declare it
// inside the try, out of the catch's scope), so a one-argument call site
// that always works beats coordinating scope across ~10 different files.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

export async function logFunctionFailure(functionName: string, error: unknown): Promise<void> {
  try {
    const url = Deno.env.get("SUPABASE_URL") ?? "";
    const key = (JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") ?? "{}")["default"] || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")) ?? "";
    if (!url || !key) return; // nothing to write with -- fail silent, never block the caller
    const admin = createClient(url, key, { auth: { persistSession: false } });
    const message = error instanceof Error ? error.message : String(error);
    await admin.from("function_invocations").insert({
      function_name: functionName,
      error_message: message.slice(0, 2000),
    });
  } catch (e) {
    console.error(`logFunctionFailure: failed to log ${functionName}'s own failure`, e);
  }
}
