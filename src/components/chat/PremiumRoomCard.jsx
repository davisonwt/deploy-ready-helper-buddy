import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Lock, 
  Users, 
  DollarSign, 
  MessageSquare,
  Sparkles,
  ExternalLink,
  ChefHat,
  Hammer,
  Heart,
  Briefcase,
  Mic,
  BookOpen
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

const categoryIcons = {
  marketing: Sparkles,
  cooking_nutrition: ChefHat,
  diy_home: Hammer,
  natural_health: Heart,
  business_training: Briefcase,
  podcasts_interviews: Mic,
  general_courses: BookOpen
};

const categoryColors = {
  marketing: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
  cooking_nutrition: 'bg-orange-500/20 text-orange-300 border-orange-500/30',
  diy_home: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  natural_health: 'bg-green-500/20 text-green-300 border-green-500/30',
  business_training: 'bg-red-500/20 text-red-300 border-red-500/30',
  podcasts_interviews: 'bg-pink-500/20 text-pink-300 border-pink-500/30',
  general_courses: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30'
};

const PremiumRoomCard = ({ room, orchard, hasAccess, onJoin, onViewOrchard }) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  
  const CategoryIcon = categoryIcons[room.premium_category] || BookOpen;
  const categoryStyle = categoryColors[room.premium_category] || categoryColors.general_courses;

  const handleJoin = async () => {
    setLoading(true);
    try {
      await onJoin(room.id);
      toast({
        title: "Joined Room",
        description: `Welcome to ${room.name}!`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to join room",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const formatCategoryName = (category) => {
    return category.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  return (
    <Card className="bg-white/10 backdrop-blur-md border-white/20 hover:bg-white/15 transition-all duration-300">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="flex items-center gap-2 text-white">
              <Lock className="h-4 w-4 text-yellow-400" />
              {room.name}
            </CardTitle>
            <div className="flex items-center gap-2 mt-2">
              <Badge className={`${categoryStyle} border`}>
                <CategoryIcon className="h-3 w-3 mr-1" />
                {formatCategoryName(room.premium_category)}
              </Badge>
              {hasAccess && (
                <Badge variant="secondary" className="bg-green-500/20 text-green-300 border-green-500/30">
                  Access Granted
                </Badge>
              )}
            </div>
          </div>
          <div className="text-right">
            <div className="flex items-center gap-1 text-yellow-400 font-semibold">
              <DollarSign className="h-4 w-4" />
              {room.required_bestowal_amount}
            </div>
            <p className="text-xs text-muted-foreground">Required</p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {room.description && (
          <p className="text-sm text-white/80 line-clamp-2">
            {room.description}
          </p>
        )}

        {room.access_description && (
          <div className="bg-white/5 rounded-lg p-3 border border-white/10">
            <p className="text-sm text-white/90">{room.access_description}</p>
          </div>
        )}

        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <Users className="h-4 w-4" />
            <span>Premium Members Only</span>
          </div>
          <div className="flex items-center gap-1">
            <MessageSquare className="h-4 w-4" />
            <span>Live Sessions</span>
          </div>
        </div>

        <div className="flex gap-2">
          {hasAccess ? (
            <Button 
              onClick={handleJoin}
              disabled={loading}
              className="flex-1 bg-green-600 hover:bg-green-700 text-white"
            >
              {loading ? "Joining..." : "Join Room"}
            </Button>
          ) : (
            <>
              <Button 
                onClick={() => onViewOrchard(orchard.id)}
                variant="outline"  
                className="flex-1 border-white/30 text-white hover:bg-white/10"
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                View Orchard
              </Button>
              <Button 
                onClick={() => onViewOrchard(orchard.id)}
                className="bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white"
              >
                Bestow to Join
              </Button>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default PremiumRoomCard;