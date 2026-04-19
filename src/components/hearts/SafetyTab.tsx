import { useTribalHeartsProfile } from '@/hooks/useTribalHeartsProfile';
import { Switch } from '@/components/ui/switch';
import { Card } from '@/components/ui/card';
import { Shield, PauseCircle, Heart } from 'lucide-react';

export function SafetyTab() {
  const { profile, setStatus } = useTribalHeartsProfile();
  const paused = profile?.status === 'paused';

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-start gap-3">
            <PauseCircle className="mt-1 h-5 w-5 text-primary" />
            <div>
              <div className="font-semibold">Pause matching</div>
              <div className="text-xs text-muted-foreground">Hide your profile from new matches. Your existing chats stay open.</div>
            </div>
          </div>
          <Switch checked={paused} onCheckedChange={(v) => setStatus(v ? 'paused' : 'active')} />
        </div>
      </Card>

      <Card className="space-y-2 p-4">
        <div className="flex items-center gap-2 font-semibold"><Shield className="h-4 w-4 text-primary" /> Community guidelines</div>
        <ul className="ml-5 list-disc space-y-1 text-sm text-muted-foreground">
          <li>Be respectful, kind, and honest. Real names, real warmth.</li>
          <li>Never share personal numbers, emails, or external links — chat, voice, and video all stay inside Sow2Grow.</li>
          <li>You decide the pace. Text first; voice and video only when you both feel ready.</li>
          <li>Report or block anyone who makes you uncomfortable — we've got your back.</li>
          <li>18+ only. Profile photo verification is encouraged.</li>
        </ul>
      </Card>

      <Card className="flex items-start gap-3 p-4">
        <Heart className="mt-0.5 h-5 w-5 text-primary" fill="currentColor" />
        <div className="text-sm text-muted-foreground">
          All chats are AI-monitored for safety. Sharing of phone numbers, emails, or external links is automatically flagged for review.
        </div>
      </Card>
    </div>
  );
}
