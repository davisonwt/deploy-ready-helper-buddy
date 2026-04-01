import React, { useState } from 'react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Car, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface DriverAvailabilityToggleProps {
  isOnline: boolean;
  driverName: string;
  userId: string;
  onStatusChange?: (online: boolean) => void;
}

export const DriverAvailabilityToggle: React.FC<DriverAvailabilityToggleProps> = ({
  isOnline, driverName, userId, onStatusChange,
}) => {
  const [online, setOnline] = useState(isOnline);
  const [reason, setReason] = useState('');
  const [showReason, setShowReason] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleToggle = async (checked: boolean) => {
    if (!checked) {
      // Going offline — show reason input
      setShowReason(true);
      return;
    }

    // Going online
    setSubmitting(true);
    try {
      await supabase
        .from('community_drivers')
        .update({ is_online: true } as any)
        .eq('user_id', userId);

      setOnline(true);
      setShowReason(false);
      onStatusChange?.(true);
      toast.success('You are now online and available for bookings');
    } catch {
      toast.error('Failed to update status');
    } finally {
      setSubmitting(false);
    }
  };

  const confirmOffline = async () => {
    setSubmitting(true);
    try {
      // Update driver status
      await supabase
        .from('community_drivers')
        .update({ is_online: false } as any)
        .eq('user_id', userId);

      // Send ChatApp notification to GoSat
      const { data: gosatUser } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'gosat')
        .limit(1)
        .single();

      if (gosatUser?.user_id) {
        const today = new Date().toLocaleDateString('en-ZA', {
          weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
        });
        const message = [
          `🚗 Driver Unavailable`,
          `${driverName} is not available today (${today}).`,
          reason ? `Reason: ${reason}` : '',
        ].filter(Boolean).join('\n');

        const { data: roomId } = await supabase.rpc('get_or_create_direct_room', {
          user1_id: userId,
          user2_id: gosatUser.user_id,
        });

        if (roomId) {
          const actualRoomId = typeof roomId === 'object' ? (roomId as any).room_id || (roomId as any).id || roomId : roomId;
          await supabase.rpc('insert_system_chat_message', {
            p_room_id: actualRoomId,
            p_content: message,
            p_metadata: { type: 'driver_unavailable' },
          });
        }
      }

      setOnline(false);
      setShowReason(false);
      setReason('');
      onStatusChange?.(false);
      toast.success('You are now offline. S2G has been notified.');
    } catch {
      toast.error('Failed to update status');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card>
      <CardContent className="pt-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Car className="w-4 h-4 text-primary" />
            <Label htmlFor="availability" className="text-sm font-semibold">
              {online ? '🟢 Online — Available' : '🔴 Offline — Unavailable'}
            </Label>
          </div>
          <Switch
            id="availability"
            checked={online}
            onCheckedChange={handleToggle}
            disabled={submitting}
          />
        </div>

        {showReason && !online && (
          <div className="space-y-2 pt-2 border-t">
            <Label className="text-xs">Reason for being unavailable (optional)</Label>
            <Input
              placeholder="e.g., Vehicle maintenance, personal day..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={confirmOffline}
                disabled={submitting}
                variant="destructive"
              >
                {submitting ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : null}
                Go Offline
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => { setShowReason(false); }}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
