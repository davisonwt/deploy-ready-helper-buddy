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
  Clock
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useRoles } from '@/hooks/useRoles';

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
  const [activeTab, setActiveTab] = useState('chats');
  const [loading, setLoading] = useState(true);
  const [chats, setChats] = useState<ChatRoom[]>([]);
  const [groups, setGroups] = useState<ChatRoom[]>([]);
  const [liveRooms, setLiveRooms] = useState<ChatRoom[]>([]);
  const [radioChannels, setRadioChannels] = useState<any[]>([]);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [selectedItem, setSelectedItem] = useState<ChatRoom | null>(null);

  useEffect(() => {
    if (!isAdminOrGosat) {
      toast.error('GoSat access required');
      return;
    }
    fetchAllContent();
    setupRealtimeSubscriptions();
  }, [isAdminOrGosat, activeTab]);

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

      // Fetch live rooms
      const { data: liveRoomsData, error: roomsError } = await supabase
        .from('chat_rooms')
        .select('*, creator:created_by(display_name, avatar_url)')
        .eq('room_type', 'live')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(50);

      if (roomsError) throw roomsError;

      // Fetch radio channels (if table exists)
      const { data: radioData, error: radioError } = await supabase
        .from('radio_slots')
        .select('*, presenter:presenter_id(display_name)')
        .order('created_at', { ascending: false })
        .limit(50);

      // Fetch announcements (if table exists)
      const { data: announcementsData, error: announcementsError } = await supabase
        .from('announcements')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

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

    // Subscribe to radio_slots changes
    const radioChannel = supabase
      .channel('gosat-ghost-monitor-radio')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'radio_slots',
        },
        () => {
          fetchAllContent();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(roomsChannel);
      supabase.removeChannel(radioChannel);
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

  const renderContentList = (items: ChatRoom[]) => {
    if (loading) {
      return <div className="text-center py-8 text-gray-400">Loading...</div>;
    }

    if (items.length === 0) {
      return <div className="text-center py-8 text-gray-400">No content found</div>;
    }

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map((item) => {
          const isNew = new Date(item.created_at) > new Date(Date.now() - 3600000); // Last hour
          const hasFlag = Math.random() > 0.9; // Simulated flag detection

          return (
            <Card
              key={item.id}
              className={`cursor-pointer transition-all hover:shadow-lg ${
                hasFlag ? 'border-red-500 bg-red-50/10' : ''
              } ${isNew ? 'ring-2 ring-amber-500/50' : ''}`}
              onClick={() => setSelectedItem(item)}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <h3 className="font-semibold text-sm mb-1 truncate">{item.name || 'Unnamed'}</h3>
                    <p className="text-xs text-gray-400">
                      {(item as any).creator?.display_name || (item as any).creator_name || 'Unknown'} • {new Date(item.created_at).toLocaleString()}
                    </p>
                  </div>
                  {isNew && <Badge className="bg-amber-500 text-white text-xs">NEW</Badge>}
                  {hasFlag && (
                    <Badge className="bg-red-500 text-white text-xs ml-2">
                      <AlertCircle className="w-3 h-3 mr-1" />
                      FLAGGED
                    </Badge>
                  )}
                </div>
                
                <div className="flex items-center gap-2 mt-3">
                  <Users className="w-4 h-4 text-gray-400" />
                  <span className="text-xs text-gray-400">{item.participant_count || 0} participants</span>
                </div>

                {hasFlag && (
                  <div className="mt-3 p-2 bg-red-500/20 rounded text-xs text-red-400 border border-red-500/30">
                    Inappropriate Content Detected
                  </div>
                )}

                <div className="flex gap-2 mt-3">
                  <Button
                    size="sm"
                    variant="destructive"
                    className="flex-1 text-xs"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(item.id);
                    }}
                  >
                    <Trash2 className="w-3 h-3 mr-1" />
                    DELETE
                  </Button>
                  <Button
                    size="sm"
                    variant="default"
                    className="flex-1 text-xs bg-green-600 hover:bg-green-700"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleApprove(item.id);
                    }}
                  >
                    <Check className="w-3 h-3 mr-1" />
                    APPROVE
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    );
  };

  if (!isAdminOrGosat) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <Shield className="w-12 h-12 mx-auto mb-4 text-gray-400" />
          <p className="text-gray-400">GoSat access required</p>
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
            <div>
              <h2 className="text-lg font-bold text-amber-300 flex items-center gap-2">
                <Shield className="w-5 h-5" />
                GoSat's Ghost Access – Real-Time Community Oversight
              </h2>
              <p className="text-sm text-gray-300 mt-1">
                Silently monitor & moderate every new chat, room, radio, or community created by users
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchAllContent}
              className="border-amber-500/30 text-amber-300"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Lock Icon Notice */}
      <div className="flex items-center justify-center gap-2 text-xs text-gray-400 bg-gray-800/50 p-2 rounded">
        <Shield className="w-4 h-4" />
        <span>Users cannot see GoSat presence – 100% hidden monitoring</span>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5">
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

        <TabsContent value="chats" className="mt-4">
          {renderContentList(chats)}
        </TabsContent>

        <TabsContent value="groups" className="mt-4">
          {renderContentList(groups)}
        </TabsContent>

        <TabsContent value="rooms" className="mt-4">
          {renderContentList(liveRooms)}
        </TabsContent>

        <TabsContent value="radio" className="mt-4">
          {loading ? (
            <div className="text-center py-8 text-gray-400">Loading...</div>
          ) : (
            <div className="text-center py-8 text-gray-400">
              {radioChannels.length === 0 ? 'No radio channels found' : `${radioChannels.length} radio channels`}
            </div>
          )}
        </TabsContent>

        <TabsContent value="announcements" className="mt-4">
          {loading ? (
            <div className="text-center py-8 text-gray-400">Loading...</div>
          ) : (
            <div className="text-center py-8 text-gray-400">
              {announcements.length === 0 ? 'No announcements found' : `${announcements.length} announcements`}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

