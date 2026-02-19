import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Music, Search, Sprout, Send, Check, X, ListMusic } from 'lucide-react';

interface SeedOption {
  id: string;
  title: string;
  artist?: string;
  cover_url?: string;
  file_url?: string;
  duration_seconds?: number;
  source: 'seed' | 'track';
}

interface SeedRequest {
  id: string;
  seed_title: string;
  seed_artist?: string;
  seed_cover_url?: string;
  status: string;
  requester_id: string;
  message?: string;
  created_at: string;
}

// ── Listener: request a seed ──
export const SeedRequestForm: React.FC<{ sessionId: string }> = ({ sessionId }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [search, setSearch] = useState('');
  const [results, setResults] = useState<SeedOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [selected, setSelected] = useState<SeedOption | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (search.length < 2) { setResults([]); return; }
    const timeout = setTimeout(async () => {
      setLoading(true);
      const q = `%${search}%`;

      // Search community seeds (music)
      const { data: seeds } = await (supabase.from('seeds') as any)
        .select('id, title, sower_name, image_url, file_url, duration_seconds')
        .eq('type', 'music')
        .eq('status', 'active')
        .ilike('title', q)
        .limit(10);

      // Search DJ tracks
      const { data: tracks } = await supabase
        .from('dj_music_tracks')
        .select('id, track_title, artist_name, file_url, duration_seconds')
        .eq('is_public', true)
        .ilike('track_title', q)
        .limit(10);

      const combined: SeedOption[] = [
        ...(seeds || []).map((s: any) => ({
          id: s.id, title: s.title, artist: s.sower_name,
          cover_url: s.image_url, file_url: s.file_url,
          duration_seconds: s.duration_seconds, source: 'seed' as const,
        })),
        ...(tracks || []).map((t: any) => ({
          id: t.id, title: t.track_title, artist: t.artist_name,
          file_url: t.file_url, duration_seconds: t.duration_seconds,
          source: 'track' as const,
        })),
      ];
      setResults(combined);
      setLoading(false);
    }, 400);
    return () => clearTimeout(timeout);
  }, [search]);

  const submitRequest = async () => {
    if (!selected || !user) return;
    setSubmitting(true);
    const { error } = await supabase.from('radio_seed_requests').insert({
      session_id: sessionId,
      requester_id: user.id,
      seed_id: selected.source === 'seed' ? selected.id : null,
      track_id: selected.source === 'track' ? selected.id : null,
      seed_title: selected.title,
      seed_artist: selected.artist || null,
      seed_cover_url: selected.cover_url || null,
      seed_file_url: selected.file_url || null,
      seed_duration_seconds: selected.duration_seconds || null,
      message: message || null,
    });
    setSubmitting(false);
    if (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'Could not send request.' });
    } else {
      toast({ title: '🎵 Song Requested!', description: `"${selected.title}" has been sent to the DJ.` });
      setSelected(null);
      setSearch('');
      setMessage('');
      setResults([]);
    }
  };

  const fmt = (s?: number) => {
    if (!s) return '';
    return `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <ListMusic className="h-4 w-4 text-primary" />
          Request a Song
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {!selected ? (
          <>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search S2G seeds or DJ tracks..."
                className="pl-8 h-9 text-sm"
              />
            </div>
            {results.length > 0 && (
              <ScrollArea className="max-h-48">
                <div className="space-y-1">
                  {results.map((r) => (
                    <button
                      key={`${r.source}-${r.id}`}
                      onClick={() => setSelected(r)}
                      className="w-full flex items-center gap-2 px-2 py-2 rounded-md hover:bg-accent/50 transition-colors text-left"
                    >
                      <div className="h-8 w-8 rounded bg-primary/10 flex items-center justify-center shrink-0 overflow-hidden">
                        {r.cover_url ? (
                          <img src={r.cover_url} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <Music className="h-3.5 w-3.5 text-primary" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate">{r.title}</p>
                        {r.artist && <p className="text-[10px] text-muted-foreground truncate">{r.artist}</p>}
                      </div>
                      <Badge variant="outline" className="text-[9px] shrink-0">
                        {r.source === 'seed' ? '🌱 Seed' : '🎧 DJ'}
                      </Badge>
                      {r.duration_seconds && (
                        <span className="text-[10px] text-muted-foreground shrink-0">{fmt(r.duration_seconds)}</span>
                      )}
                    </button>
                  ))}
                </div>
              </ScrollArea>
            )}
            {search.length >= 2 && results.length === 0 && !loading && (
              <p className="text-xs text-muted-foreground text-center py-3">No songs found</p>
            )}
          </>
        ) : (
          <div className="space-y-2">
            <div className="flex items-center gap-2 p-2 bg-primary/5 rounded-lg">
              <Sprout className="h-4 w-4 text-primary shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{selected.title}</p>
                {selected.artist && <p className="text-xs text-muted-foreground">{selected.artist}</p>}
              </div>
              <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => setSelected(null)}>
                <X className="h-3 w-3" />
              </Button>
            </div>
            <Input
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Add a message (optional)..."
              className="h-8 text-xs"
            />
            <Button onClick={submitRequest} disabled={submitting} className="w-full h-9 gap-2 text-sm">
              <Send className="h-3.5 w-3.5" />
              Send Request
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// ── DJ: manage the request queue ──
export const DJSeedRequestQueue: React.FC<{ sessionId: string }> = ({ sessionId }) => {
  const { toast } = useToast();
  const [requests, setRequests] = useState<SeedRequest[]>([]);

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase
        .from('radio_seed_requests')
        .select('*')
        .eq('session_id', sessionId)
        .in('status', ['pending', 'approved'])
        .order('created_at', { ascending: true });
      setRequests((data as SeedRequest[]) || []);
    };
    fetch();

    const channel = supabase
      .channel(`seed-requests-${sessionId}`)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'radio_seed_requests',
        filter: `session_id=eq.${sessionId}`,
      }, () => fetch())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [sessionId]);

  const updateStatus = async (id: string, status: 'approved' | 'skipped') => {
    const { error } = await supabase
      .from('radio_seed_requests')
      .update({ status, resolved_at: new Date().toISOString() })
      .eq('id', id);
    if (error) toast({ variant: 'destructive', title: 'Error', description: 'Could not update request.' });
  };

  if (requests.length === 0) {
    return (
      <div className="text-center py-4 text-xs text-muted-foreground">
        <ListMusic className="h-5 w-5 mx-auto mb-1 opacity-50" />
        No song requests yet
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
        <ListMusic className="h-3.5 w-3.5" />
        Song Requests ({requests.length})
      </p>
      {requests.map((r) => (
        <div key={r.id} className="flex items-center gap-2 p-2 bg-muted/30 rounded-lg">
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium truncate">{r.seed_title}</p>
            {r.seed_artist && <p className="text-[10px] text-muted-foreground truncate">{r.seed_artist}</p>}
            {r.message && <p className="text-[10px] text-muted-foreground italic mt-0.5">"{r.message}"</p>}
          </div>
          <Badge variant={r.status === 'approved' ? 'default' : 'outline'} className="text-[9px] shrink-0">
            {r.status}
          </Badge>
          {r.status === 'pending' && (
            <div className="flex gap-1 shrink-0">
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-primary" onClick={() => updateStatus(r.id, 'approved')}>
                <Check className="h-3.5 w-3.5" />
              </Button>
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive" onClick={() => updateStatus(r.id, 'skipped')}>
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};
