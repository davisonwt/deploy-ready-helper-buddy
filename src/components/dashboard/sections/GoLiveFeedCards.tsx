import React from 'react';
import { Radio, GraduationCap, Zap, Dumbbell } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { DashboardTheme } from '@/utils/dashboardThemes';

import classroomImg from '/images/golive/classroom.jpg';
import skilldropImg from '/images/golive/skilldrop.jpg';
import trainingImg from '/images/golive/training.jpg';
import radioImg from '/images/golive/radio.jpg';

interface GoLiveFeedCardsProps {
  theme: DashboardTheme;
}

const goLiveCards = [
  {
    href: '/explore-sessions?type=classroom',
    title: 'Classroom',
    subtitle: 'Teach the community live',
    description:
      'Host a live classroom session where you teach, train, or present to the community. Set it as free or with a bestowal value — and go live when you\'re ready.',
    image: classroomImg,
    icon: GraduationCap,
  },
  {
    href: '/explore-sessions?type=skilldrop',
    title: 'SkillDrop',
    subtitle: 'Share a quick skill with the tribe',
    description:
      'Drop a focused skill session — woodworking, coding, photography, music production, or anything you\'re great at. Quick, impactful, and community-driven.',
    image: skilldropImg,
    icon: Zap,
  },
  {
    href: '/explore-sessions?type=training',
    title: 'Training',
    subtitle: 'Health, baking, cooking & more',
    description:
      'Go live with a training session — fitness, yoga, baking, cooking, wellness coaching, or any hands-on skill. Help the community grow stronger together.',
    image: trainingImg,
    icon: Dumbbell,
  },
  {
    href: '/apply-radio-slot',
    title: 'Radio',
    subtitle: 'Broadcast live to the community',
    description:
      'Apply to become a radio DJ and broadcast live shows to the entire community. Share music, discussions, interviews, and more from your own studio.',
    image: radioImg,
    icon: Radio,
  },
];

export const GoLiveFeedCards: React.FC<GoLiveFeedCardsProps> = ({ theme }) => {
  return (
    <div className="space-y-3">
      {/* Section Label */}
      <div className="flex items-center gap-2">
        <div className="p-2 rounded-xl" style={{ background: theme.secondaryButton }}>
          <Radio className="w-5 h-5" style={{ color: theme.accent }} />
        </div>
        <div>
          <h2 className="text-base font-extrabold tracking-tight" style={{ color: theme.textPrimary }}>
            🎙️ Go Live
          </h2>
          <p className="text-[10px]" style={{ color: theme.textSecondary }}>
            Host live sessions for the community
          </p>
        </div>
      </div>

      {/* Cards */}
      <div className="space-y-3">
        {goLiveCards.map((card) => (
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
              <Button
                size="sm"
                className="text-xs h-7 rounded-lg w-full"
                onClick={(e) => e.stopPropagation()}
              >
                🎙️ Go Live!
              </Button>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
};
