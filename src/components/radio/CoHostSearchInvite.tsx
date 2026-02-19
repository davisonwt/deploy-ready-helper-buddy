import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Search, UserPlus, Loader2, Mic, Check } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface CoHostSearchInviteProps {
  open: boolean;
  onClose: () => void;
  scheduleId: string;
  hostDjId: string;
  currentCoHostCount: number;
  maxCoHosts?: number;
}

interface DJResult {
  id: string;
  dj_name: string;
  avatar_url: string | null;
  user_id: string;
  dj_role: string;
}

export const CoHostSearchInvite: React.FC<CoHostSearchInviteProps> = ({
  open, onClose, scheduleId, hostDjId, currentCoHostCount, maxCoHosts = 5
}) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<DJResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [inviting, setInviting] = useState<string | null>(null);
  const [invitedIds, setInvitedIds] = useState<Set<string>>(new Set());
  const [message, setMessage] = useState('');

  const slotsLeft = maxCoHosts - currentCoHostCount;

  useEffect(() => {
    if (!open) {
      setQuery('');
      setResults([]);
      setMessage('');
    } else {
      // Load already-invited DJs
      loadExistingInvites();
    }
  }, [open]);

  const loadExistingInvites = async () => {
    const { data } = await supabase
      .from('radio_co_host_invites')
      .select('co_host_dj_id')
      .eq('schedule_id', scheduleId)
      .in('status', ['pending', 'accepted']);

    if (data) {
      setInvitedIds(new Set(data.map(d => d.co_host_dj_id)));
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      if (query.trim().length >= 2) searchDJs();
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  const searchDJs = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('radio_djs')
        .select('id, dj_name, avatar_url, user_id, dj_role')
        .ilike('dj_name', `%${query.trim()}%`)
        .neq('id', hostDjId)
        .eq('is_active', true)
        .limit(10);

      if (error) throw error;
      setResults(data || []);
    } catch (err) {
      console.error('Search error:', err);
    } finally {
      setLoading(false);
    }
  };

  const sendInvite = async (dj: DJResult) => {
    if (invitedIds.size >= maxCoHosts) {
      toast.error(`Maximum ${maxCoHosts} co-hosts allowed`);
      return;
    }

    setInviting(dj.id);
    try {
      const { error } = await supabase
        .from('radio_co_host_invites')
        .insert({
          schedule_id: scheduleId,
          host_dj_id: hostDjId,
          co_host_dj_id: dj.id,
          co_host_user_id: dj.user_id,
          invitation_message: message || null,
          status: 'pending'
        });

      if (error) throw error;

      setInvitedIds(prev => new Set([...prev, dj.id]));
      toast.success(`Invitation sent to ${dj.dj_name}!`);
    } catch (err: any) {
      if (err?.message?.includes('duplicate')) {
        toast.info('Already invited this DJ');
        setInvitedIds(prev => new Set([...prev, dj.id]));
      } else {
        toast.error('Failed to send invite');
      }
    } finally {
      setInviting(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Invite Co-Hosts
            <Badge variant="outline" className="ml-auto">
              {slotsLeft} slot{slotsLeft !== 1 ? 's' : ''} left
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search DJs by name..."
              value={query}
              onChange={e => setQuery(e.target.value)}
              className="pl-9"
              autoFocus
            />
          </div>

          {/* Optional message */}
          <Textarea
            placeholder="Add a message with your invite (optional)..."
            value={message}
            onChange={e => setMessage(e.target.value)}
            rows={2}
            className="text-sm"
          />

          {/* Results */}
          <div className="max-h-64 overflow-y-auto space-y-2">
            {loading && (
              <div className="flex justify-center py-4">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            )}

            {!loading && results.length === 0 && query.length >= 2 && (
              <p className="text-center text-sm text-muted-foreground py-4">No DJs found</p>
            )}

            {results.map(dj => {
              const alreadyInvited = invitedIds.has(dj.id);
              return (
                <div
                  key={dj.id}
                  className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Avatar className="h-9 w-9">
                      <AvatarImage src={dj.avatar_url || undefined} />
                      <AvatarFallback>
                        <Mic className="h-4 w-4" />
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium text-sm">{dj.dj_name}</p>
                      <p className="text-xs text-muted-foreground">{dj.dj_role}</p>
                    </div>
                  </div>

                  {alreadyInvited ? (
                    <Badge variant="secondary" className="gap-1">
                      <Check className="h-3 w-3" />
                      Invited
                    </Badge>
                  ) : (
                    <Button
                      size="sm"
                      onClick={() => sendInvite(dj)}
                      disabled={inviting === dj.id || slotsLeft <= 0}
                      className="gap-1"
                    >
                      {inviting === dj.id ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <UserPlus className="h-3 w-3" />
                      )}
                      Invite
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
