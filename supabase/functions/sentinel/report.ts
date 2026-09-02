// Reconciliation logic for sentinel's checks. Each check runs independently
// and reports the FULL current set of conditions it detects (not a diff
// against last run) -- reconcileCheck() does the diffing: open a new
// condition, update/re-notify an existing one per the dedupe rule, or
// resolve one that's no longer detected. A check re-evaluating the same
// rolling window every run (e.g. "avatar wiped in the last 24h") gets
// correct auto-resolution for free once the window ages a subject out,
// with no separate "point-in-time event" code path needed.
import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

export type Severity = "info" | "warn" | "critical";

export interface Condition {
  subject: string | null;
  severity: Severity;
  message: string;
  detail?: unknown;
}

const SEVERITY_RANK: Record<Severity, number> = { info: 0, warn: 1, critical: 2 };
const RENOTIFY_AFTER_MS = 24 * 60 * 60 * 1000;

/**
 * Reconciles one check's currently-detected conditions against open
 * sentinel_events rows for that check. Never throws on a single condition's
 * notify/write failure -- logs and continues, so one bad row can't stop the
 * rest of this check (or any other check) from being processed.
 */
export async function reconcileCheck(
  admin: SupabaseClient,
  checkName: string,
  detected: Condition[],
): Promise<void> {
  const { data: openRows, error: fetchErr } = await admin
    .from("sentinel_events")
    .select("id, subject, severity, last_notified_at")
    .eq("check_name", checkName)
    .eq("status", "open");
  if (fetchErr) {
    console.error(`sentinel: reconcileCheck(${checkName}) failed to read open rows`, fetchErr);
    return;
  }

  const openBySubject = new Map<string, { id: string; severity: Severity; last_notified_at: string | null }>(
    (openRows ?? []).map((r: any) => [r.subject ?? "", r]),
  );
  const detectedKeys = new Set(detected.map((c) => c.subject ?? ""));
  const now = new Date().toISOString();

  for (const cond of detected) {
    try {
      const key = cond.subject ?? "";
      const existing = openBySubject.get(key);

      if (!existing) {
        const shouldNotify = cond.severity !== "info";
        const { error: insErr } = await admin.from("sentinel_events").insert({
          check_name: checkName,
          subject: cond.subject,
          severity: cond.severity,
          status: "open",
          message: cond.message,
          detail: cond.detail ?? null,
          first_seen: now,
          last_seen: now,
          last_notified_at: shouldNotify ? now : null,
        });
        if (insErr) { console.error(`sentinel: insert failed for ${checkName}/${key}`, insErr); continue; }
        if (shouldNotify) await notifyGosats(admin, checkName, cond);
        continue;
      }

      const severityRose = SEVERITY_RANK[cond.severity] > SEVERITY_RANK[existing.severity];
      const staleSinceNotify = !existing.last_notified_at ||
        (Date.now() - new Date(existing.last_notified_at).getTime()) > RENOTIFY_AFTER_MS;
      const shouldNotify = cond.severity !== "info" && (severityRose || staleSinceNotify);

      const { error: updErr } = await admin.from("sentinel_events").update({
        last_seen: now,
        severity: cond.severity,
        message: cond.message,
        detail: cond.detail ?? null,
        ...(shouldNotify ? { last_notified_at: now } : {}),
      }).eq("id", existing.id);
      if (updErr) { console.error(`sentinel: update failed for ${checkName}/${key}`, updErr); continue; }
      if (shouldNotify) await notifyGosats(admin, checkName, cond);
    } catch (e) {
      console.error(`sentinel: condition handling threw for ${checkName}`, e);
    }
  }

  for (const [key, row] of openBySubject) {
    if (detectedKeys.has(key)) continue;
    try {
      await admin.from("sentinel_events")
        .update({ status: "resolved", resolved_at: now })
        .eq("id", row.id);
    } catch (e) {
      console.error(`sentinel: resolve failed for ${checkName}/${key}`, e);
    }
  }
}

async function notifyGosats(admin: SupabaseClient, checkName: string, cond: Condition): Promise<void> {
  try {
    const { data: gosats, error } = await admin.from("user_roles").select("user_id").in("role", ["admin", "gosat"]);
    if (error) { console.error("sentinel: could not list gosats to notify", error); return; }
    // A user commonly holds both admin AND gosat rows (e.g. gosat+admin+
    // radio_admin is the norm for this app's staff) -- the .in() above
    // returns one row per matching role, so dedupe by user_id or a
    // multi-role user gets notified once per role they hold.
    const uniqueUserIds = [...new Set((gosats ?? []).map((g: any) => g.user_id))];
    const rows = uniqueUserIds.map((user_id) => ({
      user_id,
      type: "sentinel_alert",
      title: `Sentinel ${cond.severity === "critical" ? "CRITICAL" : "warning"}: ${checkName}`,
      message: cond.message,
      action_url: "/admin/sentinel",
      is_read: false,
    }));
    if (rows.length > 0) {
      const { error: insErr } = await admin.from("user_notifications").insert(rows);
      if (insErr) console.error("sentinel: gosat notification insert failed", insErr);
    }
  } catch (e) {
    console.error("sentinel: notifyGosats threw", e);
  }
}

/** One info row per calendar day (UTC), so "the sentinel itself is alive" is answerable without depending on any other check having fired. */
export async function maybeDailyAllClear(admin: SupabaseClient, openCriticalCount: number, openWarnCount: number): Promise<void> {
  const today = new Date().toISOString().slice(0, 10);
  const { data: existing } = await admin
    .from("sentinel_events")
    .select("id")
    .eq("check_name", "daily_heartbeat")
    .eq("subject", today)
    .maybeSingle();
  if (existing) return;
  await admin.from("sentinel_events").insert({
    check_name: "daily_heartbeat",
    subject: today,
    severity: "info",
    status: "resolved",
    resolved_at: new Date().toISOString(),
    message: `Sentinel ran today. ${openCriticalCount} open critical, ${openWarnCount} open warn.`,
    detail: { open_critical: openCriticalCount, open_warn: openWarnCount },
  });
}
