/**
 * Conversations — one list, whoever is in them.
 *
 * Built ALONGSIDE the old ChatApp on its own route. It reads and writes the
 * same chat_rooms / chat_messages / chat_participants rows, migrates
 * nothing, and renders ChatRoom exactly as /chatapp does except for
 * `recordGesture="hold"` (WhatsApp-style press-and-hold recording, added
 * 2026-09-19 -- see ChatRoom.tsx's recordGesture prop). That prop defaults
 * to 'tap' everywhere else, so /chatapp's own behavior is unchanged.
 *
 * The call docks IN PLACE -- DockedCallPane + CallErrorBoundary +
 * JitsiRoom(fullscreen=false), the same shape OneOnOneRoom.tsx already
 * uses. It deliberately does NOT navigate to /call/:roomKind/:roomId: a
 * route change unmounts the page and takes the call with it, which is the
 * 2026-09-15 bug GlobalLiveSessionOverlay exists to prevent.
 */
import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Loader2, MessageSquarePlus, Phone, Users, Video, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/hooks/useAuth';
import { useConversations, type Conversation } from '@/lib/conversations/useConversations';
import { NewConversationDialog } from '@/components/conversations/NewConversationDialog';
import { ChatRoom } from '@/components/chat/ChatRoom';
import { DockedCallPane } from '@/components/media/DockedCallPane';
import { CallErrorBoundary } from '@/components/media/CallErrorBoundary';
import JitsiRoom from '@/components/jitsi/JitsiRoom';

function whenLabel(iso: string | null): string {
  if (!iso) return '';
  const then = new Date(iso);
  const mins = Math.floor((Date.now() - then.getTime()) / 60000);
  if (mins < 1) return 'now';
  if (mins < 60) return `${mins}m`;
  if (mins < 60 * 24) return `${Math.floor(mins / 60)}h`;
  return then.toLocaleDateString();
}

function ConversationRow({ c, onOpen }: { c: Conversation; onOpen: (id: string) => void }) {
  const faces = c.people.slice(0, 3);
  return (
    <button
      type="button"
      onClick={() => onOpen(c.id)}
      data-testid="conversation-row"
      className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition-colors hover:bg-muted/60"
    >
      <div className="flex -space-x-2 shrink-0">
        {faces.length === 0 ? (
          <Avatar className="h-10 w-10"><AvatarFallback>?</AvatarFallback></Avatar>
        ) : (
          faces.map((p) => (
            <Avatar key={p.userId} className="h-10 w-10 border-2 border-background">
              {p.avatarUrl && <AvatarImage src={p.avatarUrl} alt="" />}
              <AvatarFallback>{p.name.slice(0, 1).toUpperCase()}</AvatarFallback>
            </Avatar>
          ))
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <span className="truncate text-sm font-semibold">{c.title}</span>
          <span className="shrink-0 text-xs text-muted-foreground">{whenLabel(c.lastMessageAt)}</span>
        </div>
        <p className="truncate text-xs text-muted-foreground">
          {c.lastMessage ?? 'No messages yet'}
        </p>
      </div>
    </button>
  );
}

export default function ConversationsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const openId = searchParams.get('c');

  const { conversations, loading, error, reload } = useConversations(user?.id);
  const [newOpen, setNewOpen] = useState(false);
  const [showPeople, setShowPeople] = useState(false);
  const [call, setCall] = useState<{ audioOnly: boolean } | null>(null);

  const active = conversations.find((c) => c.id === openId) ?? null;

  const open = (id: string) => {
    setCall(null);
    setShowPeople(false);
    setSearchParams({ c: id }, { replace: false });
  };

  const backToList = () => {
    setCall(null);
    setShowPeople(false);
    setSearchParams({}, { replace: false });
  };

  // --- An open conversation -------------------------------------------------
  if (openId) {
    const myName = (user?.user_metadata?.display_name as string | undefined) ?? 'Guest';
    return (
      <div className="flex h-[100dvh] flex-col bg-background">
        <div className="flex items-center gap-2 border-b border-border px-3 py-2">
          <Button variant="ghost" size="sm" onClick={backToList} className="gap-1.5 shrink-0">
            <ArrowLeft className="h-4 w-4" /> Conversations
          </Button>
          <span className="min-w-0 flex-1 truncate text-sm font-semibold">
            {active?.title ?? 'Conversation'}
          </span>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Who is in this conversation"
            data-testid="conversation-people"
            onClick={() => setShowPeople((v) => !v)}
          >
            <Users className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Start a voice call"
            data-testid="conversation-call-voice"
            onClick={() => setCall({ audioOnly: true })}
          >
            <Phone className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Start a video call"
            data-testid="conversation-call-video"
            onClick={() => setCall({ audioOnly: false })}
          >
            <Video className="h-4 w-4" />
          </Button>
        </div>

        {showPeople && (
          <div className="border-b border-border bg-muted/40 px-4 py-3" data-testid="conversation-people-panel">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                In this conversation
              </span>
              <Button variant="ghost" size="icon" aria-label="Close" onClick={() => setShowPeople(false)}>
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
            <ul className="space-y-1.5">
              <li className="flex items-center gap-2 text-sm">
                <Avatar className="h-7 w-7"><AvatarFallback>You</AvatarFallback></Avatar>
                <span>You</span>
              </li>
              {(active?.people ?? []).map((p) => (
                <li key={p.userId} className="flex items-center gap-2 text-sm">
                  <Avatar className="h-7 w-7">
                    {p.avatarUrl && <AvatarImage src={p.avatarUrl} alt="" />}
                    <AvatarFallback>{p.name.slice(0, 1).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <span className="truncate">{p.name}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {call && (
          <DockedCallPane>
            <CallErrorBoundary onBack={() => setCall(null)}>
              <JitsiRoom
                roomName={`s2g-conv-${openId}`}
                displayName={myName}
                audioOnly={call.audioOnly}
                fullscreen={false}
                onLeave={() => setCall(null)}
              />
            </CallErrorBoundary>
          </DockedCallPane>
        )}

        <div className="min-h-0 flex-1">
          <ChatRoom roomId={openId} onBack={backToList} backLabel="Conversations" recordGesture="hold" showToolbar />
        </div>
      </div>
    );
  }

  // --- The list -------------------------------------------------------------
  return (
    <div className="min-h-[100dvh] bg-background">
      <div className="mx-auto max-w-2xl px-4 py-4">
        <div className="mb-4 flex items-center justify-between gap-2">
          <Button variant="ghost" size="sm" onClick={() => navigate('/dashboard')} className="gap-1.5">
            <ArrowLeft className="h-4 w-4" /> Home
          </Button>
          <Button size="sm" className="gap-1.5" data-testid="new-conversation" onClick={() => setNewOpen(true)}>
            <MessageSquarePlus className="h-4 w-4" /> New chat
          </Button>
        </div>

        <h1 className="mb-3 text-2xl font-bold">Conversations</h1>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : error ? (
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4">
            <p className="text-sm text-destructive">{error}</p>
            <Button variant="outline" size="sm" className="mt-3" onClick={() => void reload()}>
              Try again
            </Button>
          </div>
        ) : conversations.length === 0 ? (
          <div className="rounded-xl border border-border bg-muted/30 px-4 py-10 text-center">
            <p className="text-sm text-muted-foreground">
              No conversations yet. Tap <span className="font-semibold">New chat</span> and pick someone.
            </p>
          </div>
        ) : (
          <ul className="space-y-1" data-testid="conversation-list">
            {conversations.map((c) => (
              <li key={c.id}>
                <ConversationRow c={c} onOpen={open} />
              </li>
            ))}
          </ul>
        )}
      </div>

      {user?.id && (
        <NewConversationDialog
          open={newOpen}
          onClose={() => setNewOpen(false)}
          currentUserId={user.id}
          onCreated={(roomId) => { void reload(); open(roomId); }}
        />
      )}
    </div>
  );
}
