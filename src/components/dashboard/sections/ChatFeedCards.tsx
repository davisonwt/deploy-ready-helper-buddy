import React, { useState } from 'react';
import { MessageSquare, Users, Play, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { DashboardTheme } from '@/utils/dashboardThemes';
import { SectionHeading } from './SectionHeading';

const oneOnOneImg = '/images/chat/one-on-one.jpg';
const groupChatImg = '/images/chat/group-chat.jpg';

interface ChatFeedCardsProps {
  theme: DashboardTheme;
}

const chatCards: Array<{
  href: string;
  title: string;
  subtitle: string;
  description: string;
  image: string;
  icon: React.ComponentType<{ className?: string }>;
  buttonLabel: string;
  video?: string;
}> = [
  {
    href: '/communications-hub?tab=chatapp&newchat=direct',
    title: '1-on-1 Chat',
    subtitle: 'Private conversations with sowers & bestowers',
    description:
      'Start a private conversation with any community member. Text, voice, and video — connect personally with sowers, bestowers, and fellow tribe members.',
    image: oneOnOneImg,
    video: '/videos/banners/one-on-one.mp4',
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
    video: '/videos/banners/group-chat.mp4',
    icon: Users,
    buttonLabel: '👥 Start Group Chat',
  },
];

export const ChatFeedCards: React.FC<ChatFeedCardsProps> = ({ theme }) => {
  const [activeVideo, setActiveVideo] = useState<string | null>(null);

  return (
    <div className="space-y-3">
      <SectionHeading
        icon={MessageSquare}
        title="💬 S2G ChatApp"
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
            {/* Cinematic banner — autoplay video if present, otherwise static image */}
            <div className="relative h-[140px] bg-black">
              {card.video ? (
                <video
                  src={card.video}
                  poster={card.image}
                  className="absolute inset-0 w-full h-full object-cover"
                  autoPlay
                  muted
                  loop
                  playsInline
                  preload="metadata"
                />
              ) : (
                <img
                  src={card.image}
                  alt={card.title}
                  className="absolute inset-0 w-full h-full object-cover"
                  loading="lazy"
                  width={800}
                  height={512}
                />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent pointer-events-none" />
              {card.video && (
                <button
                  type="button"
                  aria-label={`Watch ${card.title} story with sound`}
                  className="absolute top-2 right-2 w-9 h-9 rounded-full bg-black/55 hover:bg-black/75 text-white flex items-center justify-center transition shadow-lg backdrop-blur-sm"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setActiveVideo(card.video!);
                  }}
                >
                  <Play className="w-4 h-4 fill-current ml-0.5" />
                </button>
              )}
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

            {/* Description + Buttons */}
            <div className="p-3 space-y-2" style={{ background: theme.cardBg }}>
              <p className="text-[11px] leading-relaxed" style={{ color: theme.textSecondary }}>
                {card.description}
              </p>
              {card.video && (
                <Button
                  size="sm"
                  variant="outline"
                  className="text-xs h-7 rounded-lg w-full gap-1.5"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setActiveVideo(card.video!);
                  }}
                >
                  <Play className="w-3 h-3 fill-current" /> Watch the story
                </Button>
              )}
              <Button size="sm" className="text-xs h-7 rounded-lg w-full">
                {card.buttonLabel}
              </Button>
            </div>
          </Link>
        ))}
      </div>

      {/* Video lightbox */}
      {activeVideo && (
        <div
          className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-4 animate-in fade-in"
          onClick={() => setActiveVideo(null)}
        >
          <button
            type="button"
            aria-label="Close video"
            className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/15 hover:bg-white/25 text-white flex items-center justify-center transition"
            onClick={(e) => { e.stopPropagation(); setActiveVideo(null); }}
          >
            <X className="w-5 h-5" />
          </button>
          <video
            src={activeVideo}
            className="max-w-full max-h-full rounded-xl shadow-2xl"
            controls
            autoPlay
            playsInline
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
};
