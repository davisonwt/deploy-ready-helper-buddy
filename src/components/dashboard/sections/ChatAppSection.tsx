import React from 'react';
import { MessageSquare, GraduationCap, Zap, Dumbbell, Radio } from 'lucide-react';
import { DashboardTheme } from '@/utils/dashboardThemes';
import { GradientGatewayCard } from './GradientGatewayCard';
import { KeeperHelpButton } from './KeeperHelpButton';
import { SectionHeading } from './SectionHeading';

interface ChatAppSectionProps {
  theme: DashboardTheme;
}

const chatAppCards = [
  { href: '/communications', title: 'Chats', subtitle: '1-on-1 & Group circles', icon: MessageSquare, gradient: 'linear-gradient(135deg, #0d9488, #06b6d4)' },
  { href: '/explore-sessions?type=classroom', title: 'Classrooms', subtitle: 'Live & upcoming sessions', icon: GraduationCap, gradient: 'linear-gradient(135deg, #0891b2, #3b82f6)' },
  { href: '/explore-sessions?type=skilldrop', title: 'SkillDrop', subtitle: 'Learn new skills', icon: Zap, gradient: 'linear-gradient(135deg, #2563eb, #7c3aed)' },
  { href: '/explore-sessions?type=training', title: 'Training', subtitle: 'Grow & develop', icon: Dumbbell, gradient: 'linear-gradient(135deg, #7c3aed, #db2777)' },
  { href: '/grove-station', title: 'Radio', subtitle: 'Live audio & broadcasts', icon: Radio, gradient: 'linear-gradient(135deg, #db2777, #ef4444)' },
];

export const ChatAppSection: React.FC<ChatAppSectionProps> = ({ theme }) => {
  return (
    <div className="space-y-4">
      <SectionHeading
        icon={MessageSquare}
        title="ChatApp"
        subtitle="Connect, learn & listen — all in one place"
        theme={theme}
        gradientColors={['#0d9488', '#06b6d4']}
        rightSlot={<KeeperHelpButton sectionName="ChatApp" />}
      />

      {/* Gateway Cards Grid */}
      <div className="grid grid-cols-2 gap-3">
        {chatAppCards.slice(0, 4).map((card) => (
          <GradientGatewayCard key={card.title} {...card} />
        ))}
      </div>
      {/* Radio full-width */}
      <GradientGatewayCard {...chatAppCards[4]} className="w-full" />
    </div>
  );
};
