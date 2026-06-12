// Business tier metadata for the 5 SeedFlow tiers.
// Order matters (Homestead → Harvest Works).
import homesteadImg from '@/assets/tier-homestead.jpg';
import groveImg from '@/assets/tier-grove.jpg';
import orchardImg from '@/assets/tier-orchard.jpg';
import estateImg from '@/assets/tier-estate.jpg';
import harvestWorksImg from '@/assets/tier-harvest-works.jpg';

export type Tier = 'homestead' | 'grove' | 'orchard' | 'estate' | 'harvest_works';

export interface TierConfig {
  id: Tier;
  slug: string;          // URL path (without leading /)
  label: string;         // Display name
  emoji: string;
  tagline: string;
  description: string;
  accent: string;        // Tailwind/CSS hex used as themed accent
  gradient: string;      // CSS gradient for hero
  image: string;         // Imported illustration for the tier
  explainer: string;     // Longer hover-popup explanation
}

export const TIERS: TierConfig[] = [
  {
    id: 'homestead',
    slug: 'homestead',
    label: 'Homestead',
    emoji: '🏡',
    tagline: 'Individual sowers · single-owned home businesses',
    description: 'Solo growers and home-based sowers planting one seed at a time.',
    accent: '#22c55e',
    gradient: 'linear-gradient(135deg, #052e16 0%, #14532d 100%)',
    image: homesteadImg,
    explainer:
      'A Homestead is one sower at the helm — a solo creator, crafter, or home-based business planting seeds from their own kitchen, garage, or garden. Smallest tier, most personal touch.',
  },
  {
    id: 'grove',
    slug: 'grove',
    label: 'Grove',
    emoji: '🌳',
    tagline: 'Small businesses with a tight tribe',
    description: 'Small businesses — a tight grove of seeds finding their roots.',
    accent: '#84cc16',
    gradient: 'linear-gradient(135deg, #1a2e05 0%, #365314 100%)',
    image: groveImg,
    explainer:
      'A Grove is a small business — usually a handful of people working closely together. A tight-knit tribe sharing one purpose, with a small but growing range of seeds (products).',
  },
  {
    id: 'orchard',
    slug: 'orchard',
    label: 'Orchard',
    emoji: '🍎',
    tagline: 'Medium businesses with rows of fruit',
    description: 'Medium businesses bearing rows of fruit across many seasons.',
    accent: '#eab308',
    gradient: 'linear-gradient(135deg, #422006 0%, #713f12 100%)',
    image: orchardImg,
    explainer:
      'An Orchard is a medium-sized business with structured rows of offerings, repeat customers, and several harvests a year. Bigger than a Grove, with proven roots and steady fruit.',
  },
  {
    id: 'estate',
    slug: 'estate',
    label: 'Estate',
    emoji: '🏛️',
    tagline: 'Large businesses with sprawling reach',
    description: 'Large businesses — sprawling estates with deep tribal reach.',
    accent: '#f97316',
    gradient: 'linear-gradient(135deg, #431407 0%, #7c2d12 100%)',
    image: estateImg,
    explainer:
      'An Estate is a large business with sprawling reach — many products, many tribe members, and a recognised name. Think established brands and multi-region operations.',
  },
  {
    id: 'harvest_works',
    slug: 'harvest-works',
    label: 'Harvest Works',
    emoji: '🏭',
    tagline: 'Factories & manufacturing networks',
    description: 'Factories and manufacturing networks harvesting at scale.',
    accent: '#ef4444',
    gradient: 'linear-gradient(135deg, #450a0a 0%, #7f1d1d 100%)',
    image: harvestWorksImg,
    explainer:
      'Harvest Works are factories and manufacturing networks — the largest tier. They produce at scale, supply other tiers, and power the wider tribal supply chain.',
  },
];

export const TIER_BY_SLUG: Record<string, TierConfig> =
  TIERS.reduce((acc, t) => ({ ...acc, [t.slug]: t }), {});

export const TIER_BY_ID: Record<Tier, TierConfig> =
  TIERS.reduce((acc, t) => ({ ...acc, [t.id]: t }), {} as Record<Tier, TierConfig>);
