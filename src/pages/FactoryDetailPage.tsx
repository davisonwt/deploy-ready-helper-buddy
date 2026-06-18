import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, BadgeCheck, ExternalLink, Factory } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { fetchProductsByCompany } from "@/api/products";

type Company = {
  id: string;
  slug: string;
  name: string;
  tagline: string | null;
  about: string | null;
  logo_url: string | null;
  banner_url: string | null;
  website: string | null;
  is_factory: boolean;
  is_verified: boolean;
};

type Product = {
  id: string;
  slug: string | null;
  title: string;
  price: number | null;
  cover_image_url: string | null;
  image_urls: string[] | null;
};

export default function FactoryDetailPage() {
  const { slug } = useParams();
  const [company, setCompany] = useState<Company | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!slug) return;
    (async () => {
      setLoading(true);
      const { data: c } = await supabase
        .from("companies")
        .select("id, slug, name, tagline, about, logo_url, banner_url, website, is_factory, is_verified")
        .eq("slug", slug)
        .maybeSingle();
      setCompany((c as Company) || null);
      if (c?.id) {
        document.title = `${c.name} — Sow2Grow`;
        const { data: p } = await fetchProductsByCompany(c.id, 60);
        setProducts((p as Product[]) || []);
      }
      setLoading(false);
    })();
  }, [slug]);

  if (loading) {
    return <main className="min-h-screen bg-background text-foreground p-8 text-sm text-muted-foreground">Loading…</main>;
  }
  if (!company) {
    return (
      <main className="min-h-screen bg-background text-foreground p-8">
        <Link to="/factories" className="text-sm text-primary inline-flex items-center gap-1"><ArrowLeft className="h-3.5 w-3.5" /> Back</Link>
        <h1 className="text-2xl font-bold mt-4">Company not found</h1>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div
        className="h-44 sm:h-60 w-full bg-muted"
        style={{
          backgroundImage: company.banner_url ? `url(${company.banner_url})` : undefined,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      />
      <div className="container max-w-6xl mx-auto px-4 -mt-12 pb-12">
        <Link to="/factories" className="text-xs uppercase tracking-wider text-primary inline-flex items-center gap-1 mb-2">
          <ArrowLeft className="h-3.5 w-3.5" /> All companies
        </Link>
        <div className="flex items-start gap-4 flex-wrap">
          <div className="h-24 w-24 rounded-2xl bg-background border border-border overflow-hidden flex items-center justify-center shrink-0">
            {company.logo_url ? (
              <img src={company.logo_url} alt={company.name} className="h-full w-full object-cover" />
            ) : (
              <Factory className="h-10 w-10 text-muted-foreground" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl sm:text-3xl font-bold">{company.name}</h1>
              {company.is_verified && <BadgeCheck className="h-5 w-5 text-primary" />}
              {company.is_factory && (
                <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-primary/10 text-primary">Factory</span>
              )}
            </div>
            {company.tagline && <p className="text-sm text-muted-foreground mt-1">{company.tagline}</p>}
            {company.website && (
              <a
                href={company.website}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 mt-2 text-xs text-primary hover:underline"
              >
                Website <ExternalLink className="h-3 w-3" />
              </a>
            )}
          </div>
        </div>

        {company.about && (
          <section className="mt-6 max-w-3xl text-sm text-foreground/90 whitespace-pre-wrap">
            {company.about}
          </section>
        )}

        <section className="mt-8">
          <h2 className="text-lg font-semibold mb-3">Products</h2>
          {products.length === 0 ? (
            <p className="text-sm text-muted-foreground">No products yet.</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {products.map((p) => (
                <Link
                  key={p.id}
                  to={`/bulk/products/${p.slug || p.id}`}
                  className="rounded-xl overflow-hidden border border-border bg-card hover:border-primary/60 transition-colors"
                >
                  <div className="aspect-square bg-muted">
                    {(p.cover_image_url || p.image_urls?.[0]) && (
                      <img src={p.cover_image_url || p.image_urls![0]} alt={p.title} className="h-full w-full object-cover" />
                    )}
                  </div>
                  <div className="p-2">
                    <div className="text-xs font-medium truncate">{p.title}</div>
                    {p.price != null && (
                      <div className="text-[11px] text-muted-foreground mt-0.5">
                        USDC {Number(p.price).toFixed(2)}
                      </div>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
