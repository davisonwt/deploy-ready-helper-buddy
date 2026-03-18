/**
 * 🌱 Lunar Garden Hub — Crops Data Layer
 * 
 * Comprehensive crop database with:
 * - Soil pH ranges (from Old Farmer's Almanac / organic standards)
 * - Companion planting pairs (time-tested garden practices)
 * - Biodynamic moon preferences (Root/Leaf/Fruit/Flower)
 * - Frost sensitivity & categories
 */

export type CropCategory = 'fruit' | 'leafy' | 'root' | 'herb' | 'brassica' | 'legume' | 'flower';
export type MoonElement = 'root' | 'leaf' | 'fruit' | 'flower';
export type FrostSensitivity = 'hardy' | 'semi-hardy' | 'tender';

export interface CropData {
  key: string;
  name: string;
  emoji: string;
  category: CropCategory;
  phRange: { min: number; max: number; note?: string };
  companions: { good: string[]; bad: string[]; notes?: string };
  moonPreference: MoonElement;
  frostSensitivity: FrostSensitivity;
  daysToHarvest?: { min: number; max: number };
}

export const GARDEN_CROPS: CropData[] = [
  // ─── FRUIT CROPS ───
  {
    key: 'tomato',
    name: 'Tomatoes',
    emoji: '🍅',
    category: 'fruit',
    phRange: { min: 5.5, max: 7.0, note: 'Prefers slightly acidic; nutrient uptake best here' },
    companions: {
      good: ['basil', 'carrot', 'parsley', 'marigold', 'nasturtium'],
      bad: ['cabbage', 'fennel', 'potato'],
      notes: 'Basil repels flies and can improve tomato flavor',
    },
    moonPreference: 'fruit',
    frostSensitivity: 'tender',
    daysToHarvest: { min: 60, max: 85 },
  },
  {
    key: 'cucumber',
    name: 'Cucumbers',
    emoji: '🥒',
    category: 'fruit',
    phRange: { min: 5.5, max: 7.0 },
    companions: {
      good: ['bean', 'pea', 'radish', 'dill', 'marigold'],
      bad: ['potato', 'sage'],
      notes: 'Beans fix nitrogen for cucumbers',
    },
    moonPreference: 'fruit',
    frostSensitivity: 'tender',
    daysToHarvest: { min: 50, max: 70 },
  },
  {
    key: 'zucchini',
    name: 'Zucchini',
    emoji: '🥒',
    category: 'fruit',
    phRange: { min: 5.5, max: 7.0 },
    companions: {
      good: ['bean', 'corn', 'nasturtium', 'marigold'],
      bad: ['potato'],
    },
    moonPreference: 'fruit',
    frostSensitivity: 'tender',
    daysToHarvest: { min: 45, max: 65 },
  },
  {
    key: 'pepper',
    name: 'Peppers / Chillies',
    emoji: '🌶️',
    category: 'fruit',
    phRange: { min: 5.5, max: 7.0 },
    companions: {
      good: ['basil', 'carrot', 'onion', 'tomato', 'marigold'],
      bad: ['fennel', 'bean'],
    },
    moonPreference: 'fruit',
    frostSensitivity: 'tender',
    daysToHarvest: { min: 60, max: 90 },
  },
  {
    key: 'eggplant',
    name: 'Eggplant / Aubergine',
    emoji: '🍆',
    category: 'fruit',
    phRange: { min: 5.5, max: 7.0 },
    companions: {
      good: ['bean', 'pepper', 'marigold', 'thyme'],
      bad: ['fennel'],
    },
    moonPreference: 'fruit',
    frostSensitivity: 'tender',
    daysToHarvest: { min: 65, max: 85 },
  },
  {
    key: 'strawberry',
    name: 'Strawberries',
    emoji: '🍓',
    category: 'fruit',
    phRange: { min: 5.5, max: 6.5, note: 'Acid-loving' },
    companions: {
      good: ['bean', 'lettuce', 'onion', 'spinach', 'thyme'],
      bad: ['cabbage', 'broccoli'],
    },
    moonPreference: 'fruit',
    frostSensitivity: 'semi-hardy',
    daysToHarvest: { min: 60, max: 90 },
  },

  // ─── LEAFY GREENS ───
  {
    key: 'lettuce',
    name: 'Lettuce',
    emoji: '🥬',
    category: 'leafy',
    phRange: { min: 6.0, max: 7.5 },
    companions: {
      good: ['carrot', 'radish', 'strawberry', 'chive'],
      bad: ['celery'],
    },
    moonPreference: 'leaf',
    frostSensitivity: 'semi-hardy',
    daysToHarvest: { min: 30, max: 60 },
  },
  {
    key: 'spinach',
    name: 'Spinach',
    emoji: '🥬',
    category: 'leafy',
    phRange: { min: 6.0, max: 7.5 },
    companions: {
      good: ['strawberry', 'pea', 'bean', 'radish'],
      bad: [],
    },
    moonPreference: 'leaf',
    frostSensitivity: 'hardy',
    daysToHarvest: { min: 35, max: 50 },
  },
  {
    key: 'kale',
    name: 'Kale',
    emoji: '🥬',
    category: 'leafy',
    phRange: { min: 6.0, max: 7.5 },
    companions: {
      good: ['bean', 'dill', 'potato', 'onion'],
      bad: ['strawberry', 'tomato'],
    },
    moonPreference: 'leaf',
    frostSensitivity: 'hardy',
    daysToHarvest: { min: 50, max: 65 },
  },
  {
    key: 'swiss_chard',
    name: 'Swiss Chard',
    emoji: '🥬',
    category: 'leafy',
    phRange: { min: 6.0, max: 7.0 },
    companions: {
      good: ['bean', 'onion', 'cabbage'],
      bad: [],
    },
    moonPreference: 'leaf',
    frostSensitivity: 'semi-hardy',
    daysToHarvest: { min: 50, max: 60 },
  },
  {
    key: 'rocket',
    name: 'Rocket / Arugula',
    emoji: '🥬',
    category: 'leafy',
    phRange: { min: 6.0, max: 7.0 },
    companions: {
      good: ['bean', 'dill', 'lettuce'],
      bad: [],
    },
    moonPreference: 'leaf',
    frostSensitivity: 'semi-hardy',
    daysToHarvest: { min: 25, max: 40 },
  },

  // ─── ROOT CROPS ───
  {
    key: 'carrot',
    name: 'Carrots',
    emoji: '🥕',
    category: 'root',
    phRange: { min: 5.5, max: 6.5, note: 'Avoid high pH to prevent forking' },
    companions: {
      good: ['leek', 'onion', 'tomato', 'rosemary', 'sage'],
      bad: ['dill'],
      notes: 'Leeks + carrots confuse each other\'s flies (Margaret Roberts)',
    },
    moonPreference: 'root',
    frostSensitivity: 'semi-hardy',
    daysToHarvest: { min: 60, max: 80 },
  },
  {
    key: 'beetroot',
    name: 'Beets / Beetroot',
    emoji: '🟣',
    category: 'root',
    phRange: { min: 6.0, max: 7.5 },
    companions: {
      good: ['onion', 'lettuce', 'cabbage', 'garlic'],
      bad: ['bean'],
    },
    moonPreference: 'root',
    frostSensitivity: 'semi-hardy',
    daysToHarvest: { min: 50, max: 70 },
  },
  {
    key: 'radish',
    name: 'Radishes',
    emoji: '🔴',
    category: 'root',
    phRange: { min: 5.5, max: 6.8 },
    companions: {
      good: ['carrot', 'lettuce', 'pea', 'nasturtium'],
      bad: [],
    },
    moonPreference: 'root',
    frostSensitivity: 'hardy',
    daysToHarvest: { min: 22, max: 30 },
  },
  {
    key: 'potato',
    name: 'Potatoes',
    emoji: '🥔',
    category: 'root',
    phRange: { min: 5.0, max: 6.0, note: 'Prefers acidic soil' },
    companions: {
      good: ['bean', 'corn', 'cabbage', 'marigold', 'horseradish'],
      bad: ['tomato', 'cucumber', 'sunflower'],
    },
    moonPreference: 'root',
    frostSensitivity: 'semi-hardy',
    daysToHarvest: { min: 70, max: 120 },
  },
  {
    key: 'onion',
    name: 'Onions',
    emoji: '🧅',
    category: 'root',
    phRange: { min: 6.0, max: 7.0 },
    companions: {
      good: ['carrot', 'beetroot', 'lettuce', 'tomato', 'chamomile'],
      bad: ['bean', 'pea'],
    },
    moonPreference: 'root',
    frostSensitivity: 'hardy',
    daysToHarvest: { min: 90, max: 120 },
  },
  {
    key: 'garlic',
    name: 'Garlic',
    emoji: '🧄',
    category: 'root',
    phRange: { min: 6.0, max: 7.0 },
    companions: {
      good: ['tomato', 'beetroot', 'carrot', 'rose'],
      bad: ['bean', 'pea'],
      notes: 'Natural pest repellent — plant around borders',
    },
    moonPreference: 'root',
    frostSensitivity: 'hardy',
    daysToHarvest: { min: 90, max: 150 },
  },
  {
    key: 'leek',
    name: 'Leeks',
    emoji: '🧅',
    category: 'root',
    phRange: { min: 6.0, max: 7.0 },
    companions: {
      good: ['carrot', 'celery', 'onion'],
      bad: ['bean', 'pea'],
      notes: 'Leeks & carrots confuse each other\'s pest flies (Margaret Roberts)',
    },
    moonPreference: 'root',
    frostSensitivity: 'hardy',
    daysToHarvest: { min: 80, max: 120 },
  },

  // ─── HERBS ───
  {
    key: 'basil',
    name: 'Basil',
    emoji: '🌿',
    category: 'herb',
    phRange: { min: 6.0, max: 7.0 },
    companions: {
      good: ['tomato', 'pepper', 'oregano', 'marigold'],
      bad: ['sage', 'rue'],
      notes: 'Plant near tomatoes — repels flies & improves flavor (Margaret Roberts)',
    },
    moonPreference: 'leaf',
    frostSensitivity: 'tender',
    daysToHarvest: { min: 25, max: 30 },
  },
  {
    key: 'parsley',
    name: 'Parsley',
    emoji: '🌿',
    category: 'herb',
    phRange: { min: 5.0, max: 7.0 },
    companions: {
      good: ['tomato', 'carrot', 'chive', 'rose'],
      bad: [],
    },
    moonPreference: 'leaf',
    frostSensitivity: 'semi-hardy',
    daysToHarvest: { min: 70, max: 90 },
  },
  {
    key: 'coriander',
    name: 'Coriander / Cilantro',
    emoji: '🌿',
    category: 'herb',
    phRange: { min: 6.0, max: 7.0 },
    companions: {
      good: ['bean', 'pea', 'tomato', 'spinach'],
      bad: ['fennel'],
    },
    moonPreference: 'leaf',
    frostSensitivity: 'semi-hardy',
    daysToHarvest: { min: 40, max: 60 },
  },
  {
    key: 'dill',
    name: 'Dill',
    emoji: '🌿',
    category: 'herb',
    phRange: { min: 5.5, max: 6.5 },
    companions: {
      good: ['cucumber', 'lettuce', 'onion', 'cabbage'],
      bad: ['carrot', 'tomato'],
    },
    moonPreference: 'leaf',
    frostSensitivity: 'semi-hardy',
    daysToHarvest: { min: 40, max: 60 },
  },
  {
    key: 'mint',
    name: 'Mint',
    emoji: '🌱',
    category: 'herb',
    phRange: { min: 6.0, max: 7.0 },
    companions: {
      good: ['cabbage', 'tomato', 'pea'],
      bad: [],
      notes: 'Deters cabbage moth — plant in pots to contain spread',
    },
    moonPreference: 'leaf',
    frostSensitivity: 'hardy',
    daysToHarvest: { min: 30, max: 40 },
  },
  {
    key: 'thyme',
    name: 'Thyme',
    emoji: '🌿',
    category: 'herb',
    phRange: { min: 6.0, max: 7.0 },
    companions: {
      good: ['cabbage', 'eggplant', 'strawberry', 'tomato'],
      bad: [],
    },
    moonPreference: 'leaf',
    frostSensitivity: 'hardy',
    daysToHarvest: { min: 14, max: 21 },
  },
  {
    key: 'rosemary',
    name: 'Rosemary',
    emoji: '🌿',
    category: 'herb',
    phRange: { min: 6.0, max: 7.0 },
    companions: {
      good: ['bean', 'cabbage', 'carrot', 'sage'],
      bad: [],
      notes: 'Strong scent deters bean beetles & carrot fly',
    },
    moonPreference: 'leaf',
    frostSensitivity: 'semi-hardy',
    daysToHarvest: { min: 80, max: 120 },
  },
  {
    key: 'oregano',
    name: 'Oregano',
    emoji: '🌿',
    category: 'herb',
    phRange: { min: 6.0, max: 7.0 },
    companions: {
      good: ['pepper', 'tomato', 'basil'],
      bad: [],
    },
    moonPreference: 'leaf',
    frostSensitivity: 'hardy',
    daysToHarvest: { min: 45, max: 60 },
  },
  {
    key: 'sage',
    name: 'Sage',
    emoji: '🌿',
    category: 'herb',
    phRange: { min: 6.0, max: 7.0 },
    companions: {
      good: ['rosemary', 'cabbage', 'carrot'],
      bad: ['basil', 'cucumber'],
    },
    moonPreference: 'leaf',
    frostSensitivity: 'hardy',
    daysToHarvest: { min: 75, max: 90 },
  },

  // ─── BRASSICAS ───
  {
    key: 'broccoli',
    name: 'Broccoli',
    emoji: '🥦',
    category: 'brassica',
    phRange: { min: 6.0, max: 7.5 },
    companions: {
      good: ['onion', 'garlic', 'beetroot', 'dill', 'rosemary', 'sage', 'mint'],
      bad: ['tomato', 'strawberry'],
    },
    moonPreference: 'flower',
    frostSensitivity: 'semi-hardy',
    daysToHarvest: { min: 60, max: 80 },
  },
  {
    key: 'cauliflower',
    name: 'Cauliflower',
    emoji: '🥦',
    category: 'brassica',
    phRange: { min: 6.0, max: 7.5 },
    companions: {
      good: ['bean', 'onion', 'garlic', 'dill', 'mint'],
      bad: ['tomato', 'strawberry'],
    },
    moonPreference: 'flower',
    frostSensitivity: 'semi-hardy',
    daysToHarvest: { min: 55, max: 80 },
  },
  {
    key: 'brussels_sprouts',
    name: 'Brussels Sprouts',
    emoji: '🥬',
    category: 'brassica',
    phRange: { min: 6.0, max: 7.5 },
    companions: {
      good: ['onion', 'garlic', 'dill', 'sage', 'thyme'],
      bad: ['tomato', 'strawberry'],
    },
    moonPreference: 'leaf',
    frostSensitivity: 'hardy',
    daysToHarvest: { min: 80, max: 110 },
  },

  // ─── LEGUMES ───
  {
    key: 'bean',
    name: 'Beans (Bush/Pole)',
    emoji: '🫘',
    category: 'legume',
    phRange: { min: 6.0, max: 7.0 },
    companions: {
      good: ['corn', 'cucumber', 'potato', 'carrot', 'rosemary', 'marigold'],
      bad: ['onion', 'garlic', 'leek', 'fennel'],
      notes: 'Fix nitrogen in soil — great for crop rotation',
    },
    moonPreference: 'fruit',
    frostSensitivity: 'tender',
    daysToHarvest: { min: 50, max: 65 },
  },
  {
    key: 'pea',
    name: 'Peas',
    emoji: '🫛',
    category: 'legume',
    phRange: { min: 6.0, max: 7.5 },
    companions: {
      good: ['carrot', 'radish', 'spinach', 'corn', 'cucumber'],
      bad: ['onion', 'garlic'],
    },
    moonPreference: 'fruit',
    frostSensitivity: 'hardy',
    daysToHarvest: { min: 55, max: 70 },
  },

  // ─── COMPANION FLOWERS ───
  {
    key: 'marigold',
    name: 'Marigolds',
    emoji: '🌼',
    category: 'flower',
    phRange: { min: 6.0, max: 7.5 },
    companions: {
      good: ['tomato', 'pepper', 'bean', 'cucumber', 'potato'],
      bad: [],
      notes: 'General garden protector — deters nematodes & whitefly (Margaret Roberts)',
    },
    moonPreference: 'flower',
    frostSensitivity: 'tender',
    daysToHarvest: { min: 45, max: 60 },
  },
  {
    key: 'nasturtium',
    name: 'Nasturtiums',
    emoji: '🌸',
    category: 'flower',
    phRange: { min: 6.0, max: 7.5 },
    companions: {
      good: ['tomato', 'cucumber', 'bean', 'cabbage', 'radish'],
      bad: [],
      notes: 'Trap crop for aphids — sacrificial protector (Margaret Roberts)',
    },
    moonPreference: 'flower',
    frostSensitivity: 'tender',
    daysToHarvest: { min: 35, max: 50 },
  },
];

// ─── LOOKUP HELPERS ───

export function getCropByKey(key: string): CropData | undefined {
  return GARDEN_CROPS.find(c => c.key === key);
}

export function getCropsByCategory(category: CropCategory): CropData[] {
  return GARDEN_CROPS.filter(c => c.category === category);
}

export function getCropsByMoonElement(element: MoonElement): CropData[] {
  return GARDEN_CROPS.filter(c => c.moonPreference === element);
}

export function getCompanionsForCrop(cropKey: string): { good: CropData[]; bad: CropData[] } {
  const crop = getCropByKey(cropKey);
  if (!crop) return { good: [], bad: [] };
  return {
    good: crop.companions.good.map(k => getCropByKey(k)).filter(Boolean) as CropData[],
    bad: crop.companions.bad.map(k => getCropByKey(k)).filter(Boolean) as CropData[],
  };
}

export function getPhColor(ph: number, crop: CropData): 'ideal' | 'marginal' | 'poor' {
  if (ph >= crop.phRange.min && ph <= crop.phRange.max) return 'ideal';
  if (ph >= crop.phRange.min - 0.5 && ph <= crop.phRange.max + 0.5) return 'marginal';
  return 'poor';
}

export const PH_BANNER = "Most organic veggies & herbs thrive at pH 6.0–7.0. Test soil yearly — add lime to raise (less acidic) or sulfur/compost to lower. Luna tip: 🌙 Root Days are great for soil amendments!";

export const CATEGORY_LABELS: Record<CropCategory, string> = {
  fruit: '🍅 Fruit Crops',
  leafy: '🥬 Leafy Greens',
  root: '🥕 Root Crops',
  herb: '🌿 Herbs',
  brassica: '🥦 Brassicas',
  legume: '🫘 Legumes',
  flower: '🌸 Companion Flowers',
};

export const MOON_ELEMENT_LABELS: Record<MoonElement, { label: string; emoji: string; description: string }> = {
  root: { label: 'Root Day', emoji: '🌱', description: 'Best for planting & tending root crops, soil amendments, composting' },
  leaf: { label: 'Leaf Day', emoji: '🍃', description: 'Best for planting leafy greens, herbs, mowing, watering' },
  fruit: { label: 'Fruit Day', emoji: '🍎', description: 'Best for planting fruiting crops, harvesting fruit, seed saving' },
  flower: { label: 'Flower Day', emoji: '🌸', description: 'Best for planting flowers, brassicas, cultivating, weeding' },
};
