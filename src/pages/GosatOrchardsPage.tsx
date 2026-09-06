import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Loader2, RefreshCw, ArrowLeft, Trees, AlertTriangle, Ban, Play, ExternalLink } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  cancelRefusal,
  cancelSummary,
  explorerUrl,
  fundingStateLabel,
  isCancellable,
  maskAddress,
  refundStatusLabel,
  shortRef,
  type PocketTone,
} from '@/lib/orchards/refundLabels';

// P0-5 Phase C3: the gosat orchard console. Lists every orchard that holds
// or held money with its state, cancels an orchard (orchard_cancel, gosat
// only, reason mandatory), and shows refund progress per bestower with the
// gosat actions the C2 migration exposes: retry, write off, enter a payer
// address by hand, run the refund worker now. Screens only: every money
// decision stays in the SQL functions and orchard-refund-worker.

interface OrchardRow {
  id: string;
  title: string;
  user_id: string;
  funding_state: string;
  status: string;
  total_pockets: number;
  pocket_price: number;
  created_at: string;
  cancel_reason: string | null;
  cancelled_at: string | null;
}
interface HoldingRow {
  id: string;
  orchard_id: string;
  bestowal_id: string;
  bestower_user_id: string;
  pockets: number;
  gross_amount: number;
  rail: string;
  rail_reference: string | null;
  payer_address: string | null;
  payer_source: string | null;
  status: string;
  refund_id: string | null;
  created_at: string;
}
interface RefundRow {
  id: string;
  orchard_id: string;
  holding_id: string;
  bestower_user_id: string;
  rail: string;
  amount: number;
  destination: string | null;
  status: string;
  attempts: number;
  last_error: string | null;
  rail_reference: string | null;
  environment: string;
  fee_cost: number;
  claimed_at: string | null;
  sent_at: string | null;
  confirmed_at: string | null;
  written_off_reason: string | null;
  updated_at: string;
}

// orchard_* tables are not in the generated client types yet.
const db = supabase as any;

const HELD_STATES = new Set(['held', 'refund_pending', 'refund_failed']);
const fmtUsd = (n: number | string | null | undefined) => `$${(Number(n) || 0).toFixed(2)}`;
// Dark-surface tints: the app's theme is dark in both modes, and light
// pastel badges are remapped globally (index.css); these are explicit.
const BADGE = 'text-xs px-2 py-0.5 whitespace-nowrap font-medium';
const toneClass: Record<PocketTone, string> = {
  held: 'bg-amber-900/50 text-amber-100 border-amber-400/50',
  released: 'bg-emerald-900/50 text-emerald-100 border-emerald-400/50',
  pending: 'bg-sky-900/50 text-sky-100 border-sky-400/50',
  done: 'bg-emerald-900/50 text-emerald-100 border-emerald-400/50',
  problem: 'bg-red-900/50 text-red-100 border-red-400/50',
};
// Orchard state colours mean one thing each: grey open, blue funded, green
// released, amber cancelling, red cancelled.
const stateClass: Record<string, string> = {
  open: 'bg-muted text-muted-foreground border-border',
  funded: 'bg-sky-900/50 text-sky-100 border-sky-400/50',
  released: 'bg-emerald-900/50 text-emerald-100 border-emerald-400/50',
  cancelling: 'bg-amber-900/50 text-amber-100 border-amber-400/50',
  cancelled: 'bg-red-900/50 text-red-100 border-red-400/50',
};
const refundClass = (status: string, tone: PocketTone) => (status === 'written_off' ? stateClass.open : toneClass[tone]);
const NUM = 'text-right font-mono tabular-nums whitespace-nowrap';
const TH = 'py-2 px-3 font-medium';
const TD = 'py-2.5 px-3 align-middle';
function daysSince(iso: string) { return Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 86400000)); }
function rpcError(err: any): string { return err?.message ?? err?.error ?? String(err); }

export default function GosatOrchardsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [orchards, setOrchards] = useState<OrchardRow[]>([]);
  const [holdings, setHoldings] = useState<HoldingRow[]>([]);
  const [refunds, setRefunds] = useState<RefundRow[]>([]);
  const [names, setNames] = useState<Record<string, string>>({});
  const [showEmptyOpen, setShowEmptyOpen] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  const [cancelTarget, setCancelTarget] = useState<OrchardRow | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelTyped, setCancelTyped] = useState('');
  const [writeOffTarget, setWriteOffTarget] = useState<RefundRow | null>(null);
  const [writeOffReason, setWriteOffReason] = useState('');
  const [payerTarget, setPayerTarget] = useState<HoldingRow | null>(null);
  const [payerAddress, setPayerAddress] = useState('');
  const [payerNote, setPayerNote] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [o, h, r] = await Promise.all([
        db.from('orchards')
          .select('id, title, user_id, funding_state, status, total_pockets, pocket_price, created_at, cancel_reason, cancelled_at')
          .order('created_at', { ascending: false })
          .limit(500),
        db.from('orchard_holdings')
          .select('id, orchard_id, bestowal_id, bestower_user_id, pockets, gross_amount, rail, rail_reference, payer_address, payer_source, status, refund_id, created_at')
          .order('created_at', { ascending: true }),
        db.from('orchard_refunds')
          .select('id, orchard_id, holding_id, bestower_user_id, rail, amount, destination, status, attempts, last_error, rail_reference, environment, fee_cost, claimed_at, sent_at, confirmed_at, written_off_reason, updated_at')
          .order('created_at', { ascending: true }),
      ]);
      if (o.error) throw o.error;
      if (h.error) throw h.error;
      if (r.error) throw r.error;
      const os: OrchardRow[] = o.data ?? [];
      const hs: HoldingRow[] = h.data ?? [];
      const rs: RefundRow[] = r.data ?? [];
      setOrchards(os); setHoldings(hs); setRefunds(rs);
      const ids = [...new Set([...os.map((x) => x.user_id), ...hs.map((x) => x.bestower_user_id)])].filter(Boolean);
      if (ids.length) {
        const { data: profiles } = await supabase.from('profiles_public').select('user_id, display_name, username, first_name, last_name').in('user_id', ids);
        const map: Record<string, string> = {};
        for (const p of (profiles ?? []) as any[]) map[p.user_id] = p.display_name || p.username || [p.first_name, p.last_name].filter(Boolean).join(' ') || p.user_id.slice(0, 8);
        setNames(map);
      }
    } catch (err: any) {
      console.error('orchard console load failed', err);
      setError(rpcError(err));
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { load(); }, [load]);

  const holdingsByOrchard = useMemo(() => {
    const m = new Map<string, HoldingRow[]>();
    for (const h of holdings) m.set(h.orchard_id, [...(m.get(h.orchard_id) ?? []), h]);
    return m;
  }, [holdings]);
  const refundsByOrchard = useMemo(() => {
    const m = new Map<string, RefundRow[]>();
    for (const r of refunds) m.set(r.orchard_id, [...(m.get(r.orchard_id) ?? []), r]);
    return m;
  }, [refunds]);
  const holdingById = useMemo(() => new Map(holdings.map((h) => [h.id, h])), [holdings]);

  const rows = useMemo(() => orchards
    .filter((o) => showEmptyOpen || o.funding_state !== 'open' || (holdingsByOrchard.get(o.id)?.length ?? 0) > 0)
    .map((o) => {
      const hs = holdingsByOrchard.get(o.id) ?? [];
      const held = hs.filter((h) => HELD_STATES.has(h.status)).reduce((s, h) => s + Number(h.gross_amount), 0);
      const pocketsHeld = hs.filter((h) => h.status === 'held' || h.status === 'released').reduce((s, h) => s + Number(h.pockets), 0);
      const hasReleased = hs.some((h) => h.status === 'released');
      const rs = refundsByOrchard.get(o.id) ?? [];
      return { o, hs, held, pocketsHeld, hasReleased, rs, refusal: cancelRefusal(o.funding_state, hasReleased), needsGosat: rs.filter((r) => refundStatusLabel(r.status).needsGosat).length };
    }), [orchards, holdingsByOrchard, refundsByOrchard, showEmptyOpen]);

  const cancelling = rows.filter((r) => r.o.funding_state === 'cancelling' || r.o.funding_state === 'cancelled');
  const needsGosatTotal = refunds.filter((r) => refundStatusLabel(r.status).needsGosat).length;
  const unknownPayers = holdings.filter((h) => h.rail === 'solana' && (h.payer_source ?? 'unknown') === 'unknown' && HELD_STATES.has(h.status));

  // ---- actions ------------------------------------------------------------
  const runRpc = async (label: string, fn: string, args: Record<string, unknown>, key: string) => {
    setBusy(key);
    try {
      const { data, error } = await supabase.rpc(fn as any, args as any);
      if (error) throw error;
      const d = data as any;
      if (d && typeof d === 'object' && (d.ok === false || d.cancelled === false)) {
        toast.error(`${label}: ${d.reason ?? 'refused'}`);
      } else {
        toast.success(`${label}: done`);
      }
      await load();
      return d;
    } catch (err: any) {
      toast.error(`${label} failed: ${rpcError(err)}`);
      return null;
    } finally {
      setBusy(null);
    }
  };

  const confirmCancel = async () => {
    if (!cancelTarget) return;
    const res = await runRpc('Cancel orchard', 'orchard_cancel', { _orchard_id: cancelTarget.id, _reason: cancelReason.trim() }, `cancel:${cancelTarget.id}`);
    if (res?.cancelled) {
      toast.success(`${cancelTarget.title}: ${res.refunds_queued} refund(s) queued, ${res.refunds_needing_human} need a human, ${fmtUsd(res.total_to_return)} to return.`);
      setCancelTarget(null); setCancelReason(''); setCancelTyped('');
    }
  };
  const retry = (r: RefundRow) => runRpc('Retry refund', 'orchard_refund_retry', { _refund_id: r.id, _note: 'retried from the orchard console' }, `retry:${r.id}`);
  const confirmWriteOff = async () => {
    if (!writeOffTarget) return;
    const res = await runRpc('Write off', 'orchard_refund_write_off', { _refund_id: writeOffTarget.id, _reason: writeOffReason.trim() }, `wo:${writeOffTarget.id}`);
    if (res?.ok) { setWriteOffTarget(null); setWriteOffReason(''); }
  };
  const confirmPayer = async () => {
    if (!payerTarget) return;
    const res = await runRpc('Set payer address', 'orchard_set_payer_manual', { _holding_id: payerTarget.id, _address: payerAddress.trim(), _note: payerNote.trim() }, `payer:${payerTarget.id}`);
    if (res !== null) { setPayerTarget(null); setPayerAddress(''); setPayerNote(''); }
  };
  const runWorker = async (orchardId: string) => {
    setBusy(`worker:${orchardId}`);
    try {
      const { data, error } = await supabase.functions.invoke('orchard-refund-worker', { body: { orchardId } });
      if (error) throw error;
      const d = data as any;
      if (d?.ok === false) throw new Error(d.error ?? 'worker refused');
      const summary = (d?.report ?? []).map((x: any) => `${x.result}${x.reason ? ` (${x.reason})` : ''}`).join('; ') || 'nothing to do';
      toast.success(`Worker ran on ${d?.cluster ?? '?'}: claimed ${d?.claimed ?? 0}, stale ${d?.stale ?? 0}. ${summary}`);
      await load();
    } catch (err: any) {
      toast.error(`Worker run failed: ${rpcError(err)}`);
    } finally {
      setBusy(null);
    }
  };

  const summary = cancelTarget ? cancelSummary(holdingsByOrchard.get(cancelTarget.id) ?? []) : null;
  const cancelReady = !!cancelTarget && cancelReason.trim().length >= 5 && cancelTyped.trim() === cancelTarget.title.trim();

  return (
    <div className="container max-w-6xl mx-auto py-8 px-4 space-y-6">
      <header className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button asChild variant="ghost" size="sm" className="-ml-2">
            <Link to="/admin"><ArrowLeft className="h-4 w-4 mr-1" />Admin</Link>
          </Button>
          <Trees className="h-7 w-7 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Orchards</h1>
            <p className="text-sm text-muted-foreground">Every orchard holding or having held money, its state, and the refunds after a cancel. Cancel is gosat-only and always refunds in full on the original rail.</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild variant="outline" size="sm"><Link to="/admin/treasury">Treasury</Link></Button>
          <Button onClick={load} disabled={loading} variant="outline" size="sm" data-testid="orchards-refresh">
            {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
            Refresh
          </Button>
        </div>
      </header>

      {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
      {(needsGosatTotal > 0 || unknownPayers.length > 0) && (
        <Alert data-testid="orchards-attention">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="text-sm">
            {needsGosatTotal > 0 && <span className="mr-3"><strong>{needsGosatTotal}</strong> refund(s) need a human (see the refund tables below).</span>}
            {unknownPayers.length > 0 && <span><strong>{unknownPayers.length}</strong> held pocket(s) have no known payer wallet: enter it by hand before cancelling, or the refund parks.</span>}
          </AlertDescription>
        </Alert>
      )}

      {/* Orchard list */}
      <Card>
        <CardHeader>
          <CardTitle>Orchards</CardTitle>
          <CardDescription>
            {rows.length} shown.{' '}
            <label className="inline-flex items-center gap-1.5 cursor-pointer">
              <input type="checkbox" checked={showEmptyOpen} onChange={(e) => setShowEmptyOpen(e.target.checked)} /> include open orchards with no pockets yet
            </label>
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading && rows.length === 0 ? <Loader2 className="h-6 w-6 animate-spin" /> : (
            <div className="overflow-x-auto -mx-3">
              <table className="w-full min-w-[56rem] table-fixed text-sm" data-testid="orchards-table">
                <colgroup>
                  <col />
                  <col className="w-44" />
                  <col className="w-24" />
                  <col className="w-40" />
                </colgroup>
                <thead className="text-xs text-muted-foreground text-left border-b">
                  <tr>
                    <th className={TH}>Orchard</th>
                    <th className={TH}>State</th>
                    <th className={`${TH} text-right`}>Held</th>
                    <th className={`${TH} text-right`}>Cancel</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {rows.map(({ o, held, pocketsHeld, refusal, rs, needsGosat }) => {
                    const st = fundingStateLabel(o.funding_state);
                    const isCancelled = o.funding_state === 'cancelling' || o.funding_state === 'cancelled';
                    return (
                      <tr key={o.id} data-testid="orchard-row" data-orchard-id={o.id} data-state={o.funding_state}>
                        <td className={`${TD} min-w-0`}>
                          <Link to={`/orchard/${o.id}`} className="font-medium hover:underline block truncate" title={o.title}>{o.title}</Link>
                          <div className="text-xs text-muted-foreground truncate whitespace-nowrap">
                            {names[o.user_id] ?? o.user_id.slice(0, 8)} · {daysSince(o.created_at)} d · {pocketsHeld}/{o.total_pockets} pockets · {fmtUsd(o.pocket_price)} each
                          </div>
                          {isCancelled && o.cancel_reason && (
                            <div className="text-xs text-muted-foreground/80 truncate whitespace-nowrap" title={o.cancel_reason}>Reason: {o.cancel_reason}</div>
                          )}
                        </td>
                        <td className={TD}>
                          <div className="flex flex-col items-start gap-1">
                            <Badge variant="outline" className={`${BADGE} ${stateClass[o.funding_state] ?? stateClass.open}`} data-testid="orchard-state">{st.label}</Badge>
                            {needsGosat > 0 && <Badge variant="outline" className={`${BADGE} ${toneClass.problem}`}>{needsGosat} need a human</Badge>}
                            {rs.length > 0 && <span className="text-xs text-muted-foreground whitespace-nowrap">{rs.filter((r) => r.status === 'confirmed').length} of {rs.length} refunded</span>}
                          </div>
                        </td>
                        <td className={`${TD} ${NUM}`} data-testid="orchard-held">{fmtUsd(held)}</td>
                        <td className={`${TD} text-right`}>
                          {isCancellable(o.funding_state) && !refusal ? (
                            <Button size="sm" variant="destructive" onClick={() => { setCancelTarget(o); setCancelReason(''); setCancelTyped(''); }} data-testid="orchard-cancel">
                              <Ban className="h-4 w-4 mr-1" />Cancel
                            </Button>
                          ) : (
                            <div className="flex flex-col items-end gap-1">
                              <Button size="sm" variant="outline" disabled data-testid="orchard-cancel" title={refusal ?? undefined}><Ban className="h-4 w-4 mr-1" />Cancel</Button>
                              <span className="text-[11px] leading-tight text-muted-foreground/80 whitespace-nowrap truncate max-w-[10rem]" title={refusal ?? undefined} data-testid="orchard-cancel-refusal">{refusal}</span>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                  {rows.length === 0 && <tr><td colSpan={4} className="py-6 text-center text-muted-foreground">No orchard holds or has held money.</td></tr>}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Refund progress per cancelled / cancelling orchard */}
      {cancelling.map(({ o, hs, rs }) => (
        <Card key={o.id} data-testid="refund-progress" data-orchard-id={o.id}>
          <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
            <div className="min-w-0">
              <CardTitle className="truncate">{o.title}: {fundingStateLabel(o.funding_state).label.toLowerCase()}, {rs.filter((r) => r.status === 'confirmed').length} of {rs.length} refunded</CardTitle>
              <CardDescription>
                Cancelled {o.cancelled_at ? new Date(o.cancelled_at).toLocaleString() : ''}{o.cancel_reason ? ` · ${o.cancel_reason}` : ''}. The worker runs every 10 minutes; a row with a reference is never sent twice.
              </CardDescription>
            </div>
            <Button size="sm" variant="outline" className="shrink-0" disabled={busy === `worker:${o.id}`} onClick={() => runWorker(o.id)} data-testid="run-worker">
              {busy === `worker:${o.id}` ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Play className="h-4 w-4 mr-1" />}Run worker now
            </Button>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto -mx-3">
              <table className="w-full min-w-[64rem] table-fixed text-sm" data-testid="refund-table">
                <colgroup>
                  <col className="w-36" />
                  <col className="w-24" />
                  <col className="w-24" />
                  <col className="w-32" />
                  <col className="w-44" />
                  <col className="w-20" />
                  <col className="w-48" />
                  <col />
                  <col className="w-56" />
                </colgroup>
                <thead className="text-xs text-muted-foreground text-left border-b">
                  <tr>
                    <th className={TH}>Bestower</th>
                    <th className={`${TH} text-right`}>Paid</th>
                    <th className={TH}>Rail</th>
                    <th className={TH}>Destination</th>
                    <th className={TH}>State</th>
                    <th className={`${TH} text-right`}>Attempts</th>
                    <th className={TH}>Reference</th>
                    <th className={TH}>Last error</th>
                    <th className={TH}></th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {rs.map((r) => {
                    const h = holdingById.get(r.holding_id);
                    const st = refundStatusLabel(r.status);
                    const url = explorerUrl(r.rail, r.rail_reference, r.environment);
                    const canRetry = (r.status === 'failed' || r.status === 'needs_human') && !r.rail_reference;
                    const unknownPayer = r.rail === 'solana' && (h?.payer_source ?? 'unknown') === 'unknown';
                    const errorText = r.status === 'written_off' ? `Written off: ${r.written_off_reason}` : (r.last_error ?? '');
                    return (
                      <tr key={r.id} data-testid="refund-row" data-refund-id={r.id} data-status={r.status}>
                        <td className={`${TD} truncate`} title={r.bestower_user_id}>{names[r.bestower_user_id] ?? r.bestower_user_id.slice(0, 8)}</td>
                        <td className={`${TD} ${NUM}`}>{fmtUsd(r.amount)}</td>
                        <td className={`${TD} whitespace-nowrap`}>{r.rail}{r.environment !== 'live' && <span className="text-xs text-muted-foreground"> · {r.environment}</span>}</td>
                        <td className={`${TD} font-mono text-xs truncate`} title={r.destination ?? undefined}>{r.rail === 'solana' ? maskAddress(r.destination) : (r.destination ?? '—')}</td>
                        <td className={TD}><Badge variant="outline" className={`${BADGE} ${refundClass(r.status, st.tone)}`} data-testid="refund-state">{st.label}</Badge></td>
                        <td className={`${TD} ${NUM}`}>{r.attempts}</td>
                        <td className={`${TD} font-mono text-xs whitespace-nowrap`} data-testid="refund-reference">
                          {r.rail_reference
                            ? (url
                              ? <a href={url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 hover:underline">{shortRef(r.rail_reference, 10, 4)}<ExternalLink className="h-3 w-3" /></a>
                              : <span title={r.rail_reference}>{shortRef(r.rail_reference, 10, 4)}</span>)
                            : <span className="text-muted-foreground">—</span>}
                          {r.fee_cost > 0 && <span className="text-muted-foreground"> · fee {fmtUsd(r.fee_cost)}</span>}
                        </td>
                        <td className={`${TD} text-xs text-muted-foreground truncate`} title={errorText || undefined}>{errorText}</td>
                        <td className={`${TD} text-right whitespace-nowrap`}>
                          {unknownPayer && h && h.status !== 'refunded' && h.status !== 'written_off' && (
                            <Button size="sm" variant="outline" className="mr-1" onClick={() => { setPayerTarget(h); setPayerAddress(''); setPayerNote(''); }} data-testid="set-payer">Set payer address</Button>
                          )}
                          {canRetry && (
                            <>
                              <Button size="sm" variant="outline" className="mr-1" disabled={busy === `retry:${r.id}` || unknownPayer} title={unknownPayer ? 'Enter the payer address first' : undefined} onClick={() => retry(r)} data-testid="refund-retry">Retry</Button>
                              <Button size="sm" variant="destructive" disabled={busy === `wo:${r.id}`} onClick={() => { setWriteOffTarget(r); setWriteOffReason(''); }} data-testid="refund-write-off">Write off</Button>
                            </>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                  {rs.length === 0 && <tr><td colSpan={9} className="py-4 text-center text-muted-foreground">No refunds: the orchard held nothing when it was cancelled.</td></tr>}
                </tbody>
              </table>
            </div>
            {hs.some((h) => !h.refund_id) && (
              <p className="text-xs text-muted-foreground mt-3">Pockets without a refund row: {hs.filter((h) => !h.refund_id).map((h) => `${names[h.bestower_user_id] ?? h.bestower_user_id.slice(0, 8)} ${fmtUsd(h.gross_amount)} (${h.status})`).join(', ')}.</p>
            )}
          </CardContent>
        </Card>
      ))}

      {/* Cancel dialog */}
      <Dialog open={!!cancelTarget} onOpenChange={(open) => { if (!open) setCancelTarget(null); }}>
        <DialogContent data-testid="cancel-dialog">
          <DialogHeader>
            <DialogTitle>Cancel “{cancelTarget?.title}”</DialogTitle>
            <DialogDescription>{summary?.sentence}</DialogDescription>
          </DialogHeader>
          {summary && summary.unknownPayers > 0 && (
            <Alert variant="destructive"><AlertTriangle className="h-4 w-4" /><AlertDescription className="text-sm">{summary.unknownPayers} Solana pocket(s) have no known payer wallet. Their refunds will park as “needs a human” until you enter the address.</AlertDescription></Alert>
          )}
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium" htmlFor="cancel-reason">Reason (required, shown to the sower)</label>
              <Textarea id="cancel-reason" value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} placeholder="Why this orchard is being cancelled" data-testid="cancel-reason" />
            </div>
            <div>
              <label className="text-sm font-medium" htmlFor="cancel-typed">Type the orchard title to confirm</label>
              <Input id="cancel-typed" value={cancelTyped} onChange={(e) => setCancelTyped(e.target.value)} placeholder={cancelTarget?.title} data-testid="cancel-typed" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelTarget(null)}>Keep it open</Button>
            <Button variant="destructive" disabled={!cancelReady || busy === `cancel:${cancelTarget?.id}`} onClick={confirmCancel} data-testid="cancel-confirm">
              {busy === `cancel:${cancelTarget?.id}` && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Cancel and refund everyone
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Write-off dialog */}
      <Dialog open={!!writeOffTarget} onOpenChange={(open) => { if (!open) setWriteOffTarget(null); }}>
        <DialogContent data-testid="write-off-dialog">
          <DialogHeader>
            <DialogTitle>Write off this refund</DialogTitle>
            <DialogDescription>Terminal. {fmtUsd(writeOffTarget?.amount)} stays in the wallet as unclaimed surplus, not income, and the bestower is told to contact Sow2Grow. Only for a refund that cannot be sent.</DialogDescription>
          </DialogHeader>
          <Textarea value={writeOffReason} onChange={(e) => setWriteOffReason(e.target.value)} placeholder="Reason (required)" data-testid="write-off-reason" />
          <DialogFooter>
            <Button variant="outline" onClick={() => setWriteOffTarget(null)}>Back</Button>
            <Button variant="destructive" disabled={writeOffReason.trim().length < 5} onClick={confirmWriteOff} data-testid="write-off-confirm">Write off</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Manual payer dialog */}
      <Dialog open={!!payerTarget} onOpenChange={(open) => { if (!open) setPayerTarget(null); }}>
        <DialogContent data-testid="payer-dialog">
          <DialogHeader>
            <DialogTitle>Enter the payer wallet by hand</DialogTitle>
            <DialogDescription>The chain could not tell us who paid {fmtUsd(payerTarget?.gross_amount)} (signature {shortRef(payerTarget?.rail_reference, 10, 4) || '—'}). Enter the wallet the bestower gives you; the entry is logged as manual. Then Retry the refund.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Input value={payerAddress} onChange={(e) => setPayerAddress(e.target.value)} placeholder="Solana wallet address" data-testid="payer-address" />
            <Textarea value={payerNote} onChange={(e) => setPayerNote(e.target.value)} placeholder="Note (required): how you confirmed this is their wallet" data-testid="payer-note" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPayerTarget(null)}>Back</Button>
            <Button disabled={payerAddress.trim().length < 32 || payerNote.trim().length < 5} onClick={confirmPayer} data-testid="payer-confirm">Save payer address</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
