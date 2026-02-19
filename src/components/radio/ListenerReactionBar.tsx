import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';

const REACTIONS = [
  { type: 'heart', emoji: '❤️', label: 'Love' },
  { type: 'clap', emoji: '👏', label: 'Clap' },
  { type: 'fire', emoji: '🔥', label: 'Fire' },
  { type: 'pray', emoji: '🙏', label: 'Pray' },
  { type: 'mind_blown', emoji: '🤯', label: 'Mind Blown' },
] as const;

interface FloatingEmoji {
  id: number;
  emoji: string;
  x: number;
}

interface ListenerReactionBarProps {
  sessionId: string;
  segmentIndex?: number;
}

export const ListenerReactionBar: React.FC<ListenerReactionBarProps> = ({
  sessionId,
  segmentIndex,
}) => {
  const { user } = useAuth();
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [floatingEmojis, setFloatingEmojis] = useState<FloatingEmoji[]>([]);
  const [cooldowns, setCooldowns] = useState<Record<string, boolean>>({});
  let emojiIdCounter = 0;

  // Fetch initial counts
  useEffect(() => {
    if (!sessionId) return;

    const fetchCounts = async () => {
      const { data } = await supabase
        .from('radio_reactions')
        .select('reaction_type')
        .eq('session_id', sessionId);

      if (data) {
        const grouped: Record<string, number> = {};
        data.forEach((r: any) => {
          grouped[r.reaction_type] = (grouped[r.reaction_type] || 0) + 1;
        });
        setCounts(grouped);
      }
    };

    fetchCounts();

    // Real-time subscription
    const channel = supabase
      .channel(`reactions-${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'radio_reactions',
          filter: `session_id=eq.${sessionId}`,
        },
        (payload) => {
          const type = (payload.new as any).reaction_type;
          setCounts((prev) => ({ ...prev, [type]: (prev[type] || 0) + 1 }));
          
          // Show floating emoji from other users
          if ((payload.new as any).user_id !== user?.id) {
            addFloatingEmoji(type);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [sessionId, user?.id]);

  const addFloatingEmoji = useCallback((type: string) => {
    const reaction = REACTIONS.find((r) => r.type === type);
    if (!reaction) return;

    const id = Date.now() + Math.random();
    const x = 20 + Math.random() * 60; // random horizontal position 20-80%
    setFloatingEmojis((prev) => [...prev.slice(-15), { id, emoji: reaction.emoji, x }]);

    setTimeout(() => {
      setFloatingEmojis((prev) => prev.filter((e) => e.id !== id));
    }, 2000);
  }, []);

  const sendReaction = async (type: string) => {
    if (!user || !sessionId || cooldowns[type]) return;

    // Cooldown to prevent spam
    setCooldowns((prev) => ({ ...prev, [type]: true }));
    setTimeout(() => setCooldowns((prev) => ({ ...prev, [type]: false })), 800);

    // Optimistic update
    setCounts((prev) => ({ ...prev, [type]: (prev[type] || 0) + 1 }));
    addFloatingEmoji(type);

    // Small confetti burst for mind_blown
    if (type === 'mind_blown') {
      confetti({ particleCount: 30, spread: 50, origin: { y: 0.8 } });
    }

    try {
      await supabase.from('radio_reactions').insert({
        session_id: sessionId,
        user_id: user.id,
        reaction_type: type,
        segment_index: segmentIndex ?? null,
      });

      // Update streak
      await supabase.rpc('update_listener_streak', { p_user_id: user.id });
    } catch (err) {
      console.error('Reaction error:', err);
      // Revert optimistic update
      setCounts((prev) => ({ ...prev, [type]: Math.max(0, (prev[type] || 1) - 1) }));
    }
  };

  return (
    <div className="relative">
      {/* Floating emojis */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden -top-20">
        <AnimatePresence>
          {floatingEmojis.map((fe) => (
            <motion.div
              key={fe.id}
              initial={{ opacity: 1, y: 0, x: `${fe.x}%`, scale: 0.5 }}
              animate={{ opacity: 0, y: -80, scale: 1.3 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1.8, ease: 'easeOut' }}
              className="absolute bottom-0 text-2xl"
            >
              {fe.emoji}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Reaction buttons */}
      <div className="flex items-center justify-center gap-1.5 p-2 rounded-xl bg-card/80 backdrop-blur border shadow-sm">
        {REACTIONS.map((r) => (
          <motion.div key={r.type} whileTap={{ scale: 1.3 }}>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-10 px-2.5 gap-1 text-sm relative"
              onClick={() => sendReaction(r.type)}
              disabled={!user || cooldowns[r.type]}
              title={r.label}
            >
              <span className="text-lg">{r.emoji}</span>
              {(counts[r.type] || 0) > 0 && (
                <span className="text-[10px] font-bold text-muted-foreground min-w-[16px]">
                  {counts[r.type] >= 1000
                    ? `${(counts[r.type]! / 1000).toFixed(1)}k`
                    : counts[r.type]}
                </span>
              )}
            </Button>
          </motion.div>
        ))}
      </div>
    </div>
  );
};
