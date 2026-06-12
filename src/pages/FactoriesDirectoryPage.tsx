import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Factory, BadgeCheck, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type Company = {
  id: string;
  slug: string;
  name: string;
  tagline: string | null;
  logo_url: string | null;
  banner_url: string | null;
  is_factory: boolean;
  is_verified: boolean;
};

export default function FactoriesDirectoryPage() {
  const [rows, setRows] = useState<Company[]>([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    document.title = "Factories & Companies — Sow2Grow";
    (async () => {
      const { data } = await supabase
        .from("companies")
        .select("id, slug, name, tagline, logo_url, banner_url, is_factory, is_verified")
        .eq("is_verified", true)
        .order("is_factory", { ascending: false })
        .order("name", { ascending: true });
      setRows((data as Company[]) || []);
      setLoading(false);
    })();
  }, []);

  const filtered = rows.filter((r) =>
    !q.trim() ? true : r.name.toLowerCase().includes(q.toLowerCase())
  );

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="container max-w-6xl mx-auto px-4 py-8">
        <header className="mb-6">
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Factory className="h-7 w-7 text-primary" /> Factories & Companies
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Discover verified businesses and explore everything they sow.
          </p>
        </header>

        <div className="relative mb-6 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search companies…"
            className="w-full pl-9 pr-3 py-2 rounded-lg bg-muted border border-border text-sm focus:outline-none focus:border-primary"
          />
        </div>

        {loading ? (
          <div className="text-sm text-muted-foreground">Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="text-sm text-muted-foreground">No companies yet.</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((c) => (
              <Link
                key={c.id}
                to={`/factories/${c.slug}`}
                className="group rounded-2xl overflow-hidden border border-border bg-card hover:border-primary/60 transition-colors"
              >
                <div
                  className="h-28 bg-muted"
                  style={{
                    backgroundImage: c.banner_url ? `url(${c.banner_url})` : undefined,
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                  }}
                />
                <div className="p-4 flex items-start gap-3">
                  <div className="-mt-10 h-16 w-16 rounded-xl bg-background border border-border overflow-hidden flex items-center justify-center shrink-0">
                    {c.logo_url ? (
                      <img src={c.logo_url} alt={c.name} className="h-full w-full object-cover" />
                    ) : (
                      <Factory className="h-7 w-7 text-muted-foreground" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <h2 className="font-semibold truncate">{c.name}</h2>
                      {c.is_verified && <BadgeCheck className="h-4 w-4 text-primary shrink-0" />}
                    </div>
                    {c.is_factory && (
                      <span className="inline-block mt-0.5 text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-primary/10 text-primary">
                        Factory
                      </span>
                    )}
                    {c.tagline && (
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{c.tagline}</p>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
