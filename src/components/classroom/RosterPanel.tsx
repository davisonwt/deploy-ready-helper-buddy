import { useMemo } from 'react';
import { CheckCircle2, Circle, Clock, MailPlus, MinusCircle, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { InviteAttendeesDialog } from './InviteAttendeesDialog';
import type { LiveParticipant } from '@/hooks/useClassroomLive';
import type { ClassroomInvite } from '@/hooks/useClassroomInvites';

interface Props {
  isHost: boolean;
  hostUserId: string;
  inviterId: string;
  participants: LiveParticipant[];
  invites: ClassroomInvite[];
  onInvite: (ids: string[], message: string) => Promise<void> | void;
}

const dotForPresence = (status: string | undefined, inRoom: boolean) => {
  if (!inRoom) return 'bg-[#E8D9B5]/20';
  if (status === 'present') return 'bg-emerald-400 shadow-[0_0_8px_rgba(74,222,128,0.6)]';
  if (status === 'away') return 'bg-amber-400';
  if (status === 'absent') return 'bg-rose-500';
  return 'bg-emerald-400';
};

const statusBadge = {
  invited: { Icon: Clock, color: 'text-[#E8D9B5]/60', label: 'No response' },
  accepted: { Icon: CheckCircle2, color: 'text-emerald-300', label: 'Accepted' },
  declined: { Icon: XCircle, color: 'text-rose-300', label: 'Declined' },
} as const;

export function RosterPanel({ isHost, hostUserId, inviterId, participants, invites, onInvite }: Props) {
  const partMap = useMemo(() => {
    const m = new Map<string, LiveParticipant>();
    participants.forEach((p) => m.set(p.user_id, p));
    return m;
  }, [participants]);

  const excludeIds = useMemo(
    () => Array.from(new Set([hostUserId, ...invites.map((i) => i.invitee_id)])),
    [hostUserId, invites],
  );

  if (!isHost) {
    // Attendee view: just show who's in the room
    const inRoom = participants.filter((p) => p.user_id !== hostUserId);
    return (
      <div className="p-3 space-y-2">
        <h4 className="text-xs uppercase tracking-wider text-[#E8D9B5]/60">In the room ({inRoom.length})</h4>
        {inRoom.length === 0 ? (
          <p className="text-[12px] italic text-[#E8D9B5]/40">Just you and the instructor for now.</p>
        ) : (
          <ul className="space-y-1.5">
            {inRoom.map((p) => (
              <li key={p.id} className="flex items-center gap-2 text-sm text-[#E8D9B5]">
                <span className={`h-2 w-2 rounded-full ${dotForPresence(p.presence_status, true)}`} />
                <span className="truncate">{p.display_name ?? 'Sower'}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  }

  // Host view: invited roster with RSVP + presence
  const accepted = invites.filter((i) => i.status === 'accepted');
  const pending = invites.filter((i) => i.status === 'invited');
  const declined = invites.filter((i) => i.status === 'declined');
  const inRoomNotInvited = participants.filter(
    (p) => p.user_id !== hostUserId && !invites.some((i) => i.invitee_id === p.user_id),
  );

  const Row = ({ invite }: { invite: ClassroomInvite }) => {
    const part = partMap.get(invite.invitee_id);
    const inRoom = !!part && part.status === 'active';
    const badge = statusBadge[invite.status];
    const Icon = badge.Icon;
    return (
      <li className="flex items-center gap-2 rounded-lg bg-[#14101F]/70 border border-[#8B5CF6]/20 px-2.5 py-1.5">
        <span className={`h-2.5 w-2.5 rounded-full shrink-0 ${dotForPresence(part?.presence_status, inRoom)}`} title={inRoom ? part?.presence_status ?? 'present' : 'not in room'} />
        <div className="h-7 w-7 rounded-full bg-[#8B5CF6]/30 flex items-center justify-center text-[11px] font-bold overflow-hidden shrink-0">
          {invite.avatar_url ? <img src={invite.avatar_url} alt="" className="h-full w-full object-cover" /> : (invite.display_name?.[0] ?? '?')}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm text-[#E8D9B5] truncate">{invite.display_name ?? 'Sower'}</p>
          <p className={`text-[10.5px] flex items-center gap-1 ${badge.color}`}>
            <Icon className="h-3 w-3" /> {inRoom ? 'In the room' : badge.label}
            {part?.missed_check_ins ? <span className="ml-1 text-rose-300">• {part.missed_check_ins} missed</span> : null}
          </p>
        </div>
        {part?.hand_raised && <span className="text-[10px] font-bold text-[#F0B23F]">✋</span>}
      </li>
    );
  };

  return (
    <div className="p-3 space-y-4">
      <InviteAttendeesDialog
        onSend={(ids, msg) => onInvite(ids, msg)}
        excludeUserIds={excludeIds}
        trigger={
          <Button className="w-full bg-[#8B5CF6] hover:bg-[#7C4FE0] text-white">
            <MailPlus className="h-4 w-4 mr-2" /> Invite more tribe members
          </Button>
        }
      />

      <section>
        <h4 className="text-xs uppercase tracking-wider text-[#E8D9B5]/60 mb-2 flex items-center gap-1.5">
          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-300" /> Accepted ({accepted.length})
        </h4>
        {accepted.length === 0 ? (
          <p className="text-[12px] italic text-[#E8D9B5]/40">No one has RSVP'd yet.</p>
        ) : (
          <ul className="space-y-1.5">{accepted.map((i) => <Row key={i.id} invite={i} />)}</ul>
        )}
      </section>

      <section>
        <h4 className="text-xs uppercase tracking-wider text-[#E8D9B5]/60 mb-2 flex items-center gap-1.5">
          <Clock className="h-3.5 w-3.5 text-[#E8D9B5]/60" /> Awaiting response ({pending.length})
        </h4>
        {pending.length === 0 ? (
          <p className="text-[12px] italic text-[#E8D9B5]/40">Everyone has responded.</p>
        ) : (
          <ul className="space-y-1.5">{pending.map((i) => <Row key={i.id} invite={i} />)}</ul>
        )}
      </section>

      {inRoomNotInvited.length > 0 && (
        <section>
          <h4 className="text-xs uppercase tracking-wider text-[#E8D9B5]/60 mb-2 flex items-center gap-1.5">
            <Circle className="h-3.5 w-3.5 text-[#E8D9B5]/40" /> Walked in ({inRoomNotInvited.length})
          </h4>
          <ul className="space-y-1.5">
            {inRoomNotInvited.map((p) => (
              <li key={p.id} className="flex items-center gap-2 rounded-lg bg-[#14101F]/70 border border-[#8B5CF6]/20 px-2.5 py-1.5">
                <span className={`h-2.5 w-2.5 rounded-full ${dotForPresence(p.presence_status, true)}`} />
                <span className="flex-1 text-sm text-[#E8D9B5] truncate">{p.display_name ?? 'Sower'}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {declined.length > 0 && (
        <section>
          <h4 className="text-xs uppercase tracking-wider text-[#E8D9B5]/60 mb-2 flex items-center gap-1.5">
            <MinusCircle className="h-3.5 w-3.5 text-rose-300/70" /> Declined ({declined.length})
          </h4>
          <ul className="space-y-1.5">{declined.map((i) => <Row key={i.id} invite={i} />)}</ul>
        </section>
      )}
    </div>
  );
}
