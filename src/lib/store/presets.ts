export type WanderingKind = 'pillow' | 'hand' | 'wheel' | 'field' | 'hearth' | 'forge' | 'heart';

export interface WanderingPreset {
  kind: WanderingKind;
  title: string;
  /** CSS colour — buttons, chips, accents. */
  accent: string;
  promise: string;
  description: string;
  chips: string[];
  buttonText: string;
  /**
   * The real banner photo — none of the seven have landed in
   * src/assets/wandering/<kind>-banner.jpg yet (checked live: the
   * directory doesn't exist anywhere in the repo, not just forge/heart).
   * Every kind falls back to a gradient built from `accent` until the
   * real assets are supplied; swapping this to a real import later is a
   * one-line change per kind, nothing else about the preset shape moves.
   */
  bannerImage: string | null;
}

// spec-storefronts.md §4a's own table. Copy for forge/heart was marked
// "(to write)" there — drafted here in the same short, punchy style as
// the other five so every kind has a finished-looking door/shop on day
// one; not literal spec text for those two.
const PRESETS: Record<WanderingKind, WanderingPreset> = {
  pillow: {
    kind: 'pillow',
    title: 'Wandering Pillow',
    accent: '#d4af37',
    promise: 'Rest. Recharge. Belong Anywhere.',
    description: 'Stay with the tribe — private homes, hotels, farms and retreats, wherever the road takes you.',
    chips: ['Private homes', 'Hotels', 'Farms & retreats', 'Holiday getaways'],
    buttonText: 'Explore stays',
    bannerImage: null,
  },
  hand: {
    kind: 'hand',
    title: 'Wandering Hand',
    accent: '#0d9488',
    promise: 'Skilled Hands. Trusted Service.',
    description: 'Tradespeople from the tribe, ready to help — plumbing, electrical, building and more.',
    // Trades only, per spec-wandering-doors.md §4 — no Dentists / Doctors
    // until the licensed-professional question is answered by the lawyer.
    chips: ['Plumbers', 'Electricians', 'Mechanics', 'Builders', 'Carpenters'],
    buttonText: 'Book a service',
    bannerImage: null,
  },
  wheel: {
    kind: 'wheel',
    title: 'Wandering Wheel',
    accent: '#ea580c',
    promise: 'Move What Matters.',
    description: 'Rides, deliveries and vehicles from the tribe — whatever needs moving, wherever it needs to go.',
    chips: ['Passenger rides', 'Deliveries', 'Plough land', 'Move materials', 'Any vehicle'],
    buttonText: 'Book a ride or job',
    bannerImage: null,
  },
  field: {
    kind: 'field',
    title: 'Wandering Field',
    accent: '#16a34a',
    promise: 'From Our Fields to Our Tribe.',
    description: 'Fresh produce and seasonal goods, straight from the farmers who grow them.',
    chips: ['Fresh produce', 'Seasonal goods', 'Direct from farmers'],
    buttonText: 'Shop the field',
    bannerImage: null,
  },
  hearth: {
    kind: 'hearth',
    title: 'Wandering Hearth',
    accent: '#dc2626',
    promise: 'Made with Love. Shared with You.',
    description: 'Handmade crafts and homemade goods, made by hand, shared with heart.',
    chips: ['Handmade crafts', 'Homemade foods', 'Artisan products'],
    buttonText: 'Visit the hearth',
    bannerImage: null,
  },
  forge: {
    kind: 'forge',
    title: 'Wandering Forge',
    accent: '#475569',
    promise: 'Built to Order, Made to Last.',
    description: "Custom-made goods, commissions and repairs from the tribe's own makers.",
    chips: ['Custom made', 'Commissions', 'Repairs'],
    buttonText: 'Commission a piece',
    bannerImage: null,
  },
  heart: {
    kind: 'heart',
    title: 'Wandering Heart',
    accent: '#059669',
    promise: 'Never Wander Alone.',
    description: 'Companionship, care and support from the tribe — someone to walk beside you.',
    chips: ['Care', 'Companionship', 'Support'],
    buttonText: 'Find your tribe',
    bannerImage: null,
  },
};

/** Whisperer deliberately has no preset — it's a service hired by shops, not a place to shop (spec-wandering-doors.md §1). */
export function getPreset(kind: string | null | undefined): WanderingPreset | null {
  if (!kind) return null;
  return Object.prototype.hasOwnProperty.call(PRESETS, kind) ? PRESETS[kind as WanderingKind] : null;
}

export function isWanderingKind(kind: string): kind is WanderingKind {
  return Object.prototype.hasOwnProperty.call(PRESETS, kind);
}

export const WANDERING_KINDS: WanderingKind[] = ['pillow', 'hand', 'wheel', 'field', 'hearth', 'forge', 'heart'];
