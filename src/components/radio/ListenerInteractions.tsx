import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Send, MessageCircle, Music } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface Comment {
  id: string;
  user_id: string;
  message: string;
  type: 'comment' | 'request';
  created_at: string;
}

const ListenerInteractions = () => {
  const [message, setMessage] = useState('');
  const [type, setType] = useState<'comment' | 'request'>('comment');
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    fetchComments();

    // Subscribe to new comments
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
        const formattedComments = data.map(item => ({
          id: item.id,
          user_id: item.sender_id,
          message: item.content,
          type: item.message_type as 'comment' | 'request',
          created_at: item.created_at,
        }));
        setComments(formattedComments);
      }
    } catch (error) {
      console.error('Failed to fetch comments:', error);
    }
  };

  const sendMessage = async () => {
    if (!message.trim() || !user || loading) return;

    setLoading(true);
    try {
      // Get current radio session
      const { data: sessionData } = await supabase
        .from('radio_live_sessions')
        .select('id')
        .eq('status', 'live')
        .limit(1)
        .single();

      if (!sessionData) {
        toast({ 
          variant: 'destructive', 
          description: 'No active radio session found' 
        });
        return;
      }

      const { error } = await supabase.from('live_session_messages').insert({
        session_id: sessionData.id,
        sender_id: user.id,
        content: message,
        message_type: type,
        sender_type: 'participant'
      });

      if (error) throw error;

      setMessage('');
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

  const formatDisplayName = (comment: Comment) => {
    return `User ${comment.user_id.slice(0, 8)}`;
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
            
            <div className="flex space-x-2">
              <Input
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder={
                  type === 'comment' 
                    ? 'Say something...' 
                    : 'Request a song...'
                }
                onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                disabled={loading}
              />
              <Button 
                onClick={sendMessage} 
                disabled={!message.trim() || loading}
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
                className="flex items-start space-x-2 p-3 bg-muted/50 rounded-lg"
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
                    <span className="text-xs text-muted-foreground">
                      {formatTime(comment.created_at)}
                    </span>
                  </div>
                  <p className="text-sm break-words">{comment.message}</p>
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