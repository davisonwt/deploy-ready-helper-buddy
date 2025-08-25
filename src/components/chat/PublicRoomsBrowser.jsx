import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { 
  Search,
  Users,
  MessageSquare,
  Filter,
  Sparkles,
  ChefHat,
  Hammer,
  Heart,
  Briefcase,
  Mic,
  BookOpen,
  Trash2
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import PremiumRoomCard from './PremiumRoomCard';

const categoryFilters = [
  { key: 'all', label: 'All Rooms', icon: MessageSquare },
  { key: 'marketing', label: 'Marketing', icon: Sparkles },
  { key: 'cooking_nutrition', label: 'Cooking & Nutrition', icon: ChefHat },
  { key: 'diy_home', label: 'DIY & Home', icon: Hammer },
  { key: 'natural_health', label: 'Natural Health', icon: Heart },
  { key: 'business_training', label: 'Business Training', icon: Briefcase },
  { key: 'podcasts_interviews', label: 'Podcasts', icon: Mic },
  { key: 'general_courses', label: 'General Courses', icon: BookOpen }
];

const PublicRoomsBrowser = ({ onJoinRoom, onNavigateToOrchard }) => {
  const { toast } = useToast();
  const [publicRooms, setPublicRooms] = useState([]);
  const [premiumRooms, setPremiumRooms] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [userAccess, setUserAccess] = useState({});
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    fetchPublicRooms();
    fetchPremiumRooms();
    getCurrentUser();
  }, []);

  useEffect(() => {
    if (premiumRooms.length > 0) {
      checkUserAccess();
    }
  }, [premiumRooms]);

  const getCurrentUser = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUser(user);
    } catch (error) {
      console.error('Error getting current user:', error);
    }
  };

  const fetchPublicRooms = async () => {
    try {
      const { data, error } = await supabase
        .from('chat_rooms')
        .select(`
          *,
          chat_participants(count)
        `)
        .eq('is_premium', false)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPublicRooms(data || []);
    } catch (error) {
      console.error('Error fetching public rooms:', error);
      toast({
        title: "Error",
        description: "Failed to load public rooms",
        variant: "destructive",
      });
    }
  };

  const fetchPremiumRooms = async () => {
    try {
      const { data, error } = await supabase
        .from('chat_rooms')
        .select(`
          *,
          orchards(*)
        `)
        .eq('is_premium', true)
        .eq('is_active', true)
        .not('orchard_id', 'is', null)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPremiumRooms(data || []);
    } catch (error) {
      console.error('Error fetching premium rooms:', error);
      toast({
        title: "Error",
        description: "Failed to load premium rooms",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const checkUserAccess = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const roomIds = premiumRooms.map(room => room.id);
      const orchardIds = premiumRooms.map(room => room.orchard_id).filter(Boolean);

      // Check bestowals for access
      const { data: bestowals, error } = await supabase
        .from('bestowals')
        .select('orchard_id, amount')
        .eq('bestower_id', user.id)
        .eq('payment_status', 'completed')
        .in('orchard_id', orchardIds);

      if (error) throw error;

      const accessMap = {};
      premiumRooms.forEach(room => {
        const userBestowal = bestowals?.find(b => b.orchard_id === room.orchard_id);
        accessMap[room.id] = userBestowal && userBestowal.amount >= room.required_bestowal_amount;
      });

      setUserAccess(accessMap);
    } catch (error) {
      console.error('Error checking user access:', error);
    }
  };

  const deleteRoom = async (roomId, roomName) => {
    try {
      const { error } = await supabase
        .from('chat_rooms')
        .delete()
        .eq('id', roomId);

      if (error) throw error;

      // Update the local state to remove the deleted room
      setPublicRooms(prevRooms => prevRooms.filter(room => room.id !== roomId));
      setPremiumRooms(prevRooms => prevRooms.filter(room => room.id !== roomId));

      toast({
        title: "Room Deleted",
        description: `"${roomName}" has been deleted successfully.`,
      });
    } catch (error) {
      console.error('Error deleting room:', error);
      toast({
        title: "Error",
        description: "Failed to delete room. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleJoinRequest = async (roomId, roomName) => {
    try {
      const { error } = await supabase
        .from('chat_join_requests')
        .insert({
          room_id: roomId,
          user_id: currentUser.id,
          message: `Request to join ${roomName}`
        });

      if (error) throw error;

      toast({
        title: "Join Request Sent",
        description: `Your request to join "${roomName}" has been sent to the moderators.`,
      });
    } catch (error) {
      console.error('Error sending join request:', error);
      toast({
        title: "Error",
        description: "Failed to send join request. Please try again.",
        variant: "destructive",
      });
    }
  };

  const isUserInRoom = (room) => {
    return room.chat_participants?.some(p => p.user_id === currentUser?.id && p.is_active);
  };

  const filteredPublicRooms = publicRooms.filter(room => {
    const matchesSearch = room.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         room.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || room.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const filteredPremiumRooms = premiumRooms.filter(room => {
    const matchesSearch = room.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         room.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || room.premium_category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  if (loading) {
    return (
      <Card className="bg-white/10 backdrop-blur-md border-white/20">
        <CardContent className="p-8 text-center">
          <div className="text-white">Loading rooms...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-white/10 backdrop-blur-md border-white/20 h-full flex flex-col">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-white">
          <MessageSquare className="h-5 w-5" />
          Discover Chatrooms
        </CardTitle>
        <div className="space-y-4">
          <Input
            placeholder="Search rooms..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="bg-white/10 border-white/20 text-white placeholder:text-white/60"
            icon={<Search className="h-4 w-4" />}
          />
          
          {/* Category Filters */}
          <div className="flex flex-wrap gap-2">
            {categoryFilters.map(({ key, label, icon: Icon }, index) => {
              const blueShades = [
                { bg: '#1E40AF', hover: '#1E3A8A' }, // All Rooms - Deep blue
                { bg: '#2563EB', hover: '#1D4ED8' }, // Marketing - Primary blue
                { bg: '#3B82F6', hover: '#2563EB' }, // Cooking & Nutrition - Medium blue
                { bg: '#60A5FA', hover: '#3B82F6' }, // DIY & Home - Light blue
                { bg: '#1976D2', hover: '#1565C0' }, // Natural Health - Material blue
                { bg: '#42A5F5', hover: '#1E88E5' }, // Business Training - Light material blue
                { bg: '#0288D1', hover: '#0277BD' }, // Podcasts - Cyan blue
                { bg: '#0097A7', hover: '#00838F' }, // General Courses - Teal blue
              ];
              const shade = blueShades[index] || blueShades[0];
              
              return (
                <Button
                  key={key}
                  variant="outline"
                  size="sm"
                  onClick={() => setCategoryFilter(key)}
                  style={{
                    backgroundColor: categoryFilter === key ? shade.bg : shade.bg + '80',
                    borderColor: shade.bg,
                    color: 'white',
                  }}
                  className={`transition-all duration-300 hover:shadow-md ${
                    categoryFilter === key 
                      ? 'shadow-lg ring-2 ring-white/30' 
                      : ''
                  }`}
                  onMouseEnter={(e) => {
                    e.target.style.backgroundColor = shade.hover;
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.backgroundColor = categoryFilter === key ? shade.bg : shade.bg + '80';
                  }}
                >
                  <Icon className="h-3 w-3 mr-1" />
                  {label}
                </Button>
              );
            })}
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex-1 min-h-0">
        <ScrollArea className="h-full pr-4">
          <div className="space-y-6">
            {/* Premium Life Orchards Section */}
            {filteredPremiumRooms.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <Sparkles className="h-5 w-5 text-yellow-400" />
                  <h3 className="text-lg font-semibold text-white">Life Orchards</h3>
                  <Badge className="bg-gradient-to-r from-yellow-500/20 to-orange-500/20 text-yellow-300 border-yellow-500/30">
                    Premium Content
                  </Badge>
                </div>
                <div className="grid gap-4">
                  {filteredPremiumRooms.map((room) => (
                    <PremiumRoomCard
                      key={room.id}
                      room={room}
                      orchard={room.orchards}
                      hasAccess={userAccess[room.id]}
                      onJoin={onJoinRoom}
                      onViewOrchard={onNavigateToOrchard}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Public Rooms Section */}
            {filteredPublicRooms.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <Users className="h-5 w-5 text-blue-400" />
                  <h3 className="text-lg font-semibold text-white">Public Rooms</h3>
                  <Badge variant="secondary" className="bg-blue-500/20 text-blue-300 border-blue-500/30">
                    Free to Join
                  </Badge>
                </div>
                <div className="grid gap-3">
                  {filteredPublicRooms.map((room, index) => {
                    // Use the same color scheme as category buttons
                    const blueShades = [
                      { bg: '#1E40AF', hover: '#1E3A8A' }, // Deep blue
                      { bg: '#2563EB', hover: '#1D4ED8' }, // Primary blue
                      { bg: '#3B82F6', hover: '#2563EB' }, // Medium blue
                      { bg: '#60A5FA', hover: '#3B82F6' }, // Light blue
                      { bg: '#1976D2', hover: '#1565C0' }, // Material blue
                      { bg: '#42A5F5', hover: '#1E88E5' }, // Light material blue
                      { bg: '#0288D1', hover: '#0277BD' }, // Cyan blue
                      { bg: '#0097A7', hover: '#00838F' }, // Teal blue
                    ];
                    const shade = blueShades[index % blueShades.length];
                    
                    return (
                      <Card 
                        key={room.id} 
                        className="backdrop-blur-md border-white/30 transition-all duration-300 shadow-lg hover:shadow-xl"
                        style={{
                          backgroundColor: shade.bg + '40', // 40 for transparency
                          borderColor: shade.bg + '60',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = shade.hover + '50';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = shade.bg + '40';
                        }}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <h4 className="font-medium text-white">{room.name}</h4>
                              {room.description && (
                                <p className="text-sm text-white/80 mt-1 line-clamp-1">
                                  {room.description}
                                </p>
                              )}
                              <div className="flex items-center gap-2 mt-2">
                                <div className="flex items-center gap-1 text-xs text-white/70">
                                  <Users className="h-3 w-3" />
                                  <span>{room.chat_participants?.length || 0} members</span>
                                </div>
                                {room.category && (
                                  <Badge variant="outline" className="text-xs border-white/40 text-white/90 bg-white/10">
                                    {room.category}
                                  </Badge>
                                )}
                              </div>
                            </div>
                          <div className="flex items-center gap-2">
                            {isUserInRoom(room) ? (
                              <Button 
                                size="sm"
                                onClick={() => onJoinRoom(room.id)}
                                className="bg-green-600 hover:bg-green-700 text-white font-semibold shadow-md"
                              >
                                Enter Room
                              </Button>
                            ) : (
                              <Button 
                                size="sm"
                                onClick={() => handleJoinRequest(room.id, room.name)}
                                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-md"
                              >
                                Request to Join
                              </Button>
                            )}
                            {currentUser && currentUser.id === room.created_by && (
                              <Button 
                                size="sm"
                                variant="destructive"
                                onClick={() => deleteRoom(room.id, room.name)}
                                className="bg-red-600 hover:bg-red-700 text-white font-semibold shadow-md"
                                title="Delete Room"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                    );
                  })}
                </div>
              </div>
            )}

            {/* No Results */}
            {filteredPublicRooms.length === 0 && filteredPremiumRooms.length === 0 && (
              <div className="text-center py-8">
                <MessageSquare className="h-12 w-12 mx-auto mb-4 text-white/50" />
                <h3 className="text-lg font-medium text-white mb-2">No rooms found</h3>
                <p className="text-white/70">
                  {searchTerm ? 'Try adjusting your search terms' : 'No rooms match your current filters'}
                </p>
              </div>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};

export default PublicRoomsBrowser;