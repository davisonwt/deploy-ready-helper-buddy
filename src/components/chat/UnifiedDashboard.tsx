import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, BookOpen, GraduationCap, Dumbbell, Radio, ArrowLeft, Bell } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useCommunicationModes, CommunicationMode } from '@/hooks/useCommunicationModes';
import { AuroraBackground } from './AuroraBackground';
import { ChatApp } from './ChatApp';
import { ClassroomMode } from '../communication/ClassroomMode';
import { SkillDropMode } from '../communication/SkillDropMode';
import { TrainingMode } from '../communication/TrainingMode';
import { RadioMode } from '../communication/RadioMode';
import { Button } from '@/components/ui/button';
import { useIsMobile } from '@/hooks/use-mobile';
import { NotificationBellDropdown } from './NotificationBellDropdown';
import { cn } from '@/lib/utils';

interface ModeConfig {
  id: CommunicationMode;
  icon: React.ReactNode;
  label: string;
}

const modes: ModeConfig[] = [
  { id: 'chatapp', icon: <MessageSquare className="w-5 h-5" />, label: 'ChatApp' },
  { id: 'classroom', icon: <BookOpen className="w-5 h-5" />, label: 'Classrooms' },
  { id: 'skilldrop', icon: <GraduationCap className="w-5 h-5" />, label: 'SkillDrop' },
  { id: 'training', icon: <Dumbbell className="w-5 h-5" />, label: 'Training' },
  { id: 'radio', icon: <Radio className="w-5 h-5" />, label: 'Radio' },
];

export const UnifiedDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { activeMode, setActiveMode, unreadCounts, clearUnread } = useCommunicationModes();
  const isMobile = useIsMobile();

  useEffect(() => {
    const roomId = searchParams.get('room');
    if (roomId && activeMode !== 'chatapp') {
      setActiveMode('chatapp');
    }
  }, [searchParams]);

  const handleModeChange = (mode: CommunicationMode) => {
    setActiveMode(mode);
    clearUnread(mode);
  };

  const renderContent = () => {
    switch (activeMode) {
      case 'chatapp':
      case 'chat':
      case 'circles':
      case 'community':
        return <ChatApp />;
      case 'classroom':
        return <ClassroomMode />;
      case 'skilldrop':
        return <SkillDropMode />;
      case 'training':
        return <TrainingMode />;
      case 'radio':
        return <RadioMode />;
      default:
        return <ChatApp />;
    }
  };

  return (
    <AuroraBackground>
      <div className="min-h-screen p-4 md:p-6">
        <div className="max-w-[1400px] mx-auto">
          {/* Top bar: Back + Notification Bell */}
          <div className="flex items-center justify-between mb-4">
            <Button
              variant="ghost"
              onClick={() => navigate('/dashboard')}
              className="gap-2 text-foreground hover:text-primary hover:bg-primary/10 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Back to Dashboard</span>
            </Button>

            <NotificationBellDropdown />
          </div>

          {/* Mode Selector Pills */}
          <motion.div
            className="glass-panel rounded-2xl p-3 mb-6"
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.5 }}
          >
            <div className="flex flex-wrap gap-2 justify-center">
              {modes.map((mode) => {
                const isActive = activeMode === mode.id;
                return (
                  <motion.button
                    key={mode.id}
                    onClick={() => handleModeChange(mode.id)}
                    className={cn(
                      'relative flex items-center gap-2 px-4 py-2.5 rounded-full',
                      'transition-all duration-300 border-2 font-medium text-xs',
                      'hover:scale-105 active:scale-95'
                    )}
                    style={{
                      backgroundColor: isActive ? '#9bf6ff' : 'hsl(212, 49%, 24%)',
                      borderColor: isActive ? '#9bf6ff' : 'hsl(188, 78%, 41%)',
                      color: isActive ? '#1e293b' : '#ffffff',
                      borderRadius: '21px',
                      boxShadow: isActive
                        ? '0 8px 25px rgba(0,0,0,0.15), inset 0 2px 4px rgba(0,0,0,0.1)'
                        : 'inset 0 2px 4px rgba(0,0,0,0.1)',
                    }}
                    onMouseEnter={(e) => {
                      if (!isActive) {
                        e.currentTarget.style.backgroundColor = '#9bf6ff';
                        e.currentTarget.style.borderColor = '#9bf6ff';
                        e.currentTarget.style.color = '#1e293b';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isActive) {
                        e.currentTarget.style.backgroundColor = 'hsl(212, 49%, 24%)';
                        e.currentTarget.style.borderColor = 'hsl(188, 78%, 41%)';
                        e.currentTarget.style.color = '#ffffff';
                      }
                    }}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    {mode.icon}
                    <span className="font-semibold text-sm">{mode.label}</span>

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
                );
              })}
            </div>
          </motion.div>

          {/* Main Content — full width, no sidebar */}
          <motion.div
            className="min-h-[500px]"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
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
        </div>
      </div>
    </AuroraBackground>
  );
};
