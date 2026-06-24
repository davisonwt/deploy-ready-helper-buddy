import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Plus, ArrowLeft, PlayCircle } from 'lucide-react';
import OneOnOneRoom from '@/components/live/OneOnOneRoom';
import { PresenceAura, classifyAura } from '@/components/live/PresenceAura';
import CreateOneOnOneDialog from '@/components/live/CreateOneOnOneDialog';
import PageHeroBanner from '@/components/chat/PageHeroBanner';
import ExplainerDialog from '@/components/explainers/ExplainerDialog';

interface LiveRoom {
  id: string;
  name: string;
  description: string | null;
  created_by: string;
  created_at: string;
  is_active: boolean;
}

type ParticipantRow = { room_id: string; user_id: string; display_name: string | null };
type MessageRow = { room_id: string; sender_id: string; created_at: string };

export default function LiveRoomsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const roomParam = searchParams.get('room');
  const [activeRoomId, setActiveRoomId] = useState<string | null>(roomParam);
  const [createOpen, setCreateOpen] = useState(false);
  const [explainerOpen, setExplainerOpen] = useState(false);

  useEffect(() => { setActiveRoomId(roomParam); }, [roomParam]);

  const { data: rooms = [], isLoading } = useQuery({
    queryKey: ['my-live-rooms', user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('live_rooms')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as LiveRoom[];
    },
  });

  // Fetch the "other participant" + their last message recency for each room.
  // Honest signal: most recent message from the other party (no presence channel yet).
  const roomIds = useMemo(() => rooms.map(r => r.id), [rooms]);

  const { data: participantsByRoom = {} } = useQuery({
    queryKey: ['live-room-others', user?.id, roomIds.join(',')],
    enabled: !!user?.id && roomIds.length > 0,
    queryFn: async () => {
      const { data } = await supabase
        .from('live_room_participants' as any)
        .select('room_id, user_id, display_name')
        .in('room_id', roomIds);
      const map: Record<string, ParticipantRow | undefined> = {};
      ((data || []) as unknown as ParticipantRow[]).forEach(p => {
        if (p.user_id !== user?.id && !map[p.room_id]) map[p.room_id] = p;
      });
      return map;
    },
  });

  const { data: lastSignalByRoom = {} } = useQuery({
    queryKey: ['live-room-last-other-msg', user?.id, roomIds.join(',')],
    enabled: !!user?.id && roomIds.length > 0,
    queryFn: async () => {
      const { data } = await supabase
        .from('live_room_messages' as any)
        .select('room_id, sender_id, created_at')
        .in('room_id', roomIds)
        .neq('sender_id', user!.id)
        .order('created_at', { ascending: false })
        .limit(500);
      const map: Record<string, string> = {};
      ((data || []) as unknown as MessageRow[]).forEach(m => {
        if (!map[m.room_id]) map[m.room_id] = m.created_at;
      });
      return map;
    },
    refetchInterval: 60_000,
  });

  const activeRoom = useMemo(() => rooms.find(r => r.id === activeRoomId) || null, [rooms, activeRoomId]);

  const handleLeave = () => {
    setActiveRoomId(null);
    setSearchParams({});
  };

  if (activeRoomId && activeRoom) {
    return <OneOnOneRoom roomId={activeRoom.id} roomName={activeRoom.name} onLeave={handleLeave} />;
  }

  if (activeRoomId && !isLoading && !activeRoom) {
    return (
      <div className="min-h-screen bg-[#0B1420] flex items-center justify-center p-6 text-[#EAF4F2]">
        <div className="max-w-md w-full rounded-2xl border border-[#1FB6A8]/20 bg-[#123330]/40 p-6">
          <h2 className="text-2xl mb-2" style={{ fontFamily: '"Fraunces", serif', fontWeight: 500 }}>Room not available</h2>
          <p className="text-sm text-[#7E9498] mb-5">You weren't invited to this room, or it's no longer active.</p>
          <Button onClick={handleLeave} className="w-full bg-[#1FB6A8] text-[#0B1420] hover:bg-[#1FB6A8]/90">Back to my rooms</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0B1420] text-[#EAF4F2]">
      <div className="mx-auto max-w-5xl px-4 py-10">
        <PageHeroBanner variant="one_on_one" />
        <div className="mb-10 flex items-end justify-between gap-4">
          <div>
            <Button variant="ghost" size="sm" onClick={() => navigate('/communications-hub')}
              className="mb-3 gap-2 text-[#7E9498] hover:text-[#EAF4F2] hover:bg-transparent px-0">
              <ArrowLeft className="h-4 w-4" /> Back to Go-Live
            </Button>
            <h1 className="text-5xl tracking-tight mb-2" style={{ fontFamily: '"Fraunces", serif', fontWeight: 500 }}>
              1-on-1 Live
            </h1>
            <p className="text-[#7E9498] text-base mb-3">Private rooms you host or were invited to.</p>
            <button
              onClick={() => setExplainerOpen(true)}
              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-medium transition-colors border border-[#FF8A5B]/40 bg-[#FF8A5B]/10 text-[#FF8A5B] hover:bg-[#FF8A5B]/20"
            >
              <PlayCircle className="h-3.5 w-3.5" />
              Watch how it works · 34s
            </button>
          </div>
          <Button onClick={() => setCreateOpen(true)}
            className="gap-2 bg-[#1FB6A8] text-[#0B1420] hover:bg-[#1FB6A8]/90">
            <Plus className="h-4 w-4" /> New room
          </Button>
        </div>

        {isLoading && (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#1FB6A8]"></div>
          </div>
        )}

        {!isLoading && rooms.length === 0 && (
          <div className="rounded-2xl border border-[#1FB6A8]/15 bg-[#123330]/30 p-12 text-center">
            <p className="text-2xl mb-3" style={{ fontFamily: '"Fraunces", serif', fontWeight: 500 }}>No private rooms yet</p>
            <p className="text-[#7E9498] mb-6">Start a private 1-on-1 and invite a tribe member.</p>
            <Button onClick={() => setCreateOpen(true)} className="bg-[#1FB6A8] text-[#0B1420] hover:bg-[#1FB6A8]/90 gap-2"><Plus className="h-4 w-4" /> New room</Button>
          </div>
        )}

        {!isLoading && rooms.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {rooms.map(room => {
              const other = participantsByRoom[room.id];
              const otherName = other?.display_name || 'Tribe member';
              const initial = (otherName[0] || 'T').toUpperCase();
              const auraState = classifyAura(lastSignalByRoom[room.id]);
              const hosting = room.created_by === user?.id;
              return (
                <button
                  key={room.id}
                  onClick={() => setSearchParams({ room: room.id })}
                  className="text-left rounded-2xl border border-[#1FB6A8]/15 bg-[#123330]/40 hover:bg-[#123330]/60 hover:border-[#1FB6A8]/35 transition-all p-5 flex items-center gap-4 group"
                >
                  <PresenceAura state={auraState} size={64}>
                    <div
                      className="w-14 h-14 rounded-full flex items-center justify-center text-xl font-semibold border border-[#1FB6A8]/30"
                      style={{ background: 'linear-gradient(135deg, #123330 0%, #0B1420 100%)', color: '#EAF4F2' }}
                    >
                      {initial}
                    </div>
                  </PresenceAura>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="text-xl truncate" style={{ fontFamily: '"Fraunces", serif', fontWeight: 500 }}>
                        {otherName}
                      </span>
                      <span className="text-[10px] uppercase tracking-wider text-[#7E9498] shrink-0">
                        {hosting ? 'hosting' : 'invited'}
                      </span>
                    </div>
                    <p className="text-sm text-[#7E9498] truncate mt-0.5">{room.name}</p>
                    <p className="text-xs text-[#7E9498]/70 mt-2">
                      {auraState === 'active' ? 'here now' : auraState === 'recent' ? 'recently here' : 'away'}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      <CreateOneOnOneDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={(roomId) => {
          setCreateOpen(false);
          queryClient.invalidateQueries({ queryKey: ['my-live-rooms', user?.id] });
          setSearchParams({ room: roomId });
        }}
      />

      <ExplainerDialog open={explainerOpen} onOpenChange={setExplainerOpen} />
    </div>
  );
}
