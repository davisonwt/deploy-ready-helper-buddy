/**
 * LiveStageOverlay — the full-screen "Go Live" overlay used everywhere a tribe
 * member starts/joins a live seed (LivingSeedCard, /orchard-alive, dashboard).
 *
 * Layout:
 *   ┌────────────────── header (live · title · faceless · open seed · close) ──────────────────┐
 *   │ LEFT: <LiveStage … />                  │  RIGHT: seed media (carousel + audio/video)    │
 *   │                                        │         + live chat                            │
 *   └─────────────────────────────────────────────────────────────────────────────────────────┘
 *
 * Built on the existing LiveStage + Supabase realtime broadcast (`liveroom:${seedId}`).
 * No new DB tables.
 */
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  X, MessageCircle, ChevronLeft, ChevronRight, EyeOff, Eye, Send,
} from 'lucide-react';
import LiveStage from '@/components/live/LiveStage';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

export interface LiveStageOverlayProps {
  seedId: string;
  title: string;
  subtitle?: string;
  jitsiRoom: string;
  isHost: boolean;
  isRadio?: boolean;
  sowerUserId?: string | null;
  images?: string[];
  mediaUrl?: string | null;
  mediaKind?: 'audio' | 'video' | 'book' | 'orchard' | 'seed';
  whispererSharePct?: number;
  /** Path the "Open seed" header button navigates to. If omitted the button is hidden. */
  openPath?: string;
  /** Called when the user closes the overlay. Caller decides whether to also endLive(). */
  onClose: () => void;
}

export default function LiveStageOverlay({
  seedId, title, subtitle, jitsiRoom, isHost,
  isRadio = false, sowerUserId,
  images = [], mediaUrl, mediaKind,
  whispererSharePct = 10,
  openPath,
  onClose,
}: LiveStageOverlayProps) {
  const navigate = useNavigate();
  const { user } = useAuth();

  const imgList = (images || []).filter(Boolean) as string[];
  const [overlayImgIdx, setOverlayImgIdx] = useState(0);
  const [faceless, setFaceless] = useState(false);
  const [chatMsgs, setChatMsgs] = useState<Array<{ id: string; from: string; text: string; at: number }>>([]);
  const [chatDraft, setChatDraft] = useState('');

  // Live-room chat (Supabase realtime broadcast)
  useEffect(() => {
    const ch = supabase.channel(`liveroom:${seedId}`);
    ch.on('broadcast', { event: 'chat' }, ({ payload }) => {
      setChatMsgs(m => [...m.slice(-99), payload as any]);
    }).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [seedId]);

  const sendChat = () => {
    const text = chatDraft.trim();
    if (!text) return;
    const msg = {
      id: Math.random().toString(36).slice(2),
      from: (user as any)?.user_metadata?.display_name || user?.email?.split('@')[0] || 'Guest',
      text,
      at: Date.now(),
    };
    supabase.channel(`liveroom:${seedId}`).send({ type: 'broadcast', event: 'chat', payload: msg });
    setChatMsgs(m => [...m.slice(-99), msg]);
    setChatDraft('');
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[1000] flex flex-col bg-black"
    >
      <div className="flex items-center justify-between border-b border-emerald-500/20 bg-emerald-950/60 px-4 py-2 text-white">
        <div className="flex items-center gap-2 text-sm">
          <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-rose-400" />
          Live: <span className="font-semibold">{title}</span>
          <span className="ml-2 rounded-full border border-amber-400/30 bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold text-amber-300">
            🎤 {isHost ? 'You are hosting' : `Whisperer earns ${whispererSharePct}%`}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setFaceless(f => !f)}
            className="flex items-center gap-1 rounded px-2 py-1 text-xs hover:bg-white/10"
            title="Hide face — guests see the seed image instead"
          >
            {faceless ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
            {faceless ? 'Show face' : 'Faceless'}
          </button>
          {openPath && (
            <button
              onClick={() => navigate(openPath)}
              className="flex items-center gap-1 rounded px-2 py-1 text-xs hover:bg-white/10"
            >
              <MessageCircle className="h-3 w-3" /> Open seed
            </button>
          )}
          <button
            onClick={onClose}
            className="flex items-center gap-1 rounded px-2 py-1 text-xs hover:bg-white/10"
          >
            <X className="h-3 w-3" /> Close
          </button>
        </div>
      </div>

      <div className="flex flex-1 min-h-0 flex-col md:flex-row">
        {/* LEFT: Stage */}
        <div className="relative flex-1 min-h-[40vh] bg-black">
          <LiveStage
            seedId={seedId}
            title={title}
            jitsiRoom={jitsiRoom}
            isHost={isHost}
            isRadio={isRadio}
            sowerUserId={sowerUserId ?? null}
            whispererSharePct={whispererSharePct}
            images={imgList}
            mediaUrl={mediaUrl ?? null}
            mediaKind={mediaKind}
          />
        </div>

        {/* RIGHT: seed media + chat */}
        <div className="flex w-full md:w-[360px] flex-col border-l border-white/5 bg-[#0a0f1a] text-white">
          <div className="border-b border-white/5 p-3">
            <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-400">🌱 Seed Media</div>
            <div className="mt-1 truncate text-sm font-bold">{title}</div>
            {subtitle && <div className="mt-0.5 line-clamp-2 text-xs text-white/60">{subtitle}</div>}
          </div>

          {/* Image carousel */}
          {imgList.length > 0 && (
            <div className="relative h-44 bg-black">
              <img
                key={imgList[overlayImgIdx % imgList.length]}
                src={imgList[overlayImgIdx % imgList.length]}
                alt=""
                className="h-full w-full object-contain"
              />
              {imgList.length > 1 && (
                <>
                  <button
                    aria-label="Previous"
                    onClick={() => setOverlayImgIdx(i => (i - 1 + imgList.length) % imgList.length)}
                    className="absolute left-2 top-1/2 -translate-y-1/2 flex h-7 w-7 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/85"
                  ><ChevronLeft className="h-4 w-4" /></button>
                  <button
                    aria-label="Next"
                    onClick={() => setOverlayImgIdx(i => (i + 1) % imgList.length)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 flex h-7 w-7 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/85"
                  ><ChevronRight className="h-4 w-4" /></button>
                  <div className="absolute bottom-1 left-1/2 -translate-x-1/2 rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-bold">
                    {(overlayImgIdx % imgList.length) + 1}/{imgList.length}
                  </div>
                </>
              )}
            </div>
          )}

          {/* Inline media */}
          {mediaUrl && mediaKind === 'video' && (
            <video src={mediaUrl} controls className="w-full bg-black" />
          )}
          {mediaUrl && mediaKind === 'audio' && (
            <audio src={mediaUrl} controls className="w-full p-2" />
          )}

          {/* Chat */}
          <div className="flex flex-1 min-h-0 flex-col">
            <div className="border-b border-t border-white/5 bg-black/30 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-emerald-400">
              💬 Live Chat
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
              {chatMsgs.length === 0 && (
                <div className="p-3 text-center text-xs text-white/40 italic">
                  Be the first to say hello.
                </div>
              )}
              {chatMsgs.map(m => (
                <div key={m.id} className="rounded-lg bg-white/5 px-2 py-1.5 text-xs">
                  <div className="font-bold text-emerald-300">{m.from}</div>
                  <div className="text-white/85">{m.text}</div>
                </div>
              ))}
            </div>
            <form
              onSubmit={(e) => { e.preventDefault(); sendChat(); }}
              className="flex gap-1.5 border-t border-white/5 p-2"
            >
              <input
                value={chatDraft}
                onChange={(e) => setChatDraft(e.target.value)}
                placeholder="Ask the host…"
                className="flex-1 rounded-md border border-white/10 bg-black/40 px-2 py-1.5 text-xs text-white placeholder:text-white/40 focus:border-emerald-400/60 focus:outline-none"
              />
              <button
                type="submit"
                className="flex h-8 w-8 items-center justify-center rounded-md bg-emerald-500 text-black hover:bg-emerald-400"
                aria-label="Send"
              >
                <Send className="h-3.5 w-3.5" />
              </button>
            </form>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
