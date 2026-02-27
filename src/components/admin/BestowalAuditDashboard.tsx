import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Loader2, Search, AlertTriangle, CheckCircle, DollarSign,
  Filter, RefreshCw, Eye
} from 'lucide-react';
import { format } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface BestowalAuditRow {
  id: string;
  amount: number;
  currency: string;
  payment_status: string;
  created_at: string;
  bestower_id: string;
  orchard_id: string;
  distribution_data: any;
  release_status: string | null;
  // Joined
  orchard_name?: string;
  bestower_name?: string;
  // Computed split
  sower_amount?: number;
  whisperer_amount?: number;
  tithe_amount?: number;
  admin_amount?: number;
  has_whisperer?: boolean;
  anomaly?: string | null;
}

export function BestowalAuditDashboard() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [anomalyFilter, setAnomalyFilter] = useState(false);

  const { data: bestowals, isLoading, refetch } = useQuery({
    queryKey: ['gosat-bestowal-audit', statusFilter],
    queryFn: async () => {
      let query = supabase
        .from('bestowals')
        .select(`
          id, amount, currency, payment_status, created_at,
          bestower_id, orchard_id, distribution_data, release_status,
          pockets_count, distribution_mode
        `)
        .order('created_at', { ascending: false })
        .limit(200);

      if (statusFilter !== 'all') {
        query = query.eq('payment_status', statusFilter);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Fetch orchard names
      const orchardIds = [...new Set((data || []).map(b => b.orchard_id))];
      const { data: orchards } = orchardIds.length > 0
        ? await supabase.from('orchards').select('id, name').in('id', orchardIds)
        : { data: [] };
      const oMap = new Map((orchards || []).map(o => [o.id, o.name]));

      return (data || []).map((b): BestowalAuditRow => {
        const dist = b.distribution_data as any;
        const sowerAmount = dist?.sower_amount ?? b.amount * 0.85;
        const whispererAmount = dist?.whisperer_amount ?? 0;
        const titheAmount = dist?.tithe_amount ?? b.amount * 0.10;
        const adminAmount = dist?.admin_amount ?? b.amount * 0.05;
        const hasWhisperer = whispererAmount > 0;

        // Check for anomalies
        const computedTotal = sowerAmount + whispererAmount + titheAmount + adminAmount;
        const diff = Math.abs(computedTotal - b.amount);
        let anomaly: string | null = null;
        if (diff > 0.02) {
          anomaly = `Split total ($${computedTotal.toFixed(2)}) differs from bestowal ($${b.amount.toFixed(2)}) by $${diff.toFixed(2)}`;
        }
        if (hasWhisperer && !dist?.whisperer_id) {
          anomaly = 'Whisperer amount set but no whisperer ID recorded';
        }

        return {
          ...b,
          orchard_name: oMap.get(b.orchard_id) || 'Unknown',
          sower_amount: sowerAmount,
          whisperer_amount: whispererAmount,
          tithe_amount: titheAmount,
          admin_amount: adminAmount,
          has_whisperer: hasWhisperer,
          anomaly,
        };
      });
    },
  });

  const filtered = (bestowals || []).filter(b => {
    if (anomalyFilter && !b.anomaly) return false;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      return (
        b.orchard_name?.toLowerCase().includes(term) ||
        b.id.toLowerCase().includes(term) ||
        b.bestower_id.toLowerCase().includes(term)
      );
    }
    return true;
  });

  const anomalyCount = (bestowals || []).filter(b => b.anomaly).length;
  const totalAmount = (bestowals || []).reduce((s, b) => s + b.amount, 0);
  const totalWhispererPaid = (bestowals || []).reduce((s, b) => s + (b.whisperer_amount || 0), 0);

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-4 text-center">
            <DollarSign className="h-5 w-5 mx-auto mb-1 text-green-500" />
            <div className="text-lg font-bold">${totalAmount.toFixed(2)}</div>
            <div className="text-xs text-muted-foreground">Total Bestowals</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <DollarSign className="h-5 w-5 mx-auto mb-1 text-primary" />
            <div className="text-lg font-bold">${totalWhispererPaid.toFixed(2)}</div>
            <div className="text-xs text-muted-foreground">Whisperer Commission</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <CheckCircle className="h-5 w-5 mx-auto mb-1 text-green-500" />
            <div className="text-lg font-bold">{(bestowals || []).length}</div>
            <div className="text-xs text-muted-foreground">Records</div>
          </CardContent>
        </Card>
        <Card className={anomalyCount > 0 ? 'border-destructive/50' : ''}>
          <CardContent className="p-4 text-center">
            <AlertTriangle className={`h-5 w-5 mx-auto mb-1 ${anomalyCount > 0 ? 'text-destructive' : 'text-muted-foreground'}`} />
            <div className="text-lg font-bold">{anomalyCount}</div>
            <div className="text-xs text-muted-foreground">Anomalies</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by orchard, ID, bestower..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="confirmed">Confirmed</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="finished">Finished</SelectItem>
          </SelectContent>
        </Select>
        <Button
          variant={anomalyFilter ? 'destructive' : 'outline'}
          size="sm"
          onClick={() => setAnomalyFilter(!anomalyFilter)}
          className="gap-1.5"
        >
          <AlertTriangle className="h-3.5 w-3.5" />
          {anomalyFilter ? 'Showing Anomalies' : 'Show Anomalies'}
        </Button>
        <Button variant="outline" size="icon" onClick={() => refetch()}>
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <Card>
          <ScrollArea className="max-h-[600px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Orchard</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-right">Sower</TableHead>
                  <TableHead className="text-right">Whisperer</TableHead>
                  <TableHead className="text-right">Tithe</TableHead>
                  <TableHead className="text-right">Admin</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                      No bestowals found
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map(b => (
                    <TableRow key={b.id} className={b.anomaly ? 'bg-destructive/5' : ''}>
                      <TableCell className="text-sm whitespace-nowrap">
                        {format(new Date(b.created_at), 'MMM d, yyyy')}
                      </TableCell>
                      <TableCell className="font-medium max-w-[150px] truncate">
                        {b.orchard_name}
                      </TableCell>
                      <TableCell className="text-right font-semibold">
                        ${b.amount.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right text-green-600">
                        ${(b.sower_amount || 0).toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right">
                        {b.has_whisperer ? (
                          <span className="text-primary font-medium">${(b.whisperer_amount || 0).toFixed(2)}</span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        ${(b.tithe_amount || 0).toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        ${(b.admin_amount || 0).toFixed(2)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Badge variant={b.payment_status === 'confirmed' || b.payment_status === 'finished' ? 'default' : 'secondary'} className="text-[10px]">
                            {b.payment_status}
                          </Badge>
                          {b.anomaly && (
                            <AlertTriangle className="h-3.5 w-3.5 text-destructive" />
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-7 w-7">
                              <Eye className="h-3.5 w-3.5" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-lg">
                            <DialogHeader>
                              <DialogTitle>Bestowal Details</DialogTitle>
                              <DialogDescription>ID: {b.id}</DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4">
                              <div className="grid grid-cols-2 gap-3 text-sm">
                                <div><span className="text-muted-foreground">Orchard:</span> {b.orchard_name}</div>
                                <div><span className="text-muted-foreground">Amount:</span> ${b.amount.toFixed(2)}</div>
                                <div><span className="text-muted-foreground">Status:</span> {b.payment_status}</div>
                                <div><span className="text-muted-foreground">Release:</span> {b.release_status || 'N/A'}</div>
                                <div><span className="text-muted-foreground">Date:</span> {format(new Date(b.created_at), 'PPP')}</div>
                                <div><span className="text-muted-foreground">Bestower:</span> <code className="text-xs">{b.bestower_id.slice(0, 8)}...</code></div>
                              </div>

                              <div className="space-y-2">
                                <h4 className="font-semibold text-sm">Split Breakdown</h4>
                                <div className="grid grid-cols-2 gap-2">
                                  {[
                                    { label: 'Sower (85%)', value: b.sower_amount, color: 'bg-green-500' },
                                    { label: 'Whisperer', value: b.whisperer_amount, color: 'bg-primary' },
                                    { label: 'Tithe (10%)', value: b.tithe_amount, color: 'bg-amber-500' },
                                    { label: 'Admin (5%)', value: b.admin_amount, color: 'bg-muted-foreground' },
                                  ].map((item, i) => (
                                    <div key={i} className="flex items-center gap-2 p-2 rounded-lg bg-muted/50">
                                      <div className={`w-2 h-2 rounded-full ${item.color}`} />
                                      <span className="text-sm flex-1">{item.label}</span>
                                      <span className="text-sm font-semibold">${(item.value || 0).toFixed(2)}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>

                              {b.anomaly && (
                                <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                                  <div className="flex items-center gap-2 text-destructive text-sm font-medium">
                                    <AlertTriangle className="h-4 w-4" />
                                    Anomaly Detected
                                  </div>
                                  <p className="text-sm text-destructive/80 mt-1">{b.anomaly}</p>
                                </div>
                              )}

                              {b.distribution_data && (
                                <details className="text-xs">
                                  <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                                    Raw distribution data
                                  </summary>
                                  <pre className="mt-2 p-2 rounded bg-muted overflow-auto max-h-40 text-xs">
                                    {JSON.stringify(b.distribution_data, null, 2)}
                                  </pre>
                                </details>
                              )}
                            </div>
                          </DialogContent>
                        </Dialog>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </ScrollArea>
        </Card>
      )}
    </div>
  );
}
