/**
 * Live Video Call Interface for Radio Shows
 * Jitsi-powered multi-participant video interface for live radio sessions
 */
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import JitsiRoom from '@/components/jitsi/JitsiRoom';
import { 
  Video, 
  VideoOff, 
  Mic, 
  MicOff, 
  Crown,
  Shield,
  User,
  Users,
  Radio
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { JAAS_CONFIG } from '@/lib/jitsi-config';

interface LiveVideoCallInterfaceProps {
  liveSession: {
    id: string;
    schedule_id: string;
    session_token?: string;
    status?: string;
  };
  activeHosts?: any[];
  approvedGuests?: any[];
  currentUser?: {
    id: string;
    display_name?: string;
    email?: string;
  };
  isHost?: boolean;
  onHostsUpdate?: () => void;
  onGuestsUpdate?: () => void;
}

export function LiveVideoCallInterface({ 
  liveSession, 
  activeHosts = [], 
  approvedGuests = [],
  currentUser,
  isHost = false,
}: LiveVideoCallInterfaceProps) {
  const { toast } = useToast();
  const [isInSession, setIsInSession] = useState(false);
  const [participantCount, setParticipantCount] = useState(0);

  const displayName = currentUser?.display_name || currentUser?.email || 'Radio Host';
  
  // Generate unique room name for this radio session
  const roomName = `radio_session_${liveSession.id.replace(/-/g, '')}`;

  // Calculate total participant count
  useEffect(() => {
    const total = activeHosts.length + approvedGuests.length + 1; // +1 for current user
    setParticipantCount(total);
  }, [activeHosts, approvedGuests]);

  const handleJoinSession = () => {
    setIsInSession(true);
    toast({
      title: 'Joining Live Session',
      description: 'Connecting to the radio broadcast...',
    });
  };

  const handleLeaveSession = () => {
    setIsInSession(false);
    toast({
      title: 'Left Session',
      description: 'You have left the live broadcast',
    });
  };

  if (isInSession) {
    return (
      <JitsiRoom
        roomName={roomName}
        displayName={displayName}
        onLeave={handleLeaveSession}
        isModerator={isHost}
      />
    );
  }

  // Lobby/Preview interface
  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Radio className="h-5 w-5 animate-pulse text-red-500" />
            Live Radio Session
          </CardTitle>
          <Badge variant="destructive" className="gap-1">
            <span className="animate-pulse">●</span> LIVE
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Session Info */}
        <div className="text-center space-y-4">
          <div className="flex justify-center items-center gap-4">
            <div className="text-center">
              <p className="text-sm text-muted-foreground">Hosts</p>
              <p className="text-2xl font-bold">{activeHosts.length}</p>
            </div>
            <div className="text-center">
              <p className="text-sm text-muted-foreground">Guests</p>
              <p className="text-2xl font-bold">{approvedGuests.length}</p>
            </div>
            <div className="text-center">
              <p className="text-sm text-muted-foreground">Total</p>
              <p className="text-2xl font-bold">{participantCount}</p>
            </div>
          </div>

          {/* Participants Preview */}
          {(activeHosts.length > 0 || approvedGuests.length > 0) && (
            <div className="space-y-3">
              <p className="text-sm font-medium">Who's In:</p>
              <div className="flex flex-wrap justify-center gap-2">
                {activeHosts.map((host, idx) => (
                  <div key={idx} className="flex items-center gap-2 bg-secondary px-3 py-1 rounded-full">
                    <Crown className="h-3 w-3 text-yellow-500" />
                    <span className="text-sm">
                      {host.profile?.display_name || host.profile?.first_name || 'Host'}
                    </span>
                  </div>
                ))}
                {approvedGuests.map((guest, idx) => (
                  <div key={idx} className="flex items-center gap-2 bg-secondary px-3 py-1 rounded-full">
                    <User className="h-3 w-3" />
                    <span className="text-sm">
                      {guest.profile?.display_name || guest.profile?.first_name || 'Guest'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Your Role */}
          <div className="flex justify-center">
            <Badge variant={isHost ? 'default' : 'outline'} className="gap-2">
              {isHost ? (
                <>
                  <Crown className="h-4 w-4" />
                  You are a Host
                </>
              ) : (
                <>
                  <Users className="h-4 w-4" />
                  You are a Guest
                </>
              )}
            </Badge>
          </div>
        </div>

        {/* Join Button */}
        <div className="flex justify-center">
          <Button 
            size="lg" 
            onClick={handleJoinSession}
            className="gap-2 shadow-lg"
          >
            <Video className="h-5 w-5" />
            Join Live Session
          </Button>
        </div>

        {/* Instructions */}
        <div className="bg-muted/50 rounded-lg p-4 space-y-2">
          <p className="text-sm font-medium">Before you join:</p>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>• Make sure your camera and microphone are working</li>
            <li>• Find a quiet place with good lighting</li>
            <li>• Test your internet connection for smooth streaming</li>
            {isHost && <li className="text-primary">• As a host, you can moderate the session</li>}
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
