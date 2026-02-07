import { UserTree } from './types';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { X, User, Trophy, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';

interface TreeProfileCardProps {
  user: UserTree;
  onClose: () => void;
  rank: number;
}

export function TreeProfileCard({ user, onClose, rank }: TreeProfileCardProps) {
  const isTop10 = rank <= 10;
  const treeEmoji = user.level >= 20 ? '🌳' : user.level >= 10 ? '🌲' : '🌱';
  
  return (
    <Card className="absolute z-50 w-72 bg-background/95 backdrop-blur-md border-primary/20 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
      <CardHeader className="pb-2 relative">
        <button
          onClick={onClose}
          className="absolute right-2 top-2 p-1 rounded-full hover:bg-muted transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
        
        <div className="flex items-center gap-3">
          <Avatar className="h-14 w-14 border-2 border-primary/30">
            <AvatarImage src={user.avatarUrl} alt={user.name} />
            <AvatarFallback className="bg-primary/20 text-lg">
              {user.name.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-lg truncate">{user.name}</h3>
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <span className="text-lg">{treeEmoji}</span>
              <span>Ring {user.ring}</span>
              {isTop10 && (
                <span className="flex items-center gap-1 text-yellow-500">
                  <Trophy className="h-3 w-3" />
                  #{rank}
                </span>
              )}
            </div>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-muted/50 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-primary">{user.level}</div>
            <div className="text-xs text-muted-foreground">Level</div>
          </div>
          <div className="bg-muted/50 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-primary">{user.xp.toLocaleString()}</div>
            <div className="text-xs text-muted-foreground">XP</div>
          </div>
        </div>
        
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Sparkles className="h-4 w-4" />
          <span>
            {user.treeStyle === 'layered' ? 'Ancient Wisdom Tree' : 
             user.treeStyle === 'pointed' ? 'Growing Strong' : 
             'Young Seedling'}
          </span>
        </div>
        
        <Button asChild className="w-full">
          <Link to={`/sower/${user.id}`}>
            <User className="h-4 w-4 mr-2" />
            View Full Profile
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}
