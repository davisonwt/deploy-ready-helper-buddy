import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Users, PlayCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import PublicRoomsBrowser from '@/components/chat/PublicRoomsBrowser';
import PageHeroBanner from '@/components/chat/PageHeroBanner';
import ExplainerDialog from '@/components/explainers/ExplainerDialog';


export default function CommunityChatsPage() {
  const navigate = useNavigate();
  const [explainerOpen, setExplainerOpen] = useState(false);



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
          <div className="mb-3 flex items-center gap-3">
            <Users className="h-7 w-7 text-cyan-300" />
            <h1 className="text-2xl font-black text-white">Community Chats</h1>
          </div>
          <p className="mb-3 text-sm text-slate-300/80">
            Browse already created rooms — view, request to join, or open a brand new room of your own.
          </p>
          <button
            onClick={() => setExplainerOpen(true)}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-medium transition-colors border border-amber-400/40 bg-amber-400/10 text-amber-300 hover:bg-amber-400/20 mb-5"
          >
            <PlayCircle className="h-3.5 w-3.5" />
            Watch how it works · 35s
          </button>


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
      <ExplainerDialog open={explainerOpen} onOpenChange={setExplainerOpen} variant="community" />
    </main>
  );
}

