import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  ArrowLeft, Users, Package, MousePointerClick, TrendingUp,
  DollarSign, Loader2, UserMinus, Copy, Check, Megaphone,
  BarChart3, AlertCircle
} from 'lucide-react';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface Assignment {
  id: string;
  whisperer_id: string;
  product_id: string | null;
  orchard_id: string | null;
  book_id: string | null;
  commission_percent: number;
  status: string | null;
  total_bestowals: number | null;
  total_earned: number | null;
  created_at: string | null;
  whisperer?: {
    id: string;
    display_name: string;
    is_verified: boolean;
    user_id: string;
  };
  product?: { id: string; title: string; cover_image_url: string | null } | null;
  orchard?: { id: string; name: string } | null;
  book?: { id: string; title: string } | null;
  referral_link?: {
    ref_code: string;
    total_clicks: number;
    total_conversions: number;
    total_earned: number;
    is_active: boolean;
  } | null;
}

export default function SowerWhispererManagementPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Get sower ID
  const { data: sower } = useQuery({
    queryKey: ['my-sower-id', user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('sowers')
        .select('id')
        .eq('user_id', user!.id)
        .single();
      return data;
    },
    enabled: !!user?.id,
  });

  // Get all assignments for this sower's products
  const { data: assignments, isLoading } = useQuery({
    queryKey: ['sower-whisperer-assignments', sower?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('product_whisperer_assignments')
        .select(`
          id, whisperer_id, product_id, orchard_id, book_id,
          commission_percent, status, total_bestowals, total_earned, created_at
        `)
        .eq('sower_id', sower!.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch related data in parallel
      const whispererIds = [...new Set((data || []).map(a => a.whisperer_id))];
      const productIds = (data || []).filter(a => a.product_id).map(a => a.product_id!);
      const orchardIds = (data || []).filter(a => a.orchard_id).map(a => a.orchard_id!);
      const bookIds = (data || []).filter(a => a.book_id).map(a => a.book_id!);
      const assignmentIds = (data || []).map(a => a.id);

      const [whisperers, products, orchards, books, refLinks] = await Promise.all([
        whispererIds.length > 0
          ? supabase.from('whisperers').select('id, display_name, is_verified, user_id').in('id', whispererIds)
          : { data: [] },
        productIds.length > 0
          ? supabase.from('products').select('id, title, cover_image_url').in('id', productIds)
          : { data: [] },
        orchardIds.length > 0
          ? supabase.from('orchards').select('id, name').in('id', orchardIds)
          : { data: [] },
        bookIds.length > 0
          ? supabase.from('sower_books').select('id, title').in('id', bookIds)
          : { data: [] },
        assignmentIds.length > 0
          ? supabase.from('whisperer_referral_links' as any)
              .select('assignment_id, ref_code, total_clicks, total_conversions, total_earned, is_active')
              .in('assignment_id', assignmentIds)
          : { data: [] },
      ]);

      const wMap = new Map((whisperers.data || []).map((w: any) => [w.id, w]));
      const pMap = new Map((products.data || []).map((p: any) => [p.id, p]));
      const oMap = new Map((orchards.data || []).map((o: any) => [o.id, o]));
      const bMap = new Map((books.data || []).map((b: any) => [b.id, b]));
      const rlMap = new Map((refLinks.data || []).map((r: any) => [r.assignment_id, r]));

      return (data || []).map((a): Assignment => ({
        ...a,
        whisperer: wMap.get(a.whisperer_id) || undefined,
        product: a.product_id ? pMap.get(a.product_id) || null : null,
        orchard: a.orchard_id ? oMap.get(a.orchard_id) || null : null,
        book: a.book_id ? bMap.get(a.book_id) || null : null,
        referral_link: rlMap.get(a.id) || null,
      }));
    },
    enabled: !!sower?.id,
  });

  // Toggle assignment status
  const toggleStatus = useMutation({
    mutationFn: async ({ id, newStatus }: { id: string; newStatus: string }) => {
      const { error } = await supabase
        .from('product_whisperer_assignments')
        .update({ status: newStatus })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sower-whisperer-assignments'] });
      toast.success('Assignment updated');
    },
    onError: () => toast.error('Failed to update assignment'),
  });

  // Remove assignment
  const removeAssignment = useMutation({
    mutationFn: async (id: string) => {
      // Deactivate referral link too
      await supabase
        .from('whisperer_referral_links' as any)
        .update({ is_active: false })
        .eq('assignment_id', id);

      const { error } = await supabase
        .from('product_whisperer_assignments')
        .update({ status: 'removed' })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sower-whisperer-assignments'] });
      toast.success('Whisperer removed from this product');
    },
    onError: () => toast.error('Failed to remove whisperer'),
  });

  const getItemName = (a: Assignment) => a.product?.title || a.orchard?.name || a.book?.title || 'Unknown';
  const getItemType = (a: Assignment) => a.product_id ? 'Seed' : a.orchard_id ? 'Orchard' : 'Book';

  // Group by product
  const groupedByProduct = (assignments || []).reduce((acc, a) => {
    const key = a.product_id || a.orchard_id || a.book_id || 'unknown';
    if (!acc[key]) acc[key] = { name: getItemName(a), type: getItemType(a), assignments: [] };
    acc[key].assignments.push(a);
    return acc;
  }, {} as Record<string, { name: string; type: string; assignments: Assignment[] }>);

  // Summary stats
  const totalWhisperers = new Set((assignments || []).filter(a => a.status === 'active').map(a => a.whisperer_id)).size;
  const totalClicks = (assignments || []).reduce((s, a) => s + (a.referral_link?.total_clicks || 0), 0);
  const totalConversions = (assignments || []).reduce((s, a) => s + (a.referral_link?.total_conversions || 0), 0);
  const totalEarned = (assignments || []).reduce((s, a) => s + (a.total_earned || 0), 0);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <div className="container max-w-4xl mx-auto px-4 py-8">
        <Link to="/my-products" className="inline-flex items-center text-muted-foreground hover:text-foreground mb-6">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to My Seeds
        </Link>

        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 rounded-xl bg-primary/10">
            <Users className="h-8 w-8 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Whisperer Management</h1>
            <p className="text-muted-foreground">Track performance of your marketing whisperers</p>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
          {[
            { label: 'Active Whisperers', value: totalWhisperers, icon: Megaphone, color: 'text-primary' },
            { label: 'Total Clicks', value: totalClicks, icon: MousePointerClick, color: 'text-blue-500' },
            { label: 'Conversions', value: totalConversions, icon: TrendingUp, color: 'text-green-500' },
            { label: 'Commission Paid', value: `$${totalEarned.toFixed(2)}`, icon: DollarSign, color: 'text-amber-500' },
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

        {/* Products with Whisperers */}
        {Object.keys(groupedByProduct).length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Users className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
              <h3 className="font-semibold mb-1">No Whisperer Assignments Yet</h3>
              <p className="text-sm text-muted-foreground">
                Invite whisperers to promote your seeds and earn commissions
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {Object.entries(groupedByProduct).map(([key, group]) => (
              <Card key={key}>
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{group.type}</Badge>
                    <CardTitle className="text-lg">{group.name}</CardTitle>
                    <Badge variant="secondary" className="ml-auto">
                      {group.assignments.filter(a => a.status === 'active').length} active
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {group.assignments.map((assignment) => (
                    <div
                      key={assignment.id}
                      className={`p-4 rounded-xl border transition-all ${
                        assignment.status === 'active'
                          ? 'bg-muted/30'
                          : 'bg-muted/10 opacity-60'
                      }`}
                    >
                      {/* Whisperer Info Row */}
                      <div className="flex items-center justify-between gap-3 mb-3">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-full bg-primary/10">
                            <Megaphone className="h-4 w-4 text-primary" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-medium">
                                {assignment.whisperer?.display_name || 'Unknown Whisperer'}
                              </span>
                              {assignment.whisperer?.is_verified && (
                                <Badge variant="default" className="text-[10px] px-1.5 py-0">Verified</Badge>
                              )}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {assignment.commission_percent}% commission
                              {assignment.referral_link && (
                                <> · ref: <code className="font-mono">{assignment.referral_link.ref_code}</code></>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs text-muted-foreground">
                              {assignment.status === 'active' ? 'Active' : 'Paused'}
                            </span>
                            <Switch
                              checked={assignment.status === 'active'}
                              onCheckedChange={(checked) =>
                                toggleStatus.mutate({
                                  id: assignment.id,
                                  newStatus: checked ? 'active' : 'paused',
                                })
                              }
                              disabled={assignment.status === 'removed'}
                            />
                          </div>

                          {assignment.status !== 'removed' && (
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive">
                                  <UserMinus className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Remove Whisperer?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    This will deactivate their referral link. Past earnings remain.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => removeAssignment.mutate(assignment.id)}
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                  >
                                    Remove
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          )}
                        </div>
                      </div>

                      {/* Performance Stats */}
                      <div className="grid grid-cols-4 gap-2">
                        {[
                          { label: 'Clicks', value: assignment.referral_link?.total_clicks || 0, icon: MousePointerClick },
                          { label: 'Conversions', value: assignment.referral_link?.total_conversions || 0, icon: TrendingUp },
                          { label: 'Bestowals', value: assignment.total_bestowals || 0, icon: Package },
                          { label: 'Earned', value: `$${(assignment.total_earned || 0).toFixed(2)}`, icon: DollarSign },
                        ].map((s, i) => (
                          <div key={i} className="text-center p-2 rounded-lg bg-background">
                            <s.icon className="h-3 w-3 mx-auto mb-0.5 text-muted-foreground" />
                            <div className="text-sm font-semibold">{s.value}</div>
                            <div className="text-[10px] text-muted-foreground">{s.label}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
