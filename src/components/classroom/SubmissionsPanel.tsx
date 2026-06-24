import { useRef, useState } from 'react';
import { Download, FileText, Image as ImageIcon, Film, Music, Star, Upload, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import type { LiveMediaItem, LiveParticipant } from '@/hooks/useClassroomLive';

interface Props {
  isHost: boolean;
  userId: string;
  media: LiveMediaItem[];
  participants: LiveParticipant[];
  onUpload: (file: File) => void;
  onScore: (mediaId: string, score: number, feedback: string) => void;
}

const iconFor = (mime: string | null) => {
  if (!mime) return FileText;
  if (mime.startsWith('image/')) return ImageIcon;
  if (mime.startsWith('video/')) return Film;
  if (mime.startsWith('audio/')) return Music;
  return FileText;
};

export function SubmissionsPanel({ isHost, userId, media, participants, onUpload, onScore }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [activeScoreId, setActiveScoreId] = useState<string | null>(null);

  const subs = media
    .filter((m) => m.submission_role === 'attendee_task')
    .filter((m) => (isHost ? true : m.uploader_id === userId))
    .sort((a, b) => (b.created_at ?? '').localeCompare(a.created_at ?? ''));

  const nameOf = (uid: string) => participants.find((p) => p.user_id === uid)?.display_name ?? 'Sower';

  return (
    <div className="p-3 space-y-3">
      {!isHost && (
        <>
          <input
            ref={fileRef}
            type="file"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onUpload(f);
              e.target.value = '';
            }}
          />
          <Button
            onClick={() => fileRef.current?.click()}
            className="w-full bg-[#8B5CF6] hover:bg-[#7C4FE0] text-white"
          >
            <Upload className="h-4 w-4 mr-2" /> Submit my task
          </Button>
        </>
      )}

      {subs.length === 0 ? (
        <p className="text-[12px] italic text-[#E8D9B5]/40 text-center py-4">
          {isHost ? 'No submissions yet.' : 'You have not submitted anything yet.'}
        </p>
      ) : (
        <ul className="space-y-2">
          {subs.map((s) => {
            const Icon = iconFor(s.mime_type);
            return (
              <li key={s.id} className="rounded-lg bg-[#14101F] border border-[#8B5CF6]/25 p-2.5">
                <div className="flex items-center gap-2">
                  <Icon className="h-4 w-4 text-[#8B5CF6] shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-[#E8D9B5] truncate">{s.file_name}</p>
                    {isHost && <p className="text-[11px] text-[#E8D9B5]/50">by {nameOf(s.uploader_id)}</p>}
                  </div>
                  <a href={s.file_path} target="_blank" rel="noopener noreferrer" download={s.file_name}>
                    <Button size="sm" variant="ghost" className="h-7 px-2 text-[#E8D9B5] hover:bg-[#8B5CF6]/15">
                      <Download className="h-3.5 w-3.5" />
                    </Button>
                  </a>
                </div>

                {s.score != null && (
                  <div className="mt-2 rounded-md bg-[#F0B23F]/10 border border-[#F0B23F]/30 px-2 py-1.5">
                    <div className="flex items-center gap-1.5 text-[#F0B23F] text-xs font-bold">
                      <Star className="h-3.5 w-3.5 fill-[#F0B23F]" /> Score: {Number(s.score).toFixed(1)} / 10
                    </div>
                    {s.feedback && <p className="text-[12px] text-[#E8D9B5]/80 mt-1">{s.feedback}</p>}
                  </div>
                )}

                {isHost && s.score == null && (
                  activeScoreId === s.id ? (
                    <ScoreForm
                      onCancel={() => setActiveScoreId(null)}
                      onSubmit={(score, feedback) => {
                        onScore(s.id, score, feedback);
                        setActiveScoreId(null);
                      }}
                    />
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setActiveScoreId(s.id)}
                      className="mt-2 h-7 text-xs border-[#F0B23F]/50 text-[#F0B23F] hover:bg-[#F0B23F]/10"
                    >
                      <Star className="h-3 w-3 mr-1" /> Score this
                    </Button>
                  )
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function ScoreForm({ onSubmit, onCancel }: { onSubmit: (score: number, feedback: string) => void; onCancel: () => void }) {
  const [score, setScore] = useState('8');
  const [feedback, setFeedback] = useState('');
  return (
    <div className="mt-2 space-y-2">
      <div className="flex items-center gap-2">
        <label className="text-[11px] text-[#E8D9B5]/60 uppercase">Score /10</label>
        <Input
          value={score}
          onChange={(e) => setScore(e.target.value)}
          className="h-8 w-20 bg-[#0f0a1a] border-[#8B5CF6]/30 text-[#E8D9B5]"
          inputMode="decimal"
        />
      </div>
      <Textarea
        value={feedback}
        onChange={(e) => setFeedback(e.target.value)}
        placeholder="Feedback for the student"
        className="bg-[#0f0a1a] border-[#8B5CF6]/30 text-[#E8D9B5] text-sm min-h-[60px]"
      />
      <div className="flex gap-2 justify-end">
        <Button size="sm" variant="ghost" onClick={onCancel} className="h-7 text-xs text-[#E8D9B5]/70">Cancel</Button>
        <Button
          size="sm"
          onClick={() => {
            const n = Number(score);
            if (Number.isFinite(n)) onSubmit(n, feedback.trim());
          }}
          className="h-7 text-xs bg-[#F0B23F] text-[#14101F] hover:bg-[#F0B23F]/90"
        >
          <Check className="h-3 w-3 mr-1" /> Save score
        </Button>
      </div>
    </div>
  );
}
