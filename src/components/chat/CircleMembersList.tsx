import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { X, MessageSquare } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface CircleMember {
  id: string;
  user_id: string;
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
  bio: string | null;
}

interface CircleMembersListProps {
  circleId: string;
  circleName: string;
  onMemberRemove?: (userId: string) => void;
  onStartChat?: (userId: string) => void;
}

export function CircleMembersList({ 
  circleId, 
  circleName,
  onMemberRemove,
  onStartChat 
}: CircleMembersListProps) {
  const [members, setMembers] = useState<CircleMember[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadMembers();
  }, [circleId]);

  const loadMembers = async () => {
    try {
      // Get circle members
      const { data: membersData, error } = await supabase
        .from('circle_members')
        .select(`
          id,
          user_id,
          profiles!circle_members_user_id_fkey (
            user_id,
            username,
            first_name,
            last_name,
            avatar_url,
            bio
          )
        `)
        .eq('circle_id', circleId);

      if (error) {
        console.error('Error loading circle members:', error);
        setMembers([]);
        return;
      }

      const formattedMembers: CircleMember[] = (membersData || []).map((m: any) => {
        const profile = m.profiles;
        return {
          id: m.id,
          user_id: m.user_id,
          username: profile?.username || null,
          full_name: profile?.username || `${profile?.first_name || ''} ${profile?.last_name || ''}`.trim() || null,
          avatar_url: profile?.avatar_url || null,
          bio: profile?.bio || null,
        };
      }).filter((m: CircleMember) => m.full_name);

      setMembers(formattedMembers);
      setLoading(false);
    } catch (error) {
      console.error('Error loading members:', error);
      setMembers([]);
      setLoading(false);
    }
  };

  const handleRemoveMember = async (memberId: string, userId: string, name: string) => {
    const { error } = await supabase
      .from('circle_members')
      .delete()
      .eq('id', memberId);

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to remove member',
        variant: 'destructive',
      });
      return;
    }

    toast({
      title: 'Removed',
      description: `${name} removed from ${circleName}`,
    });

    setMembers(prev => prev.filter(m => m.id !== memberId));
    onMemberRemove?.(userId);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (members.length === 0) {
    return (
      <div className="text-center p-8">
        <p className="text-muted-foreground">No members yet</p>
        <p className="text-sm text-muted-foreground mt-1">Add people using the swipe deck</p>
      </div>
    );
  }

  return (
    <div className="space-y-2 p-4">
      <AnimatePresence mode="popLayout">
        {members.map((member, index) => (
          <motion.div
            key={member.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ delay: index * 0.05 }}
            className="group relative"
          >
            <div className="flex items-center gap-3 p-3 rounded-xl bg-card/50 backdrop-blur border border-border/50 hover:bg-card/80 hover:border-primary/30 transition-all">
              <Avatar className="h-12 w-12 ring-2 ring-primary/20">
                <AvatarImage src={member.avatar_url || undefined} />
                <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/10">
                  {(member.full_name || 'U').charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>

              <div className="flex-1 min-w-0">
                <p className="font-semibold truncate">{member.full_name || 'Anonymous'}</p>
                {member.bio && (
                  <p className="text-xs text-muted-foreground truncate">{member.bio}</p>
                )}
              </div>

              <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => onStartChat?.(member.user_id)}
                  className="h-8 w-8 p-0 rounded-full"
                >
                  <MessageSquare className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleRemoveMember(member.id, member.user_id, member.full_name || 'Member')}
                  className="h-8 w-8 p-0 rounded-full text-destructive hover:text-destructive hover:bg-destructive/10"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>

      <div className="text-center pt-2">
        <Badge variant="secondary" className="text-xs">
          {members.length} {members.length === 1 ? 'member' : 'members'}
        </Badge>
      </div>
    </div>
  );
}
