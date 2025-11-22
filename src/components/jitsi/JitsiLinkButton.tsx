import { Button } from '@/components/ui/button';
import { Phone, Video } from 'lucide-react';

interface JitsiLinkButtonProps {
  callType?: 'audio' | 'video';
  className?: string;
}

export function JitsiLinkButton({ callType = 'audio', className }: JitsiLinkButtonProps) {
  const jitsiDomain = 'meet.sow2growapp.com';
  const roomName = crypto.randomUUID().slice(0, 12);
  const jitsiUrl = `https://${jitsiDomain}/${roomName}`;

  return (
    <Button
      variant="ghost"
      size="sm"
      asChild
      className={className}
    >
      <a
        href={jitsiUrl}
        target="_blank"
        rel="noopener noreferrer"
      >
        {callType === 'video' ? (
          <Video className="h-4 w-4" />
        ) : (
          <Phone className="h-4 w-4" />
        )}
      </a>
    </Button>
  );
}

