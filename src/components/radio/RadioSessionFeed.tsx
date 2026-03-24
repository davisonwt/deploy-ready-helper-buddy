import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Clock, Calendar, Edit, Trash2, MoreVertical, Mic, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { LiveBadge, ReplayBadge, UpcomingBadge, CherryReactionButton } from '@/components/chat/SparkleEffects';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { getCurrentTheme } from '@/utils/dashboardThemes';

interface ScheduledSlot {
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

interface RadioSessionFeedProps {
  slots: ScheduledSlot[];
  currentUserId?: string;
  onEditSlot?: (slot: ScheduledSlot) => void;
  onDeleteSlot?: (slotId: string) => void;
  onJoinSlot?: (slot: ScheduledSlot) => void;
  onScheduleNew?: () => void;
  onOpenVoiceStudio?: () => void;
}

export const RadioSessionFeed: React.FC<RadioSessionFeedProps> = ({
  slots,
  currentUserId,
  onEditSlot,
  onDeleteSlot,
  onJoinSlot,
  onScheduleNew,
  onOpenVoiceStudio,
}) => {
  const formatSlotTime = (startTime: string, endTime: string) => {
    try {
      return `${format(new Date(startTime), 'HH:mm')} - ${format(new Date(endTime), 'HH:mm')}`;
    } catch {
      return 'TBD';
    }
  };

  const isMySlot = (slot: ScheduledSlot) =>
    currentUserId && slot.radio_djs?.user_id === currentUserId;

  const now = new Date();
  const upcomingSlots = slots.filter(
    (s) => new Date(s.end_time) >= now || s.approval_status === 'pending' || isMySlot(s)
  );

  const [theme, setTheme] = useState(getCurrentTheme());

  useEffect(() => {
    const refreshTheme = () => setTheme(getCurrentTheme());
    refreshTheme();
    const interval = setInterval(refreshTheme, 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const actionButtonStyle: React.CSSProperties = {
    background: theme.primaryButton,
    color: theme.textPrimary,
    borderColor: theme.cardBorder,
    boxShadow: `0 8px 18px ${theme.shadow}`,
  };

  return (
    <div className="space-y-3">
      {/* Section header with actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4" style={{ color: theme.accent }} />
          <h3 className="text-sm font-bold" style={{ color: theme.textPrimary }}>
            Sessions ({upcomingSlots.length})
          </h3>
        </div>
        <div className="flex gap-1.5">
          {onOpenVoiceStudio && (
            <Button variant="ghost" size="sm" className="gap-1 text-xs h-7 px-2" style={actionButtonStyle} onClick={onOpenVoiceStudio}>
              <Mic className="w-3.5 h-3.5" /> Record
            </Button>
          )}
          {onScheduleNew && (
            <Button size="sm" className="gap-1 text-xs h-7 px-2.5" style={actionButtonStyle} onClick={onScheduleNew}>
              <Plus className="w-3.5 h-3.5" /> New Slot
            </Button>
          )}
        </div>
      </div>

      {/* Empty state */}
      {upcomingSlots.length === 0 && (
        <div
          className="rounded-2xl border p-8 text-center"
          style={{ backgroundColor: theme.cardBg, borderColor: theme.cardBorder }}
        >
          <Clock className="w-10 h-10 mx-auto mb-2 text-muted-foreground/40" />
          <p className="text-xs text-muted-foreground">No upcoming radio slots</p>
        </div>
      )}

      {/* Feed cards */}
      {upcomingSlots.map((slot, index) => {
        const slotDate = new Date(slot.time_slot_date);
        const isLive = slot.status === 'live';
        const isPending = slot.approval_status === 'pending';
        const isApproved = slot.approval_status === 'approved';
        const isPast = new Date(slot.end_time) < now && !isLive;
        const isMine = isMySlot(slot);

        return (
          <motion.div
            key={slot.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05, type: 'spring', stiffness: 200, damping: 25 }}
            className={cn(
              'rounded-2xl border overflow-hidden transition-all'
            )}
            style={{
              backgroundColor: theme.cardBg,
              borderColor: isLive ? 'hsl(var(--destructive) / 0.5)' : theme.cardBorder,
              boxShadow: `0 10px 24px ${theme.shadow}`,
            }}
          >
            <div className="p-3">
              {/* Top row: Host + Status */}
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Avatar className="w-8 h-8 border-2" style={{ borderColor: theme.cardBorder }}>
                    <AvatarImage src={slot.radio_djs?.avatar_url || undefined} />
                    <AvatarFallback className="text-[10px]" style={{ backgroundColor: theme.secondaryButton, color: theme.textPrimary }}>
                      {slot.radio_djs?.dj_name?.charAt(0) || '?'}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-xs font-semibold text-foreground">{slot.radio_djs?.dj_name || 'Unknown DJ'}</p>
                    <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                      <Clock className="w-3 h-3" />
                      {formatSlotTime(slot.start_time, slot.end_time)}
                      <span>•</span>
                      <span>{format(slotDate, 'MMM d')}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  {isLive && <LiveBadge />}
                  {isPast && !isLive && <ReplayBadge />}
                  {!isPast && !isLive && isApproved && <UpcomingBadge />}
                  {isPending && (
                    <span className="px-2 py-0.5 rounded-full bg-warning/20 text-warning text-[10px] font-bold border border-warning/30">
                      Pending
                    </span>
                  )}
                  {isMine && onEditSlot && onDeleteSlot && (
                    <DropdownMenu modal={false}>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7">
                          <MoreVertical className="h-3.5 w-3.5" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="bg-popover border border-border">
                        <DropdownMenuItem onClick={() => onEditSlot(slot)}>
                          <Edit className="h-3.5 w-3.5 mr-2" /> Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onDeleteSlot(slot.id)} className="text-destructive focus:text-destructive">
                          <Trash2 className="h-3.5 w-3.5 mr-2" /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
              </div>

              {/* Title + description */}
              <h4 className="text-sm font-bold text-foreground mb-0.5 truncate">
                {slot.show_subject || slot.show_notes || 'Radio Slot'}
              </h4>
              {slot.show_topic_description && (
                <p className="text-xs text-muted-foreground line-clamp-2 mb-2">{slot.show_topic_description}</p>
              )}

              {/* Broadcast mode badge */}
              <div className="flex items-center justify-between">
                <Badge variant="secondary" className="text-[10px] px-2 py-0.5" style={{ backgroundColor: theme.secondaryButton, borderColor: theme.cardBorder, color: theme.textPrimary }}>
                  {slot.broadcast_mode === 'pre_recorded' ? '📻 Auto-play' : '🎙️ Live'}
                </Badge>

                <div className="flex items-center gap-1">
                  {onJoinSlot && isLive && (
                    <Button
                      size="sm"
                      className="text-xs h-7 px-3 rounded-full bg-destructive hover:bg-destructive/90 text-destructive-foreground"
                      onClick={() => onJoinSlot(slot)}
                    >
                      🔴 Join Live
                    </Button>
                  )}
                  <CherryReactionButton />
                </div>
              </div>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
};
