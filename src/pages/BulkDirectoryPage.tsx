import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Loader2, Search, Sprout, BadgeCheck } from "lucide-react";

type SowerRow = {
  id: string;
  slug: string;
  display_name: string;
  logo_url: string | null;
  banner_url: string | null;
  tagline: string | null;
  bio: string | null;
  is_verified: boolean | null;
};

type SowerWithStats = SowerRow & { product_count: number };

const PAGE_SIZE = 24;

export default function BulkDirectoryPage() {
  const [sowers, setSowers] = useState<SowerWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [sort, setSort] = useState<"new" | "products" | "name">("products");
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  useEffect(() => {
    document.title = "Sower Directory — Sow2Grow";
    const meta =
      document.querySelector('meta[name="description"]') ||
      Object.assign(document.createElement("meta"), { name: "description" });
    meta.setAttribute(
      "content",
      "Browse global tribal sowers — verified storytellers planting products in the Sow2Grow orchard.",
    );
    document.head.appendChild(meta);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      let query = supabase
        .from("sowers")
        .select("id, slug, display_name, logo_url, banner_url, tagline, bio, is_verified")
        .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1);

      if (verifiedOnly) query = query.eq("is_verified", true);
      if (q.trim()) query = query.ilike("display_name", `%${q.trim()}%`);
      if (sort === "new") query = query.order("created_at", { ascending: false });
      else if (sort === "name") query = query.order("display_name", { ascending: true });
      else query = query.order("created_at", { ascending: false });

      const { data, error } = await query;
      if (cancelled) return;
      if (error || !data) {
        setSowers([]);
        setHasMore(false);
        setLoading(false);
        return;
      }

      const ids = data.map((s) => s.id);
      const counts: Record<string, number> = {};
      if (ids.length) {
        const { data: prods } = await supabase
          .from("products")
          .select("sower_id")
          .in("sower_id", ids)
          .neq("status", "archived");
        prods?.forEach((p: any) => {
          counts[p.sower_id] = (counts[p.sower_id] || 0) + 1;
        });
      }

      let rows: SowerWithStats[] = data.map((s) => ({
        ...(s as SowerRow),
        product_count: counts[s.id] || 0,
      }));
      if (sort === "products") rows = rows.sort((a, b) => b.product_count - a.product_count);

      setSowers((prev) => (page === 0 ? rows : [...prev, ...rows]));
      setHasMore(data.length === PAGE_SIZE);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [q, verifiedOnly, sort, page]);

  const onSearch = (val: string) => {
    setQ(val);
    setPage(0);
  };

  const empty = useMemo(() => !loading && sowers.length === 0, [loading, sowers]);

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b bg-card/40 backdrop-blur">
        <div className="container mx-auto px-4 py-8">
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Sprout className="h-7 w-7 text-primary" />
            Sower Directory
          </h1>
          <p className="text-muted-foreground mt-1">
            Discover storytellers planting products across the tribal orchard.
          </p>

          <div className="mt-5 flex flex-col md:flex-row gap-3 md:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search sowers by name…"
                value={q}
                onChange={(e) => onSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant={sort === "products" ? "default" : "outline"}
                onClick={() => {
                  setSort("products");
                  setPage(0);
                }}
              >
                Most products
              </Button>
              <Button
                size="sm"
                variant={sort === "new" ? "default" : "outline"}
                onClick={() => {
                  setSort("new");
                  setPage(0);
                }}
              >
                Newest
              </Button>
              <Button
                size="sm"
                variant={sort === "name" ? "default" : "outline"}
                onClick={() => {
                  setSort("name");
                  setPage(0);
                }}
              >
                A–Z
              </Button>
              <Button
                size="sm"
                variant={verifiedOnly ? "default" : "outline"}
                onClick={() => {
                  setVerifiedOnly((v) => !v);
                  setPage(0);
                }}
              >
                <BadgeCheck className="h-4 w-4 mr-1" /> Verified
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {loading && page === 0 ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : empty ? (
          <div className="text-center py-16 text-muted-foreground">
            No sowers found. Try another search.
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {sowers.map((s) => (
                <Link key={s.id} to={`/bulk/sower/${s.slug}`} className="group">
                  <Card className="overflow-hidden hover:shadow-lg transition-all h-full">
                    <div
                      className="h-24 bg-gradient-to-br from-primary/20 to-secondary/20"
                      style={
                        s.banner_url
                          ? { backgroundImage: `url(${s.banner_url})`, backgroundSize: "cover" }
                          : undefined
                      }
                    />
                    <div className="p-4 -mt-8">
                      <div className="flex items-end gap-3">
                        <div className="h-14 w-14 rounded-full border-4 border-card bg-muted overflow-hidden shrink-0">
                          {s.logo_url ? (
                            <img
                              src={s.logo_url}
                              alt={s.display_name}
                              className="h-full w-full object-cover"
                              loading="lazy"
                            />
                          ) : (
                            <div className="h-full w-full flex items-center justify-center text-muted-foreground">
                              <Sprout className="h-6 w-6" />
                            </div>
                          )}
                        </div>
                        <div className="min-w-0 pb-1">
                          <div className="flex items-center gap-1">
                            <h3 className="font-semibold truncate group-hover:text-primary transition-colors">
                              {s.display_name}
                            </h3>
                            {s.is_verified && (
                              <BadgeCheck className="h-4 w-4 text-primary shrink-0" />
                            )}
                          </div>
                        </div>
                      </div>
                      {s.tagline && (
                        <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                          {s.tagline}
                        </p>
                      )}
                      <div className="mt-3 flex items-center justify-between">
                        <Badge variant="secondary">{s.product_count} products</Badge>
                        <span className="text-xs text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                          Visit →
                        </span>
                      </div>
                    </div>
                  </Card>
                </Link>
              ))}
            </div>

            {hasMore && (
              <div className="flex justify-center mt-8">
                <Button
                  variant="outline"
                  disabled={loading}
                  onClick={() => setPage((p) => p + 1)}
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Load more"}
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
