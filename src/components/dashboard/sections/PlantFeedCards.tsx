import React, { useState } from 'react';
import { Sprout, TreePine, Leaf, Play, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { DashboardTheme } from '@/utils/dashboardThemes';
import { SectionHeading } from './SectionHeading';

import standardOrchardImg from '/images/plant/standard-orchard.jpg';
import fullvalueOrchardImg from '/images/plant/fullvalue-orchard.jpg';
import sowSeedImg from '/images/plant/sow-a-seed.jpg';

interface PlantFeedCardsProps {
  theme: DashboardTheme;
}

const plantCards = [
  {
    href: '/create-orchard?type=standard',
    title: 'Community Orchard',
    subtitle: 'Rally your community around a shared need',
    description:
      'Create an orchard with hidden seeds inside bestowal pockets. The community bestows towards pockets — and harvesters receive the seed inside. Perfect for group needs where your tribe helps you reach a shared goal together.',
    image: standardOrchardImg,
    video: '/videos/banners/community-orchard.mp4',
    icon: TreePine,
    buttonLabel: '🌳 Plant a Community Orchard',
  },
  {
    href: '/create-orchard?type=fullvalue',
    title: 'Production Orchard',
    subtitle: 'Turn your business idea into real products & cash-flow',
    description:
      'Each bestowal pocket contains a seed that grows into a fruit for the harvester. Like community-backed production — once enough pockets are bestowed, you can manufacture, deliver, and fulfil every harvest.',
    image: fullvalueOrchardImg,
    video: '/videos/banners/production-orchard.mp4',
    icon: Sprout,
    buttonLabel: '🌱 Plant a Production Orchard',
  },
  {
    href: '/products/upload',
    title: 'Single Seed',
    subtitle: 'Make anything available to the community',
    description:
      'Seeds are anything you want to sow — vehicles, music, books, houses, produce, services, and more. List it, set a bestowal amount, and let the community harvest.',
    image: sowSeedImg,
    video: undefined as string | undefined,
    icon: Leaf,
    buttonLabel: '🌾 Sow a Single Seed',
  },
];

export const PlantFeedCards: React.FC<PlantFeedCardsProps> = ({ theme }) => {
  const [activeVideo, setActiveVideo] = useState<string | null>(null);
  return (
    <div className="space-y-3">
      <SectionHeading
        icon={Sprout}
        title="🌱 SOW"
        subtitle="Sow orchards & seeds for the community to harvest"
        theme={theme}
        gradientColors={['#16a34a', '#4ade80']}
      />

      {/* Cards */}
      <div className="space-y-3">
        {plantCards.map((card) => (
          <Link
            key={card.title}
            to={card.href}
            className="block rounded-2xl overflow-hidden shadow-md transition-all hover:scale-[1.01] active:scale-[0.99]"
            style={{ borderColor: theme.cardBorder, border: `1px solid ${theme.cardBorder}` }}
          >
            {/* Cinematic banner video (autoplay, muted, looped). Click play btn for full audio in lightbox. */}
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
              <Button
                size="sm"
                className="text-xs h-7 rounded-lg w-full"
                onClick={(e) => e.stopPropagation()}
              >
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
