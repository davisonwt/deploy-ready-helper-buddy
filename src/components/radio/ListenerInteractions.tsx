import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Send, MessageCircle, Music, Pencil, Trash2, X, Check, Search } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface SowerTrack {
  id: string;
  title: string;
  artist: string;
  genre?: string;
}

interface Comment {
  id: string;
  user_id: string;
  message: string;
  type: 'comment' | 'request';
  created_at: string;
  display_name?: string;
}

const ListenerInteractions = () => {
  const [message, setMessage] = useState('');
  const [type, setType] = useState<'comment' | 'request'>('comment');
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [tracks, setTracks] = useState<SowerTrack[]>([]);
  const [trackSearch, setTrackSearch] = useState('');
  const [selectedTrack, setSelectedTrack] = useState<SowerTrack | null>(null);
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    fetchTracks();
  }, []);

  useEffect(() => {
    fetchComments();

    const channel = supabase
      .channel('live-radio-comments')
      .on(
        'postgres_changes',
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'live_session_messages',
          filter: 'message_type=in.(comment,request)'
        },
        (payload) => {
          setComments((prev) => [payload.new as Comment, ...prev.slice(0, 49)]);
        }
      )
      .on(
        'postgres_changes',
        { 
          event: 'UPDATE', 
          schema: 'public', 
          table: 'live_session_messages'
        },
        (payload) => {
          const updated = payload.new as any;
          setComments((prev) => prev.map(c => 
            c.id === updated.id 
              ? { ...c, message: updated.content } 
              : c
          ));
        }
      )
      .on(
        'postgres_changes',
        { 
          event: 'DELETE', 
          schema: 'public', 
          table: 'live_session_messages'
        },
        (payload) => {
          const deleted = payload.old as any;
          setComments((prev) => prev.filter(c => c.id !== deleted.id));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchComments = async () => {
    try {
      const { data } = await supabase
        .from('live_session_messages')
        .select('id, sender_id, content, message_type, created_at')
        .in('message_type', ['comment', 'request'])
        .order('created_at', { ascending: false })
        .limit(50);

      if (data) {
        // Fetch profile names for all unique sender_ids
        const senderIds = [...new Set(data.map(d => d.sender_id))];
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, display_name, first_name, last_name')
          .in('user_id', senderIds);

        const nameMap: Record<string, string> = {};
        profiles?.forEach(p => {
          nameMap[p.user_id] = p.display_name || [p.first_name, p.last_name].filter(Boolean).join(' ') || '';
        });

        const formattedComments = data.map(item => ({
          id: item.id,
          user_id: item.sender_id,
          message: item.content,
          type: item.message_type as 'comment' | 'request',
          created_at: item.created_at,
          display_name: nameMap[item.sender_id] || undefined,
        }));
        setComments(formattedComments);
      }
    } catch (error) {
      console.error('Failed to fetch comments:', error);
    }
  };

  const fetchTracks = async () => {
    try {
      // Fetch from DJ tracks
      const { data: djTracks } = await supabase
        .from('dj_music_tracks')
        .select('id, track_title, artist_name, music_genre')
        .eq('is_public', true)
        .order('track_title');

      // Fetch music products from sowers
      const { data: musicProducts } = await (supabase
        .from('products') as any)
        .select('id, title, sower_id, category')
        .eq('type', 'music')
        .order('title');

      // Get sower names — sower_id references sowers.id, not auth users
      const sowerIds = [...new Set(((musicProducts as any[]) || []).map((p: any) => p.sower_id))] as string[];
      let sowerNameMap: Record<string, string> = {};
      if (sowerIds.length > 0) {
        const { data: sowers } = await (supabase
          .from('sowers') as any)
          .select('id, display_name')
          .in('id', sowerIds);
        (sowers as any[] || []).forEach((s: any) => {
          sowerNameMap[s.id] = s.display_name || 'Sower';
        });
      }

      const allTracks: SowerTrack[] = [];
      const seenTitles = new Set<string>();

      // Add DJ tracks
      (djTracks || []).forEach(t => {
        const key = t.track_title.toLowerCase().trim();
        if (!seenTitles.has(key)) {
          seenTitles.add(key);
          allTracks.push({
            id: t.id,
            title: t.track_title,
            artist: t.artist_name || 'Unknown Artist',
            genre: t.music_genre || undefined,
          });
        }
      });

      // Add music products (deduplicated by title)
      (musicProducts || []).forEach(p => {
        const key = p.title.toLowerCase().trim();
        if (!seenTitles.has(key)) {
          seenTitles.add(key);
          allTracks.push({
            id: p.id,
            title: p.title,
            artist: sowerNameMap[p.sower_id] || 'Sower',
            genre: p.category || undefined,
          });
        }
      });

      allTracks.sort((a, b) => a.title.localeCompare(b.title));
      setTracks(allTracks);
    } catch (error) {
      console.error('Failed to fetch tracks:', error);
    }
  };

  const filteredTracks = useMemo(() => {
    if (!trackSearch.trim()) return tracks;
    const q = trackSearch.toLowerCase();
    return tracks.filter(t => 
      t.title.toLowerCase().includes(q) || t.artist.toLowerCase().includes(q)
    );
  }, [tracks, trackSearch]);

  const sendMessage = async () => {
    if (type === 'request' && !selectedTrack && !message.trim()) return;
    if (type === 'comment' && !message.trim()) return;
    if (!user || loading) return;

    setLoading(true);
    try {
      const { data: sessionData } = await supabase
        .from('radio_live_sessions')
        .select('id')
        .eq('status', 'live')
        .limit(1)
        .maybeSingle();

      if (!sessionData) {
        toast({ 
          variant: 'destructive', 
          description: 'No active radio session found' 
        });
        return;
      }

      const content = type === 'request' && selectedTrack
        ? `🎵 ${selectedTrack.title} — ${selectedTrack.artist}${message.trim() ? ` (${message.trim()})` : ''}`
        : message;

      const { error } = await supabase.from('live_session_messages').insert({
        session_id: sessionData.id,
        sender_id: user.id,
        content,
        message_type: type,
        sender_type: 'participant'
      });

      if (error) throw error;

      setMessage('');
      setSelectedTrack(null);
      toast({ 
        title: type === 'comment' ? 'Comment sent!' : 'Song request sent!',
        description: type === 'request' ? 'The DJ will see your request' : undefined
      });
    } catch (err: any) {
      toast({ variant: 'destructive', description: err.message });
    } finally {
      setLoading(false);
    }
  };

  const startEdit = (comment: Comment) => {
    setEditingId(comment.id);
    setEditText(comment.message);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditText('');
  };

  const saveEdit = async (id: string) => {
    if (!editText.trim()) return;
    try {
      const { error } = await supabase
        .from('live_session_messages')
        .update({ content: editText.trim() })
        .eq('id', id);

      if (error) throw error;

      setComments(prev => prev.map(c => c.id === id ? { ...c, message: editText.trim() } : c));
      setEditingId(null);
      setEditText('');
      toast({ description: 'Message updated' });
    } catch (err: any) {
      toast({ variant: 'destructive', description: err.message });
    }
  };

  const deleteComment = async (id: string) => {
    try {
      const { error } = await supabase
        .from('live_session_messages')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setComments(prev => prev.filter(c => c.id !== id));
      toast({ description: 'Message deleted' });
    } catch (err: any) {
      toast({ variant: 'destructive', description: err.message });
    }
  };

  const formatDisplayName = (comment: Comment) => {
    return comment.display_name || `User ${comment.user_id.slice(0, 8)}`;
  };

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center">
          <MessageCircle className="mr-2 h-5 w-5" />
          Live Chat & Requests
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {user ? (
          <div className="space-y-3">
            <Select value={type} onValueChange={(v) => setType(v as 'comment' | 'request')}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="comment">
                  <div className="flex items-center">
                    <MessageCircle className="mr-2 h-4 w-4" />
                    Comment
                  </div>
                </SelectItem>
                <SelectItem value="request">
                  <div className="flex items-center">
                    <Music className="mr-2 h-4 w-4" />
                    Song Request
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
            
            {type === 'request' && (
              <div className="space-y-2">
                {selectedTrack ? (
                  <div className="flex items-center justify-between p-2 bg-primary/10 rounded-lg border border-primary/20">
                    <div className="flex items-center gap-2 min-w-0">
                      <Music className="h-4 w-4 text-primary shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{selectedTrack.title}</p>
                        <p className="text-xs text-muted-foreground truncate">{selectedTrack.artist}</p>
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={() => setSelectedTrack(null)}>
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ) : (
                  <>
                    <div className="relative">
                      <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        value={trackSearch}
                        onChange={(e) => setTrackSearch(e.target.value)}
                        placeholder="Search sower songs..."
                        className="pl-9"
                      />
                    </div>
                    <ScrollArea className="h-40 border rounded-lg">
                      {filteredTracks.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-4">No songs found</p>
                      ) : (
                        <div className="p-1">
                          {filteredTracks.map(track => (
                            <button
                              key={track.id}
                              onClick={() => { setSelectedTrack(track); setTrackSearch(''); }}
                              className="w-full flex items-center gap-2 p-2 rounded-md hover:bg-muted text-left transition-colors"
                            >
                              <Music className="h-4 w-4 text-muted-foreground shrink-0" />
                              <div className="min-w-0">
                                <p className="text-sm font-medium truncate">{track.title}</p>
                                <p className="text-xs text-muted-foreground truncate">{track.artist}{track.genre ? ` · ${track.genre}` : ''}</p>
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                    </ScrollArea>
                  </>
                )}
              </div>
            )}

            <div className="flex space-x-2">
              <Input
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder={
                  type === 'comment' 
                    ? 'Say something...' 
                    : selectedTrack ? 'Add a note (optional)...' : 'Or type a song name...'
                }
                onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                disabled={loading}
              />
              <Button 
                onClick={sendMessage} 
                disabled={(type === 'request' ? (!selectedTrack && !message.trim()) : !message.trim()) || loading}
                size="sm"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ) : (
          <div className="text-center p-4 border rounded-lg">
            <p className="text-muted-foreground">Login to join the conversation</p>
          </div>
        )}
        
        <div className="space-y-2 max-h-80 overflow-y-auto">
          {comments.length === 0 ? (
            <div className="text-center py-8">
              <MessageCircle className="mx-auto h-12 w-12 text-muted-foreground/50" />
              <p className="text-muted-foreground mt-2">No messages yet</p>
              <p className="text-sm text-muted-foreground">Be the first to comment!</p>
            </div>
          ) : (
            comments.map((comment) => (
              <div 
                key={comment.id} 
                className="flex items-start space-x-2 p-3 bg-muted/50 rounded-lg group"
              >
                <Badge 
                  variant={comment.type === 'request' ? 'secondary' : 'default'}
                  className="shrink-0 mt-0.5"
                >
                  {comment.type === 'request' ? (
                    <Music className="h-3 w-3 mr-1" />
                  ) : (
                    <MessageCircle className="h-3 w-3 mr-1" />
                  )}
                  {comment.type}
                </Badge>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="font-medium text-sm truncate">
                      {formatDisplayName(comment)}
                    </p>
                    <div className="flex items-center gap-1">
                      <span className="text-xs text-muted-foreground">
                        {formatTime(comment.created_at)}
                      </span>
                      {user && user.id === comment.user_id && editingId !== comment.id && (
                        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => startEdit(comment)}
                          >
                            <Pencil className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-destructive hover:text-destructive"
                            onClick={() => deleteComment(comment.id)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                  {editingId === comment.id ? (
                    <div className="flex items-center gap-1 mt-1">
                      <Input
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                        className="h-7 text-sm"
                        onKeyPress={(e) => e.key === 'Enter' && saveEdit(comment.id)}
                        autoFocus
                      />
                      <Button size="icon" className="h-7 w-7 shrink-0" onClick={() => saveEdit(comment.id)}>
                        <Check className="h-3 w-3" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7 shrink-0" onClick={cancelEdit}>
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ) : (
                    <p className="text-sm break-words">{comment.message}</p>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default ListenerInteractions;
