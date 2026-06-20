import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { Loader2, Sparkles } from "lucide-react";

/**
 * Gosat/admin-only control for the time-bound Companion free-trial.
 * Reads `app_settings.companion_promo_ends_at` and lets staff extend or end early.
 * Reverts automatically when the timestamp passes — no manual switch-off needed.
 */
export function CompanionPromoControl() {
  const [endsAt, setEndsAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    const { data, error } = await supabase
      .from("app_settings")
      .select("value")
      .eq("key", "companion_promo_ends_at")
      .maybeSingle();
    if (!error && data) {
      // Stored as JSON string (timestamptz cast to text).
      const v = typeof data.value === "string" ? data.value : (data.value as any);
      setEndsAt(v);
    }
    setLoading(false);
  }

  useEffect(() => {
    void load();
  }, []);

  async function setTo(newEndsAtIso: string) {
    setSaving(true);
    const { error } = await supabase.rpc("set_companion_promo_ends_at", {
      _ends_at: newEndsAtIso,
    });
    setSaving(false);
    if (error) {
      toast({ title: "Failed to update promo", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Promo updated", description: `Ends at ${new Date(newEndsAtIso).toLocaleString()}` });
    void load();
  }

  const now = Date.now();
  const ends = endsAt ? new Date(endsAt).getTime() : 0;
  const active = ends > now;
  const daysLeft = active ? Math.ceil((ends - now) / 86_400_000) : 0;

  return (
    <Card className="border-primary/40">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5" />
          Companion Free Trial
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading…
          </div>
        ) : (
          <>
            <div className="text-sm">
              {active ? (
                <>
                  <span className="font-medium text-primary">Free trial active</span>{" "}
                  for sower-tier users until{" "}
                  <span className="font-mono">{new Date(endsAt!).toLocaleString()}</span>{" "}
                  ({daysLeft} day{daysLeft === 1 ? "" : "s"} left).
                </>
              ) : (
                <span className="text-muted-foreground">
                  No active promo. Normal tier caps apply.
                </span>
              )}
            </div>

            <div className="text-xs text-muted-foreground space-y-1">
              <div>
                Safety ceilings during promo (per user / 24h):{" "}
                <span className="font-mono">100 images · 100 voice · 50 video</span>.
              </div>
              <div>
                Global platform ceiling:{" "}
                <span className="font-mono">500 videos / 24h</span> across all users.
              </div>
              <div>Keeper / Ambassador / Council tiers keep their normal caps.</div>
            </div>

            <div className="flex flex-wrap items-end gap-2">
              <div>
                <Label htmlFor="promo-ends-at" className="text-xs">
                  Set end date/time
                </Label>
                <Input
                  id="promo-ends-at"
                  type="datetime-local"
                  defaultValue={endsAt ? toLocalInput(endsAt) : ""}
                  onBlur={(e) => {
                    const v = e.target.value;
                    if (!v) return;
                    const iso = new Date(v).toISOString();
                    if (iso !== endsAt) void setTo(iso);
                  }}
                  disabled={saving}
                />
              </div>
              <Button
                size="sm"
                variant="outline"
                disabled={saving}
                onClick={() => setTo(new Date(Date.now() + 7 * 86_400_000).toISOString())}
              >
                +7 days from now
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={saving}
                onClick={() => setTo(new Date(Date.now() + 14 * 86_400_000).toISOString())}
              >
                +14 days from now
              </Button>
              <Button
                size="sm"
                variant="destructive"
                disabled={saving || !active}
                onClick={() => {
                  if (confirm("End the promo immediately? Sower-tier users will revert to normal caps right away.")) {
                    void setTo(new Date(Date.now() - 1000).toISOString());
                  }
                }}
              >
                End now
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function toLocalInput(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
