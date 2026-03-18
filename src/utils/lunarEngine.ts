/**
 * 🌙 Lunar Engine — Biodynamic Moon Phase & Zodiac Calculator
 * 
 * Pure astronomical calculations — no API dependencies.
 * Uses synodic month (29.53059 days) anchored to a known new moon epoch.
 */

// ─── TYPES ───

export type MoonPhaseName =
  | 'New Moon'
  | 'Waxing Crescent'
  | 'First Quarter'
  | 'Waxing Gibbous'
  | 'Full Moon'
  | 'Waning Gibbous'
  | 'Last Quarter'
  | 'Waning Crescent';

export type ZodiacSign =
  | 'Aries' | 'Taurus' | 'Gemini' | 'Cancer'
  | 'Leo' | 'Virgo' | 'Libra' | 'Scorpio'
  | 'Sagittarius' | 'Capricorn' | 'Aquarius' | 'Pisces';

export type BiodynamicElement = 'root' | 'leaf' | 'fruit' | 'flower';

export interface MoonInfo {
  phase: MoonPhaseName;
  phaseEmoji: string;
  illumination: number; // 0-1
  zodiac: ZodiacSign;
  element: BiodynamicElement;
  dayAge: number; // days into current lunation
  advice: string;
  isWaxing: boolean;
}

// ─── CONSTANTS ───

const SYNODIC_MONTH = 29.53059; // days
// Known New Moon: January 29, 2025 12:36 UTC
const NEW_MOON_EPOCH = new Date('2025-01-29T12:36:00Z').getTime();
// Sidereal month for zodiac calculation
const SIDEREAL_MONTH = 27.321661;
// Known moon position: Jan 29 2025 = Aquarius (approx 308° ecliptic longitude)
const ZODIAC_EPOCH_DEGREES = 308;

const PHASE_NAMES: MoonPhaseName[] = [
  'New Moon', 'Waxing Crescent', 'First Quarter', 'Waxing Gibbous',
  'Full Moon', 'Waning Gibbous', 'Last Quarter', 'Waning Crescent',
];

const PHASE_EMOJIS: Record<MoonPhaseName, string> = {
  'New Moon': '🌑',
  'Waxing Crescent': '🌒',
  'First Quarter': '🌓',
  'Waxing Gibbous': '🌔',
  'Full Moon': '🌕',
  'Waning Gibbous': '🌖',
  'Last Quarter': '🌗',
  'Waning Crescent': '🌘',
};

const ZODIAC_SIGNS: ZodiacSign[] = [
  'Aries', 'Taurus', 'Gemini', 'Cancer',
  'Leo', 'Virgo', 'Libra', 'Scorpio',
  'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces',
];

const ZODIAC_EMOJIS: Record<ZodiacSign, string> = {
  Aries: '♈', Taurus: '♉', Gemini: '♊', Cancer: '♋',
  Leo: '♌', Virgo: '♍', Libra: '♎', Scorpio: '♏',
  Sagittarius: '♐', Capricorn: '♑', Aquarius: '♒', Pisces: '♓',
};

// Biodynamic element mapping (Rudolf Steiner / Maria Thun)
const ZODIAC_ELEMENT: Record<ZodiacSign, BiodynamicElement> = {
  Aries: 'fruit',    // Fire
  Taurus: 'root',    // Earth
  Gemini: 'flower',  // Air
  Cancer: 'leaf',    // Water
  Leo: 'fruit',      // Fire
  Virgo: 'root',     // Earth
  Libra: 'flower',   // Air
  Scorpio: 'leaf',   // Water
  Sagittarius: 'fruit', // Fire
  Capricorn: 'root', // Earth
  Aquarius: 'flower', // Air
  Pisces: 'leaf',    // Water
};

// ─── CORE CALCULATIONS ───

/**
 * Get the moon's age in days (0 = new moon, ~14.76 = full moon)
 */
function getMoonAge(date: Date): number {
  const diff = date.getTime() - NEW_MOON_EPOCH;
  const daysSinceEpoch = diff / (1000 * 60 * 60 * 24);
  const age = daysSinceEpoch % SYNODIC_MONTH;
  return age < 0 ? age + SYNODIC_MONTH : age;
}

/**
 * Get the moon phase name from the moon's age
 */
export function getMoonPhase(date: Date): MoonPhaseName {
  const age = getMoonAge(date);
  const phaseLength = SYNODIC_MONTH / 8;
  const idx = Math.floor(age / phaseLength) % 8;
  return PHASE_NAMES[idx];
}

/**
 * Get estimated moon illumination (0-1)
 */
function getIllumination(age: number): number {
  // Simple cosine approximation
  return (1 - Math.cos((age / SYNODIC_MONTH) * 2 * Math.PI)) / 2;
}

/**
 * Get approximate zodiac sign the moon is in
 * Uses sidereal month calculation from a known epoch position
 */
export function getMoonZodiac(date: Date): ZodiacSign {
  const diff = date.getTime() - NEW_MOON_EPOCH;
  const daysSinceEpoch = diff / (1000 * 60 * 60 * 24);
  
  // Moon moves ~13.18° per day through the zodiac
  const degreesPerDay = 360 / SIDEREAL_MONTH;
  const currentDegrees = (ZODIAC_EPOCH_DEGREES + (daysSinceEpoch * degreesPerDay)) % 360;
  const normalizedDegrees = currentDegrees < 0 ? currentDegrees + 360 : currentDegrees;
  
  // Each sign = 30°
  const signIndex = Math.floor(normalizedDegrees / 30) % 12;
  return ZODIAC_SIGNS[signIndex];
}

/**
 * Get the biodynamic element for a zodiac sign
 */
export function getBiodynamicElement(zodiac: ZodiacSign): BiodynamicElement {
  return ZODIAC_ELEMENT[zodiac];
}

/**
 * Get comprehensive moon info for a date
 */
export function getMoonInfo(date: Date): MoonInfo {
  const age = getMoonAge(date);
  const phase = getMoonPhase(date);
  const zodiac = getMoonZodiac(date);
  const element = getBiodynamicElement(zodiac);
  const illumination = getIllumination(age);
  const isWaxing = age < SYNODIC_MONTH / 2;

  const elementLabels: Record<BiodynamicElement, string> = {
    root: 'Root Day — Best for root crops, soil work & composting',
    leaf: 'Leaf Day — Best for leafy greens, herbs & watering',
    fruit: 'Fruit Day — Best for fruiting crops, harvesting & seeds',
    flower: 'Flower Day — Best for flowers, brassicas & weeding',
  };

  const phaseAdvice: Record<string, string> = {
    waxing: 'Waxing moon — energy rising. Good for planting above-ground crops.',
    waning: 'Waning moon — energy descending. Good for root work, pruning & composting.',
  };

  const advice = `${elementLabels[element]}. ${phaseAdvice[isWaxing ? 'waxing' : 'waning']}`;

  return {
    phase,
    phaseEmoji: PHASE_EMOJIS[phase],
    illumination,
    zodiac,
    element,
    dayAge: Math.floor(age),
    advice,
    isWaxing,
  };
}

/**
 * Get a daily companion planting tip based on moon element
 */
export function getDailyCompanionTip(element: BiodynamicElement): string {
  const tips: Record<BiodynamicElement, string[]> = {
    root: [
      '🥕🧅 Plant carrots near leeks — they confuse each other\'s flies (Margaret Roberts)',
      '🧄🍅 Garlic near tomatoes acts as natural pest repellent',
      '🥔🫘 Potatoes and beans are great companions — beans fix nitrogen',
    ],
    leaf: [
      '🌿🍅 Plant basil near tomatoes — repels flies & boosts flavor (Margaret Roberts)',
      '🌱 Mint deters cabbage moth — plant in pots to prevent spreading',
      '🥬🍓 Spinach and strawberries make excellent companions',
    ],
    fruit: [
      '🍅🌿 Tomatoes + basil = classic companion pair for pest control & taste',
      '🌶️🥕 Peppers thrive near carrots and onions',
      '🥒🫘 Cucumbers love beans — they fix nitrogen for heavy feeders',
    ],
    flower: [
      '🌼 Marigolds protect the whole garden — deters nematodes & whitefly',
      '🌸 Nasturtiums are trap crops for aphids — sacrificial protectors',
      '🥦 Flower day is ideal for broccoli, cauliflower & ornamentals',
    ],
  };
  
  const dayTips = tips[element];
  // Use day of year for consistent daily tip
  const now = new Date();
  const dayOfYear = Math.floor((now.getTime() - new Date(now.getFullYear(), 0, 0).getTime()) / (1000 * 60 * 60 * 24));
  return dayTips[dayOfYear % dayTips.length];
}

/**
 * Get zodiac emoji
 */
export function getZodiacEmoji(zodiac: ZodiacSign): string {
  return ZODIAC_EMOJIS[zodiac];
}

/**
 * Get pH advice for a specific crop on a Root day
 */
export function getRootDayPhAdvice(cropName: string, phMin: number, phMax: number, userPh?: number): string {
  if (userPh !== undefined) {
    if (userPh < phMin) {
      return `⚗️ Your soil pH ${userPh} is low for ${cropName} (needs ${phMin}–${phMax}). Add lime to raise pH!`;
    }
    if (userPh > phMax) {
      return `⚗️ Your soil pH ${userPh} is high for ${cropName} (needs ${phMin}–${phMax}). Add sulfur or compost to lower!`;
    }
    return `✅ Your soil pH ${userPh} is ideal for ${cropName} (${phMin}–${phMax})`;
  }
  return `⚗️ Check soil pH for ${cropName} — aim for ${phMin}–${phMax}`;
}
