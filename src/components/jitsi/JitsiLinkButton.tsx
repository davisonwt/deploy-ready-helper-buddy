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
    <a
      href={jitsiUrl}
      target="_blank"
      rel="noopener noreferrer"
      className={`flex items-center gap-2 ${className || ''}`}
    >
      {callType === 'video' ? (
        <>
          <Video className="h-4 w-4" />
          chatapp call
        </>
      ) : (
        <>
          <Phone className="h-4 w-4" />
          chatapp call
        </>
      )}
    </a>
  );
}

