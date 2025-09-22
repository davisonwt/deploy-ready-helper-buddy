import { useAuth } from '@/hooks/useAuth';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Navigate } from 'react-router-dom';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Crown, Lock, Star, Gift } from 'lucide-react';
import { ReactNode } from 'react';

interface PremiumRoomGuardProps {
  roomId: string;
  children: ReactNode;
}

const PremiumRoomGuard = ({ roomId, children }: PremiumRoomGuardProps) => {
  const { user } = useAuth();

  // Check if user has premium access through bestowals
  const { data: hasAccess, isLoading: accessLoading } = useQuery({
    queryKey: ['premium-room-access', roomId, user?.id],
    queryFn: async () => {
      if (!user) return false;
      
      const { data, error } = await supabase.rpc('user_has_premium_room_access', {
        room_id_param: roomId,
        user_id_param: user.id
      });
      
      if (error) {
        console.error('Error checking premium access:', error);
        return false;
      }
      
      return data;
    },
    enabled: !!user && !!roomId,
  });

  // Get room details
  const { data: room, isLoading: roomLoading } = useQuery({
    queryKey: ['room-details', roomId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('chat_rooms')
        .select(`
          *,
          orchards!chat_rooms_orchard_id_fkey(
            title,
            description,
            pocket_price
          )
        `)
        .eq('id', roomId)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!roomId,
  });

  if (accessLoading || roomLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // If not a premium room, allow access
  if (!room?.is_premium) {
    return <>{children}</>;
  }

  // If user has access, allow through
  if (hasAccess) {
    return <>{children}</>;
  }

  // Block access and show premium upgrade UI
  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md mx-auto bg-white/90 backdrop-blur-sm shadow-xl border-2 border-amber-200">
        <CardHeader className="text-center pb-4">
          <div className="flex justify-center mb-4">
            <div className="relative">
              <div className="w-20 h-20 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full flex items-center justify-center">
                <Crown className="h-10 w-10 text-white" />
              </div>
              <div className="absolute -top-1 -right-1">
                <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                  <Star className="h-4 w-4 text-white" />
                </div>
              </div>
            </div>
          </div>
          <CardTitle className="text-2xl font-bold text-gray-800 mb-2">
            <Lock className="inline h-6 w-6 mr-2 text-amber-600" />
            Premium Room
          </CardTitle>
          <div className="space-y-2">
            <Badge variant="secondary" className="bg-gradient-to-r from-amber-500 to-orange-500 text-white border-none">
              {room.premium_category || 'Exclusive Content'}
            </Badge>
            <p className="text-gray-600 text-sm">
              {room.access_description || 'This is an exclusive premium room with special content.'}
            </p>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Room Info */}
          <div className="bg-gradient-to-r from-amber-50 to-orange-50 p-4 rounded-lg border border-amber-200">
            <h3 className="font-semibold text-gray-800 mb-2">{room.name}</h3>
            <p className="text-sm text-gray-600 mb-3">{room.description}</p>
            
            {room.orchards && (
              <div className="space-y-2">
                <p className="text-sm font-medium text-gray-700">
                  💰 Minimum Contribution: ${room.required_bestowal_amount || room.orchards.pocket_price}
                </p>
                <p className="text-xs text-gray-500">
                  Support "{room.orchards.title}" to unlock access
                </p>
              </div>
            )}
          </div>

          {/* Access Requirements */}
          <div className="space-y-3">
            <h4 className="font-semibold text-gray-800 flex items-center gap-2">
              <Gift className="h-5 w-5 text-amber-600" />
              How to Get Access
            </h4>
            <div className="space-y-2 text-sm text-gray-600">
              <div className="flex items-start gap-2">
                <span className="flex-shrink-0 w-6 h-6 bg-amber-100 text-amber-700 rounded-full flex items-center justify-center text-xs font-bold">1</span>
                <span>Find the associated orchard project</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="flex-shrink-0 w-6 h-6 bg-amber-100 text-amber-700 rounded-full flex items-center justify-center text-xs font-bold">2</span>
                <span>Make a contribution of ${room.required_bestowal_amount || room.orchards?.pocket_price || '150'} or more</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="flex-shrink-0 w-6 h-6 bg-amber-100 text-amber-700 rounded-full flex items-center justify-center text-xs font-bold">3</span>
                <span>Return here to access exclusive content</span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3">
            {room.orchard_id ? (
              <Button 
                onClick={() => window.location.href = `/orchard/${room.orchard_id}`}
                className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-semibold py-3 rounded-lg shadow-lg"
              >
                <Gift className="h-5 w-5 mr-2" />
                Support This Project
              </Button>
            ) : (
              <Button 
                onClick={() => window.location.href = '/browse-orchards'}
                className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-semibold py-3 rounded-lg shadow-lg"
              >
                <Gift className="h-5 w-5 mr-2" />
                Browse Projects
              </Button>
            )}
            
            <Button 
              variant="outline" 
              onClick={() => window.location.href = '/chatapp'}
              className="w-full border-amber-300 text-amber-700 hover:bg-amber-50"
            >
              Back to Chat Rooms
            </Button>
          </div>

          {/* Premium Benefits */}
          <div className="bg-gradient-to-r from-purple-50 to-pink-50 p-4 rounded-lg border border-purple-200">
            <h4 className="font-semibold text-gray-800 mb-2 flex items-center gap-2">
              <Star className="h-5 w-5 text-purple-600" />
              Premium Benefits
            </h4>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• Exclusive community discussions</li>
              <li>• Direct access to project creators</li>
              <li>• Priority support and updates</li>
              <li>• Special contributor recognition</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PremiumRoomGuard;