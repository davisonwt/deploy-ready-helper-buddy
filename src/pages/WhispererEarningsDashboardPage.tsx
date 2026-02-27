import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  ArrowLeft, Loader2, DollarSign, TrendingUp, MousePointerClick,
  Clock, CheckCircle, Copy, Check, Megaphone, BarChart3, Package, Link2
} from 'lucide-react';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';

export default function WhispererEarningsDashboardPage() {
  const { user } = useAuth();
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Get whisperer profile
  const { data: whisperer } = useQuery({
    queryKey: ['my-whisperer-profile', user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('whisperers')
        .select('id, display_name, total_earnings, is_verified, wallet_address')
        .eq('user_id', user!.id)
        .single();
      return data;
    },
    enabled: !!user?.id,
  });

  // Get earnings
  const { data: earnings, isLoading: earningsLoading } = useQuery({
    queryKey: ['whisperer-earnings', whisperer?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('whisperer_earnings')
        .select('id, amount, commission_percent, status, bestowal_id, assignment_id, created_at, processed_at')
        .eq('whisperer_id', whisperer!.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!whisperer?.id,
  });

  // Get referral links with performance
  const { data: refLinks, isLoading: linksLoading } = useQuery({
    queryKey: ['whisperer-ref-links-full', whisperer?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('whisperer_referral_links' as any)
        .select('id, ref_code, product_id, orchard_id, book_id, is_active, total_clicks, total_conversions, total_earned, created_at')
        .eq('whisperer_id', whisperer!.id)
        .order('total_earned', { ascending: false });
      if (error) throw error;

      // Enrich with names
      const productIds = (data || []).filter((l: any) => l.product_id).map((l: any) => l.product_id);
      const [products] = await Promise.all([
        productIds.length > 0
          ? supabase.from('products').select('id, title').in('id', productIds)
          : { data: [] },
      ]);
      const pMap = new Map((products.data || []).map((p: any) => [p.id, p.title]));

      return (data || []).map((l: any) => ({
        ...l,
        item_name: l.product_id ? pMap.get(l.product_id) || 'Product' : 'Item',
        conversionRate: l.total_clicks > 0
          ? ((l.total_conversions / l.total_clicks) * 100).toFixed(1)
          : '0.0',
      }));
    },
    enabled: !!whisperer?.id,
  });

  // Get recent conversions
  const { data: conversions } = useQuery({
    queryKey: ['whisperer-conversions', whisperer?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('whisperer_conversions' as any)
        .select('id, bestowal_amount, commission_amount, commission_percent, attribution_type, product_id, created_at')
        .eq('whisperer_id', whisperer!.id)
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return data || [];
    },
    enabled: !!whisperer?.id,
  });

  const copyLink = async (refCode: string, productId: string) => {
    const url = `https://sow2growapp.com/products/${productId}?ref=${refCode}`;
    await navigator.clipboard.writeText(url);
    setCopiedCode(refCode);
    toast.success('Link copied!');
    setTimeout(() => setCopiedCode(null), 2000);
  };

  // Compute summary
  const totalEarned = (earnings || []).reduce((s, e: any) => s + e.amount, 0);
  const pendingEarnings = (earnings || []).filter((e: any) => e.status === 'pending').reduce((s, e: any) => s + e.amount, 0);
  const paidEarnings = (earnings || []).filter((e: any) => e.status === 'released' || e.status === 'paid').reduce((s, e: any) => s + e.amount, 0);
  const totalClicks = (refLinks || []).reduce((s: number, l: any) => s + (l.total_clicks || 0), 0);
  const totalConversions = (refLinks || []).reduce((s: number, l: any) => s + (l.total_conversions || 0), 0);

  if (!whisperer && !earningsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md w-full text-center">
          <CardContent className="pt-8 pb-6">
            <Megaphone className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
            <h2 className="text-xl font-bold mb-2">Not a Whisperer Yet</h2>
            <p className="text-muted-foreground mb-4">Register as a whisperer to start earning</p>
            <Link to="/become-whisperer">
              <Button>Become a Whisperer</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (earningsLoading || linksLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <div className="container max-w-4xl mx-auto px-4 py-8">
        <Link to="/become-whisperer" className="inline-flex items-center text-muted-foreground hover:text-foreground mb-6">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Whisperer Profile
        </Link>

        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 rounded-xl bg-primary/10">
            <BarChart3 className="h-8 w-8 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Earnings Dashboard</h1>
            <p className="text-muted-foreground">
              {whisperer?.display_name}
              {whisperer?.is_verified && <Badge variant="default" className="ml-2 text-[10px]">Verified</Badge>}
            </p>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
          {[
            { label: 'Total Earned', value: `$${totalEarned.toFixed(2)}`, icon: DollarSign, color: 'text-green-500' },
            { label: 'Pending', value: `$${pendingEarnings.toFixed(2)}`, icon: Clock, color: 'text-amber-500' },
            { label: 'Total Clicks', value: totalClicks, icon: MousePointerClick, color: 'text-blue-500' },
            { label: 'Conversions', value: totalConversions, icon: TrendingUp, color: 'text-primary' },
          ].map((stat, i) => (
            <Card key={i}>
              <CardContent className="p-4 text-center">
                <stat.icon className={`h-5 w-5 mx-auto mb-1 ${stat.color}`} />
                <div className="text-lg font-bold">{stat.value}</div>
                <div className="text-xs text-muted-foreground">{stat.label}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Tabs */}
        <Tabs defaultValue="links" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="links" className="gap-1.5">
              <Link2 className="h-3.5 w-3.5" />
              Referral Links
            </TabsTrigger>
            <TabsTrigger value="earnings" className="gap-1.5">
              <DollarSign className="h-3.5 w-3.5" />
              Earnings
            </TabsTrigger>
            <TabsTrigger value="conversions" className="gap-1.5">
              <TrendingUp className="h-3.5 w-3.5" />
              Conversions
            </TabsTrigger>
          </TabsList>

          {/* Referral Links Tab */}
          <TabsContent value="links">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Your Referral Links</CardTitle>
                <CardDescription>Performance metrics for each product you promote</CardDescription>
              </CardHeader>
              <CardContent>
                {(refLinks || []).length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No referral links yet</p>
                ) : (
                  <ScrollArea className="max-h-[500px]">
                    <div className="space-y-3">
                      {(refLinks || []).map((link: any) => (
                        <div key={link.id} className="p-4 rounded-xl border bg-muted/30 space-y-3">
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-medium">{link.item_name}</span>
                                {!link.is_active && <Badge variant="destructive" className="text-[10px]">Inactive</Badge>}
                              </div>
                              <code className="text-xs text-muted-foreground font-mono">ref={link.ref_code}</code>
                            </div>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => copyLink(link.ref_code, link.product_id)}
                              className="gap-1.5"
                            >
                              {copiedCode === link.ref_code ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                              {copiedCode === link.ref_code ? 'Copied' : 'Copy'}
                            </Button>
                          </div>
                          <div className="grid grid-cols-4 gap-2 text-center">
                            <div className="p-2 rounded-lg bg-background">
                              <div className="text-sm font-semibold">{link.total_clicks}</div>
                              <div className="text-[10px] text-muted-foreground">Clicks</div>
                            </div>
                            <div className="p-2 rounded-lg bg-background">
                              <div className="text-sm font-semibold">{link.total_conversions}</div>
                              <div className="text-[10px] text-muted-foreground">Conversions</div>
                            </div>
                            <div className="p-2 rounded-lg bg-background">
                              <div className="text-sm font-semibold">{link.conversionRate}%</div>
                              <div className="text-[10px] text-muted-foreground">Conv. Rate</div>
                            </div>
                            <div className="p-2 rounded-lg bg-background">
                              <div className="text-sm font-semibold text-primary">${Number(link.total_earned).toFixed(2)}</div>
                              <div className="text-[10px] text-muted-foreground">Earned</div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Earnings Tab */}
          <TabsContent value="earnings">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Earnings History</CardTitle>
                <CardDescription>All commission payouts from your referrals</CardDescription>
              </CardHeader>
              <CardContent>
                {(earnings || []).length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No earnings yet</p>
                ) : (
                  <ScrollArea className="max-h-[500px]">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Amount</TableHead>
                          <TableHead>Commission</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(earnings || []).map((earning: any) => (
                          <TableRow key={earning.id}>
                            <TableCell className="text-sm">
                              {formatDistanceToNow(new Date(earning.created_at), { addSuffix: true })}
                            </TableCell>
                            <TableCell className="font-semibold">${earning.amount.toFixed(2)}</TableCell>
                            <TableCell className="text-muted-foreground">{earning.commission_percent}%</TableCell>
                            <TableCell>
                              <Badge
                                variant={earning.status === 'released' || earning.status === 'paid' ? 'default' : 'secondary'}
                              >
                                {earning.status === 'released' || earning.status === 'paid' ? (
                                  <><CheckCircle className="h-3 w-3 mr-1" />Paid</>
                                ) : (
                                  <><Clock className="h-3 w-3 mr-1" />Pending</>
                                )}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Conversions Tab */}
          <TabsContent value="conversions">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Recent Conversions</CardTitle>
                <CardDescription>When someone bestowed through your referral link</CardDescription>
              </CardHeader>
              <CardContent>
                {(conversions || []).length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No conversions yet</p>
                ) : (
                  <ScrollArea className="max-h-[500px]">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Bestowal</TableHead>
                          <TableHead>Your Commission</TableHead>
                          <TableHead>Type</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(conversions || []).map((conv: any) => (
                          <TableRow key={conv.id}>
                            <TableCell className="text-sm">
                              {formatDistanceToNow(new Date(conv.created_at), { addSuffix: true })}
                            </TableCell>
                            <TableCell>${conv.bestowal_amount.toFixed(2)}</TableCell>
                            <TableCell className="font-semibold text-primary">
                              ${conv.commission_amount.toFixed(2)}
                              <span className="text-xs text-muted-foreground ml-1">({conv.commission_percent}%)</span>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="text-xs capitalize">
                                {conv.attribution_type}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
