import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { MessageCircle, Plus } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { CirclesBubbleRail, Circle } from '../CirclesBubbleRail';
import { CircleMembersList } from '../CircleMembersList';
import { SwipeDeck } from '../SwipeDeck';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export const ChatMode: React.FC = () => {
  const { user } = useAuth();
  const [circles, setCircles] = useState<Circle[]>([]);
  const [activeCircleId, setActiveCircleId] = useState<string | null>(null);
  const [showSwipeDeck, setShowSwipeDeck] = useState(false);
  const [swipeDeckRefreshKey, setSwipeDeckRefreshKey] = useState(0);

  useEffect(() => {
    loadCircles();
  }, [user]);

  const loadCircles = async () => {
    if (!user) return;

    const { data: circlesData } = await supabase
      .from('circles')
      .select('id, name, emoji, color')
      .order('name');

    if (!circlesData) return;

    const circleIds = circlesData.map(c => c.id);
    const { data: memberCounts } = await supabase
      .from('circle_members')
      .select('circle_id')
      .in('circle_id', circleIds);

    const counts = new Map<string, number>();
    (memberCounts || []).forEach((m: any) => {
      counts.set(m.circle_id, (counts.get(m.circle_id) || 0) + 1);
    });

    const formattedCircles: Circle[] = circlesData.map((circle: any) => ({
      id: circle.id,
      name: circle.name,
      emoji: circle.emoji,
      color: circle.color,
      unreadCount: 0,
      isLive: false,
      memberCount: counts.get(circle.id) || 0,
    }));

    setCircles(formattedCircles);
  };


  const handleSwipeRight = async (profile: any, circleId: string) => {
    if (!user) return;

    const userIdToAdd = profile.user_id || profile.id;

    const { data: existing } = await supabase
      .from('circle_members')
      .select('id')
      .eq('circle_id', circleId)
      .eq('user_id', userIdToAdd)
      .maybeSingle();

    if (existing) return;

    await supabase
      .from('circle_members')
      .insert({
        circle_id: circleId,
        user_id: userIdToAdd,
        added_by: user.id,
      });

    loadCircles();
  };

  const handleMemberRemoved = () => {
    setSwipeDeckRefreshKey(prev => prev + 1);
    loadCircles();
  };

  return (
    <div className="space-y-6">
      {/* Circles Bubble Rail */}
      <Card className="glass-card">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <MessageCircle className="w-5 h-5" />
              Your Circles
            </CardTitle>
            <Button
              onClick={() => setShowSwipeDeck(!showSwipeDeck)}
              size="sm"
              variant="outline"
              className="glass-button"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add People
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <CirclesBubbleRail
            circles={circles}
            activeCircleId={activeCircleId}
            onCircleSelect={setActiveCircleId}
          />
        </CardContent>
      </Card>

      {/* Swipe Deck for Adding Members */}
      {showSwipeDeck && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
        >
          <Card className="glass-card">
            <CardHeader>
              <CardTitle>Add People to Circles</CardTitle>
            </CardHeader>
            <CardContent>
              <SwipeDeck
                onSwipeRight={handleSwipeRight}
                onComplete={() => setShowSwipeDeck(false)}
                refreshKey={swipeDeckRefreshKey}
              />
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Circle Members List */}
      {activeCircleId && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card className="glass-card">
            <CardHeader>
              <CardTitle>
                {circles.find(c => c.id === activeCircleId)?.name || 'Circle'} Members
              </CardTitle>
            </CardHeader>
            <CardContent>
              <CircleMembersList
                circleId={activeCircleId}
                circles={circles}
                onMemberRemoved={handleMemberRemoved}
              />
            </CardContent>
          </Card>
        </motion.div>
      )}

      {!activeCircleId && !showSwipeDeck && (
        <Card className="glass-card">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <MessageCircle className="w-16 h-16 text-muted-foreground mb-4 opacity-50" />
            <h3 className="text-xl font-semibold mb-2">Select a Circle</h3>
            <p className="text-muted-foreground">
              Choose a circle above to view members and start chatting
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
