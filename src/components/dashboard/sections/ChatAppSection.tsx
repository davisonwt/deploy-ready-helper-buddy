import React from 'react';
import { MessageSquare } from 'lucide-react';
import { DashboardTheme } from '@/utils/dashboardThemes';
import { ChatAppDMsSubSection } from './ChatAppDMsSubSection';
import { ClassroomSubSection } from './ClassroomSubSection';
import { SkillDropSubSection } from './SkillDropSubSection';
import { TrainingSubSection } from './TrainingSubSection';
import { RadioSection } from './RadioSection';

interface ChatAppSectionProps {
  theme: DashboardTheme;
}

export const ChatAppSection: React.FC<ChatAppSectionProps> = ({ theme }) => {
  return (
    <div className="space-y-6">
      {/* Section Header */}
      <div className="flex items-center gap-2">
        <div className="p-2 rounded-xl" style={{ background: theme.secondaryButton }}>
          <MessageSquare className="w-5 h-5" style={{ color: theme.accent }} />
        </div>
        <div>
          <h2 className="text-lg font-extrabold tracking-tight" style={{ color: theme.textPrimary }}>
            ChatApp
          </h2>
          <p className="text-[10px]" style={{ color: theme.textSecondary }}>
            Connect, learn & listen — all in one place
          </p>
        </div>
      </div>

      {/* Sub-sections with dividers */}
      <ChatAppDMsSubSection theme={theme} />

      <div className="border-t" style={{ borderColor: theme.cardBorder }} />

      <ClassroomSubSection theme={theme} />

      <div className="border-t" style={{ borderColor: theme.cardBorder }} />

      <SkillDropSubSection theme={theme} />

      <div className="border-t" style={{ borderColor: theme.cardBorder }} />

      <TrainingSubSection theme={theme} />

      <div className="border-t" style={{ borderColor: theme.cardBorder }} />

      <RadioSection theme={theme} />
    </div>
  );
};
