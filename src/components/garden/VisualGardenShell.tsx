import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useTribalScore, TIER_META, type TribalTier } from '@/hooks/useTribalScore';
import { Sprout, TreePine, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';

interface SeedTile {
  id: string;
  title: string;
  health: number;     // 0-100
  growth: number;     // 0-100
  bestowals: number;
  emoji: string;
}

const STAGES = ['🌱', '🌿', '🪴', '🌳', '🌳✨'];

function stageEmoji(growth: number): string {
  if (growth < 20) return STAGES[0];
  if (growth < 40) return STAGES[1];
  if (growth < 60) return STAGES[2];
  if (growth < 85) return STAGES[3];
  return STAGES[4];
}

export const VisualGardenShell: React.FC<{ compact?: boolean }> = ({ compact = false }) => {
  const { user } = useAuth();
  const { score } = useTribalScore();
  const [tiles, setTiles] = useState<SeedTile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    let active = true;
    (async () => {
      const { data: orchards } = await supabase
        .from('orchards')
        .select('id, title, total_pockets, sold_pockets, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(compact ? 6 : 24);

      if (!active || !orchards) return;

      const built: SeedTile[] = orchards.map((o: any) => {
        const sold = o.sold_pockets ?? 0;
        const total = Math.max(1, o.total_pockets ?? 100);
        const growth = Math.min(100, Math.round((sold / total) * 100));
        const ageDays = Math.max(1, Math.floor((Date.now() - new Date(o.created_at).getTime()) / 86400000));
        const health = Math.max(20, 100 - Math.min(80, ageDays * 2 - growth));
        return {
          id: o.id,
          title: o.title || 'Unnamed Seed',
          health,
          growth,
          bestowals: sold,
          emoji: stageEmoji(growth),
        };
      });
      setTiles(built);
      setLoading(false);
    })();
    return () => { active = false; };
  }, [user, compact]);

  const tier: TribalTier = (score?.tier as TribalTier) ?? 'seedling';
  const tierMeta = TIER_META[tier];

  return (
    <div className="rounded-3xl overflow-hidden shadow-xl border border-emerald-200/30 bg-gradient-to-br from-emerald-950 via-green-900 to-teal-900 p-5 relative">
      {/* Sky glow */}
      <div
        className="absolute inset-x-0 top-0 h-24 opacity-40 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse at 50% 0%, rgba(255,255,255,0.5), transparent 70%)' }}
      />
      {/* Header */}
      <div className="flex items-center justify-between mb-4 relative z-10">
        <div className="flex items-center gap-2">
          <Sprout className="w-5 h-5 text-emerald-300" />
          <h3 className="text-white font-bold tracking-tight">Your Living Garden</h3>
        </div>
        <div className={`text-xs px-2.5 py-1 rounded-full bg-gradient-to-r ${tierMeta.gradient} text-white font-bold shadow`}>
          {tierMeta.emoji} {tierMeta.label} · {score?.score ?? 0}
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-3 gap-3 relative z-10">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="aspect-square rounded-2xl bg-emerald-800/30 animate-pulse" />
          ))}
        </div>
      ) : tiles.length === 0 ? (
        <div className="text-center py-10 relative z-10">
          <div className="text-5xl mb-2">🌰</div>
          <p className="text-emerald-100/80 text-sm mb-3">Your garden is bare. Plant your first Seed to begin.</p>
          <Link
            to="/create-orchard"
            className="inline-flex items-center gap-1 px-4 py-2 rounded-full bg-emerald-400 text-emerald-950 font-semibold text-sm hover:bg-emerald-300 transition"
          >
            <Sparkles className="w-4 h-4" /> Plant a Seed
          </Link>
        </div>
      ) : (
        <div className={`grid ${compact ? 'grid-cols-3' : 'grid-cols-4 sm:grid-cols-6'} gap-3 relative z-10`}>
          {tiles.map((t, i) => (
            <motion.div
              key={t.id}
              initial={{ scale: 0.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: i * 0.04, type: 'spring', stiffness: 220, damping: 18 }}
              className="aspect-square rounded-2xl bg-gradient-to-b from-emerald-800/50 to-emerald-950/70 border border-emerald-400/20 p-2 flex flex-col items-center justify-between text-center cursor-pointer hover:scale-105 transition-transform"
              title={`${t.title} · ${t.bestowals} bestowals · ${t.growth}% grown`}
            >
              <div className="text-3xl mt-1 drop-shadow-lg" style={{ filter: `saturate(${0.6 + t.health/200})` }}>
                {t.emoji}
              </div>
              <div className="w-full">
                <p className="text-[9px] text-white/90 font-medium truncate leading-tight">{t.title}</p>
                <div className="h-1 w-full bg-emerald-950/70 rounded-full overflow-hidden mt-1">
                  <div
                    className="h-full bg-gradient-to-r from-amber-300 to-emerald-300"
                    style={{ width: `${t.growth}%` }}
                  />
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Soil base */}
      <div className="absolute inset-x-0 bottom-0 h-3 bg-gradient-to-t from-amber-900/60 to-transparent pointer-events-none" />
    </div>
  );
};
