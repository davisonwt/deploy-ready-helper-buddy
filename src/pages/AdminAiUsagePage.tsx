import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Loader2, AlertTriangle } from "lucide-react";

type Run = {
  id: string;
  user_id: string;
  companion_slug: string | null;
  tier_at_run: string | null;
  kind: string | null;
  cost_usd_estimate: number | string | null;
  created_at: string;
};

type Profile = {
  user_id: string;
  display_name: string | null;
  username: string | null;
  email: string | null;
};

const TIERS = ["sower", "keeper", "ambassador", "council"] as const;
type Tier = (typeof TIERS)[number];

const fmtUsd = (n: number) =>
  n.toLocaleString(undefined, {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: n < 1 ? 4 : 2,
    maximumFractionDigits: 4,
  });

function isoDaysAgo(days: number) {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString().slice(0, 10);
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

export default function AdminAiUsagePage() {
  const [from, setFrom] = useState(isoDaysAgo(30));
  const [to, setTo] = useState(todayIso());
  const [bucket, setBucket] = useState<"day" | "week" | "month">("day");
  const [runs, setRuns] = useState<Run[]>([]);
  const [profiles, setProfiles] = useState<Record<string, Profile>>({});
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // pricing calculator inputs
  const [prices, setPrices] = useState<Record<Tier, number>>({
    sower: 5,
    keeper: 15,
    ambassador: 35,
    council: 0,
  });

  async function load() {
    setLoading(true);
    setErr(null);
    try {
      const fromTs = new Date(from + "T00:00:00Z").toISOString();
      const toTs = new Date(to + "T23:59:59Z").toISOString();
      const { data, error } = await supabase
        .from("s2g_companion_runs")
        .select(
          "id,user_id,companion_slug,tier_at_run,kind,cost_usd_estimate,created_at"
        )
        .gte("created_at", fromTs)
        .lte("created_at", toTs)
        .order("created_at", { ascending: false })
        .limit(10000);
      if (error) throw error;
      const rows = (data ?? []) as Run[];
      setRuns(rows);

      const ids = Array.from(new Set(rows.map((r) => r.user_id))).filter(
        Boolean
      );
      if (ids.length) {
        const { data: profs } = await supabase
          .from("profiles")
          .select("user_id,display_name,username,email")
          .in("user_id", ids);
        const map: Record<string, Profile> = {};
        (profs ?? []).forEach((p: any) => (map[p.user_id] = p));
        setProfiles(map);
      } else {
        setProfiles({});
      }
    } catch (e: any) {
      setErr(e?.message ?? "Failed to load");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const normalized = useMemo(
    () =>
      runs.map((r) => ({
        ...r,
        cost: Number(r.cost_usd_estimate ?? 0) || 0,
      })),
    [runs]
  );

  const totalSpend = useMemo(
    () => normalized.reduce((s, r) => s + r.cost, 0),
    [normalized]
  );

  const activeUsers = useMemo(
    () => new Set(normalized.map((r) => r.user_id)).size,
    [normalized]
  );

  const timeSeries = useMemo(() => {
    const acc: Record<string, number> = {};
    for (const r of normalized) {
      const d = new Date(r.created_at);
      let key: string;
      if (bucket === "day") key = d.toISOString().slice(0, 10);
      else if (bucket === "month") key = d.toISOString().slice(0, 7);
      else {
        // ISO week (UTC-ish, good enough for reporting)
        const tmp = new Date(
          Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())
        );
        const day = tmp.getUTCDay() || 7;
        tmp.setUTCDate(tmp.getUTCDate() - day + 1);
        key = tmp.toISOString().slice(0, 10);
      }
      acc[key] = (acc[key] ?? 0) + r.cost;
    }
    return Object.entries(acc).sort(([a], [b]) => (a < b ? 1 : -1));
  }, [normalized, bucket]);

  const byTier = useMemo(() => {
    const acc: Record<string, { total: number; users: Set<string> }> = {};
    for (const r of normalized) {
      const t = r.tier_at_run ?? "unknown";
      if (!acc[t]) acc[t] = { total: 0, users: new Set() };
      acc[t].total += r.cost;
      acc[t].users.add(r.user_id);
    }
    return Object.entries(acc).map(([tier, v]) => ({
      tier,
      total: v.total,
      users: v.users.size,
      avgPerUser: v.users.size ? v.total / v.users.size : 0,
    }));
  }, [normalized]);

  const byKind = useMemo(() => {
    const acc: Record<string, { total: number; count: number }> = {};
    for (const r of normalized) {
      const k = r.kind ?? "unknown";
      if (!acc[k]) acc[k] = { total: 0, count: 0 };
      acc[k].total += r.cost;
      acc[k].count += 1;
    }
    return Object.entries(acc)
      .map(([kind, v]) => ({
        kind,
        total: v.total,
        count: v.count,
        avg: v.count ? v.total / v.count : 0,
      }))
      .sort((a, b) => b.total - a.total);
  }, [normalized]);

  const byCompanion = useMemo(() => {
    const acc: Record<string, { total: number; count: number }> = {};
    for (const r of normalized) {
      const k = r.companion_slug ?? "unknown";
      if (!acc[k]) acc[k] = { total: 0, count: 0 };
      acc[k].total += r.cost;
      acc[k].count += 1;
    }
    return Object.entries(acc)
      .map(([slug, v]) => ({
        slug,
        total: v.total,
        count: v.count,
        avg: v.count ? v.total / v.count : 0,
      }))
      .sort((a, b) => b.total - a.total);
  }, [normalized]);

  const topUsers = useMemo(() => {
    const acc: Record<string, { total: number; runs: number }> = {};
    for (const r of normalized) {
      if (!acc[r.user_id]) acc[r.user_id] = { total: 0, runs: 0 };
      acc[r.user_id].total += r.cost;
      acc[r.user_id].runs += 1;
    }
    return Object.entries(acc)
      .map(([user_id, v]) => ({
        user_id,
        total: v.total,
        runs: v.runs,
        profile: profiles[user_id],
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 20);
  }, [normalized, profiles]);

  const lowDataWarning = activeUsers < 10;

  return (
    <div className="container mx-auto p-6 space-y-6">
      <header className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">AI Usage & Pricing</h1>
          <p className="text-muted-foreground">
            Real spend captured from <code>s2g_companion_runs.cost_usd_estimate</code>.
            Read-only. No charging happens here.
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <Label htmlFor="from">From</Label>
            <Input
              id="from"
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="to">To</Label>
            <Input
              id="to"
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
            />
          </div>
          <div>
            <Label>Bucket</Label>
            <div className="flex gap-1">
              {(["day", "week", "month"] as const).map((b) => (
                <Button
                  key={b}
                  size="sm"
                  variant={bucket === b ? "default" : "outline"}
                  onClick={() => setBucket(b)}
                >
                  {b}
                </Button>
              ))}
            </div>
          </div>
          <Button onClick={load} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Refresh"}
          </Button>
        </div>
      </header>

      {err && (
        <Card className="border-destructive">
          <CardContent className="p-4 text-destructive">{err}</CardContent>
        </Card>
      )}

      {lowDataWarning && (
        <Card className="border-yellow-500/50 bg-yellow-500/5">
          <CardContent className="p-4 flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-yellow-500 mt-0.5" />
            <div className="text-sm">
              Fewer than 10 active users in this period
              ({activeUsers} active). Treat these averages as early signal,
              not a final answer.
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard label="Total real spend" value={fmtUsd(totalSpend)} />
        <StatCard label="Runs" value={normalized.length.toLocaleString()} />
        <StatCard label="Active users" value={activeUsers.toLocaleString()} />
        <StatCard
          label="Avg cost / active user"
          value={
            activeUsers ? fmtUsd(totalSpend / activeUsers) : fmtUsd(0)
          }
        />
      </div>

      <Tabs defaultValue="time">
        <TabsList className="flex-wrap">
          <TabsTrigger value="time">Over time</TabsTrigger>
          <TabsTrigger value="tier">By tier</TabsTrigger>
          <TabsTrigger value="kind">By kind</TabsTrigger>
          <TabsTrigger value="companion">By companion</TabsTrigger>
          <TabsTrigger value="users">Top users</TabsTrigger>
          <TabsTrigger value="pricing">Pricing calculator</TabsTrigger>
        </TabsList>

        <TabsContent value="time">
          <Card>
            <CardHeader>
              <CardTitle>Spend by {bucket}</CardTitle>
            </CardHeader>
            <CardContent>
              <SimpleTable
                cols={[bucket, "spend"]}
                rows={timeSeries.map(([k, v]) => [k, fmtUsd(v)])}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tier">
          <Card>
            <CardHeader>
              <CardTitle>Spend by tier</CardTitle>
            </CardHeader>
            <CardContent>
              <SimpleTable
                cols={["tier", "total spend", "active users", "avg / user"]}
                rows={byTier.map((r) => [
                  r.tier,
                  fmtUsd(r.total),
                  r.users.toString(),
                  fmtUsd(r.avgPerUser),
                ])}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="kind">
          <Card>
            <CardHeader>
              <CardTitle>Spend by action kind</CardTitle>
            </CardHeader>
            <CardContent>
              <SimpleTable
                cols={["kind", "total", "runs", "avg / run"]}
                rows={byKind.map((r) => [
                  r.kind,
                  fmtUsd(r.total),
                  r.count.toString(),
                  fmtUsd(r.avg),
                ])}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="companion">
          <Card>
            <CardHeader>
              <CardTitle>Spend by companion</CardTitle>
            </CardHeader>
            <CardContent>
              <SimpleTable
                cols={["companion", "total", "runs", "avg / run"]}
                rows={byCompanion.map((r) => [
                  r.slug,
                  fmtUsd(r.total),
                  r.count.toString(),
                  fmtUsd(r.avg),
                ])}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="users">
          <Card>
            <CardHeader>
              <CardTitle>Top 20 users by spend</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>#</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Runs</TableHead>
                    <TableHead className="text-right">Spend</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {topUsers.map((u, i) => (
                    <TableRow key={u.user_id}>
                      <TableCell>{i + 1}</TableCell>
                      <TableCell>
                        <div className="font-medium">
                          {u.profile?.display_name ||
                            u.profile?.username ||
                            u.profile?.email ||
                            u.user_id.slice(0, 8)}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {u.user_id}
                        </div>
                      </TableCell>
                      <TableCell>{u.runs}</TableCell>
                      <TableCell className="text-right font-mono">
                        {fmtUsd(u.total)}
                      </TableCell>
                    </TableRow>
                  ))}
                  {!topUsers.length && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-muted-foreground">
                        No runs in this period.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pricing">
          <Card>
            <CardHeader>
              <CardTitle>What should we charge?</CardTitle>
              <p className="text-sm text-muted-foreground">
                Margin = your hypothetical monthly price − average real cost
                per active user in the selected period. Red = average real cost
                exceeds the price.
              </p>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tier</TableHead>
                    <TableHead>Active users</TableHead>
                    <TableHead>Avg real cost / user</TableHead>
                    <TableHead>Hypothetical price</TableHead>
                    <TableHead className="text-right">Margin / user</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {TIERS.map((tier) => {
                    const row = byTier.find((r) => r.tier === tier);
                    const avg = row?.avgPerUser ?? 0;
                    const users = row?.users ?? 0;
                    const price = prices[tier];
                    const margin = price - avg;
                    const overBudget = avg > price && price > 0;
                    return (
                      <TableRow
                        key={tier}
                        className={overBudget ? "bg-destructive/10" : ""}
                      >
                        <TableCell className="capitalize font-medium">
                          {tier}
                        </TableCell>
                        <TableCell>{users}</TableCell>
                        <TableCell className="font-mono">
                          {fmtUsd(avg)}
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            value={price}
                            onChange={(e) =>
                              setPrices((p) => ({
                                ...p,
                                [tier]: Number(e.target.value) || 0,
                              }))
                            }
                            className="w-24"
                          />
                        </TableCell>
                        <TableCell
                          className={`text-right font-mono ${
                            overBudget
                              ? "text-destructive font-semibold"
                              : margin > 0
                              ? "text-green-600 dark:text-green-400"
                              : ""
                          }`}
                        >
                          {fmtUsd(margin)}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
              {lowDataWarning && (
                <p className="text-xs text-muted-foreground mt-3">
                  Note: with fewer than 10 active users in the period, these
                  per-tier averages are noisy. Widen the date range or wait for
                  more usage before locking a price.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="text-sm text-muted-foreground">{label}</div>
        <div className="text-2xl font-bold mt-1">{value}</div>
      </CardContent>
    </Card>
  );
}

function SimpleTable({
  cols,
  rows,
}: {
  cols: string[];
  rows: (string | number)[][];
}) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          {cols.map((c) => (
            <TableHead key={c} className="capitalize">
              {c}
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((r, i) => (
          <TableRow key={i}>
            {r.map((cell, j) => (
              <TableCell key={j} className={j === 0 ? "" : "font-mono"}>
                {cell}
              </TableCell>
            ))}
          </TableRow>
        ))}
        {!rows.length && (
          <TableRow>
            <TableCell
              colSpan={cols.length}
              className="text-muted-foreground"
            >
              No data in this period.
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  );
}
