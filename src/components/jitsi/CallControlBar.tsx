/**
 * Shared Call Control Bar with S2G Member Invite
 * Used by JitsiAudioCall, JitsiVideoCall, and JitsiRoom
 */
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import {
  Mic, MicOff, Video, VideoOff, Phone, Hand, Settings, UserPlus,
  Search, Check, Monitor, MessageSquare, LayoutGrid, Users,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface CallControlBarProps {
  jitsiApi: any;
  roomName?: string;
  isAudioMuted?: boolean;
  isVideoMuted?: boolean;
  isHandRaised?: boolean;
  participantCount?: number;
  onToggleAudio?: () => void;
  onToggleVideo?: () => void;
  onHangUp: () => void;
  showVideoToggle?: boolean;
}

export default function CallControlBar({
  jitsiApi,
  roomName,
  isAudioMuted = false,
  isVideoMuted = false,
  isHandRaised = false,
  participantCount = 1,
  onToggleAudio,
  onToggleVideo,
  onHangUp,
  showVideoToggle = true,
}: CallControlBarProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [inviteSearch, setInviteSearch] = useState('');
  const [availableUsers, setAvailableUsers] = useState<any[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [invitedUserIds, setInvitedUserIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!showInviteDialog || !user) return;
    const timeout = setTimeout(() => loadAvailableUsers(), 300);
    return () => clearTimeout(timeout);
  }, [showInviteDialog, inviteSearch, user]);

  const loadAvailableUsers = async () => {
    if (!user) return;
    setLoadingUsers(true);
    try {
      let query = supabase
        .from('profiles')
        .select('id, user_id, display_name, avatar_url, first_name, last_name')
        .neq('user_id', user.id)
        .limit(30);

      if (inviteSearch.trim()) {
        const s = inviteSearch.trim();
        query = query.or(`display_name.ilike.%${s}%,first_name.ilike.%${s}%,last_name.ilike.%${s}%`);
      }

      const { data: profiles, error } = await query;
      if (error) throw error;

      setAvailableUsers(
        (profiles || []).filter((u: any) => {
          const name = (u.display_name || `${u.first_name || ''} ${u.last_name || ''}`.trim());
          return name.length > 1 && name !== ' ';
        })
      );
    } catch (error) {
      console.error('Error loading users:', error);
    } finally {
      setLoadingUsers(false);
    }
  };

  const handleInviteUser = async (invitedUser: any) => {
    if (!user) return;
    try {
      const { error } = await supabase.from('call_sessions').insert({
        caller_id: user.id,
        receiver_id: invitedUser.user_id,
        call_type: 'video',
        status: 'ringing',
        ...(roomName ? { room_id: roomName } : {}),
      });
      if (error) throw error;

      setInvitedUserIds(prev => new Set(prev).add(invitedUser.user_id));
      toast({
        title: 'Invitation sent!',
        description: `${invitedUser.display_name || invitedUser.first_name || 'User'} will receive a call notification.`,
      });
    } catch (err: any) {
      console.error('Invite error:', err);
      toast({ variant: 'destructive', title: 'Invite failed', description: err.message || 'Could not send invitation' });
    }
  };

  const toggleAudio = () => onToggleAudio ? onToggleAudio() : jitsiApi?.executeCommand('toggleAudio');
  const toggleVideo = () => onToggleVideo ? onToggleVideo() : jitsiApi?.executeCommand('toggleVideo');
  const toggleRaiseHand = () => jitsiApi?.executeCommand('toggleRaiseHand');
  const openSettings = () => jitsiApi?.executeCommand('toggleSettings');
  const toggleScreenShare = () => jitsiApi?.executeCommand('toggleShareScreen');
  const toggleChat = () => jitsiApi?.executeCommand('toggleChat');
  const toggleTileView = () => jitsiApi?.executeCommand('toggleTileView');

  return (
    <>
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20">
        <Card className="p-3 shadow-lg bg-background/95 backdrop-blur">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 px-2 py-1.5 bg-muted rounded-md">
              <Users className="h-4 w-4" />
              <span className="text-sm font-medium">{participantCount}</span>
            </div>
            <Button variant="outline" size="icon" onClick={() => { setInviteSearch(''); setShowInviteDialog(true); }} className="rounded-full h-11 w-11" title="Invite S2G members">
              <UserPlus className="h-5 w-5" />
            </Button>
            <Button variant={isAudioMuted ? 'destructive' : 'secondary'} size="icon" onClick={toggleAudio} className="rounded-full h-11 w-11">
              {isAudioMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
            </Button>
            {showVideoToggle && (
              <Button variant={isVideoMuted ? 'destructive' : 'secondary'} size="icon" onClick={toggleVideo} className="rounded-full h-11 w-11">
                {isVideoMuted ? <VideoOff className="h-5 w-5" /> : <Video className="h-5 w-5" />}
              </Button>
            )}
            <Button variant={isHandRaised ? 'default' : 'outline'} size="icon" onClick={toggleRaiseHand} className="rounded-full h-11 w-11">
              <Hand className="h-5 w-5" />
            </Button>
            <Button variant="outline" size="icon" onClick={toggleScreenShare} className="rounded-full h-11 w-11" title="Share screen">
              <Monitor className="h-5 w-5" />
            </Button>
            <Button variant="outline" size="icon" onClick={toggleChat} className="rounded-full h-11 w-11" title="Chat">
              <MessageSquare className="h-5 w-5" />
            </Button>
            <Button variant="outline" size="icon" onClick={toggleTileView} className="rounded-full h-11 w-11" title="Tile view">
              <LayoutGrid className="h-5 w-5" />
            </Button>
            <Button variant="outline" size="icon" onClick={openSettings} className="rounded-full h-11 w-11">
              <Settings className="h-5 w-5" />
            </Button>
            <Button variant="destructive" size="icon" onClick={onHangUp} className="rounded-full h-11 w-11 ml-1">
              <Phone className="h-5 w-5 rotate-135" />
            </Button>
          </div>
        </Card>
      </div>

      <Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Invite Members to Call</DialogTitle></DialogHeader>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search registered members..."
              value={inviteSearch}
              onChange={(e) => setInviteSearch(e.target.value)}
              className="pl-9"
              autoFocus
            />
          </div>
          <ScrollArea className="max-h-80">
            {loadingUsers ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : availableUsers.length === 0 ? (
              <p className="text-center text-muted-foreground py-4">
                {inviteSearch.trim() ? `No members found for "${inviteSearch}"` : 'No members available'}
              </p>
            ) : (
              <div className="space-y-2">
                {availableUsers.map((u) => {
                  const alreadyInvited = invitedUserIds.has(u.user_id);
                  const name = u.display_name || `${u.first_name || ''} ${u.last_name || ''}`.trim() || 'User';
                  return (
                    <div
                      key={u.id}
                      className={`flex items-center justify-between p-3 rounded-lg transition-colors ${
                        alreadyInvited ? 'bg-primary/10' : 'hover:bg-accent cursor-pointer'
                      }`}
                      onClick={() => !alreadyInvited && handleInviteUser(u)}
                    >
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={u.avatar_url} />
                          <AvatarFallback>{name.charAt(0).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <p className="font-medium">{name}</p>
                      </div>
                      {alreadyInvited ? (
                        <span className="flex items-center gap-1 text-sm text-primary">
                          <Check className="h-4 w-4" /> Invited
                        </span>
                      ) : (
                        <Button size="sm" variant="outline"><UserPlus className="h-4 w-4 mr-1" />Invite</Button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </>
  );
}
