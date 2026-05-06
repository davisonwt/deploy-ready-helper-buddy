import React from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Radio, GraduationCap, Zap, Dumbbell, Video, Users, ChevronRight } from 'lucide-react'
import { useLiveSessions, LiveKind, liveKindLabel } from '@/hooks/useLiveSessions'

const KIND_ICONS: Record<LiveKind, React.ReactNode> = {
  radio: <Radio className="h-3.5 w-3.5" />,
  one_on_one: <Video className="h-3.5 w-3.5" />,
  community_chat: <Users className="h-3.5 w-3.5" />,
  classroom: <GraduationCap className="h-3.5 w-3.5" />,
  skilldrop: <Zap className="h-3.5 w-3.5" />,
  training: <Dumbbell className="h-3.5 w-3.5" />,
}

const ORDER: LiveKind[] = ['radio', 'classroom', 'skilldrop', 'training', 'one_on_one', 'community_chat']

export function LiveNowStrip() {
  const navigate = useNavigate()
  const { all, total, byKind, loading } = useLiveSessions()
  const top = all[0]

  return (
    <div
      className="w-full border-b border-cyan-400/15"
      style={{ background: 'linear-gradient(180deg, rgba(10,15,26,0.92) 0%, rgba(6,10,18,0.85) 100%)', backdropFilter: 'blur(8px)' }}
    >
      <div className="max-w-5xl mx-auto px-3 py-2 flex items-center gap-2 flex-wrap">
        <Link
          to="/live-lounge"
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-500/15 border border-rose-400/40 text-rose-200 text-[11px] font-bold"
        >
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500" />
          </span>
          LIVE NOW · {loading ? '…' : total}
        </Link>

        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          {ORDER.map((k) => {
            const c = byKind[k] || 0
            return (
              <button
                key={k}
                onClick={() => navigate(`/live-lounge?kind=${k}`)}
                className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-semibold border transition whitespace-nowrap ${
                  c > 0
                    ? 'bg-cyan-500/15 border-cyan-400/40 text-cyan-100 hover:bg-cyan-500/25'
                    : 'bg-white/[0.03] border-white/10 text-slate-400 hover:bg-white/[0.06]'
                }`}
              >
                {KIND_ICONS[k]}
                {liveKindLabel(k)}
                {c > 0 && <span className="ml-0.5 text-cyan-300">{c}</span>}
              </button>
            )
          })}
        </div>

        <Link
          to="/live-lounge"
          className="ml-auto inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-500/15 border border-amber-400/40 text-amber-200 text-[11px] font-bold hover:bg-amber-500/25"
        >
          Open Lounge <ChevronRight className="h-3 w-3" />
        </Link>
      </div>

      {total > 0 && top && (
        <button
          onClick={() => navigate(top.joinPath)}
          className="w-full max-w-5xl mx-auto px-3 pb-2 -mt-0.5 flex items-center gap-2 text-left text-[11px] text-slate-300 hover:text-white truncate"
        >
          <span className="text-rose-300">●</span>
          <span className="font-semibold text-slate-100 truncate">{top.title}</span>
          <span className="text-slate-500">·</span>
          <span className="truncate">{top.hostName}</span>
          <span className="text-slate-500">·</span>
          <span className="text-cyan-300">{liveKindLabel(top.kind)}</span>
          {top.count > 0 && (
            <>
              <span className="text-slate-500">·</span>
              <span>{top.count} listening</span>
            </>
          )}
        </button>
      )}

      {!loading && total === 0 && (
        <Link
          to="/communications-hub"
          className="block w-full max-w-5xl mx-auto px-3 pb-2 -mt-0.5 text-[11px] text-slate-400 hover:text-cyan-200"
        >
          No tribe members live right now — <span className="text-amber-300 font-semibold">Go Live →</span>
        </Link>
      )}
    </div>
  )
}
