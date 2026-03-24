/**
 * ChatApp - Unified "Live & Active Hub"
 * Default view: UnifiedFeed (TikTok-style live feed)
 * Private chats accessible via drawer
 */
import React, { useState } from 'react';
import { MessageCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { UnifiedFeed } from './UnifiedFeed';
import { PrivateChatsDrawer } from './PrivateChatsDrawer';
import { RelationshipLayerChatApp } from './RelationshipLayerChatApp';
import { CommunityForums } from './CommunityForums';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useSearchParams } from 'react-router-dom';
import { UnifiedConversation } from './UnifiedConversation';

export const ChatApp: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [chatDrawerOpen, setChatDrawerOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'feed' | 'circles' | 'community'>('feed');

  // Handle room parameter from URL (e.g. from Memry message button)
  const roomId = searchParams.get('room');
  if (roomId) {
    return (
      <UnifiedConversation
        roomId={roomId}
        onBack={() => setSearchParams({})}
      />
    );
  }

  return (
    <div className="glass-panel rounded-2xl min-h-[500px] max-h-[calc(100vh-220px)] flex flex-col relative">
      {/* Sub-navigation: Feed / Circles / Community */}
      <div className="border-b border-border/30">
        <Tabs value={activeTab} onValueChange={v => setActiveTab(v as any)} className="w-full">
          <TabsList className="w-full justify-start px-4 pt-2 bg-transparent rounded-none h-auto gap-1">
            <TabsTrigger
              value="feed"
              className="data-[state=active]:bg-primary/20 data-[state=active]:text-primary rounded-full px-4 py-2 gap-2 text-xs"
            >
              🌱 Live Feed
            </TabsTrigger>
            <TabsTrigger
              value="circles"
              className="data-[state=active]:bg-primary/20 data-[state=active]:text-primary rounded-full px-4 py-2 gap-2 text-xs"
            >
              Circles
            </TabsTrigger>
            <TabsTrigger
              value="community"
              className="data-[state=active]:bg-primary/20 data-[state=active]:text-primary rounded-full px-4 py-2 gap-2 text-xs"
            >
              Community
            </TabsTrigger>
          </TabsList>

          <TabsContent value="feed" className="flex-1 overflow-hidden m-0">
            <UnifiedFeed />
          </TabsContent>
          <TabsContent value="circles" className="flex-1 overflow-y-auto m-0">
            <RelationshipLayerChatApp />
          </TabsContent>
          <TabsContent value="community" className="flex-1 overflow-y-auto m-0">
            <CommunityForums />
          </TabsContent>
        </Tabs>
      </div>

      {/* FAB: My Chats */}
      <motion.button
        onClick={() => setChatDrawerOpen(true)}
        className="fixed bottom-6 right-6 z-30 flex items-center gap-2 px-4 py-3 rounded-full shadow-lg"
        style={{ backgroundColor: 'hsl(188 78% 41%)', color: 'white' }}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        <MessageCircle className="w-5 h-5" />
        <span className="text-sm font-bold hidden sm:inline">My Chats</span>
      </motion.button>

      {/* Private Chats Drawer */}
      <PrivateChatsDrawer isOpen={chatDrawerOpen} onClose={() => setChatDrawerOpen(false)} />
    </div>
  );
};
