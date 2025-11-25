import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, Users, BookOpen, GraduationCap, Dumbbell, Radio } from 'lucide-react';
import { useCommunicationModes, CommunicationMode } from '@/hooks/useCommunicationModes';
import { AuroraBackground } from './AuroraBackground';
import { ActivityFeed } from './ActivityFeed';
import { CommunityForums } from './CommunityForums';
import { RelationshipLayerChatApp } from './RelationshipLayerChatApp';
import { cn } from '@/lib/utils';

interface ModeConfig {
  id: CommunicationMode;
  icon: React.ReactNode;
  label: string;
  color: string;
}

const modes: ModeConfig[] = [
  { id: 'chat', icon: <MessageCircle className="w-5 h-5" />, label: '1-on-1 Chats', color: 'from-primary/20 to-primary/5' },
  { id: 'community', icon: <Users className="w-5 h-5" />, label: 'Community', color: 'from-cyan-500/20 to-cyan-500/5' },
  { id: 'classroom', icon: <BookOpen className="w-5 h-5" />, label: 'Classrooms', color: 'from-success/20 to-success/5' },
  { id: 'lecture', icon: <GraduationCap className="w-5 h-5" />, label: 'Lectures', color: 'from-info/20 to-info/5' },
  { id: 'training', icon: <Dumbbell className="w-5 h-5" />, label: 'Training', color: 'from-warning/20 to-warning/5' },
  { id: 'radio', icon: <Radio className="w-5 h-5" />, label: 'Radio', color: 'from-harvest/20 to-harvest/5' },
];

export const UnifiedDashboard: React.FC = () => {
  const { activeMode, setActiveMode, unreadCounts, clearUnread } = useCommunicationModes();
  const [selectedCircle, setSelectedCircle] = useState<string | null>(null);

  const handleModeChange = (mode: CommunicationMode) => {
    setActiveMode(mode);
    clearUnread(mode);
  };

  const renderContent = () => {
    switch (activeMode) {
      case 'chat':
        return <RelationshipLayerChatApp />;
      case 'community':
        return <CommunityForums />;
      case 'classroom':
        return (
          <div className="glass-card p-8 rounded-2xl">
            <h2 className="text-2xl font-bold text-heading-primary mb-4">Interactive Classrooms</h2>
            <p className="text-muted-foreground">Coming soon: Join live learning sessions with whiteboards and breakout rooms</p>
          </div>
        );
      case 'lecture':
        return (
          <div className="glass-card p-8 rounded-2xl">
            <h2 className="text-2xl font-bold text-heading-primary mb-4">Lecture Halls</h2>
            <p className="text-muted-foreground">Coming soon: Attend presentations and Q&A sessions</p>
          </div>
        );
      case 'training':
        return (
          <div className="glass-card p-8 rounded-2xl">
            <h2 className="text-2xl font-bold text-heading-primary mb-4">Training Sessions</h2>
            <p className="text-muted-foreground">Coming soon: Complete courses and earn XP points</p>
          </div>
        );
      case 'radio':
        return (
          <div className="glass-card p-8 rounded-2xl">
            <h2 className="text-2xl font-bold text-heading-primary mb-4">Radio Broadcasts</h2>
            <p className="text-muted-foreground">Coming soon: Listen to live audio streams and participate in discussions</p>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <AuroraBackground>
      <div className="min-h-screen p-4 md:p-6">
        <div className="max-w-[1800px] mx-auto">
          {/* Mode Selector - Horizontal Pills */}
          <motion.div 
            className="glass-panel rounded-2xl p-3 mb-6"
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.5 }}
          >
            <div className="flex flex-wrap gap-2 justify-center">
              {modes.map((mode) => (
                <motion.button
                  key={mode.id}
                  onClick={() => handleModeChange(mode.id)}
                  className={cn(
                    'relative flex items-center gap-2 px-4 py-2.5 rounded-full',
                    'transition-all duration-300',
                    'glass-button',
                    activeMode === mode.id
                      ? 'bg-primary/30 border-primary text-primary-foreground teal-glow'
                      : 'hover:bg-primary/10 text-foreground'
                  )}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.98 }}
                >
                  {mode.icon}
                  <span className="font-semibold text-sm">{mode.label}</span>
                  
                  {/* Unread count badge */}
                  {unreadCounts[mode.id] > 0 && (
                    <motion.span
                      className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: 'spring', stiffness: 500, damping: 15 }}
                    >
                      {unreadCounts[mode.id] > 9 ? '9+' : unreadCounts[mode.id]}
                    </motion.span>
                  )}
                </motion.button>
              ))}
            </div>
          </motion.div>

          {/* Main Layout - Content + Activity Feed */}
          <div className="grid grid-cols-1 lg:grid-cols-[1fr,400px] gap-6">
            {/* Main Content Area */}
            <motion.div
              className="min-h-[600px]"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
            >
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeMode}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  {renderContent()}
                </motion.div>
              </AnimatePresence>
            </motion.div>

            {/* Activity Feed Sidebar */}
            <motion.div
              className="hidden lg:block"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <ActivityFeed />
            </motion.div>
          </div>
        </div>
      </div>
    </AuroraBackground>
  );
};
