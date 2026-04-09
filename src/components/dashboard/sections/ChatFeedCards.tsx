import React from 'react';
import { MessageSquare, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { DashboardTheme } from '@/utils/dashboardThemes';
import { SectionHeading } from './SectionHeading';

import oneOnOneImg from '/images/chat/one-on-one.jpg';
import groupChatImg from '/images/chat/group-chat.jpg';

interface ChatFeedCardsProps {
  theme: DashboardTheme;
}

const chatCards = [
  {
    href: '/communications-hub?tab=chatapp&newchat=direct',
    title: '1-on-1 Chat',
    subtitle: 'Private conversations with sowers & bestowers',
    description:
      'Start a private conversation with any community member. Text, voice, and video — connect personally with sowers, bestowers, and fellow tribe members.',
    image: oneOnOneImg,
    icon: MessageSquare,
    buttonLabel: '💬 Start 1-on-1 Chat',
  },
  {
    href: '/communications-hub?tab=chatapp&newchat=group',
    title: 'Group Chat',
    subtitle: 'Collaborate with your circles',
    description:
      'Create a group chat with multiple community members. Discuss ideas, plan events, share updates, and grow together as a tribe.',
    image: groupChatImg,
    icon: Users,
    buttonLabel: '👥 Start Group Chat',
  },
];

export const ChatFeedCards: React.FC<ChatFeedCardsProps> = ({ theme }) => {
  return (
    <div className="space-y-3">
      <SectionHeading
        icon={MessageSquare}
        title="💬 Chat"
        subtitle="Connect with sowers & bestowers"
        theme={theme}
        gradientColors={['#0d9488', '#3b82f6']}
      />

      {/* Cards */}
      <div className="space-y-3">
        {chatCards.map((card) => (
          <Link
            key={card.title}
            to={card.href}
            className="block rounded-2xl overflow-hidden shadow-md transition-all hover:scale-[1.01] active:scale-[0.99]"
            style={{ border: `1px solid ${theme.cardBorder}` }}
          >
            {/* Image */}
            <div className="relative h-[140px]">
              <img
                src={card.image}
                alt={card.title}
                className="absolute inset-0 w-full h-full object-cover"
                loading="lazy"
                width={800}
                height={512}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
              <div className="absolute bottom-3 left-3 right-3 flex items-end gap-2">
                <div className="w-8 h-8 rounded-lg bg-white/20 backdrop-blur-sm flex items-center justify-center shrink-0">
                  <card.icon className="w-4 h-4 text-white" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-bold text-white text-sm truncate">{card.title}</h3>
                  <p className="text-[10px] text-white/80 truncate">{card.subtitle}</p>
                </div>
              </div>
            </div>

            {/* Description + Button */}
            <div className="p-3" style={{ background: theme.cardBg }}>
              <p className="text-[11px] leading-relaxed mb-2" style={{ color: theme.textSecondary }}>
                {card.description}
              </p>
              <Button size="sm" className="text-xs h-7 rounded-lg w-full">
                {card.buttonLabel}
              </Button>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
};
