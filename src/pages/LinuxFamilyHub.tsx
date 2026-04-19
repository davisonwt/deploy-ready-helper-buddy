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
import { Loader2, Terminal as TerminalIcon, FileText, Sparkles, Activity, Wand2 } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

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
  const [terminal, setTerminal] = useState<{ cmd: string; out: string }[]>([
    { cmd: '', out: 'Welcome to the Linux Open Source Family terminal. Type "help".' },
  ]);
  const [cmd, setCmd] = useState('');
  const [busy, setBusy] = useState(false);

  const init = async () => {
    if (!user) return;
    await supabase.functions.invoke('linux-family-orchestrator', { body: { action: 'init' } });
    await refresh();
  };

  const refresh = async () => {
    const [a, l, s, r] = await Promise.all([
      supabase.from('linux_family_agents').select('*').order('agent_name'),
      supabase.from('linux_family_activity_log').select('*').order('created_at', { ascending: false }).limit(40),
      supabase.from('linux_family_suggestions').select('*').eq('status', 'pending').order('created_at', { ascending: false }),
      supabase.from('bestowal_reports').select('*').order('created_at', { ascending: false }).limit(10),
    ]);
    setAgents(a.data ?? []);
    setActivity(l.data ?? []);
    setSuggestions(s.data ?? []);
    setReports(r.data ?? []);
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
    toast({ title: decision === 'approved' ? '🐧 The family is on it!' : 'Got it — skipped.' });
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

  const statusFor = (key: string) => agents.find(a => a.agent_name === key)?.status ?? 'idle';

  return (
    <div className="container mx-auto p-4 max-w-6xl space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">🐧 Linux Open Source Family</h1>
          <p className="text-sm text-muted-foreground">Your loyal tribe of penguin agents — running marketing, content, calls, and bookkeeping for every Seed.</p>
        </div>
        <Button onClick={() => buildReport(7)} disabled={busy} className="gap-2">
          {busy ? <Loader2 className="w-4 h-4 animate-spin"/> : <FileText className="w-4 h-4"/>}
          Weekly Bestowal Report
        </Button>
      </div>

      {/* Family Roster */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {AGENTS.map(a => {
          const s = statusFor(a.key);
          return (
            <Card key={a.key} className="glass-panel">
              <CardContent className="p-3">
                <div className="flex items-center gap-2">
                  <div className="text-2xl">{a.emoji}</div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm truncate">{a.name}</div>
                    <div className="text-[10px] text-muted-foreground">{a.role}</div>
                  </div>
                  <Badge variant={s === 'working' ? 'default' : s === 'waiting' ? 'secondary' : 'outline'} className="text-[10px]">{s}</Badge>
                </div>
                <p className="text-[11px] text-muted-foreground mt-1 line-clamp-2">{a.bio}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Tabs defaultValue="suggestions">
        <TabsList>
          <TabsTrigger value="suggestions" className="gap-1"><Sparkles className="w-3 h-3"/> Suggestions {suggestions.length>0 && <Badge variant="destructive" className="ml-1 text-[9px]">{suggestions.length}</Badge>}</TabsTrigger>
          <TabsTrigger value="activity" className="gap-1"><Activity className="w-3 h-3"/> Activity</TabsTrigger>
          <TabsTrigger value="reports" className="gap-1"><FileText className="w-3 h-3"/> Reports</TabsTrigger>
          <TabsTrigger value="terminal" className="gap-1"><TerminalIcon className="w-3 h-3"/> Terminal</TabsTrigger>
        </TabsList>

        <TabsContent value="suggestions">
          <Card><CardContent className="p-4 space-y-2">
            {suggestions.length === 0 && <p className="text-sm text-muted-foreground">All quiet 🐧 — the family will nudge you when needed.</p>}
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
