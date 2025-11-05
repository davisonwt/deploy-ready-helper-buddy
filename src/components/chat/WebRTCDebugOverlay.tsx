import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, X, Bug } from 'lucide-react';
import { useState } from 'react';

interface WebRTCDebugOverlayProps {
  connectionState: string;
  iceConnectionState: string;
  signalingState: string;
  hasLocalDescription: boolean;
  hasRemoteDescription: boolean;
  hasRemoteTrack: boolean;
  onRestartICE: () => void;
  onClose: () => void;
}

const WebRTCDebugOverlay = ({
  connectionState,
  iceConnectionState,
  signalingState,
  hasLocalDescription,
  hasRemoteDescription,
  hasRemoteTrack,
  onRestartICE,
  onClose
}: WebRTCDebugOverlayProps) => {
  const getStateBadgeVariant = (state: string) => {
    if (state === 'connected' || state === 'stable' || state === 'completed') {
      return 'default';
    }
    if (state === 'connecting' || state === 'checking' || state === 'have-local-offer' || state === 'have-remote-offer') {
      return 'secondary';
    }
    if (state === 'failed' || state === 'closed' || state === 'disconnected') {
      return 'destructive';
    }
    return 'outline';
  };

  return (
    <Card className="fixed top-4 right-4 w-80 z-[100] shadow-lg border-2 bg-background/95 backdrop-blur">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bug className="h-4 w-4" />
            <CardTitle className="text-sm">WebRTC Debug</CardTitle>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-6 w-6 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 text-xs">
        {/* Connection States */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Connection:</span>
            <Badge variant={getStateBadgeVariant(connectionState)} className="text-xs">
              {connectionState}
            </Badge>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">ICE Connection:</span>
            <Badge variant={getStateBadgeVariant(iceConnectionState)} className="text-xs">
              {iceConnectionState}
            </Badge>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Signaling:</span>
            <Badge variant={getStateBadgeVariant(signalingState)} className="text-xs">
              {signalingState}
            </Badge>
          </div>
        </div>

        {/* SDP Status */}
        <div className="border-t pt-2 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Local SDP:</span>
            <Badge variant={hasLocalDescription ? 'default' : 'destructive'} className="text-xs">
              {hasLocalDescription ? '✓ Present' : '✗ Missing'}
            </Badge>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Remote SDP:</span>
            <Badge variant={hasRemoteDescription ? 'default' : 'destructive'} className="text-xs">
              {hasRemoteDescription ? '✓ Present' : '✗ Missing'}
            </Badge>
          </div>
        </div>

        {/* Track Status */}
        <div className="border-t pt-2">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Remote Track:</span>
            <Badge variant={hasRemoteTrack ? 'default' : 'destructive'} className="text-xs">
              {hasRemoteTrack ? '✓ Received' : '✗ Missing'}
            </Badge>
          </div>
        </div>

        {/* Actions */}
        <div className="border-t pt-2">
          <Button
            onClick={onRestartICE}
            size="sm"
            variant="outline"
            className="w-full text-xs"
          >
            <RefreshCw className="h-3 w-3 mr-2" />
            Restart ICE
          </Button>
        </div>

        {/* Status Summary */}
        <div className="border-t pt-2 text-[10px] text-muted-foreground">
          <p className="leading-tight">
            {connectionState === 'connected' && hasRemoteTrack ? (
              <span className="text-green-600 dark:text-green-400 font-medium">✓ Connection healthy</span>
            ) : connectionState === 'failed' ? (
              <span className="text-red-600 dark:text-red-400 font-medium">✗ Connection failed - try Restart ICE</span>
            ) : (
              <span className="text-yellow-600 dark:text-yellow-400 font-medium">⚠ Establishing connection...</span>
            )}
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default WebRTCDebugOverlay;
