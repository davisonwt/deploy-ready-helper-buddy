import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, BookOpen, Dumbbell, MessageCircle, Radio, Users, Video, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';

type LaunchKind = 'one_on_one' | 'community_chat' | 'classroom' | 'skilldrop' | 'training' | 'radio';

const LAUNCH_TYPES: Array<{ id: LaunchKind; label: string; icon: React.ReactNode; deepLink: string }> = [
  { id: 'one_on_one',     label: '1-on-1 Live',     icon: <Video className="h-5 w-5" />,    deepLink: '/live-rooms' },
  { id: 'community_chat', label: 'Community Chat',  icon: <Users className="h-5 w-5" />,    deepLink: '/community-chats' },
  { id: 'classroom',      label: 'Classroom',       icon: <BookOpen className="h-5 w-5" />, deepLink: '/classroom' },
  { id: 'skilldrop',      label: 'SkillDrop',       icon: <Zap className="h-5 w-5" />,      deepLink: '/skilldrop' },
  { id: 'training',       label: 'Training',        icon: <Dumbbell className="h-5 w-5" />, deepLink: '/premium-rooms' },
  { id: 'radio',          label: 'Radio',           icon: <Radio className="h-5 w-5" />,    deepLink: '/radio' },
];

export default function CommunicationsHub() {
  const navigate = useNavigate();

  return (
    <main className="min-h-screen text-slate-100 relative" style={{ background: 'linear-gradient(180deg, #0a0f1a 0%, #060a12 100%)' }}>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_20%,rgba(56,189,248,0.18),transparent_55%),radial-gradient(circle_at_85%_30%,rgba(236,72,153,0.16),transparent_55%),radial-gradient(circle_at_50%_90%,rgba(168,85,247,0.18),transparent_55%)] pointer-events-none" />
      <div className="relative mx-auto max-w-3xl px-4 py-5">
        <Button variant="ghost" onClick={() => navigate('/dashboard')} className="mb-4 gap-2 text-cyan-300 hover:text-cyan-200 hover:bg-cyan-500/10">
          <ArrowLeft className="h-4 w-4" /> Go Back
        </Button>

        <div className="rounded-2xl border border-cyan-400/25 bg-[#0f172a]/80 backdrop-blur p-5 shadow-[0_0_40px_rgba(34,211,238,0.10)]">
          <div className="mb-5 flex items-center gap-3">
            <MessageCircle className="h-7 w-7 text-cyan-300" />
            <h1 className="text-2xl font-black text-white">ChatApp Go-Live</h1>
          </div>
          <p className="mb-5 text-sm text-slate-300/80">Pick a section — each one opens its own page where you can browse, host, or create.</p>

          <div className="grid gap-3">
            {LAUNCH_TYPES.map((t, idx) => {
              const accents = [
                { glow: 'shadow-[0_0_25px_rgba(34,211,238,0.35)]',  bg: 'from-cyan-500/15 to-cyan-500/5',     icon: 'text-cyan-300',    border: 'border-cyan-400/30' },
                { glow: 'shadow-[0_0_25px_rgba(16,185,129,0.35)]',  bg: 'from-emerald-500/15 to-emerald-500/5', icon: 'text-emerald-300', border: 'border-emerald-400/30' },
                { glow: 'shadow-[0_0_25px_rgba(139,92,246,0.35)]',  bg: 'from-violet-500/15 to-violet-500/5',   icon: 'text-violet-300',  border: 'border-violet-400/30' },
                { glow: 'shadow-[0_0_25px_rgba(245,158,11,0.35)]',  bg: 'from-amber-500/15 to-amber-500/5',     icon: 'text-amber-300',   border: 'border-amber-400/30' },
                { glow: 'shadow-[0_0_25px_rgba(244,114,182,0.35)]', bg: 'from-rose-500/15 to-rose-500/5',       icon: 'text-rose-300',    border: 'border-rose-400/30' },
                { glow: 'shadow-[0_0_25px_rgba(56,189,248,0.35)]',  bg: 'from-sky-500/15 to-sky-500/5',         icon: 'text-sky-300',     border: 'border-sky-400/30' },
              ];
              const a = accents[idx % accents.length];
              return (
                <motion.button
                  key={t.id}
                  onClick={() => navigate(t.deepLink)}
                  whileHover={{ y: -2 }}
                  whileTap={{ scale: 0.97 }}
                  className={`flex items-center justify-between rounded-xl border ${a.border} bg-gradient-to-br ${a.bg} backdrop-blur px-4 py-3 text-left font-bold text-white transition-all hover:${a.glow}`}
                >
                  <span className="flex items-center gap-3">
                    <span className={a.icon}>{t.icon}</span>
                    {t.label}
                  </span>
                  <span className="text-xs text-slate-400">Open →</span>
                </motion.button>
              );
            })}
          </div>
        </div>
      </div>
    </main>
  );
}
