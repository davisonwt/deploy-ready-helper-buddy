/**
 * Sacred Calendar System - Complete Implementation
 * 
 * 364-day Creator year + Days Out of Time
 * Man's count vs Creator's count
 * Feast days, Sabbaths, Intercalary days
 */

export interface DayInfo {
  creatorDay: number; // Creator's day count (1-364)
  manDay: number; // Man's day count (1-364)
  month: number; // Month (1-12)
  dayOfMonth: number; // Day within month
  weekDay: number; // Day of week (1-7, where 7 is Sabbath)
  isSabbath: boolean;
  isHighSabbath: boolean;
  isFeast: boolean;
  feastName?: string;
  isIntercalary: boolean;
  isDayOutOfTime: boolean;
  isTequfah: boolean; // Straight shadow day
  partOfDay: 'Day' | 'Evening' | 'Night' | 'Morning'; // Current part of day
}

// Month structure: [days, startsOnWeekDay]
// Pattern: 30/30/31/30/30/31/30/30/31/30/30/31 = 364 days total
const MONTHS = [
  { days: 30, startsOn: 1 }, // Month 1 - starts on day 1 of week
  { days: 30, startsOn: 6 }, // Month 2 - starts on day 6 of week
  { days: 31, startsOn: 3 }, // Month 3 - starts on day 3 of week
  { days: 30, startsOn: 4 }, // Month 4 - starts on day 4 of week
  { days: 30, startsOn: 6 }, // Month 5 - starts on day 6 of week
  { days: 31, startsOn: 1 }, // Month 6 - starts on day 1 of week
  { days: 30, startsOn: 4 }, // Month 7 - starts on day 4 of week
  { days: 30, startsOn: 6 }, // Month 8 - starts on day 6 of week
  { days: 31, startsOn: 2 }, // Month 9 - starts on day 2 of week
  { days: 30, startsOn: 1 }, // Month 10 - starts on day 1 of week
  { days: 30, startsOn: 6 }, // Month 11 - starts on day 6 of week
  { days: 31, startsOn: 1 }, // Month 12 - starts on day 1 of week
];

// Feast days by month and day
const FEAST_DAYS: Record<number, Record<number, { name: string; isHighSabbath: boolean }>> = {
  1: {
    1: { name: 'New Year', isHighSabbath: false },
    14: { name: 'Pesach (Passover)', isHighSabbath: true },
    15: { name: 'Unleavened Bread (Day 1)', isHighSabbath: true },
    16: { name: 'Unleavened Bread (Day 2)', isHighSabbath: false },
    17: { name: 'Unleavened Bread (Day 3)', isHighSabbath: false },
    18: { name: 'Unleavened Bread (Day 4)', isHighSabbath: false },
    19: { name: 'Unleavened Bread (Day 5)', isHighSabbath: false },
    20: { name: 'Unleavened Bread (Day 6)', isHighSabbath: false },
    21: { name: 'Unleavened Bread (Day 7)', isHighSabbath: true },
    26: { name: "First Fruits (Wave Sheaf) · Omer Day 1 → Shavu\u2019ot", isHighSabbath: false },
  },
  2: {
    1: { name: 'New Month Feast', isHighSabbath: false },
    14: { name: 'Pesach Sheni (Second Passover)', isHighSabbath: false },
    15: { name: 'Second Unleavened Bread (Day 1)', isHighSabbath: false },
    16: { name: 'Second Unleavened Bread (Day 2)', isHighSabbath: false },
    17: { name: 'Second Unleavened Bread (Day 3)', isHighSabbath: false },
    18: { name: 'Second Unleavened Bread (Day 4)', isHighSabbath: false },
    19: { name: 'Second Unleavened Bread (Day 5)', isHighSabbath: false },
    20: { name: 'Second Unleavened Bread (Day 6)', isHighSabbath: false },
    21: { name: 'Second Unleavened Bread (Day 7)', isHighSabbath: false },
  },
  3: {
    1: { name: 'New Month Feast', isHighSabbath: false },
    15: { name: "Shavu\u2019ot (Feast of Weeks) · Omer Day 1 → New Wine", isHighSabbath: true },
  },
  4: {
    1: { name: 'New Month Feast', isHighSabbath: false },
  },
  5: {
    1: { name: 'New Month Feast', isHighSabbath: false },
    3: { name: 'Feast of New Wine · Omer Day 1 → New Oil', isHighSabbath: true },
  },
  6: {
    1: { name: 'New Month Feast', isHighSabbath: false },
    22: { name: 'Feast of New Oil', isHighSabbath: true },
  },
  7: {
    1: { name: 'Yom Teruah (Day of Trumpets)', isHighSabbath: true },
    10: { name: 'Yom Kippur (Day of Atonement)', isHighSabbath: true },
    15: { name: 'Sukkot (Day 1)', isHighSabbath: true },
    22: { name: 'Shemini Atzeret (Simchat Torah)', isHighSabbath: true },
  },
  8: {
    1: { name: 'New Month Feast', isHighSabbath: false },
  },
  9: {
    1: { name: 'New Month Feast', isHighSabbath: false },
  },
  10: {
    1: { name: 'New Month Feast', isHighSabbath: false },
  },
  11: {
    1: { name: 'New Month Feast', isHighSabbath: false },
  },
  12: {
    1: { name: 'New Month Feast', isHighSabbath: false },
  },
};

/**
 * Omer Counts — three sequential 50-day counts:
 *  • Count A: starts M1 D26 (First Fruits) → M3 D15 (Shavu'ot)
 *  • Count B: starts M3 D15 (Shavu'ot)     → M5 D3  (Feast of New Wine)
 *  • Count C: starts M5 D3  (New Wine)     → M6 D22 (Feast of New Oil)
 *
 * Each count covers 50 inclusive days. Returns the active count for a given
 * scriptural (month, dayOfMonth) or null if none applies.
 */
const MONTH_DAY_COUNT = [30, 30, 31, 30, 30, 31, 30, 30, 31, 30, 30, 31];

function absoluteDayOfYear(month: number, day: number): number {
  let total = 0;
  for (let i = 0; i < month - 1; i++) total += MONTH_DAY_COUNT[i];
  return total + day;
}

export interface OmerCountInfo {
  count: 'A' | 'B' | 'C';
  label: string;        // e.g. "Omer 12/50 → Shavu'ot"
  dayNumber: number;    // 1..50
  goal: string;         // target feast name
}

export function getOmerCount(month: number, dayOfMonth: number): OmerCountInfo | null {
  const today = absoluteDayOfYear(month, dayOfMonth);
  const ranges: { count: 'A' | 'B' | 'C'; start: number; goal: string }[] = [
    { count: 'A', start: absoluteDayOfYear(1, 26), goal: "Shavu\u2019ot" },
    { count: 'B', start: absoluteDayOfYear(3, 15), goal: 'Feast of New Wine' },
    { count: 'C', start: absoluteDayOfYear(5, 3),  goal: 'Feast of New Oil' },
  ];
  for (const r of ranges) {
    const diff = today - r.start + 1;
    if (diff >= 1 && diff <= 50) {
      return { count: r.count, dayNumber: diff, goal: r.goal, label: `Omer ${diff}/50 → ${r.goal}` };
    }
  }
  return null;
}

// Intercalary days (31st days of months 3, 6, 10, 12)
const INTERCALARY_DAYS = [
  { month: 3, day: 31 },
  { month: 6, day: 31 },
  { month: 10, day: 31 },
  { month: 12, day: 31 },
];

// Tequfah days (equinox - straight shadow)
// Month 7, day 2 or 3 (determines days out of time)
const TEQUFAH_MONTH = 7;
const TEQUFAH_DAYS = [2, 3];

/**
 * Calculate day information for a given Creator day (1-364)
 */
export function getDayInfo(creatorDay: number, tequfahDay: number = 2): DayInfo {
  let remainingDays = creatorDay;
  let month = 1;
  let dayOfMonth = 1;
  let weekDay = 1; // Creator's day 1 is always week day 1
  let manDay = 1;

  // Calculate month and day based on Creator's day count
  let accumulatedDays = 0;
  for (let m = 0; m < MONTHS.length; m++) {
    const monthInfo = MONTHS[m];
    if (creatorDay <= accumulatedDays + monthInfo.days) {
      month = m + 1;
      dayOfMonth = creatorDay - accumulatedDays;
      break;
    }
    accumulatedDays += monthInfo.days;
  }

  // Calculate week day (Creator's count)
  // Year starts on weekday 4 (Tequfah day), so we need to offset
  // If creatorDay 1 = weekday 4, then creatorDay 12 should be weekday 5
  // Offset: (creatorDay - 1 + 3) % 7 + 1 to account for starting on weekday 4
  weekDay = ((creatorDay - 1 + 3) % 7) + 1;

  // Calculate Man's day count
  // Man's count starts on Creator's day 4 (Tequfah day)
  if (creatorDay >= 4) {
    manDay = creatorDay - 3;
  } else {
    // Days before Tequfah are part of previous year's count
    manDay = 364 + (creatorDay - 3);
  }

  // Check if it's a Sabbath (every 7th day of Creator's count)
  const isSabbath = weekDay === 7;

  // Check if it's a feast day
  const feast = FEAST_DAYS[month]?.[dayOfMonth];
  const isFeast = !!feast;
  const isHighSabbath = feast?.isHighSabbath || false;

  // Check if it's an intercalary day
  const isIntercalary = INTERCALARY_DAYS.some(d => d.month === month && d.day === dayOfMonth);

  // Check if it's Tequfah day
  const isTequfah = month === TEQUFAH_MONTH && TEQUFAH_DAYS.includes(dayOfMonth);

  // Days out of time come after Creator's day 364 (52nd Sabbath)
  const isDayOutOfTime = false; // Will be calculated separately

  return {
    creatorDay,
    manDay,
    month,
    dayOfMonth,
    weekDay,
    isSabbath,
    isHighSabbath,
    isFeast,
    feastName: feast?.name,
    isIntercalary,
    isDayOutOfTime,
    isTequfah,
    partOfDay: 'Day', // Will be calculated based on time of day
  };
}

/**
 * Get all days of the year (364 Creator days + days out of time)
 */
export function getAllDays(tequfahDay: number = 2): DayInfo[] {
  const days: DayInfo[] = [];
  const daysOutOfTime = tequfahDay === 2 ? 1 : 2;

  // Creator's 364 days
  for (let i = 1; i <= 364; i++) {
    days.push(getDayInfo(i, tequfahDay));
  }

  // Days out of time (after 52nd Sabbath)
  for (let i = 1; i <= daysOutOfTime; i++) {
    days.push({
      creatorDay: 364 + i,
      manDay: 362 + i, // Man continues counting
      month: 12,
      dayOfMonth: 28 + i,
      weekDay: ((364 + i - 1) % 7) + 1,
      isSabbath: false,
      isHighSabbath: false,
      isFeast: false,
      isIntercalary: i === daysOutOfTime, // Last day out of time is intercalary
      isDayOutOfTime: true,
      isTequfah: false,
      partOfDay: 'Day',
    });
  }

  return days;
}

/**
 * Calculate current part of day based on sunrise/sunset
 */
export function getPartOfDay(date: Date, lat: number, lon: number): 'Day' | 'Evening' | 'Night' | 'Morning' {
  // This will use SunCalc to determine current part
  // For now, return placeholder
  return 'Day';
}

