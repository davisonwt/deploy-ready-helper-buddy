import React, { useMemo } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Radio, GraduationCap, Zap, Dumbbell, Video, Users, Sparkles, Loader2 } from 'lucide-react'
import { MidnightShell, MidnightCard } from '@/components/shell/MidnightShell'
import { useLiveSessions, LiveKind, liveKindLabel } from '@/hooks/useLiveSessions'

const ALL_KINDS: LiveKind[] = ['radio', 'classroom', 'skilldrop', 'training', 'one_on_one', 'community_chat']

const KIND_ICONS: Record<LiveKind, React.ReactNode> = {
  radio: <Radio className="h-4 w-4" />,
  one_on_one: <Video className="h-4 w-4" />,
  community_chat: <Users className="h-4 w-4" />,
  classroom: <GraduationCap className="h-4 w-4" />,
  skilldrop: <Zap className="h-4 w-4" />,
  training: <Dumbbell className="h-4 w-4" />,
}

export default function LiveLoungePage() {
  const [params, setParams] = useSearchParams()
  const navigate = useNavigate()
  const kindParam = params.get('kind') as LiveKind | null
  const activeKind = ALL_KINDS.includes(kindParam as LiveKind) ? (kindParam as LiveKind) : null

  const { sessions, all, byKind, total, loading, refresh } = useLiveSessions(activeKind)

  const setKind = (k: LiveKind | null) => {
    const next = new URLSearchParams(params)
    if (k) next.set('kind', k)
    else next.delete('kind')
    setParams(next, { replace: true })
  }

  const grouped = useMemo(() => {
    const map = new Map<LiveKind, typeof sessions>()
    sessions.forEach((s) => {
      const arr = map.get(s.kind) || []
      arr.push(s)
      map.set(s.kind, arr)
    })
    return map
  }, [sessions])

  return (
    <MidnightShell
      title="Live Lounge"
      subtitle="Step into any tribe session that's happening right now."
      icon={<Sparkles className="h-6 w-6" />}
      rightSlot={
        <Link
          to="/communications-hub"
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-amber-500/15 border border-amber-400/40 text-amber-200 hover:bg-amber-500/25"
        >
          Go Live →
        </Link>
      }
    >
      {/* Filter chips */}
      <div className="flex items-center gap-2 flex-wrap">
        <button
          onClick={() => setKind(null)}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition ${
            !activeKind
              ? 'bg-cyan-500/20 border-cyan-400/50 text-cyan-100'
              : 'bg-white/[0.03] border-white/10 text-slate-300 hover:bg-white/[0.06]'
          }`}
        >
          All Live · {total}
        </button>
        {ALL_KINDS.map((k) => {
          const c = byKind[k] || 0
          const active = activeKind === k
          return (
            <button
              key={k}
              onClick={() => setKind(k)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition ${
                active
                  ? 'bg-cyan-500/20 border-cyan-400/50 text-cyan-100'
                  : c > 0
                  ? 'bg-white/[0.04] border-white/10 text-slate-200 hover:bg-white/[0.08]'
                  : 'bg-white/[0.02] border-white/5 text-slate-500 hover:bg-white/[0.05]'
              }`}
            >
              {KIND_ICONS[k]}
              {liveKindLabel(k)}
              {c > 0 && <span className="text-cyan-300">{c}</span>}
            </button>
          )
        })}
        <button
          onClick={refresh}
          className="ml-auto text-xs text-slate-400 hover:text-cyan-200 underline-offset-2 hover:underline"
        >
          Refresh
        </button>
      </div>

      {/* Sessions */}
      {loading && all.length === 0 ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-cyan-300" />
        </div>
      ) : sessions.length === 0 ? (
        <MidnightCard accent="amber">
          <div className="text-center py-10">
            <div className="text-4xl mb-3">🔇</div>
            <h3 className="text-lg font-bold text-white">
              {activeKind
                ? `No live ${liveKindLabel(activeKind).toLowerCase()} sessions`
                : 'No tribe members are live right now'}
            </h3>
            <p className="text-slate-400 mt-1 mb-5 text-sm">
              Be the first to fire one up — your tribe will see it instantly.
            </p>
            <Link
              to="/communications-hub"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold bg-cyan-500/20 border border-cyan-400/50 text-cyan-100 hover:bg-cyan-500/30"
            >
              Go Live →
            </Link>
          </div>
        </MidnightCard>
      ) : activeKind ? (
        <div className="grid sm:grid-cols-2 gap-3">
          {sessions.map((s) => (
            <SessionCard key={s.id} s={s} onJoin={() => navigate(s.joinPath)} />
          ))}
        </div>
      ) : (
        <div className="space-y-6">
          {ALL_KINDS.filter((k) => (grouped.get(k) || []).length > 0).map((k) => (
            <section key={k}>
              <div className="flex items-center gap-2 mb-2 text-cyan-200/90">
                {KIND_ICONS[k]}
                <h2 className="text-sm font-bold uppercase tracking-wider">
                  {liveKindLabel(k)} <span className="text-slate-500">· {grouped.get(k)!.length}</span>
                </h2>
              </div>
              <div className="grid sm:grid-cols-2 gap-3">
                {grouped.get(k)!.map((s) => (
                  <SessionCard key={s.id} s={s} onJoin={() => navigate(s.joinPath)} />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </MidnightShell>
  )
}

function SessionCard({ s, onJoin }: { s: ReturnType<typeof useLiveSessions>['sessions'][number]; onJoin: () => void }) {
  return (
    <div className="rounded-2xl border border-cyan-400/15 bg-[#0f172a]/80 backdrop-blur p-4 flex flex-col gap-3 hover:border-cyan-400/40 transition">
      <div className="flex items-start gap-3">
        <div className="h-11 w-11 rounded-full bg-cyan-500/15 border border-cyan-400/30 flex items-center justify-center overflow-hidden flex-shrink-0">
          {s.hostAvatar ? (
            <img src={s.hostAvatar} alt={s.hostName} className="h-full w-full object-cover" />
          ) : (
            <span className="text-cyan-200 font-bold">{s.hostName.charAt(0)}</span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-rose-300">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-rose-500" />
              </span>
              LIVE
            </span>
            <span className="text-[10px] font-semibold uppercase tracking-wider text-cyan-300">
              {liveKindLabel(s.kind)}
            </span>
            {s.count > 0 && (
              <span className="text-[10px] text-slate-400">· {s.count} in</span>
            )}
          </div>
          <h3 className="text-white font-bold mt-1 truncate">{s.title}</h3>
          <p className="text-xs text-slate-400 truncate">{s.hostName}</p>
        </div>
      </div>
      {s.description && (
        <p className="text-xs text-slate-300/80 line-clamp-2">{s.description}</p>
      )}
      <button
        onClick={onJoin}
        className="mt-auto w-full py-2 rounded-xl font-bold text-sm bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-400/40 text-cyan-100 transition"
      >
        Join →
      </button>
    </div>
  )
}
