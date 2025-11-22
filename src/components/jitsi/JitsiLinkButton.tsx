import { Button } from '@/components/ui/button';
import { Phone, Video } from 'lucide-react';

interface JitsiLinkButtonProps {
  callType?: 'audio' | 'video';
  className?: string;
}

// REMOVED: External links - using embedded JitsiCall component instead
// This component is kept for reference but should not be used
export function JitsiLinkButton({ callType = 'audio', className }: JitsiLinkButtonProps) {
  // This component is deprecated - use JitsiCall component instead
  return null;
}

