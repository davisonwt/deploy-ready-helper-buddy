import React from 'react';
import { Sprout, TreePine, Leaf } from 'lucide-react';
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
    title: 'Standard Orchard',
    subtitle: 'Hide seeds within bestowal pockets',
    description:
      'Create an orchard with hidden seeds inside bestowal pockets. The community bestows towards pockets — and harvesters receive the seed inside. Perfect for getting your community to help you reach your sowing goals.',
    image: standardOrchardImg,
    icon: TreePine,
    buttonLabel: '🌳 Plant a Standard Orchard',
  },
  {
    href: '/create-orchard?type=fullvalue',
    title: 'Full Value Orchard',
    subtitle: 'Every pocket grows into a harvest',
    description:
      'Each bestowal pocket contains a seed that grows into a fruit for the harvester. Like community-backed production — once enough pockets are bestowed, you can manufacture, deliver, and fulfil every harvest.',
    image: fullvalueOrchardImg,
    icon: Sprout,
    buttonLabel: '🌱 Plant a Full Value Orchard',
  },
  {
    href: '/products/upload',
    title: 'Sow a Seed',
    subtitle: 'Make anything available to the community',
    description:
      'Seeds are anything you want to sow — vehicles, music, books, houses, produce, services, and more. List it, set a bestowal amount, and let the community harvest.',
    image: sowSeedImg,
    icon: Leaf,
    buttonLabel: '🌾 Sow a Seed',
  },
];

export const PlantFeedCards: React.FC<PlantFeedCardsProps> = ({ theme }) => {
  return (
    <div className="space-y-3">
      <SectionHeading
        icon={Sprout}
        title="🌱 Plant"
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
                {card.buttonLabel}
              </Button>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
};
