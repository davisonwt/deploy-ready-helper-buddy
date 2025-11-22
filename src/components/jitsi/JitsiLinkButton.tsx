import { Button } from '@/components/ui/button';
import { Phone, Video } from 'lucide-react';

interface JitsiLinkButtonProps {
  callType?: 'audio' | 'video';
  className?: string;
}

export function JitsiLinkButton({ callType = 'audio', className }: JitsiLinkButtonProps) {
  const generateRoomName = () => {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 12; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };

  const jitsiDomain = import.meta.env.VITE_JITSI_DOMAIN || '197.245.26.199';
  const roomName = generateRoomName();
  const jitsiUrl = `https://${jitsiDomain}/${roomName}`;

  return (
    <Button
      asChild
      variant="default"
      className={className}
      onClick={() => {
        // Generate new room name on each click
        const newRoom = generateRoomName();
        const newUrl = `https://${jitsiDomain}/${newRoom}`;
        window.open(newUrl, '_blank', 'noopener,noreferrer');
      }}
    >
      <a
        href={jitsiUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-2"
      >
        {callType === 'video' ? (
          <>
            <Video className="h-4 w-4" />
            Join with Jitsi
          </>
        ) : (
          <>
            <Phone className="h-4 w-4" />
            Join with Jitsi
          </>
        )}
      </a>
    </Button>
  );
}

