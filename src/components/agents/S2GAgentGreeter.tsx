/**
 * S2GAgentGreeter
 * Mounts globally. Listens for new linux_family_activity_log rows for the current user
 * and shows a toast nudging them to open /s2g-agents (e.g. when Gentoo greets them
 * after a Seed is planted).
 */
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';

const SEEN_KEY = 's2g_agent_greeter_seen';

export default function S2GAgentGreeter() {
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel(`s2g-agent-greeter-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'linux_family_activity_log',
          filter: `user_id=eq.${user.id}`,
        },
        (payload: any) => {
          const row = payload.new;
          // Only react to seed-planted greetings or new suggestion creations
          if (!['seed_planted', 'seed_planted_greeting', 'suggestion_created'].includes(row?.activity_type)) return;
          // Dedupe by row id in sessionStorage so we don't spam
          try {
            const seen = JSON.parse(sessionStorage.getItem(SEEN_KEY) || '[]');
            if (seen.includes(row.id)) return;
            sessionStorage.setItem(SEEN_KEY, JSON.stringify([...seen.slice(-50), row.id]));
          } catch {}
          toast({
            title: row.message?.slice(0, 80) || '🐧 Your S2G Agents are working',
            description: 'Open the S2G Agents hub to review and approve their suggestions.',
            action: (
              <button
                onClick={() => navigate('/s2g-agents')}
                className="text-xs font-semibold underline underline-offset-2"
              >
                View →
              </button>
            ) as any,
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, navigate]);

  return null;
}
