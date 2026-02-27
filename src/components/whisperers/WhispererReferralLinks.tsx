import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Copy, Link2, ExternalLink, MousePointerClick, TrendingUp, Check } from 'lucide-react';
import { toast } from 'sonner';

interface ReferralLink {
  id: string;
  ref_code: string;
  product_id: string | null;
  orchard_id: string | null;
  book_id: string | null;
  is_active: boolean;
  total_clicks: number;
  total_conversions: number;
  total_earned: number;
  created_at: string;
  product?: { title: string; cover_image_url: string | null } | null;
  orchard?: { name: string } | null;
  book?: { title: string } | null;
}

export function WhispererReferralLinks() {
  const { user } = useAuth();
  const [links, setLinks] = useState<ReferralLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    fetchLinks();
  }, [user]);

  const fetchLinks = async () => {
    try {
      const { data: whisperer } = await supabase
        .from('whisperers')
        .select('id')
        .eq('user_id', user!.id)
        .single();

      if (!whisperer) {
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('whisperer_referral_links' as any)
        .select(`
          id, ref_code, product_id, orchard_id, book_id,
          is_active, total_clicks, total_conversions, total_earned, created_at
        `)
        .eq('whisperer_id', whisperer.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch product/orchard/book names
      const productIds = (data || []).filter((l: any) => l.product_id).map((l: any) => l.product_id);
      const orchardIds = (data || []).filter((l: any) => l.orchard_id).map((l: any) => l.orchard_id);
      const bookIds = (data || []).filter((l: any) => l.book_id).map((l: any) => l.book_id);

      const [products, orchards, books] = await Promise.all([
        productIds.length > 0
          ? supabase.from('products').select('id, title, cover_image_url').in('id', productIds)
          : { data: [] },
        orchardIds.length > 0
          ? supabase.from('orchards').select('id, name').in('id', orchardIds)
          : { data: [] },
        bookIds.length > 0
          ? supabase.from('sower_books').select('id, title').in('id', bookIds)
          : { data: [] },
      ]);

      const productMap = new Map((products.data || []).map((p: any) => [p.id, p]));
      const orchardMap = new Map((orchards.data || []).map((o: any) => [o.id, o]));
      const bookMap = new Map((books.data || []).map((b: any) => [b.id, b]));

      const enriched: ReferralLink[] = (data || []).map((link: any) => ({
        ...link,
        product: link.product_id ? productMap.get(link.product_id) || null : null,
        orchard: link.orchard_id ? orchardMap.get(link.orchard_id) || null : null,
        book: link.book_id ? bookMap.get(link.book_id) || null : null,
      }));

      setLinks(enriched);
    } catch (err) {
      console.error('Error fetching referral links:', err);
    } finally {
      setLoading(false);
    }
  };

  const getReferralUrl = (link: ReferralLink): string => {
    const base = 'https://sow2growapp.com';
    if (link.product_id) return `${base}/products/${link.product_id}?ref=${link.ref_code}`;
    if (link.orchard_id) return `${base}/orchards/${link.orchard_id}?ref=${link.ref_code}`;
    if (link.book_id) return `${base}/books/${link.book_id}?ref=${link.ref_code}`;
    return `${base}?ref=${link.ref_code}`;
  };

  const getItemName = (link: ReferralLink): string => {
    if (link.product) return link.product.title;
    if (link.orchard) return link.orchard.name;
    if (link.book) return link.book.title;
    return 'Unknown item';
  };

  const getItemType = (link: ReferralLink): string => {
    if (link.product_id) return 'Seed';
    if (link.orchard_id) return 'Orchard';
    if (link.book_id) return 'Book';
    return 'Item';
  };

  const copyLink = async (link: ReferralLink) => {
    const url = getReferralUrl(link);
    await navigator.clipboard.writeText(url);
    setCopiedId(link.id);
    toast.success('Referral link copied!');
    setTimeout(() => setCopiedId(null), 2000);
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8 flex items-center justify-center">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Link2 className="h-5 w-5 text-primary" />
          <CardTitle>My Referral Links</CardTitle>
          {links.length > 0 && (
            <Badge variant="secondary">{links.length}</Badge>
          )}
        </div>
        <CardDescription>
          Share these links to earn commission when someone bestows on a product you promote
        </CardDescription>
      </CardHeader>

      <CardContent>
        {links.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Link2 className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No referral links yet</p>
            <p className="text-sm mt-1">Accept a sower invitation to get your first link!</p>
          </div>
        ) : (
          <ScrollArea className="max-h-[500px]">
            <div className="space-y-3">
              {links.map((link) => (
                <div
                  key={link.id}
                  className="p-4 rounded-xl border bg-muted/30 space-y-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline" className="text-xs">{getItemType(link)}</Badge>
                        {!link.is_active && <Badge variant="destructive" className="text-xs">Inactive</Badge>}
                      </div>
                      <p className="font-medium truncate">{getItemName(link)}</p>
                      <p className="text-xs text-muted-foreground font-mono mt-1 truncate">
                        ref={link.ref_code}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant={copiedId === link.id ? 'default' : 'outline'}
                      onClick={() => copyLink(link)}
                      className="shrink-0 gap-1.5"
                    >
                      {copiedId === link.id ? (
                        <>
                          <Check className="h-3.5 w-3.5" />
                          Copied
                        </>
                      ) : (
                        <>
                          <Copy className="h-3.5 w-3.5" />
                          Copy Link
                        </>
                      )}
                    </Button>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="p-2 rounded-lg bg-background">
                      <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground mb-0.5">
                        <MousePointerClick className="h-3 w-3" />
                        Clicks
                      </div>
                      <p className="text-sm font-semibold">{link.total_clicks}</p>
                    </div>
                    <div className="p-2 rounded-lg bg-background">
                      <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground mb-0.5">
                        <TrendingUp className="h-3 w-3" />
                        Conversions
                      </div>
                      <p className="text-sm font-semibold">{link.total_conversions}</p>
                    </div>
                    <div className="p-2 rounded-lg bg-background">
                      <div className="text-xs text-muted-foreground mb-0.5">Earned</div>
                      <p className="text-sm font-semibold text-primary">${Number(link.total_earned).toFixed(2)}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
