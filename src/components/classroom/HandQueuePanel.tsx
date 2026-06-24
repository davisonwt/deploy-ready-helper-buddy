import { Hand, Mic, MicOff, UserCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { LiveParticipant } from '@/hooks/useClassroomLive';

interface Props {
  isHost: boolean;
  participants: LiveParticipant[];
  hostUserId: string;
  onSetCanSpeak: (uid: string, allow: boolean) => void;
}

export function HandQueuePanel({ isHost, participants, hostUserId, onSetCanSpeak }: Props) {
  const raised = participants
    .filter((p) => p.user_id !== hostUserId && p.hand_raised)
    .sort((a, b) => (a.hand_raised_at ?? '').localeCompare(b.hand_raised_at ?? ''));
  const speakers = participants.filter((p) => p.user_id !== hostUserId && p.can_speak);

  if (!isHost) {
    return (
      <div className="p-4 text-sm text-[#E8D9B5]/70">
        <p className="font-spectral text-base text-[#E8D9B5] mb-1">Want to speak?</p>
        <p>Tap the <Hand className="inline h-3.5 w-3.5 text-[#F0B23F]" /> button below. The instructor will see your hand and unmute you when it's your turn.</p>
      </div>
    );
  }

  return (
    <div className="p-3 space-y-4">
      <div>
        <h4 className="text-xs uppercase tracking-wider text-[#E8D9B5]/60 mb-2 flex items-center gap-1.5">
          <Hand className="h-3.5 w-3.5 text-[#F0B23F]" /> Raised hands {raised.length > 0 && `(${raised.length})`}
        </h4>
        {raised.length === 0 ? (
          <p className="text-[12px] italic text-[#E8D9B5]/40">No raised hands.</p>
        ) : (
          <ul className="space-y-1.5">
            {raised.map((p) => (
              <li key={p.id} className="flex items-center gap-2 rounded-lg bg-[#F0B23F]/10 border border-[#F0B23F]/30 px-2.5 py-1.5">
                <div className="h-7 w-7 rounded-full bg-[#8B5CF6]/30 flex items-center justify-center text-[11px] font-bold text-[#E8D9B5] overflow-hidden">
                  {p.avatar_url ? <img src={p.avatar_url} alt="" className="h-full w-full object-cover" /> : (p.display_name?.[0] ?? '?')}
                </div>
                <span className="flex-1 text-sm text-[#E8D9B5] truncate">{p.display_name ?? 'Sower'}</span>
                <Button size="sm" onClick={() => onSetCanSpeak(p.user_id, true)} className="h-7 text-xs bg-[#8B5CF6] hover:bg-[#7C4FE0]">
                  <Mic className="h-3 w-3 mr-1" /> Allow
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div>
        <h4 className="text-xs uppercase tracking-wider text-[#E8D9B5]/60 mb-2 flex items-center gap-1.5">
          <UserCheck className="h-3.5 w-3.5 text-emerald-300" /> Can speak {speakers.length > 0 && `(${speakers.length})`}
        </h4>
        {speakers.length === 0 ? (
          <p className="text-[12px] italic text-[#E8D9B5]/40">No attendees have the floor.</p>
        ) : (
          <ul className="space-y-1.5">
            {speakers.map((p) => (
              <li key={p.id} className="flex items-center gap-2 rounded-lg bg-emerald-500/10 border border-emerald-400/30 px-2.5 py-1.5">
                <div className="h-7 w-7 rounded-full bg-[#8B5CF6]/30 flex items-center justify-center text-[11px] font-bold text-[#E8D9B5] overflow-hidden">
                  {p.avatar_url ? <img src={p.avatar_url} alt="" className="h-full w-full object-cover" /> : (p.display_name?.[0] ?? '?')}
                </div>
                <span className="flex-1 text-sm text-[#E8D9B5] truncate">{p.display_name ?? 'Sower'}</span>
                <Button size="sm" variant="outline" onClick={() => onSetCanSpeak(p.user_id, false)} className="h-7 text-xs border-rose-400/50 text-rose-200 hover:bg-rose-500/10">
                  <MicOff className="h-3 w-3 mr-1" /> Revoke
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
