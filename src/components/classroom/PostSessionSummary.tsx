import { useMemo } from 'react';
import { Award, CheckCircle2, Clock, Hand, Star, Users, X } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import type { LiveParticipant, LiveMessage, LiveMediaItem } from '@/hooks/useClassroomLive';
import type { ClassroomInvite } from '@/hooks/useClassroomInvites';

interface Props {
  open: boolean;
  onClose: () => void;
  sessionTitle: string;
  startedAt: string | null;
  endedAt: string | null;
  hostUserId: string;
  participants: LiveParticipant[];
  invites: ClassroomInvite[];
  messages: LiveMessage[];
  media: LiveMediaItem[];
}

function pct(n: number, d: number) {
  if (!d) return '0%';
  return `${Math.round((n / d) * 100)}%`;
}

function formatDuration(secs: number) {
  if (secs < 60) return `${secs}s`;
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return s ? `${m}m ${s}s` : `${m}m`;
}

export function PostSessionSummary(props: Props) {
  const { open, onClose, sessionTitle, startedAt, endedAt, hostUserId, participants, invites, messages, media } = props;

  const summary = useMemo(() => {
    const invitedCount = invites.length;
    const attendees = participants.filter((p) => p.user_id !== hostUserId);
    const attended = attendees.length;
    const attendedFromInvite = attendees.filter((a) => invites.some((i) => i.invitee_id === a.user_id)).length;
    const noShows = invites.filter((i) => !attendees.some((a) => a.user_id === i.invitee_id));

    const totalActiveSecs = attendees.reduce((s, a) => s + (a.total_active_seconds ?? 0), 0);
    const totalAwaySecs = attendees.reduce((s, a) => s + (a.total_away_seconds ?? 0), 0);
    const avgActive = attended ? Math.round(totalActiveSecs / attended) : 0;

    const handsFromMessages = 0; // could track from realtime events
    const handsRaised = attendees.filter((a) => a.hand_raised || (a.hands_raised_count ?? 0) > 0).length;

    const subs = media.filter((m) => m.submission_role === 'attendee_task');
    const scored = subs.filter((m) => m.score != null);
    const avgScore = scored.length ? scored.reduce((s, m) => s + Number(m.score), 0) / scored.length : null;

    const textMsgs = messages.filter((m) => m.message_type === 'text').length;
    const voiceMsgs = messages.filter((m) => m.message_type === 'voice').length;

    const durationSecs = startedAt && endedAt ? Math.max(1, Math.round((new Date(endedAt).getTime() - new Date(startedAt).getTime()) / 1000)) : null;

    return {
      invitedCount, attended, attendedFromInvite, noShows,
      avgActive, totalActiveSecs, totalAwaySecs,
      handsRaised, subs: subs.length, scored: scored.length, avgScore,
      textMsgs, voiceMsgs, durationSecs,
    };
  }, [participants, invites, messages, media, hostUserId, startedAt, endedAt]);

  const Stat = ({ label, value, sub }: { label: string; value: React.ReactNode; sub?: string }) => (
    <div className="rounded-xl bg-[#14101F]/80 border border-[#8B5CF6]/25 p-3">
      <p className="text-[11px] uppercase tracking-wider text-[#E8D9B5]/60">{label}</p>
      <p className="font-spectral text-2xl text-[#E8D9B5] mt-0.5">{value}</p>
      {sub && <p className="text-[11px] text-[#E8D9B5]/50 mt-0.5">{sub}</p>}
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-2xl bg-[#1a1430] border-[#8B5CF6]/40 text-[#E8D9B5] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-spectral text-2xl">
            <Award className="h-6 w-6 text-[#F0B23F]" /> Session summary
          </DialogTitle>
          <DialogDescription className="text-[#E8D9B5]/70">
            {sessionTitle} {summary.durationSecs ? `• ${formatDuration(summary.durationSecs)} live` : ''}
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
          <Stat
            label="Attendance"
            value={pct(summary.attendedFromInvite, summary.invitedCount || 1)}
            sub={`${summary.attendedFromInvite}/${summary.invitedCount} invited showed up`}
          />
          <Stat
            label="In the room"
            value={summary.attended}
            sub={summary.attended - summary.attendedFromInvite > 0 ? `+${summary.attended - summary.attendedFromInvite} walked in` : 'all from invites'}
          />
          <Stat
            label="Avg time present"
            value={formatDuration(summary.avgActive)}
            sub={summary.totalAwaySecs ? `${formatDuration(summary.totalAwaySecs)} total away` : 'no away time'}
          />
          <Stat label="Hands raised" value={summary.handsRaised} sub="unique attendees" />
          <Stat
            label="Submissions"
            value={summary.subs}
            sub={summary.scored ? `${summary.scored} scored` : 'none scored yet'}
          />
          <Stat
            label="Avg score"
            value={summary.avgScore != null ? `${summary.avgScore.toFixed(1)} / 10` : '—'}
          />
          <Stat label="Text messages" value={summary.textMsgs} />
          <Stat label="Voice notes" value={summary.voiceMsgs} />
          <Stat label="No-shows" value={summary.noShows.length} sub={summary.noShows.length ? 'they got the invite' : 'everyone showed'} />
        </div>

        {summary.noShows.length > 0 && (
          <div className="mt-4 rounded-xl border border-rose-400/20 bg-rose-500/5 p-3">
            <h4 className="text-xs uppercase tracking-wider text-rose-200/80 mb-2">No-shows</h4>
            <ul className="text-sm text-[#E8D9B5] space-y-0.5">
              {summary.noShows.map((i) => (
                <li key={i.id}>• {i.display_name ?? 'Sower'} {i.status === 'declined' ? '(declined)' : '(no response)'}</li>
              ))}
            </ul>
          </div>
        )}

        <Button onClick={onClose} className="mt-4 w-full bg-[#8B5CF6] hover:bg-[#7C4FE0] text-white">
          Done
        </Button>
      </DialogContent>
    </Dialog>
  );
}
