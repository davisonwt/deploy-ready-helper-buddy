import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  MessageSquare, 
  Users, 
  Radio, 
  Mic, 
  AlertCircle,
  Eye,
  Trash2,
  Check,
  X,
  RefreshCw,
  Shield,
  Clock,
  Flag,
  Ban
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useRoles } from '@/hooks/useRoles';
import { GoSatAlertBadge } from './GoSatAlertBadge';
import { FlaggedContentTab } from './FlaggedContentTab';
import { ChatRoomMonitorTab } from './ChatRoomMonitorTab';

interface ChatRoom {
  id: string;
  name: string;
  room_type: string;
  created_by: string;
  created_at: string;
  is_active: boolean;
  creator_name?: string;
  participant_count?: number;
}

export function GoSatGhostAccessMonitor() {
  const { user } = useAuth();
  const { isAdminOrGosat } = useRoles();
  const [activeTab, setActiveTab] = useState('flagged');
  const [loading, setLoading] = useState(true);
  const [chats, setChats] = useState<ChatRoom[]>([]);
  const [groups, setGroups] = useState<ChatRoom[]>([]);
  const [liveRooms, setLiveRooms] = useState<ChatRoom[]>([]);
  const [radioChannels, setRadioChannels] = useState<any[]>([]);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [flaggedCount, setFlaggedCount] = useState(0);

  useEffect(() => {
    if (!isAdminOrGosat) {
      toast.error('GoSat access required');
      return;
    }
    fetchAllContent();
    fetchFlaggedCount();
    setupRealtimeSubscriptions();
  }, [isAdminOrGosat, activeTab]);

  const fetchFlaggedCount = async () => {
    try {
      const { count, error } = await supabase
        .from('content_flags')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');
      
      if (!error) {
        setFlaggedCount(count || 0);
      }
    } catch (error) {
      console.error('Error fetching flagged count:', error);
    }
  };

  const fetchAllContent = async () => {
    try {
      setLoading(true);
      
      // Fetch 1-on-1 chats (direct messages)
      const { data: directChats, error: chatsError } = await supabase
        .from('chat_rooms')
        .select('*, creator:created_by(display_name, avatar_url)')
        .eq('room_type', 'direct')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(50);

      if (chatsError) throw chatsError;

      // Fetch community groups
      const { data: communityGroups, error: groupsError } = await supabase
        .from('chat_rooms')
        .select('*, creator:created_by(display_name, avatar_url)')
        .eq('room_type', 'group')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(50);

      if (groupsError) throw groupsError;

      // Fetch live rooms (using valid room types)
      const { data: liveRoomsData, error: roomsError } = await supabase
        .from('chat_rooms')
        .select('*, creator:created_by(display_name, avatar_url)')
        .in('room_type', ['live_conference', 'live_marketing', 'live_podcast', 'live_study', 'live_training'])
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(50);

      if (roomsError) throw roomsError;

      // Radio channels - table doesn't exist yet, use empty array
      const radioData: any[] = [];

      // Announcements - table doesn't exist yet, use empty array
      const announcementsData: any[] = [];

      // Get participant counts for each room
      const enrichWithCounts = async (rooms: any[]) => {
        return Promise.all(rooms.map(async (room) => {
          const { count } = await supabase
            .from('chat_participants')
            .select('*', { count: 'exact', head: true })
            .eq('room_id', room.id)
            .eq('is_active', true);
          return { ...room, participant_count: count || 0 };
        }));
      };

      setChats(await enrichWithCounts(directChats || []));
      setGroups(await enrichWithCounts(communityGroups || []));
      setLiveRooms(await enrichWithCounts(liveRoomsData || []));
      setRadioChannels(radioData || []);
      setAnnouncements(announcementsData || []);

    } catch (error: any) {
      console.error('Error fetching content:', error);
      toast.error('Failed to load monitoring data');
    } finally {
      setLoading(false);
    }
  };

  const setupRealtimeSubscriptions = () => {
    // Subscribe to chat_rooms changes
    const roomsChannel = supabase
      .channel('gosat-ghost-monitor-rooms')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'chat_rooms',
        },
        () => {
          fetchAllContent();
        }
      )
      .subscribe();

    // Subscribe to content_flags changes
    const flagsChannel = supabase
      .channel('gosat-ghost-monitor-flags')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'content_flags',
        },
        () => {
          fetchFlaggedCount();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(roomsChannel);
      supabase.removeChannel(flagsChannel);
    };
  };

  const handleDelete = async (roomId: string) => {
    if (!confirm('Are you sure you want to delete this content?')) return;

    try {
      const { error } = await supabase
        .from('chat_rooms')
        .update({ is_active: false })
        .eq('id', roomId);

      if (error) throw error;

      toast.success('Content deleted');
      fetchAllContent();
    } catch (error: any) {
      toast.error('Failed to delete: ' + error.message);
    }
  };

  const handleApprove = async (roomId: string) => {
    try {
      // Mark as reviewed/approved
      toast.success('Content approved');
      fetchAllContent();
    } catch (error: any) {
      toast.error('Failed to approve: ' + error.message);
    }
  };

  if (!isAdminOrGosat) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <Shield className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">GoSat access required</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <Card className="bg-gradient-to-r from-amber-500/20 to-purple-500/20 border-amber-500/30">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div>
                <h2 className="text-lg font-bold text-amber-300 flex items-center gap-2">
                  <Shield className="w-5 h-5" />
                  GoSat's Ghost Access – Real-Time Community Oversight
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Silently monitor & moderate every new chat, room, radio, or community created by users
                </p>
              </div>
              <GoSatAlertBadge />
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                fetchAllContent();
                fetchFlaggedCount();
              }}
              className="border-amber-500/30 text-amber-300"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Lock Icon Notice */}
      <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground bg-muted/50 p-2 rounded">
        <Shield className="w-4 h-4" />
        <span>Users cannot see GoSat presence – 100% hidden monitoring</span>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="flagged" className="relative">
            <Flag className="w-4 h-4 mr-2" />
            Flagged Content
            {flaggedCount > 0 && (
              <Badge className="ml-2 bg-destructive text-destructive-foreground text-xs">
                {flaggedCount}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="chats">
            <MessageSquare className="w-4 h-4 mr-2" />
            1-on-1 Chats ({chats.length})
          </TabsTrigger>
          <TabsTrigger value="groups">
            <Users className="w-4 h-4 mr-2" />
            Community Groups ({groups.length})
          </TabsTrigger>
          <TabsTrigger value="rooms">
            <Mic className="w-4 h-4 mr-2" />
            Live Rooms ({liveRooms.length})
          </TabsTrigger>
          <TabsTrigger value="radio">
            <Radio className="w-4 h-4 mr-2" />
            Radio Channels ({radioChannels.length})
          </TabsTrigger>
          <TabsTrigger value="announcements">
            <AlertCircle className="w-4 h-4 mr-2" />
            Announcements ({announcements.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="flagged" className="mt-4">
          <FlaggedContentTab />
        </TabsContent>

        <TabsContent value="chats" className="mt-4">
          <ChatRoomMonitorTab 
            rooms={chats} 
            loading={loading} 
            onDelete={handleDelete} 
            onApprove={handleApprove} 
          />
        </TabsContent>

        <TabsContent value="groups" className="mt-4">
          <ChatRoomMonitorTab 
            rooms={groups} 
            loading={loading} 
            onDelete={handleDelete} 
            onApprove={handleApprove} 
          />
        </TabsContent>

        <TabsContent value="rooms" className="mt-4">
          <ChatRoomMonitorTab 
            rooms={liveRooms} 
            loading={loading} 
            onDelete={handleDelete} 
            onApprove={handleApprove} 
          />
        </TabsContent>

        <TabsContent value="radio" className="mt-4">
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              {radioChannels.length === 0 ? 'No radio channels found' : `${radioChannels.length} radio channels`}
            </div>
          )}
        </TabsContent>

        <TabsContent value="announcements" className="mt-4">
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              {announcements.length === 0 ? 'No announcements found' : `${announcements.length} announcements`}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
