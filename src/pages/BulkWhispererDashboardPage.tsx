import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { fetchWhispererEnabledProducts } from "@/api/products";
import { useAuth } from "@/hooks/useAuth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Megaphone, Sprout, TrendingUp, DollarSign, BadgeCheck } from "lucide-react";

type Assignment = {
  id: string;
  product_id: string;
  sower_id: string;
  commission_percent: number | null;
  status: string;
  total_bestowals: number | null;
  total_earned: number | null;
  products?: {
    id: string;
    title: string;
    slug: string | null;
    cover_image_url: string | null;
    price: number | null;
    whisperer_commission_percent: number | null;
    commission_fixed: number | null;
  } | null;
  sowers?: {
    id: string;
    display_name: string;
    slug: string;
    logo_url: string | null;
    is_verified: boolean | null;
  } | null;
};

type SowerSuggestion = {
  id: string;
  slug: string;
  display_name: string;
  logo_url: string | null;
  is_verified: boolean | null;
  open_products: number;
  avg_commission: number;
};

export default function BulkWhispererDashboardPage() {
  const { user } = useAuth();
  const [whispererId, setWhispererId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [suggestions, setSuggestions] = useState<SowerSuggestion[]>([]);
  const [totals, setTotals] = useState({ pending: 0, paid: 0, bestowals: 0 });

  useEffect(() => {
    document.title = "Whisperer Dashboard — Sow2Grow";
  }, []);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      setLoading(true);

      const { data: w } = await supabase
        .from("whisperers")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();
      const wid = (w as any)?.id ?? null;
      if (cancelled) return;
      setWhispererId(wid);

      if (wid) {
        const { data: rows } = await supabase
          .from("product_whisperer_assignments")
          .select(
            "id, product_id, sower_id, commission_percent, status, total_bestowals, total_earned, products:product_id (id, title, slug, cover_image_url, price, whisperer_commission_percent, commission_fixed), sowers:sower_id (id, display_name, slug, logo_url, is_verified)",
          )
          .eq("whisperer_id", wid)
          .order("created_at", { ascending: false });
        if (!cancelled) setAssignments((rows as any) || []);

        const { data: earnings } = await supabase
          .from("whisperer_earnings")
          .select("amount, status")
          .eq("whisperer_id", wid);
        const pending = (earnings || [])
          .filter((e: any) => e.status !== "paid")
          .reduce((s: number, e: any) => s + Number(e.amount || 0), 0);
        const paid = (earnings || [])
          .filter((e: any) => e.status === "paid")
          .reduce((s: number, e: any) => s + Number(e.amount || 0), 0);
        const bestowals = (rows || []).reduce(
          (s: number, r: any) => s + Number(r.total_bestowals || 0),
          0,
        );
        if (!cancelled) setTotals({ pending, paid, bestowals });
      }

      // Sowers to market: sowers with active products having whisperer enabled
      const { data: sowerProds } = await fetchWhispererEnabledProducts(200);

      const map = new Map<string, SowerSuggestion>();
      (sowerProds || []).forEach((p: any) => {
        if (!p.sowers) return;
        const cur = map.get(p.sower_id) || {
          id: p.sowers.id,
          slug: p.sowers.slug,
          display_name: p.sowers.display_name,
          logo_url: p.sowers.logo_url,
          is_verified: p.sowers.is_verified,
          open_products: 0,
          avg_commission: 0,
        };
        cur.open_products += 1;
        cur.avg_commission =
          (cur.avg_commission * (cur.open_products - 1) +
            Number(p.whisperer_commission_percent || 0)) /
          cur.open_products;
        map.set(p.sower_id, cur);
      });
      const sugg = [...map.values()]
        .sort((a, b) => b.avg_commission - a.avg_commission)
        .slice(0, 8);
      if (!cancelled) setSuggestions(sugg);

      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  if (!user) {
    return (
      <div className="container mx-auto py-16 text-center">
        <p className="text-muted-foreground">Please sign in to view your whisperer dashboard.</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="flex items-center gap-3 mb-2">
        <Megaphone className="h-7 w-7 text-primary" />
        <h1 className="text-3xl font-bold">Whisperer Dashboard</h1>
      </div>
      <p className="text-muted-foreground mb-6">
        Market sower products, earn commissions on every bestowal.
      </p>

      {!whispererId && !loading && (
        <Card className="p-4 mb-6 border-dashed">
          <p className="text-sm text-muted-foreground">
            You're not registered as a whisperer yet.{" "}
            <Link to="/commissions" className="text-primary underline">
              Set up your whisperer profile
            </Link>{" "}
            to start earning.
          </p>
        </Card>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">Pending earnings</div>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="text-2xl font-bold mt-1">${totals.pending.toFixed(2)}</div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">Paid out</div>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="text-2xl font-bold mt-1">${totals.paid.toFixed(2)}</div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">Total bestowals</div>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="text-2xl font-bold mt-1">{totals.bestowals}</div>
        </Card>
      </div>

      <section className="mb-10">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xl font-semibold">My assigned products</h2>
          <Badge variant="secondary">{assignments.length}</Badge>
        </div>
        {loading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : assignments.length === 0 ? (
          <Card className="p-6 text-center text-muted-foreground">
            No assignments yet. Browse sowers below and request to market their products.
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {assignments.map((a) => {
              const p = a.products;
              const s = a.sowers;
              const commission =
                a.commission_percent ?? p?.whisperer_commission_percent ?? 0;
              return (
                <Card key={a.id} className="overflow-hidden">
                  <Link to={`/bulk/products/${p?.slug ?? p?.id ?? ""}`} className="block">
                    <div className="aspect-video bg-muted overflow-hidden">
                      {p?.cover_image_url ? (
                        <img
                          src={p.cover_image_url}
                          alt={p.title}
                          className="h-full w-full object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <div className="h-full w-full flex items-center justify-center text-muted-foreground">
                          <Sprout className="h-8 w-8" />
                        </div>
                      )}
                    </div>
                  </Link>
                  <div className="p-3">
                    <Link
                      to={`/bulk/products/${p?.slug ?? p?.id ?? ""}`}
                      className="font-medium line-clamp-1 hover:text-primary"
                    >
                      {p?.title ?? "Untitled"}
                    </Link>
                    {s && (
                      <Link
                        to={`/bulk/sower/${s.slug}`}
                        className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1 mt-1"
                      >
                        {s.display_name}
                        {s.is_verified && <BadgeCheck className="h-3 w-3 text-primary" />}
                      </Link>
                    )}
                    <div className="flex items-center justify-between mt-3 text-sm">
                      <Badge variant="outline" className="text-primary border-primary/40">
                        {commission}% commission
                      </Badge>
                      <span className="text-muted-foreground">
                        {a.total_bestowals || 0} bestowed
                      </span>
                    </div>
                    <div className="mt-2 text-xs text-muted-foreground">
                      Earned ${Number(a.total_earned || 0).toFixed(2)} · {a.status}
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </section>

      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xl font-semibold">Sowers to market</h2>
          <Link to="/bulk/directory" className="text-sm text-primary hover:underline">
            Browse all →
          </Link>
        </div>
        {loading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : suggestions.length === 0 ? (
          <Card className="p-6 text-center text-muted-foreground">
            No open opportunities right now. Check back soon.
          </Card>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {suggestions.map((s) => (
              <Link key={s.id} to={`/bulk/sower/${s.slug}`}>
                <Card className="p-3 hover:shadow-md transition-all h-full">
                  <div className="flex items-center gap-2">
                    <div className="h-10 w-10 rounded-full bg-muted overflow-hidden shrink-0">
                      {s.logo_url ? (
                        <img
                          src={s.logo_url}
                          alt={s.display_name}
                          className="h-full w-full object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <div className="h-full w-full flex items-center justify-center">
                          <Sprout className="h-5 w-5 text-muted-foreground" />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="font-medium text-sm truncate flex items-center gap-1">
                        {s.display_name}
                        {s.is_verified && <BadgeCheck className="h-3 w-3 text-primary" />}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {s.open_products} open
                      </div>
                    </div>
                  </div>
                  <div className="mt-2">
                    <Badge variant="secondary" className="text-xs">
                      Avg {s.avg_commission.toFixed(0)}%
                    </Badge>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
