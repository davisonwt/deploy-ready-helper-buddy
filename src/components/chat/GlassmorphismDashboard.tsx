import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import { 
  MessageSquare, 
  Users, 
  GraduationCap, 
  Radio, 
  BookOpen,
  Mic,
  Video,
  Bell,
  Search,
  Plus,
  Flame,
  TrendingUp,
  Activity,
  Zap,
  X,
  UserPlus
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { CirclesBubbleRail, Circle } from './CirclesBubbleRail';
import { SwipeDeck } from './SwipeDeck';
import { CircleMembersList } from './CircleMembersList';
import { supabase } from '@/integrations/supabase/client';
import { ArrowLeft, UserPlus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ActivityUpdate {
  id: string;
  type: 'chat' | 'community' | 'classroom' | 'radio' | 'training';
  user?: {
    name: string;
    avatar?: string;
  };
  title: string;
  message: string;
  timestamp: Date;
  unread?: number;
  badge?: string;
}

interface GlassmorphismDashboardProps {
  onNavigate?: (mode: string) => void;
  circles?: Circle[];
  activeCircleId?: string;
  circleMembers?: Array<{
    id: string;
    user_id: string;
    display_name?: string;
    full_name?: string;
    avatar_url?: string;
    is_sower?: boolean;
    is_bestower?: boolean;
    is_gosat?: boolean;
  }>;
  loadingMembers?: boolean;
  onCircleSelect?: (circleId: string) => void;
  onCircleDeselect?: () => void;
  onStartChat?: (userId: string) => void;
  onStartCall?: (userId: string, callType: 'audio' | 'video') => void;
  onNavigateToTraining?: (userId: string) => void;
  onNavigateToRadio?: (userId: string) => void;
  onAddPeople?: () => void;
  onMemberRemoved?: () => void;
}

// Component to show users not in any circle
function AvailableUsersSection({ circles, onAddToCircle }: { circles: Circle[], onAddToCircle: (userId: string, userName: string, circleId: string) => void }) {
  const [availableUsers, setAvailableUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadAvailableUsers();
  }, [circles]);

  const loadAvailableUsers = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get all users in circles
      const { data: circleMembersData } = await supabase
        .from('circle_members')
        .select('user_id');
      
      const usersInCircles = new Set((circleMembersData || []).map((m: any) => m.user_id));

      // Get all profiles except current user
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, user_id, display_name, first_name, last_name, avatar_url')
        .neq('user_id', user.id)
        .limit(50);

      // Filter out users already in circles
      const available = (profilesData || []).filter((p: any) => !usersInCircles.has(p.user_id));
      setAvailableUsers(available);
    } catch (error) {
      console.error('Error loading available users:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card variant="glass" className="backdrop-blur-xl bg-charcoal/60 border-amber-500/20 mb-6">
        <CardContent className="p-6">
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (availableUsers.length === 0) {
    return null;
  }

  return (
    <Card variant="glass" className="backdrop-blur-xl bg-charcoal/60 border-amber-500/20 mb-6">
      <CardHeader>
        <CardTitle className="text-amber-200 flex items-center gap-2">
          <UserPlus className="h-5 w-5" />
          Available to Add to Circles
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-4">
          {availableUsers.map((user) => (
            <AvailableUserCard
              key={user.user_id}
              user={user}
              circles={circles}
              onAddToCircle={onAddToCircle}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function AvailableUserCard({ user, circles, onAddToCircle }: { user: any, circles: Circle[], onAddToCircle: (userId: string, userName: string, circleId: string) => void }) {
  const [showDropdown, setShowDropdown] = useState(false);
  const fullName = `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.display_name || 'User';

  return (
    <DropdownMenu open={showDropdown} onOpenChange={setShowDropdown}>
      <DropdownMenuTrigger asChild>
        <div className="flex flex-col items-center cursor-pointer hover:scale-105 transition-transform">
          <Avatar className="h-16 w-16 border-2 border-primary/30 hover:border-primary/50 mb-2">
            <AvatarImage src={user.avatar_url} />
            <AvatarFallback className="bg-gradient-to-br from-primary/50 to-primary/20">
              {fullName.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <span className="text-xs text-white text-center max-w-[80px] truncate">
            {fullName}
          </span>
        </div>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
          Add to circle:
        </div>
        {circles.map(circle => (
          <DropdownMenuItem
            key={circle.id}
            onClick={() => {
              onAddToCircle(user.user_id, fullName, circle.id);
              setShowDropdown(false);
            }}
          >
            {circle.emoji} {circle.name}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function GlassmorphismDashboard({ 
  onNavigate, 
  circles = [],
  activeCircleId: propActiveCircleId,
  circleMembers,
  loadingMembers = false,
  onCircleSelect,
  onCircleDeselect,
  onStartChat,
  onStartCall,
  onNavigateToTraining,
  onNavigateToRadio,
  onAddPeople,
  onMemberRemoved
}: GlassmorphismDashboardProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [hueRotation, setHueRotation] = useState(0);
  const [scrollY, setScrollY] = useState(0);
  const [activeMode, setActiveMode] = useState<'chat' | 'community' | 'classroom' | 'radio' | 'training'>('chat');
  const [liveUpdates, setLiveUpdates] = useState<ActivityUpdate[]>([]);
  const [communityEngagement, setCommunityEngagement] = useState({ active: 78, posts: 124, participants: 2500 });
  const [streakDays, setStreakDays] = useState(0);
  const [activeCircleId, setActiveCircleId] = useState<string | undefined>(propActiveCircleId);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setActiveCircleId(propActiveCircleId);
  }, [propActiveCircleId]);

  // Aurora gradient animation
  useEffect(() => {
    const interval = setInterval(() => {
      setHueRotation(prev => (prev + 0.5) % 360);
    }, 50);

    return () => clearInterval(interval);
  }, []);

  // Scroll tracking for floating nav
  useEffect(() => {
    const handleScroll = () => {
      setScrollY(window.scrollY);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Load live updates
  useEffect(() => {
    const loadUpdates = async () => {
      // Mock data - replace with real data fetching
      const updates: ActivityUpdate[] = [
        {
          id: '1',
          type: 'chat',
          user: { name: 'Sarah', avatar: '' },
          title: '1on1 Chat',
          message: "Great idea, let's connect!",
          timestamp: new Date(),
          unread: 3,
        },
        {
          id: '2',
          type: 'community',
          user: { name: 'FlowSync Forum', avatar: '' },
          title: 'Community Discussion',
          message: 'New poll launched!',
          timestamp: new Date(Date.now() - 300000),
        },
        {
          id: '3',
          type: 'classroom',
          user: { name: 'History 101', avatar: '' },
          title: 'Classroom Activity',
          message: 'Whiteboard updated',
          timestamp: new Date(Date.now() - 600000),
          unread: 2,
        },
        {
          id: '4',
          type: 'radio',
          user: { name: 'FlowSync FM', avatar: '' },
          title: 'Radio Broadcast',
          message: 'Morning motivation!',
          timestamp: new Date(Date.now() - 900000),
          unread: 1,
        },
      ];
      setLiveUpdates(updates);
    };

    loadUpdates();
  }, []);

  const navigationModes = [
    { id: 'chat', label: '1-on-1 Chat', icon: MessageSquare, color: 'from-amber-500/20 to-coral-500/20' },
    { id: 'community', label: 'Community Forums', icon: Users, color: 'from-coral-500/20 to-amber-500/20' },
    { id: 'classroom', label: 'Classroom Modules', icon: GraduationCap, color: 'from-amber-500/20 to-orange-500/20' },
    { id: 'radio', label: 'Live Broadcasts', icon: Radio, color: 'from-coral-500/20 to-red-500/20' },
  ];

  const getActivityIcon = (type: ActivityUpdate['type']) => {
    switch (type) {
      case 'chat': return MessageSquare;
      case 'community': return Users;
      case 'classroom': return GraduationCap;
      case 'radio': return Radio;
      case 'training': return Zap;
      default: return Activity;
    }
  };

  return (
    <div 
      ref={containerRef}
      className="min-h-screen relative overflow-hidden"
      style={{
        background: `
          radial-gradient(circle at 20% 50%, rgba(251, 146, 60, 0.15) 0%, transparent 50%),
          radial-gradient(circle at 80% 50%, rgba(255, 107, 107, 0.15) 0%, transparent 50%),
          radial-gradient(circle at 50% 20%, rgba(251, 191, 36, 0.1) 0%, transparent 50%),
          linear-gradient(${hueRotation}deg, rgba(17, 24, 39, 0.95), rgba(31, 41, 55, 0.98))
        `,
      }}
    >
      {/* Aurora gradient overlay */}
      <div 
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `
            radial-gradient(ellipse at top, rgba(251, 146, 60, 0.1) 0%, transparent 50%),
            radial-gradient(ellipse at bottom, rgba(255, 107, 107, 0.1) 0%, transparent 50%),
            radial-gradient(ellipse at right, rgba(251, 191, 36, 0.05) 0%, transparent 50%)
          `,
          animation: 'aurora 20s ease-in-out infinite alternate',
        }}
      />

      {/* Floating Navigation */}
      <motion.div
        initial={{ y: -100, opacity: 0 }}
        animate={{ 
          y: scrollY > 50 ? 0 : 20,
          opacity: 1,
        }}
        transition={{ duration: 0.3 }}
        className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 ${
          scrollY > 50 ? 'backdrop-blur-xl bg-charcoal/80 shadow-2xl' : 'backdrop-blur-md bg-charcoal/60'
        } rounded-2xl px-6 py-3 border border-amber-500/20`}
      >
        <div className="flex items-center gap-2">
          {navigationModes.map((mode) => {
            const Icon = mode.icon;
            const isActive = activeMode === mode.id;
            return (
              <motion.button
                key={mode.id}
                onClick={() => {
                  setActiveMode(mode.id as any);
                  onNavigate?.(mode.id);
                }}
                className={`
                  relative px-4 py-2 rounded-xl transition-all duration-300
                  ${isActive 
                    ? 'bg-gradient-to-r ' + mode.color + ' text-amber-100 shadow-lg' 
                    : 'text-charcoal-300 hover:text-amber-200 hover:bg-charcoal/40'
                  }
                `}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <div className="flex items-center gap-2">
                  <Icon className="h-4 w-4" />
                  <span className="text-sm font-medium hidden sm:inline">{mode.label}</span>
                </div>
                {isActive && (
                  <motion.div
                    layoutId="activeMode"
                    className="absolute inset-0 rounded-xl bg-gradient-to-r from-amber-500/30 to-coral-500/30 -z-10"
                    transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                  />
                )}
              </motion.button>
            );
          })}
        </div>
      </motion.div>

      {/* Main Content */}
      <div className="relative z-10 pt-24 pb-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <motion.h1 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-4xl sm:text-5xl font-bold mb-2 bg-gradient-to-r from-amber-200 via-coral-200 to-amber-200 bg-clip-text text-transparent"
              style={{ fontFamily: 'Playfair Display, serif' }}
            >
              chatapp FrequencySync Dashboard
            </motion.h1>
            <p className="text-charcoal-300 text-lg">Your unified communication hub</p>
          </div>

          {/* Widgets Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
            {/* LIVE UPDATES Widget */}
            <Card variant="glass" className="lg:col-span-2 backdrop-blur-xl bg-charcoal/60 border-amber-500/20">
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <CardTitle className="text-amber-200 flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  LIVE UPDATES
                </CardTitle>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-charcoal-400 hover:text-amber-200">
                  <X className="h-4 w-4" />
                </Button>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[400px] pr-4">
                  <div className="space-y-3">
                    {liveUpdates.map((update, idx) => {
                      const Icon = getActivityIcon(update.type);
                      return (
                        <motion.div
                          key={update.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: idx * 0.1 }}
                          className="group p-4 rounded-xl bg-gradient-to-r from-charcoal/40 to-charcoal/20 border border-amber-500/10 hover:border-amber-500/30 transition-all duration-300 cursor-pointer hover:shadow-lg hover:shadow-amber-500/10"
                        >
                          <div className="flex items-start gap-3">
                            <div className="relative">
                              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-500/20 to-coral-500/20 flex items-center justify-center border border-amber-500/30">
                                <Icon className="h-5 w-5 text-amber-200" />
                              </div>
                              {update.unread && (
                                <Badge className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center bg-red-500 text-white text-xs">
                                  {update.unread}
                                </Badge>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-amber-100 font-semibold text-sm">{update.title}</span>
                                <span className="text-charcoal-400 text-xs">
                                  {Math.floor((Date.now() - update.timestamp.getTime()) / 60000)}m ago
                                </span>
                              </div>
                              <p className="text-charcoal-300 text-sm line-clamp-2">{update.message}</p>
                              {update.badge && (
                                <Badge variant="outline" className="mt-2 text-xs border-amber-500/30 text-amber-200">
                                  {update.badge}
                                </Badge>
                              )}
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>

            {/* COMMUNITY ENGAGEMENT Widget */}
            <Card variant="glass" className="backdrop-blur-xl bg-charcoal/60 border-amber-500/20">
              <CardHeader>
                <CardTitle className="text-amber-200 flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  COMMUNITY ENGAGEMENT
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-center">
                  <div className="relative w-32 h-32">
                    <svg className="w-32 h-32 transform -rotate-90">
                      <circle
                        cx="64"
                        cy="64"
                        r="56"
                        stroke="rgba(251, 146, 60, 0.2)"
                        strokeWidth="8"
                        fill="none"
                      />
                      <motion.circle
                        cx="64"
                        cy="64"
                        r="56"
                        stroke="url(#gradient)"
                        strokeWidth="8"
                        fill="none"
                        strokeLinecap="round"
                        strokeDasharray={`${2 * Math.PI * 56}`}
                        initial={{ strokeDashoffset: 2 * Math.PI * 56 }}
                        animate={{ strokeDashoffset: 2 * Math.PI * 56 * (1 - communityEngagement.active / 100) }}
                        transition={{ duration: 1, ease: 'easeOut' }}
                      />
                      <defs>
                        <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                          <stop offset="0%" stopColor="#FB923C" />
                          <stop offset="100%" stopColor="#FF6B6B" />
                        </linearGradient>
                      </defs>
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="text-center">
                        <div className="text-3xl font-bold text-amber-200">{communityEngagement.active}%</div>
                        <div className="text-xs text-charcoal-400">Active</div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 rounded-lg bg-charcoal/40 border border-amber-500/10">
                    <span className="text-charcoal-300 text-sm">New Posts</span>
                    <Badge className="bg-amber-500/20 text-amber-200 border-amber-500/30">
                      {communityEngagement.posts}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg bg-charcoal/40 border border-amber-500/10">
                    <span className="text-charcoal-300 text-sm">Participants</span>
                    <Badge className="bg-coral-500/20 text-coral-200 border-coral-500/30">
                      {communityEngagement.participants.toLocaleString()}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Circles Section */}
          <Card variant="glass" className="backdrop-blur-xl bg-charcoal/60 border-amber-500/20 mb-6">
            <CardHeader className="flex flex-row items-center justify-between py-6">
              <div className="flex items-center gap-3">
                {activeCircleId && onCircleDeselect && (
                  <Button
                    onClick={onCircleDeselect}
                    variant="ghost"
                    size="sm"
                    className="text-amber-200 hover:text-amber-100 hover:bg-amber-500/20"
                  >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back
                  </Button>
                )}
                <CardTitle className="text-amber-200 flex items-center gap-2 text-2xl font-bold">
                  <Users className="h-6 w-6" />
                  {activeCircleId ? circles.find(c => c.id === activeCircleId)?.name || 'Circle Members' : 'YOUR CIRCLES'}
                </CardTitle>
              </div>
              {!activeCircleId && onAddPeople && (
                <Button 
                  onClick={onAddPeople}
                  className="bg-gradient-to-r from-amber-500/20 to-coral-500/20 hover:from-amber-500/30 hover:to-coral-500/30 text-amber-200 border border-amber-500/30"
                  size="sm"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add People
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {activeCircleId ? (
                // Show circle members inline
                <div className="space-y-4">
                  {loadingMembers ? (
                    <div className="flex items-center justify-center h-64">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500" />
                    </div>
                  ) : (
                    <CircleMembersList
                      circleId={activeCircleId}
                      circles={circles}
                      onStartChat={onStartChat}
                      onStartCall={onStartCall}
                      onNavigateToTraining={onNavigateToTraining}
                      onNavigateToRadio={onNavigateToRadio}
                      onMemberRemoved={onMemberRemoved}
                    />
                  )}
                </div>
              ) : circles.length > 0 ? (
                <CirclesBubbleRail
                  circles={circles}
                  activeCircleId={activeCircleId}
                  onCircleSelect={(circleId) => {
                    setActiveCircleId(circleId);
                    onCircleSelect?.(circleId);
                  }}
                />
              ) : (
                <div className="text-center py-8 text-charcoal-400">
                  <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="mb-4">No circles yet</p>
                  {onAddPeople && (
                    <Button 
                      onClick={onAddPeople}
                      className="bg-gradient-to-r from-amber-500/20 to-coral-500/20 hover:from-amber-500/30 hover:to-coral-500/30 text-amber-200 border border-amber-500/30"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Create Your First Circle
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Available Users Section - Users not in any circle */}
          <AvailableUsersSection 
            circles={circles}
            onAddToCircle={async (userId, userName, circleId) => {
              try {
                const { error } = await supabase
                  .from('circle_members')
                  .insert({ circle_id: circleId, user_id: userId });
                if (error) throw error;
                toast({
                  title: 'Added to circle',
                  description: `${userName} added to ${circles.find(c => c.id === circleId)?.name || 'circle'}`,
                });
                onMemberRemoved?.();
              } catch (error: any) {
                toast({
                  title: 'Error',
                  description: error.message || 'Failed to add user to circle',
                  variant: 'destructive',
                });
              }
            }}
          />

          {/* Activity Stream */}
          <Card variant="glass" className="backdrop-blur-xl bg-charcoal/60 border-amber-500/20">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-amber-200 flex items-center gap-2">
                <Activity className="h-5 w-5" />
                ACTIVITY STREAM
              </CardTitle>
              <Button className="bg-white text-[#0A1931] border-2 border-[#0A1931] hover:bg-[#0A1931]/5">
                <Plus className="h-4 w-4 mr-2" />
                Compose Post
              </Button>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12 text-charcoal-400">
                <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Your activity stream will appear here</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Floating Action Button - Quick Actions Menu */}
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.5, type: 'spring' }}
        className="fixed bottom-8 right-8 z-50"
      >
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              size="lg"
              className="h-14 w-14 rounded-full bg-gradient-to-r from-amber-500 to-coral-500 shadow-2xl shadow-amber-500/50 hover:shadow-amber-500/70 hover:scale-110 transition-transform"
              title="Quick Actions"
            >
              <Plus className="h-6 w-6" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent 
            align="end" 
            className="w-56 bg-background/95 backdrop-blur-xl border-2 border-primary/50 shadow-2xl"
          >
            <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
              Quick Actions
            </div>
            {onAddPeople && (
              <DropdownMenuItem onClick={onAddPeople} className="cursor-pointer">
                <UserPlus className="h-4 w-4 mr-2" />
                Add People to Circles
              </DropdownMenuItem>
            )}
            <DropdownMenuItem 
              onClick={() => onNavigate?.('chat')} 
              className="cursor-pointer"
            >
              <MessageSquare className="h-4 w-4 mr-2" />
              Start 1-on-1 Chat
            </DropdownMenuItem>
            <DropdownMenuItem 
              onClick={() => onNavigate?.('community')} 
              className="cursor-pointer"
            >
              <Users className="h-4 w-4 mr-2" />
              Create Community Post
            </DropdownMenuItem>
            <DropdownMenuItem 
              onClick={() => onNavigate?.('classroom')} 
              className="cursor-pointer"
            >
              <GraduationCap className="h-4 w-4 mr-2" />
              Open Classroom
            </DropdownMenuItem>
            <DropdownMenuItem 
              onClick={() => onNavigate?.('radio')} 
              className="cursor-pointer"
            >
              <Radio className="h-4 w-4 mr-2" />
              Start Radio Broadcast
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </motion.div>

    </div>
  );
}

