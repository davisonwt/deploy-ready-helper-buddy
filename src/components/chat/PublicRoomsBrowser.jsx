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
  BookOpen
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';
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

  useEffect(() => {
    fetchPublicRooms();
    fetchPremiumRooms();
  }, []);

  useEffect(() => {
    if (premiumRooms.length > 0) {
      checkUserAccess();
    }
  }, [premiumRooms]);

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
            {categoryFilters.map(({ key, label, icon: Icon }) => (
              <Button
                key={key}
                variant={categoryFilter === key ? "default" : "outline"}
                size="sm"
                onClick={() => setCategoryFilter(key)}
                className={`${
                  categoryFilter === key 
                    ? 'bg-primary text-white' 
                    : 'bg-white/10 border-white/30 text-white hover:bg-white/20'
                }`}
              >
                <Icon className="h-3 w-3 mr-1" />
                {label}
              </Button>
            ))}
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
                  {filteredPublicRooms.map((room) => (
                    <Card key={room.id} className="bg-white/5 border-white/10 hover:bg-white/10 transition-all duration-200">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <h4 className="font-medium text-white">{room.name}</h4>
                            {room.description && (
                              <p className="text-sm text-white/70 mt-1 line-clamp-1">
                                {room.description}
                              </p>
                            )}
                            <div className="flex items-center gap-2 mt-2">
                              <div className="flex items-center gap-1 text-xs text-white/60">
                                <Users className="h-3 w-3" />
                                <span>{room.chat_participants?.length || 0} members</span>
                              </div>
                              {room.category && (
                                <Badge variant="outline" className="text-xs border-white/30 text-white/80">
                                  {room.category}
                                </Badge>
                              )}
                            </div>
                          </div>
                          <Button 
                            size="sm"
                            onClick={() => onJoinRoom(room.id)}
                            className="bg-blue-600 hover:bg-blue-700 text-white"
                          >
                            Join
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
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