import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { JitsiCall } from '@/components/JitsiCall';
import type { DailyRoomKind } from '@/lib/daily-config';

const VALID_KINDS: DailyRoomKind[] = ['call_session', 'chat_room', 'custom'];

/**
 * Full-page call, opened in a new tab by chat's "Start a call" button
 * (RelationshipLayerChatApp.tsx) -- replaces opening a raw, unauthenticated
 * Jitsi URL that the other party had no way to learn (P1-6). `roomId` here
 * is the real shared chat room id (get_or_create_direct_room), so both
 * sides land in the same Daily room; the edge function authorizes each via
 * chat_participants membership.
 */
export default function CallPage() {
  const { roomKind, roomId } = useParams<{ roomKind: string; roomId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const kind = (VALID_KINDS as string[]).includes(roomKind ?? '') ? (roomKind as DailyRoomKind) : null;
  const displayName = user?.display_name || user?.first_name || user?.email?.split('@')[0] || 'Sower';

  const leaveCall = () => {
    window.close();
    // window.close() only works on a script-opened tab; if this page was
    // reached by direct navigation instead, fall back to leaving the route.
    setTimeout(() => navigate('/dashboard'), 150);
  };

  if (!kind || !roomId) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <p className="text-muted-foreground">This call link isn't valid.</p>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col">
      <div className="p-3 border-b flex items-center">
        <Button variant="ghost" size="sm" onClick={leaveCall}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Leave call
        </Button>
      </div>
      <div className="flex-1">
        <JitsiCall
          roomName={roomId}
          roomKind={kind}
          userInfo={{ displayName, email: '' }}
          onLeave={leaveCall}
        />
      </div>
    </div>
  );
}
