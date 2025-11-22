import { useEffect, useState, Suspense, Component, ReactNode } from 'react';
import UserSelector from './UserSelector';

// Lightweight local error boundary so a selector error doesn't crash the whole Chat page
class LocalErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean; error?: any }> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }
  componentDidCatch(error: any, info: any) {
    // Non-fatal: keep chats and the rest of the UI working
    console.error('UserSelector failed, rendering fallback instead:', error, info);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          User selection is temporarily unavailable. You can still use your existing chats below.
        </div>
      );
    }
    return this.props.children as any;
  }
}

export default function SafeUserSelector({
  onStartDirectChat,
  onStartCall, // REMOVED: React call flow - using direct Jitsi links instead
}: {
  onStartDirectChat: (otherUserId: string) => void;
  onStartCall?: (otherUserId: string, callType: 'audio' | 'video') => void; // Optional - not used anymore
}) {
  // Ensure we only render on client after mount to avoid any edge initialization issues
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted) return null;

  return (
    <LocalErrorBoundary>
      <Suspense fallback={null}>
        <UserSelector
          onStartDirectChat={onStartDirectChat}
          onStartCall={onStartCall || (() => {})} // REMOVED: React call flow - using direct Jitsi links instead
        />
      </Suspense>
    </LocalErrorBoundary>
  );
}
