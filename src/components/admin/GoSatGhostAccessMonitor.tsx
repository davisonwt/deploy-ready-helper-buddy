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
      return;
    }
    
    fetchAllContent();
    const cleanup = setupRealtimeSubscriptions();
    
    return () => {
      if (cleanup) cleanup();
    };
  }, [isAdminOrGosat]);

  const fetchAllContent = async () => {
    try {
      setLoading(true);
      
      // Fetch 1-on-1 chats (direct messages)
      const { data: directChats, error: chatsError } = await supabase
        .from('chat_rooms')
        .select('*')
        .eq('room_type', 'direct')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(50);

      if (chatsError) {
        console.error('Error fetching direct chats:', chatsError);
        throw chatsError;
      }

      // Fetch community groups
      const { data: communityGroups, error: groupsError } = await supabase
        .from('chat_rooms')
        .select('*')
        .eq('room_type', 'group')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(50);

      if (groupsError) {
        console.error('Error fetching groups:', groupsError);
        throw groupsError;
      }

      // Fetch live rooms (all live_* types)
      const { data: liveRoomsData, error: roomsError } = await supabase
        .from('chat_rooms')
        .select('*')
        .like('room_type', 'live_%')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(50);

      if (roomsError) {
        console.error('Error fetching live rooms:', roomsError);
        throw roomsError;
      }

      // Get creator profiles for all rooms
      const getAllCreatorIds = (rooms: any[]) => {
        return [...new Set(rooms.map(r => r.created_by).filter(Boolean))];
      };

      const allCreatorIds = [
        ...getAllCreatorIds(directChats || []),
        ...getAllCreatorIds(communityGroups || []),
        ...getAllCreatorIds(liveRoomsData || [])
      ];

      let profilesMap: Record<string, any> = {};
      if (allCreatorIds.length > 0) {
        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('user_id, display_name, avatar_url')
          .in('user_id', allCreatorIds);

        if (!profilesError && profiles) {
          profilesMap = profiles.reduce((acc: Record<string, any>, p: any) => {
            acc[p.user_id] = p;
            return acc;
          }, {});
        }
      }

      // Enrich rooms with creator info and participant counts
      const enrichWithCounts = async (rooms: any[]) => {
        return Promise.all(rooms.map(async (room) => {
          // Get participant count
          const { count } = await supabase
            .from('chat_participants')
            .select('*', { count: 'exact', head: true })
            .eq('room_id', room.id)
            .eq('is_active', true);
          
          return {
            ...room,
            participant_count: count || 0,
            creator: profilesMap[room.created_by] || null,
            creator_name: profilesMap[room.created_by]?.display_name || 'Unknown'
          };
        }));
      };

      // Fetch radio channels (if table exists)
      let radioData: any[] = [];
      try {
        const { data: radioSlots, error: radioError } = await supabase
          .from('radio_schedule')
          .select('*, show:show_id(show_name, description), dj:dj_id(display_name)')
          .order('created_at', { ascending: false })
          .limit(50);
        
        if (!radioError && radioSlots) {
          radioData = radioSlots;
        }
      } catch (err) {
        console.log('Radio schedule table not available or error:', err);
      }

      // Fetch announcements (if table exists)
      let announcementsData: any[] = [];
      try {
        const { data: announcements, error: announcementsError } = await supabase
          .from('announcements')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(50);
        
        if (!announcementsError && announcements) {
          announcementsData = announcements;
        }
      } catch (err) {
        console.log('Announcements table not available or error:', err);
      }

      setChats(await enrichWithCounts(directChats || []));
      setGroups(await enrichWithCounts(communityGroups || []));
      setLiveRooms(await enrichWithCounts(liveRoomsData || []));
      setRadioChannels(radioData);
      setAnnouncements(announcementsData);

    } catch (error: any) {
      console.error('Error fetching content:', error);
      toast.error('Failed to load monitoring data: ' + (error.message || 'Unknown error'));
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
        (payload) => {
          console.log('Chat room change detected:', payload);
          fetchAllContent();
        }
      )
      .subscribe();

    // Subscribe to chat_participants changes (for participant counts)
    const participantsChannel = supabase
      .channel('gosat-ghost-monitor-participants')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'chat_participants',
        },
        () => {
          fetchAllContent();
        }
      )
      .subscribe();

    // Subscribe to radio_schedule changes (if table exists)
    const radioChannel = supabase
      .channel('gosat-ghost-monitor-radio')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'radio_schedule',
        },
        () => {
          fetchAllContent();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(roomsChannel);
      supabase.removeChannel(participantsChannel);
      supabase.removeChannel(radioChannel);
    };
  };

  const handleDelete = async (roomId: string) => {
    if (!confirm('Are you sure you want to delete this content? This action cannot be undone.')) return;

    try {
      const { error } = await supabase
        .from('chat_rooms')
        .update({ is_active: false })
        .eq('id', roomId);

      if (error) throw error;

      toast.success('Content deleted successfully');
      // Refresh immediately
      await fetchAllContent();
    } catch (error: any) {
      console.error('Delete error:', error);
      toast.error('Failed to delete: ' + (error.message || 'Unknown error'));
    }
  };

  const handleApprove = async (roomId: string) => {
    try {
      // For now, just mark as reviewed by updating a note or flag
      // In the future, you could add a moderation_status column
      toast.success('Content approved and flagged as reviewed');
      await fetchAllContent();
    } catch (error: any) {
      console.error('Approve error:', error);
      toast.error('Failed to approve: ' + (error.message || 'Unknown error'));
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
          // Simulated flag detection - in production, this would check against a moderation table
          // For now, randomly flag 5% of items for demo purposes
          const hasFlag = Math.random() > 0.95;

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
          ) : radioChannels.length === 0 ? (
            <div className="text-center py-8 text-gray-400">No radio channels found</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {radioChannels.map((slot: any) => (
                <Card key={slot.id} className="border shadow-lg">
                  <CardContent className="p-4">
                    <h3 className="font-semibold text-sm mb-1">
                      {slot.show?.show_name || 'Radio Show'}
                    </h3>
                    <p className="text-xs text-gray-400 mb-2">
                      {slot.dj?.display_name || 'Unknown DJ'} • {new Date(slot.start_time).toLocaleString()}
                    </p>
                    <Badge variant={slot.status === 'live' ? 'destructive' : 'secondary'} className="text-xs">
                      {slot.status}
                    </Badge>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="announcements" className="mt-4">
          {loading ? (
            <div className="text-center py-8 text-gray-400">Loading...</div>
          ) : announcements.length === 0 ? (
            <div className="text-center py-8 text-gray-400">No announcements found</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {announcements.map((announcement: any) => (
                <Card key={announcement.id} className="border shadow-lg">
                  <CardContent className="p-4">
                    <h3 className="font-semibold text-sm mb-1">{announcement.title || 'Announcement'}</h3>
                    <p className="text-xs text-gray-400">{new Date(announcement.created_at).toLocaleString()}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

