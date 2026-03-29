import React, { useEffect, useMemo, useState } from 'react';
import { Radio, Clock, ChevronRight, Music, Headphones } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { DashboardTheme } from '@/utils/dashboardThemes';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { LiveBadge, UpcomingBadge, CherryReactionButton } from '@/components/chat/SparkleEffects';
import { format } from 'date-fns';

interface RadioSectionProps {
  theme: DashboardTheme;
}

interface RadioSlot {
  id: string;
  time_slot_date: string;
  start_time: string;
  end_time: string;
  hour_slot: number;
  status: string | null;
  approval_status: string | null;
  show_subject: string | null;
  show_notes: string | null;
  show_topic_description: string | null;
  broadcast_mode: string;
  dj_id: string | null;
  radio_djs: {
    dj_name: string;
    user_id: string;
    avatar_url: string | null;
  } | null;
}

type DisplayRadioSlot = RadioSlot & {
  isAlwaysOn?: boolean;
};

const ALWAYS_ON_SESSION_MATCHERS = [
  '364yhvh / s2g community member',
  'path of refinement: from wisdom to understanding to knowledge',
];

const normalizeText = (value: string | null | undefined) => (value || '').toLowerCase().replace(/\s+/g, ' ').trim();

const isAlwaysOnSession = (slot: RadioSlot) => {
  const subject = normalizeText(slot.show_subject);
  const notes = normalizeText(slot.show_notes);
  return ALWAYS_ON_SESSION_MATCHERS.some(
    (matcher) => subject.includes(matcher) || notes.includes(matcher)
  );
};

function parsePlaylistDescription(raw: string): string[] | null {
  try {
    const trimmed = raw.trim();
    if (!trimmed.startsWith('[')) return null;
    const parsed = JSON.parse(trimmed);
    if (!Array.isArray(parsed)) return null;
    return parsed
      .filter((t: any) => t.contentName || t.title)
      .map((t: any) => t.contentName || t.title);
  } catch {
    const titles: string[] = [];
    const regex = /"(?:contentName|title)"\s*:\s*"([^"]+)"/g;
    let match: RegExpExecArray | null;
    while ((match = regex.exec(raw)) !== null) {
      if (!titles.includes(match[1])) titles.push(match[1]);
    }
    return titles.length > 0 ? titles : null;
  }
}

export const RadioSection: React.FC<RadioSectionProps> = ({ theme }) => {
  const [slots, setSlots] = useState<RadioSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchSlots = async () => {
      const { data } = await supabase
        .from('radio_schedule')
        .select('*, radio_djs(dj_name, user_id, avatar_url)')
        .eq('approval_status', 'approved')
        .order('created_at', { ascending: false })
        .limit(60);

      setSlots((data as RadioSlot[]) || []);
      setLoading(false);
    };

    fetchSlots();
  }, []);

  const displaySlots = useMemo<DisplayRadioSlot[]>(() => {
    const now = new Date();

    const alwaysOnSessions: DisplayRadioSlot[] = ALWAYS_ON_SESSION_MATCHERS.flatMap((matcher) => {
      const found = slots.find((slot) => {
        const subject = normalizeText(slot.show_subject);
        const notes = normalizeText(slot.show_notes);
        return subject.includes(matcher) || notes.includes(matcher);
      });

      return found ? [{ ...found, isAlwaysOn: true }] : [];
    });

    const dynamicActiveSessions: DisplayRadioSlot[] = slots
      .filter((slot) => !isAlwaysOnSession(slot))
      .filter((slot) => {
        if (slot.status === 'live') return true;
        const end = new Date(slot.end_time);
        return !Number.isNaN(end.getTime()) && end >= now;
      })
      .map((slot) => ({ ...slot }));

    return [...alwaysOnSessions, ...dynamicActiveSessions].slice(0, 6);
  }, [slots]);

  const handleJoin = (slot: DisplayRadioSlot) => {
    navigate(`/grove-station?schedule=${slot.id}`);
  };

  const formatTime = (start: string, end: string) => {
    try {
      return `${format(new Date(start), 'HH:mm')} – ${format(new Date(end), 'HH:mm')}`;
    } catch {
      return 'Any time';
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg" style={{ background: theme.secondaryButton }}>
            <Radio className="w-4 h-4" style={{ color: theme.accent }} />
          </div>
          <h2 className="text-base font-bold" style={{ color: theme.textPrimary }}>
            Grove Station Radio
          </h2>
        </div>
        <Link to="/grove-station" className="text-[11px] font-semibold flex items-center gap-0.5" style={{ color: theme.accent }}>
          See All <ChevronRight className="w-3 h-3" />
        </Link>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <div className="w-5 h-5 border-2 rounded-full animate-spin" style={{ borderColor: theme.accent, borderTopColor: 'transparent' }} />
        </div>
      ) : displaySlots.length === 0 ? (
        <div
          className="rounded-xl p-6 text-center border"
          style={{ background: theme.cardBg, borderColor: theme.cardBorder }}
        >
          <Radio className="w-8 h-8 mx-auto mb-2 text-muted-foreground/50" />
          <p className="text-xs font-medium" style={{ color: theme.textSecondary }}>No active sessions right now</p>
          <Button
            size="sm"
            className="mt-3 text-xs h-7 rounded-full"
            style={{ background: theme.primaryButton, color: theme.textPrimary }}
            onClick={() => navigate('/grove-station')}
          >
            <Headphones className="w-3 h-3 mr-1" /> Browse Station
          </Button>
        </div>
      ) : (
        <div className="space-y-2.5">
          {displaySlots.map((slot, i) => {
            const isLive = slot.isAlwaysOn || slot.status === 'live';
            const slotDate = new Date(slot.time_slot_date);

            let tracks: string[] | null = null;
            if (slot.show_topic_description) {
              tracks = parsePlaylistDescription(slot.show_topic_description);
            }
            const displayTracks = tracks?.slice(0, 3) || [];
            const remaining = tracks ? tracks.length - displayTracks.length : 0;

            return (
              <motion.div
                key={slot.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06, type: 'spring', stiffness: 200, damping: 25 }}
                className="rounded-xl border overflow-hidden cursor-pointer hover:scale-[1.01] transition-transform"
                style={{
                  background: theme.cardBg,
                  borderColor: isLive ? 'hsl(var(--destructive) / 0.45)' : theme.cardBorder,
                  boxShadow: `0 6px 16px ${theme.shadow}`,
                }}
                onClick={() => handleJoin(slot)}
              >
                {/* Radio studio banner */}
                <div className="relative h-[60px] overflow-hidden">
                  <img src="/images/radio/radio-studio.jpg" alt="Radio studio" className="absolute inset-0 w-full h-full object-cover" loading="lazy" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                  {isLive && (
                    <div className="absolute top-1.5 left-1.5 flex items-center gap-1 bg-red-600/90 backdrop-blur-sm px-1.5 py-0.5 rounded-full">
                      <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                      <span className="text-[8px] font-bold text-white">ON AIR</span>
                    </div>
                  )}
                </div>
                <div className="p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Avatar className="w-7 h-7 border" style={{ borderColor: theme.cardBorder }}>
                        <AvatarImage src={slot.radio_djs?.avatar_url || undefined} />
                        <AvatarFallback className="text-[9px]" style={{ backgroundColor: theme.secondaryButton, color: theme.textPrimary }}>
                          {slot.radio_djs?.dj_name?.charAt(0) || '?'}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-[11px] font-semibold" style={{ color: theme.textPrimary }}>
                          {slot.radio_djs?.dj_name || 'Unknown DJ'}
                        </p>
                        <div className="flex items-center gap-1 text-[9px]" style={{ color: theme.textSecondary }}>
                          <Clock className="w-2.5 h-2.5" />
                          {slot.isAlwaysOn ? 'Always available' : formatTime(slot.start_time, slot.end_time)}
                          {!slot.isAlwaysOn && !Number.isNaN(slotDate.getTime()) && (
                            <>
                              <span>·</span>
                              <span>{format(slotDate, 'MMM d')}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {isLive ? <LiveBadge /> : <UpcomingBadge />}
                    </div>
                  </div>

                  <h4 className="text-sm font-bold mb-1 truncate" style={{ color: theme.textPrimary }}>
                    {slot.show_subject || slot.show_notes || 'Radio Session'}
                  </h4>

                  {displayTracks.length > 0 ? (
                    <div className="flex flex-wrap items-center gap-1 mb-2">
                      {displayTracks.map((name, idx) => (
                        <span
                          key={idx}
                          className="inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[9px] font-medium border"
                          style={{ backgroundColor: theme.secondaryButton, borderColor: theme.cardBorder, color: theme.textPrimary }}
                        >
                          <Music className="w-2 h-2" />
                          {name}
                        </span>
                      ))}
                      {remaining > 0 && (
                        <span className="text-[9px]" style={{ color: theme.textSecondary }}>+{remaining} more</span>
                      )}
                    </div>
                  ) : slot.show_topic_description ? (
                    <p className="text-[10px] line-clamp-1 mb-2" style={{ color: theme.textSecondary }}>
                      {slot.show_topic_description}
                    </p>
                  ) : null}

                  <div className="flex items-center justify-between">
                    <Badge variant="secondary" className="text-[9px] px-1.5 py-0" style={{ backgroundColor: theme.secondaryButton, borderColor: theme.cardBorder, color: theme.textPrimary }}>
                      {slot.isAlwaysOn ? '🎧 Always On' : slot.broadcast_mode === 'pre_recorded' ? '📻 Auto-play' : '🎙️ Live'}
                    </Badge>
                    <div className="flex items-center gap-1">
                      <Button
                        size="sm"
                        className="text-[10px] h-6 px-2.5 rounded-full font-semibold"
                        style={{
                          background: isLive ? theme.primaryButton : theme.secondaryButton,
                          color: theme.textPrimary,
                          borderColor: theme.cardBorder,
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleJoin(slot);
                        }}
                      >
                        {isLive ? '🔴 Join Live' : '▶ Listen'}
                      </Button>
                      <CherryReactionButton />
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
};
