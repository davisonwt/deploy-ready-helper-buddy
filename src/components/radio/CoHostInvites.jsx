import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2, UserPlus, AlertCircle } from 'lucide-react';
import { CoHostInviteCard } from './CoHostInviteCard';

export function CoHostInvites() {
  const { user } = useAuth();
  const [invites, setInvites] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchInvites();
      
      // Set up realtime subscription
      const channel = supabase
        .channel('cohost-invites')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'radio_co_host_invites',
            filter: `co_host_user_id=eq.${user.id}`
          },
          () => {
            fetchInvites();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user]);

  const fetchInvites = async () => {
    if (!user) return;

    try {
      // Get DJ profile first
      const { data: djProfile } = await supabase
        .from('radio_djs')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!djProfile) {
        setInvites([]);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('radio_co_host_invites')
        .select(`
          *,
          radio_schedule (
            id,
            start_time,
            end_time,
            time_slot_date,
            hour_slot
          ),
          radio_shows (
            show_name,
            description,
            category
          ),
          host_dj:radio_djs!radio_co_host_invites_host_dj_id_fkey (
            dj_name,
            avatar_url
          )
        `)
        .eq('co_host_dj_id', djProfile.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setInvites(data || []);
    } catch (error) {
      console.error('Error fetching invites:', error);
      toast.error('Failed to load invitations');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
          <p className="text-muted-foreground mt-2">Loading invitations...</p>
        </CardContent>
      </Card>
    );
  }

  if (invites.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Co-Host Invitations
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 space-y-4">
            <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground" />
            <div>
              <p className="font-medium">No pending invitations</p>
              <p className="text-sm text-muted-foreground">
                You'll see invitations here when hosts invite you to co-host their shows
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Co-Host Invitations ({invites.filter(i => i.status === 'pending').length} pending)
          </CardTitle>
        </CardHeader>
      </Card>

      {invites.map((invite) => (
        <CoHostInviteCard
          key={invite.id}
          invite={invite}
          onUpdate={fetchInvites}
        />
      ))}
    </div>
  );
}
