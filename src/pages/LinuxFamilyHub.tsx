/**
 * Linux Open Source Family — Agent Hub
 * Dashboard for the 8 penguin agents that run a member's Sow2Grow operations.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from '@/hooks/use-toast';
import { Loader2, Terminal as TerminalIcon, FileText, Sparkles, Activity, Wand2, MessageCircle, Phone } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';

const AGENTS = [
  { key: 'gentoo', emoji: '🐧', name: 'Gentoo', role: 'Overseer', bio: 'Coordinates the whole family.' },
  { key: 'tux', emoji: '🎨', name: 'Tux', role: 'Content', bio: 'Posts, reels, newsletters.' },
  { key: 'ubuntu', emoji: '🛡️', name: 'Ubuntu', role: 'Branding', bio: 'Keeps the voice on-tribe.' },
  { key: 'kali', emoji: '🪄', name: 'Kali', role: 'Images', bio: 'Banners, brochures, flyers.' },
  { key: 'fedora', emoji: '🎬', name: 'Fedora', role: 'Videos', bio: 'Voice-over video plans.' },
  { key: 'debian', emoji: '💬', name: 'Debian', role: 'Messaging', bio: 'Talks to customers & bestowars.' },
  { key: 'arch', emoji: '📞', name: 'Arch', role: 'Calls', bio: 'Voice & video via ChatApp.' },
  { key: 'mint', emoji: '📒', name: 'Mint', role: 'Bookkeeper', bio: 'Bestowal Reports & finance.' },
];

export default function LinuxFamilyHub() {
  const { user } = useAuth();
  const [agents, setAgents] = useState<any[]>([]);
  const [activity, setActivity] = useState<any[]>([]);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [reports, setReports] = useState<any[]>([]);
  const [seeds, setSeeds] = useState<any[]>([]);
  const [outbound, setOutbound] = useState<any[]>([]);
  const [calls, setCalls] = useState<any[]>([]);
  const [selectedSeed, setSelectedSeed] = useState<string>('');
  const [platform, setPlatform] = useState<string>('instagram');
  const [language, setLanguage] = useState<string>('English');
  const [pack, setPack] = useState<any>(null);
  const [packBusy, setPackBusy] = useState(false);
  // Comms state
  const [blastKind, setBlastKind] = useState<string>('collab_offer');
  const [blastLimit, setBlastLimit] = useState<number>(10);
  const [blastCustom, setBlastCustom] = useState<string>('');
  const [blastBusy, setBlastBusy] = useState(false);
  const [terminal, setTerminal] = useState<{ cmd: string; out: string }[]>([
    { cmd: '', out: 'Welcome to the S2G Agents terminal. Type "help".' },
  ]);
  const [cmd, setCmd] = useState('');
  const [busy, setBusy] = useState(false);

  const init = async () => {
    if (!user) return;
    await supabase.functions.invoke('linux-family-orchestrator', { body: { action: 'init' } });
    await refresh();
  };

  const refresh = async () => {
    const [a, l, s, r, sd, ob, cl] = await Promise.all([
      supabase.from('linux_family_agents').select('*').order('agent_name'),
      supabase.from('linux_family_activity_log').select('*').order('created_at', { ascending: false }).limit(40),
      supabase.from('linux_family_suggestions').select('*').eq('status', 'pending').order('created_at', { ascending: false }),
      supabase.from('bestowal_reports').select('*').order('created_at', { ascending: false }).limit(10),
      supabase.from('orchards').select('id,title,description').eq('user_id', user!.id).order('created_at', { ascending: false }).limit(50),
      supabase.from('linux_family_outbound_messages').select('*').order('created_at', { ascending: false }).limit(20),
      supabase.from('linux_family_call_log').select('*').order('created_at', { ascending: false }).limit(20),
    ]);
    setAgents(a.data ?? []);
    setActivity(l.data ?? []);
    setSuggestions(s.data ?? []);
    setReports(r.data ?? []);
    setSeeds(sd.data ?? []);
    setOutbound(ob.data ?? []);
    setCalls(cl.data ?? []);
    if (!selectedSeed && sd.data?.[0]) setSelectedSeed(sd.data[0].id);
  };

  useEffect(() => {
    init();
    if (!user) return;
    const ch = supabase.channel('lf-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'linux_family_activity_log', filter: `user_id=eq.${user.id}` }, refresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'linux_family_suggestions', filter: `user_id=eq.${user.id}` }, refresh)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const respond = async (id: string, decision: 'approved' | 'declined') => {
    await supabase.functions.invoke('linux-family-orchestrator', {
      body: { action: 'respond_suggestion', payload: { suggestion_id: id, decision } },
    });
    toast({ title: decision === 'approved' ? '🐧 Your S2G Agents are on it!' : 'Got it — skipped.' });
    refresh();
  };

  const buildReport = async (days: number) => {
    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke('agent-mint-bookkeeper', { body: { period_days: days } });
      if (error) throw error;
      toast({ title: '📒 Report ready', description: `Total: ${data?.metrics?.currency} ${data?.metrics?.total_amount}` });
      refresh();
    } catch (e: any) {
      toast({ title: 'Report failed', description: e.message, variant: 'destructive' });
    } finally { setBusy(false); }
  };

  const runCmd = async () => {
    if (!cmd.trim()) return;
    const sent = cmd;
    setCmd('');
    if (sent === 'clear') { setTerminal([{ cmd: '', out: 'cleared.' }]); return; }
    const { data } = await supabase.functions.invoke('linux-family-terminal', { body: { command: sent } });
    setTerminal(t => [...t, { cmd: sent, out: data?.output ?? '' }]);
  };

  const runContentPack = async () => {
    const seed = seeds.find(s => s.id === selectedSeed);
    if (!seed) {
      toast({ title: 'Pick a Seed first', description: 'Plant or select a Seed to generate a content pack.' });
      return;
    }
    setPackBusy(true);
    setPack(null);
    try {
      const { data, error } = await supabase.functions.invoke('linux-family-orchestrator', {
        body: {
          action: 'run_content_pack',
          seed_id: seed.id,
          payload: {
            seed_title: seed.title,
            seed_description: seed.description ?? '',
            platform, language,
          },
        },
      });
      if (error) throw error;
      setPack(data?.pack ?? null);
      toast({ title: '🐧 Content pack ready', description: 'Your S2G Agents (Tux, Ubuntu, Kali & Fedora) delivered.' });
      refresh();
    } catch (e: any) {
      toast({ title: 'Content pack failed', description: e.message, variant: 'destructive' });
    } finally { setPackBusy(false); }
  };

  const runCommsBlast = async () => {
    const seed = seeds.find(s => s.id === selectedSeed);
    setBlastBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke('linux-family-orchestrator', {
        body: {
          action: 'comms_blast',
          seed_id: seed?.id ?? null,
          payload: {
            seed_title: seed?.title ?? 'a Sow2Grow Seed',
            seed_description: seed?.description ?? '',
            message_kind: blastKind,
            limit: blastLimit,
            custom_text: blastCustom.trim() || null,
          },
        },
      });
      if (error) throw error;
      toast({ title: '💬 Debian sent the broadcast', description: `Reached ${data?.sent ?? 0} bestowars.` });
      refresh();
    } catch (e: any) {
      toast({ title: 'Broadcast failed', description: e.message, variant: 'destructive' });
    } finally { setBlastBusy(false); }
  };

  const statusFor = (key: string) => agents.find(a => a.agent_name === key)?.status ?? 'idle';

  // Per-agent visual identity (gradient + accent ring)
  const agentStyle: Record<string, { gradient: string; ring: string; iconBg: string }> = {
    gentoo: { gradient: 'from-slate-700/40 to-slate-900/40', ring: 'ring-slate-400/30', iconBg: 'bg-slate-500/20' },
    tux:    { gradient: 'from-rose-600/30 to-orange-500/20', ring: 'ring-rose-400/30',  iconBg: 'bg-rose-500/20' },
    ubuntu: { gradient: 'from-orange-600/30 to-amber-500/20', ring: 'ring-orange-400/30', iconBg: 'bg-orange-500/20' },
    kali:   { gradient: 'from-fuchsia-600/30 to-purple-600/20', ring: 'ring-fuchsia-400/30', iconBg: 'bg-fuchsia-500/20' },
    fedora: { gradient: 'from-blue-600/30 to-indigo-600/20', ring: 'ring-blue-400/30',   iconBg: 'bg-blue-500/20' },
    debian: { gradient: 'from-red-600/30 to-rose-500/20',   ring: 'ring-red-400/30',     iconBg: 'bg-red-500/20' },
    arch:   { gradient: 'from-cyan-600/30 to-sky-500/20',   ring: 'ring-cyan-400/30',    iconBg: 'bg-cyan-500/20' },
    mint:   { gradient: 'from-emerald-600/30 to-teal-500/20', ring: 'ring-emerald-400/30', iconBg: 'bg-emerald-500/20' },
  };
  const statusDot: Record<string, string> = {
    idle: 'bg-slate-400', working: 'bg-emerald-400 animate-pulse', waiting: 'bg-amber-400',
  };

  return (
    <div className="container mx-auto p-4 max-w-6xl space-y-6">
      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-2xl border border-border/40 bg-gradient-to-br from-emerald-900/40 via-teal-900/30 to-slate-900/50 p-6 shadow-xl">
        <div className="absolute inset-0 opacity-30 pointer-events-none"
             style={{ background: 'radial-gradient(60% 50% at 80% 0%, hsl(160 80% 60% / 0.25), transparent 60%), radial-gradient(50% 60% at 0% 100%, hsl(200 80% 60% / 0.18), transparent 60%)' }} />
        <div className="relative flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-2xl shadow-lg shadow-emerald-500/30">
                🐧
              </div>
              <div className="min-w-0">
                <h1 className="text-2xl md:text-3xl font-bold tracking-tight bg-gradient-to-r from-emerald-200 to-teal-100 bg-clip-text text-transparent">
                  S2G Agents
                </h1>
                <p className="text-xs text-emerald-200/70">Your loyal tribal AI workforce</p>
              </div>
            </div>
            <p className="text-sm text-foreground/80 mt-3 max-w-2xl">
              Eight specialist agents run marketing, content, calls, messaging, and bookkeeping for every Seed you plant — automatically.
            </p>
          </div>
          <Button onClick={() => buildReport(7)} disabled={busy}
                  className="shrink-0 gap-2 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white shadow-lg shadow-emerald-500/30 border-0">
            {busy ? <Loader2 className="w-4 h-4 animate-spin"/> : <FileText className="w-4 h-4"/>}
            Weekly Bestowal Report
          </Button>
        </div>
      </div>

      {/* Family Roster */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {AGENTS.map(a => {
          const s = statusFor(a.key);
          const sty = agentStyle[a.key];
          return (
            <Card key={a.key}
                  className={cn(
                    'group relative overflow-hidden border-border/40 bg-gradient-to-br backdrop-blur-sm transition-all duration-300',
                    'hover:scale-[1.03] hover:shadow-xl hover:-translate-y-0.5 cursor-default',
                    sty.gradient, `hover:ring-2 ${sty.ring}`
                  )}>
              <CardContent className="p-3 relative">
                <div className="flex items-start gap-2.5">
                  <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0 shadow-inner', sty.iconBg)}>
                    {a.emoji}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <div className="font-bold text-sm truncate text-foreground">{a.name}</div>
                      <div className="flex items-center gap-1 shrink-0">
                        <span className={cn('w-1.5 h-1.5 rounded-full', statusDot[s] ?? statusDot.idle)} />
                        <span className="text-[9px] uppercase tracking-wide text-muted-foreground">{s}</span>
                      </div>
                    </div>
                    <div className="text-[10px] text-muted-foreground/90 font-medium uppercase tracking-wide">{a.role}</div>
                    <p className="text-[11px] text-foreground/70 mt-1.5 line-clamp-2 leading-snug">{a.bio}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Tabs defaultValue="suggestions">
        <TabsList className="flex-wrap h-auto bg-muted/40 backdrop-blur-sm p-1 rounded-xl">
          <TabsTrigger value="suggestions" className="gap-1.5 data-[state=active]:bg-background data-[state=active]:shadow"><Sparkles className="w-3.5 h-3.5"/> Suggestions {suggestions.length>0 && <Badge variant="destructive" className="ml-1 text-[9px] h-4 px-1.5">{suggestions.length}</Badge>}</TabsTrigger>
          <TabsTrigger value="studio" className="gap-1.5 data-[state=active]:bg-background data-[state=active]:shadow"><Wand2 className="w-3.5 h-3.5"/> Studio</TabsTrigger>
          <TabsTrigger value="comms" className="gap-1.5 data-[state=active]:bg-background data-[state=active]:shadow"><MessageCircle className="w-3.5 h-3.5"/> Comms</TabsTrigger>
          <TabsTrigger value="activity" className="gap-1.5 data-[state=active]:bg-background data-[state=active]:shadow"><Activity className="w-3.5 h-3.5"/> Activity</TabsTrigger>
          <TabsTrigger value="reports" className="gap-1.5 data-[state=active]:bg-background data-[state=active]:shadow"><FileText className="w-3.5 h-3.5"/> Reports</TabsTrigger>
          <TabsTrigger value="terminal" className="gap-1.5 data-[state=active]:bg-background data-[state=active]:shadow"><TerminalIcon className="w-3.5 h-3.5"/> Terminal</TabsTrigger>
        </TabsList>

        <TabsContent value="studio">
          <Card><CardContent className="p-4 space-y-3">
            <div className="text-sm text-muted-foreground">
              Pick one of your Seeds. Tux drafts a post → Ubuntu polishes it for tribal voice → Kali generates a banner → Fedora drafts multi-platform video cuts.
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              <Select value={selectedSeed} onValueChange={setSelectedSeed}>
                <SelectTrigger><SelectValue placeholder="Select a Seed" /></SelectTrigger>
                <SelectContent>
                  {seeds.length === 0 && <SelectItem value="__none" disabled>No Seeds yet — plant one first</SelectItem>}
                  {seeds.map(s => <SelectItem key={s.id} value={s.id}>{s.title}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={platform} onValueChange={setPlatform}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="instagram">Instagram</SelectItem>
                  <SelectItem value="facebook">Facebook</SelectItem>
                  <SelectItem value="tiktok">TikTok</SelectItem>
                  <SelectItem value="whatsapp">WhatsApp</SelectItem>
                  <SelectItem value="youtube">YouTube</SelectItem>
                </SelectContent>
              </Select>
              <Select value={language} onValueChange={setLanguage}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {['English','Afrikaans','Zulu','Xhosa','Sotho','Spanish','French','Portuguese','Swahili'].map(l => (
                    <SelectItem key={l} value={l}>{l}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={runContentPack} disabled={packBusy || !selectedSeed} className="gap-2">
              {packBusy ? <Loader2 className="w-4 h-4 animate-spin"/> : <Wand2 className="w-4 h-4"/>}
              Generate Content Pack
            </Button>

            {pack && (
              <div className="space-y-3 mt-3 border-t pt-3">
                {pack.banner_url && (
                  <div>
                    <div className="text-xs font-semibold mb-1">🪄 Kali · Banner</div>
                    <img src={pack.banner_url} alt="Banner" className="rounded-lg border max-h-72 object-cover" />
                  </div>
                )}
                <div>
                  <div className="text-xs font-semibold mb-1">🛡️ Ubuntu · Polished post</div>
                  <pre className="whitespace-pre-wrap text-sm bg-muted/40 rounded-lg p-3">{pack.polished_post}</pre>
                </div>
                <details className="text-xs">
                  <summary className="cursor-pointer text-muted-foreground">🎨 Tux · Raw draft</summary>
                  <pre className="whitespace-pre-wrap mt-2 bg-muted/30 rounded-lg p-3">{pack.raw_post}</pre>
                </details>
                <details>
                  <summary className="cursor-pointer text-xs font-semibold">🎬 Fedora · Video plan ({pack.language})</summary>
                  <pre className="whitespace-pre-wrap text-xs mt-2 bg-muted/40 rounded-lg p-3">{pack.video_plan}</pre>
                </details>
              </div>
            )}
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="suggestions">
          <Card><CardContent className="p-4 space-y-2">
            {suggestions.length === 0 && <p className="text-sm text-muted-foreground">All quiet 🐧 — your S2G Agents will nudge you when needed.</p>}
            {suggestions.map(s => (
              <div key={s.id} className="border rounded-lg p-3">
                <div className="font-semibold text-sm">{s.title}</div>
                <p className="text-xs text-muted-foreground mt-1">{s.description}</p>
                <div className="flex gap-2 mt-2">
                  <Button size="sm" onClick={() => respond(s.id, 'approved')}>Yes, do it</Button>
                  <Button size="sm" variant="outline" onClick={() => respond(s.id, 'declined')}>Skip</Button>
                </div>
              </div>
            ))}
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="comms">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Card><CardContent className="p-4 space-y-3">
              <div className="flex items-center gap-2">
                <MessageCircle className="w-4 h-4 text-primary" />
                <div className="font-semibold text-sm">💬 Debian · Bestowar broadcast</div>
              </div>
              <p className="text-xs text-muted-foreground">
                Debian will draft a warm tribal message and send it to other active sowers in the tribe — perfect for collab offers, launches, or community asks.
              </p>
              <div className="grid grid-cols-2 gap-2">
                <Select value={blastKind} onValueChange={setBlastKind}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="collab_offer">Collaboration offer</SelectItem>
                    <SelectItem value="launch_announcement">Launch announcement</SelectItem>
                    <SelectItem value="community_ask">Community ask</SelectItem>
                    <SelectItem value="thank_you">Thank-you note</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={String(blastLimit)} onValueChange={v => setBlastLimit(parseInt(v))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {[5, 10, 25, 50].map(n => <SelectItem key={n} value={String(n)}>{n} bestowars</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <Textarea
                placeholder="Optional: write your own message. Leave blank and Debian will craft one for you."
                value={blastCustom}
                onChange={e => setBlastCustom(e.target.value)}
                className="text-sm"
                rows={3}
              />
              <Button onClick={runCommsBlast} disabled={blastBusy} className="gap-2 w-full">
                {blastBusy ? <Loader2 className="w-4 h-4 animate-spin"/> : <MessageCircle className="w-4 h-4"/>}
                Send tribal broadcast
              </Button>

              <div className="border-t pt-3 mt-2">
                <div className="text-xs font-semibold mb-2">Recent outbound messages</div>
                <ScrollArea className="h-[180px]">
                  <div className="space-y-2">
                    {outbound.length === 0 && <p className="text-xs text-muted-foreground">No messages sent yet.</p>}
                    {outbound.map(m => (
                      <div key={m.id} className="text-xs border-l-2 border-primary/40 pl-2 py-1">
                        <div className="text-muted-foreground text-[10px]">
                          {m.message_type} · {m.channel} · {new Date(m.created_at).toLocaleString()}
                        </div>
                        <div className="line-clamp-2">{m.message_body}</div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            </CardContent></Card>

            <Card><CardContent className="p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-primary" />
                <div className="font-semibold text-sm">📞 Arch · Call log</div>
              </div>
              <p className="text-xs text-muted-foreground">
                Arch handles voice & video calls inside ChatApp. Place calls from the Communications Hub or via the terminal — every call is logged here.
              </p>
              <div className="flex gap-2 text-xs">
                <a href="/communications" className="text-primary underline">Open Communications Hub →</a>
              </div>

              <div className="border-t pt-3 mt-2">
                <div className="text-xs font-semibold mb-2">Recent calls</div>
                <ScrollArea className="h-[280px]">
                  <div className="space-y-2">
                    {calls.length === 0 && <p className="text-xs text-muted-foreground">No calls yet.</p>}
                    {calls.map(c => (
                      <div key={c.id} className="text-xs border-l-2 border-primary/40 pl-2 py-1">
                        <div className="font-medium">
                          {c.direction === 'outgoing' ? '↗' : '↘'} {c.call_type} · {c.outcome}
                        </div>
                        <div className="text-muted-foreground text-[10px]">
                          {c.duration_seconds ? `${c.duration_seconds}s · ` : ''}{new Date(c.created_at).toLocaleString()}
                        </div>
                        {c.transcript && <div className="line-clamp-2 text-[11px] mt-1">{c.transcript}</div>}
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            </CardContent></Card>
          </div>
        </TabsContent>

        <TabsContent value="activity">
          <Card><CardContent className="p-0">
            <ScrollArea className="h-[400px]">
              <div className="p-4 space-y-2">
                {activity.length === 0 && <p className="text-sm text-muted-foreground">No activity yet — the family is warming up.</p>}
                {activity.map(a => (
                  <div key={a.id} className="text-sm border-l-2 border-primary/40 pl-3 py-1">
                    <div>{a.message}</div>
                    <div className="text-[10px] text-muted-foreground">{new Date(a.created_at).toLocaleString()}</div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="reports">
          <Card><CardContent className="p-4 space-y-2">
            <div className="flex gap-2 mb-2">
              <Button size="sm" onClick={() => buildReport(7)} disabled={busy}>7-day</Button>
              <Button size="sm" onClick={() => buildReport(30)} disabled={busy}>30-day</Button>
              <Button size="sm" onClick={() => buildReport(90)} disabled={busy}>90-day</Button>
            </div>
            {reports.length === 0 && <p className="text-sm text-muted-foreground">No reports yet — generate one above.</p>}
            {reports.map(r => (
              <details key={r.id} className="border rounded-lg p-3">
                <summary className="cursor-pointer font-semibold text-sm">
                  📒 {r.report_type} · {r.period_start} → {r.period_end} · {r.metrics?.currency} {Number(r.metrics?.total_amount ?? 0).toFixed(2)}
                </summary>
                <div className="mt-2" dangerouslySetInnerHTML={{ __html: r.html_snapshot ?? '' }} />
              </details>
            ))}
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="terminal">
          <Card style={{ background: 'hsl(0 0% 6%)', color: 'hsl(140 70% 65%)' }} className="font-mono">
            <CardContent className="p-3">
              <ScrollArea className="h-[320px]">
                <div className="space-y-1 text-xs">
                  {terminal.map((t, i) => (
                    <div key={i}>
                      {t.cmd && <div>tux@s2g:~$ {t.cmd}</div>}
                      <pre className="whitespace-pre-wrap" style={{ color: 'hsl(140 60% 75%)' }}>{t.out}</pre>
                    </div>
                  ))}
                </div>
              </ScrollArea>
              <div className="flex items-center gap-2 mt-2 pt-2" style={{ borderTop: '1px solid hsl(140 40% 18%)' }}>
                <span>tux@s2g:~$</span>
                <input
                  value={cmd}
                  onChange={e => setCmd(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && runCmd()}
                  className="flex-1 bg-transparent outline-none"
                  style={{ color: 'hsl(140 60% 75%)' }}
                  placeholder='try: help, status, mint report 7'
                  autoFocus
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
