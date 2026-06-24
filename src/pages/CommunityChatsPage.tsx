import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import PublicRoomsBrowser from '@/components/chat/PublicRoomsBrowser';
import PageHeroBanner from '@/components/chat/PageHeroBanner';

export default function CommunityChatsPage() {
  const navigate = useNavigate();

  return (
    <main
      className="min-h-screen text-slate-100 relative"
      style={{ background: 'linear-gradient(180deg, #0a0f1a 0%, #060a12 100%)' }}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_20%,rgba(56,189,248,0.18),transparent_55%),radial-gradient(circle_at_85%_30%,rgba(168,85,247,0.18),transparent_55%)] pointer-events-none" />
      <div className="relative mx-auto max-w-5xl px-4 py-5">
        <PageHeroBanner variant="community" />
        <div className="flex items-center justify-between mb-4">
          <Button
            variant="ghost"
            onClick={() => navigate(-1)}
            className="gap-2 text-cyan-300 hover:text-cyan-200 hover:bg-cyan-500/10"
          >
            <ArrowLeft className="h-4 w-4" /> Go Back
          </Button>
          <Button
            onClick={() => navigate('/create-premium-room')}
            className="gap-2 bg-emerald-500/80 hover:bg-emerald-500 text-white font-semibold"
          >
            <Plus className="h-4 w-4" /> Open New Room
          </Button>
        </div>

        <div className="rounded-2xl border border-cyan-400/25 bg-[#0f172a]/80 backdrop-blur p-5 shadow-[0_0_40px_rgba(34,211,238,0.10)]">
          <div className="mb-5 flex items-center gap-3">
            <Users className="h-7 w-7 text-cyan-300" />
            <h1 className="text-2xl font-black text-white">Community Chats</h1>
          </div>
          <p className="mb-5 text-sm text-slate-300/80">
            Browse already created rooms — view, request to join, or open a brand new room of your own.
          </p>

          <PublicRoomsBrowser
            onJoinRoom={(room: { id: string; is_premium?: boolean }) => {
              if (room.is_premium) {
                navigate(`/premium-room/${room.id}`);
              } else {
                navigate(`/chatapp?room=${room.id}`);
              }
            }}
            onNavigateToOrchard={(orchardId: string) => navigate(`/orchard/${orchardId}`)}
          />
        </div>
      </div>
    </main>
  );
}
