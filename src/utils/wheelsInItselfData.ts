/**
 * Wheels in Itself Calendar Data
 * Complete data structure for the 8-wheel sacred calendar system
 */

// 4 SEASONAL LEADERS (91 days each)
export const SEASONAL_LEADERS = [
  {
    name: "Malki'el",
    creature: "Lion",
    ezekielVision: "Lion of Ezeki'el's vision",
    representative: "Mosheh & A'aron",
    months: [1, 2, 3],
    daysRule: 91,
    startDay: 1,
    endDay: 91,
    color: "hsl(38, 92%, 50%)" // Amber/Gold
  },
  {
    name: "Hemel-Melek",
    creature: "Man",
    ezekielVision: "Man of Ezeki'el's vision",
    representative: "Kohath",
    months: [4, 5, 6],
    daysRule: 91,
    startDay: 92,
    endDay: 182,
    color: "hsl(142, 71%, 45%)" // Green
  },
  {
    name: "Mel'eyal",
    creature: "Ox",
    ezekielVision: "Ox of Ezeki'el's vision",
    representative: "Gershon",
    months: [7, 8, 9],
    daysRule: 91,
    startDay: 183,
    endDay: 273,
    color: "hsl(0, 84%, 60%)" // Red
  },
  {
    name: "Nar'el",
    creature: "Eagle",
    ezekielVision: "Eagle of Ezeki'el's vision",
    representative: "Merari",
    months: [10, 11, 12],
    daysRule: 91,
    startDay: 274,
    endDay: 364,
    color: "hsl(217, 91%, 60%)" // Blue
  }
];

// 12 MONTHLY LEADERS with tribal representatives
export const MONTHLY_LEADERS = [
  { month: 1, name: "Adnar'el", tribe: "Yehudah", seasonIndex: 0 },
  { month: 2, name: "Yahsu-sa'el", tribe: "Yissachar", seasonIndex: 0 },
  { month: 3, name: "Olam'el", tribe: "Zevulun", seasonIndex: 0 },
  { month: 4, name: "Barak'el", tribe: "Re'uven", seasonIndex: 1 },
  { month: 5, name: "Zelebsa'el", tribe: "Shimon", seasonIndex: 1 },
  { month: 6, name: "Hilah-Yahseph", tribe: "Gad", seasonIndex: 1 },
  { month: 7, name: "Adnar'el", tribe: "Efrayim", seasonIndex: 2 },
  { month: 8, name: "Yahsusa'el", tribe: "Menasheh", seasonIndex: 2 },
  { month: 9, name: "Elomi'el", tribe: "Binyamin", seasonIndex: 2 },
  { month: 10, name: "Barka'el", tribe: "Dan", seasonIndex: 3 },
  { month: 11, name: "Gida'yi'el", tribe: "Asher", seasonIndex: 3 },
  { month: 12, name: "Ki'el", tribe: "Naftali", seasonIndex: 3 }
];

// Leader of Days Out of Time
export const INFINITY_LEADER = {
  name: "Asfa'el",
  role: "Leader of the Days Out of Time (Infinity)"
};

// Color constants
export const COLORS = {
  SABBATH: 'hsl(45, 93%, 47%)',      // Yellow
  FEAST: 'hsl(217, 91%, 60%)',        // Blue
  INTERCALARY: 'hsl(330, 81%, 60%)',  // Pink
  DAY_OUT_OF_TIME: 'hsl(263, 70%, 50%)', // Royal Purple
  NORMAL: 'hsl(220, 9%, 46%)',        // Default gray
  MOON_354: 'hsl(292, 84%, 61%)',     // Magenta for moon day 354
  CURRENT_HIGHLIGHT: 'hsl(45, 100%, 60%)', // Bright gold for current
  OUTER_TEXT: 'hsl(220, 20%, 70%)'    // Light gray for outer text
};

// Month pattern: 30/30/31 repeating (364 total)
export const MONTH_DAYS = [30, 30, 31, 30, 30, 31, 30, 30, 31, 30, 30, 31];

// 4 Parts of Day
export const PARTS_OF_DAY = ['Day', 'Evening', 'Night', 'Morning'];

// 18 Parts of Day (numbered 1-18)
export const EIGHTEEN_PARTS = Array.from({ length: 18 }, (_, i) => i + 1);

// Feast days by month and day
export const FEAST_DAYS: Record<number, Record<number, { name: string; type: 'sabbath' | 'feast' | 'intercalary' | 'normal' }>> = {
  1: {
    1: { name: 'New Year', type: 'feast' },
    7: { name: 'Sabbath', type: 'sabbath' },
    14: { name: 'Sabbath', type: 'sabbath' },
    15: { name: 'Unleavened Bread', type: 'feast' },
    21: { name: 'Last Day UB / Sabbath', type: 'sabbath' },
    28: { name: 'Sabbath', type: 'sabbath' },
  },
  2: {
    1: { name: 'New Month', type: 'feast' },
    5: { name: 'Sabbath', type: 'sabbath' },
    12: { name: 'Sabbath', type: 'sabbath' },
    19: { name: 'Sabbath', type: 'sabbath' },
    26: { name: 'Sabbath', type: 'sabbath' },
  },
  3: {
    1: { name: 'New Month', type: 'feast' },
    4: { name: 'Sabbath', type: 'sabbath' },
    11: { name: 'Sabbath', type: 'sabbath' },
    15: { name: 'Shavuot', type: 'feast' },
    18: { name: 'Sabbath', type: 'sabbath' },
    25: { name: 'Sabbath', type: 'sabbath' },
    31: { name: 'Intercalary', type: 'intercalary' },
  },
  4: {
    1: { name: 'New Month', type: 'feast' },
    3: { name: 'Sabbath', type: 'sabbath' },
    10: { name: 'Sabbath', type: 'sabbath' },
    17: { name: 'Sabbath', type: 'sabbath' },
    24: { name: 'Sabbath', type: 'sabbath' },
  },
  5: {
    1: { name: 'New Month / Sabbath', type: 'sabbath' },
    3: { name: 'New Wine', type: 'feast' },
    8: { name: 'Sabbath', type: 'sabbath' },
    15: { name: 'Sabbath', type: 'sabbath' },
    22: { name: 'Sabbath', type: 'sabbath' },
    29: { name: 'Sabbath', type: 'sabbath' },
  },
  6: {
    1: { name: 'New Month', type: 'feast' },
    6: { name: 'Sabbath', type: 'sabbath' },
    13: { name: 'Sabbath', type: 'sabbath' },
    20: { name: 'Sabbath', type: 'sabbath' },
    22: { name: 'New Oil', type: 'feast' },
    27: { name: 'Sabbath', type: 'sabbath' },
    31: { name: 'Intercalary', type: 'intercalary' },
  },
  7: {
    1: { name: 'Yom Teruah', type: 'feast' },
    4: { name: 'Sabbath', type: 'sabbath' },
    10: { name: 'Yom Kippur', type: 'feast' },
    11: { name: 'Sabbath', type: 'sabbath' },
    15: { name: 'Sukkot', type: 'feast' },
    18: { name: 'Sabbath', type: 'sabbath' },
    22: { name: 'Shemini Atzeret', type: 'feast' },
    25: { name: 'Sabbath', type: 'sabbath' },
  },
  8: {
    1: { name: 'New Month', type: 'feast' },
    2: { name: 'Sabbath', type: 'sabbath' },
    9: { name: 'Sabbath', type: 'sabbath' },
    16: { name: 'Sabbath', type: 'sabbath' },
    23: { name: 'Sabbath', type: 'sabbath' },
    30: { name: 'Sabbath', type: 'sabbath' },
  },
  9: {
    1: { name: 'New Month / Sabbath', type: 'sabbath' },
    8: { name: 'Sabbath', type: 'sabbath' },
    15: { name: 'Sabbath', type: 'sabbath' },
    22: { name: 'Sabbath', type: 'sabbath' },
    29: { name: 'Sabbath', type: 'sabbath' },
    31: { name: 'Intercalary', type: 'intercalary' },
  },
  10: {
    1: { name: 'New Month', type: 'feast' },
    6: { name: 'Sabbath', type: 'sabbath' },
    13: { name: 'Sabbath', type: 'sabbath' },
    20: { name: 'Sabbath', type: 'sabbath' },
    27: { name: 'Sabbath', type: 'sabbath' },
  },
  11: {
    1: { name: 'New Month', type: 'feast' },
    4: { name: 'Sabbath', type: 'sabbath' },
    11: { name: 'Sabbath', type: 'sabbath' },
    18: { name: 'Sabbath', type: 'sabbath' },
    25: { name: 'Sabbath', type: 'sabbath' },
  },
  12: {
    1: { name: 'New Month', type: 'feast' },
    2: { name: 'Sabbath', type: 'sabbath' },
    9: { name: 'Sabbath', type: 'sabbath' },
    16: { name: 'Sabbath', type: 'sabbath' },
    23: { name: 'Sabbath', type: 'sabbath' },
    30: { name: '52nd Sabbath', type: 'sabbath' },
    31: { name: 'Intercalary', type: 'intercalary' },
  },
};

// Helper function to get day type
export function getDayType(month: number, day: number): 'sabbath' | 'feast' | 'intercalary' | 'dayOutOfTime' | 'normal' {
  const feast = FEAST_DAYS[month]?.[day];
  if (feast) return feast.type;
  return 'normal';
}

// Helper function to get day color
export function getDayColor(type: 'sabbath' | 'feast' | 'intercalary' | 'dayOutOfTime' | 'normal'): string {
  switch (type) {
    case 'sabbath': return COLORS.SABBATH;
    case 'feast': return COLORS.FEAST;
    case 'intercalary': return COLORS.INTERCALARY;
    case 'dayOutOfTime': return COLORS.DAY_OUT_OF_TIME;
    default: return COLORS.NORMAL;
  }
}

// Helper function to get feast name
export function getFeastName(month: number, day: number): string | null {
  return FEAST_DAYS[month]?.[day]?.name || null;
}

// Helper function to calculate day of year from month and day
export function getDayOfYear(month: number, day: number): number {
  let dayOfYear = 0;
  for (let m = 1; m < month; m++) {
    dayOfYear += MONTH_DAYS[m - 1];
  }
  return dayOfYear + day;
}

// Helper function to get month and day from day of year
export function getMonthAndDay(dayOfYear: number): { month: number; day: number } {
  let remaining = dayOfYear;
  let month = 1;
  
  for (let m = 0; m < MONTH_DAYS.length; m++) {
    if (remaining <= MONTH_DAYS[m]) {
      return { month: m + 1, day: remaining };
    }
    remaining -= MONTH_DAYS[m];
    month++;
  }
  
  return { month: 12, day: MONTH_DAYS[11] };
}

// Helper function to get weekday name
export function getWeekdayName(dayOfWeek: number): string {
  if (dayOfWeek === 7) return 'Sabbath';
  return `Day ${dayOfWeek}`;
}

// Helper to calculate man's count (1,2,3,4 then 1,2,3...360)
export function getMansCount(dayOfYear: number): number {
  // First 4 days are 1,2,3,4
  if (dayOfYear <= 4) return dayOfYear;
  // After that, restart from 1 and count to 360
  return dayOfYear - 4;
}

// Calculate current season (1-4) from day of year
export function getCurrentSeason(dayOfYear: number): number {
  if (dayOfYear <= 91) return 1;
  if (dayOfYear <= 182) return 2;
  if (dayOfYear <= 273) return 3;
  return 4;
}

// Calculate current week (1-52) from day of year
export function getCurrentWeek(dayOfYear: number): number {
  return Math.ceil(dayOfYear / 7);
}

// Calculate lunar day (1-354) - moon is ~10.875 days behind per year
export function getLunarDay(solarDayOfYear: number, year: number): number {
  // Approximate calculation: lunar year is 354 days vs 364 solar
  // This creates a 10-day lag per year
  const yearsElapsed = year - 6028; // Base year
  const lagDays = (yearsElapsed * 10.875) % 354;
  let lunarDay = solarDayOfYear - Math.floor(lagDays);
  if (lunarDay <= 0) lunarDay += 354;
  if (lunarDay > 354) lunarDay = ((lunarDay - 1) % 354) + 1;
  return lunarDay;
}

// Calculate 18-part of day based on time
export function get18PartOfDay(hours: number, minutes: number): number {
  // Each part is 80 minutes (1440 minutes / 18 = 80)
  const totalMinutes = hours * 60 + minutes;
  return Math.floor(totalMinutes / 80) + 1;
}

// Calculate 4-part of day based on time (equal 90-degree segments for now)
export function get4PartOfDay(hours: number, minutes: number): number {
  // Approximate: Day (6-12), Evening (12-18), Night (18-24), Morning (0-6)
  if (hours >= 6 && hours < 12) return 1; // Day
  if (hours >= 12 && hours < 18) return 2; // Evening
  if (hours >= 18 && hours < 24) return 3; // Night
  return 4; // Morning (0-6)
}

/**
 * Calculate variable 4-part day angles based on sunrise/sunset times
 * Day and night lengths vary with seasons
 * @param sunriseHour - Hour of sunrise (e.g., 6.5 for 6:30 AM)
 * @param sunsetHour - Hour of sunset (e.g., 18.5 for 6:30 PM)
 * @param solarNoonHour - Hour of solar noon (e.g., 12.5)
 * @returns Object with angle sizes for each part of day in degrees
 */
export function calculate4PartAngles(
  sunriseHour: number = 6,
  sunsetHour: number = 18,
  solarNoonHour: number = 12
): { day: number; evening: number; night: number; morning: number; startAngles: { day: number; evening: number; night: number; morning: number } } {
  // Calculate durations in hours
  const dayLength = solarNoonHour - sunriseHour;       // Sunrise to noon
  const eveningLength = sunsetHour - solarNoonHour;   // Noon to sunset
  const nightLength = 24 - sunsetHour;                 // Sunset to midnight
  const morningLength = sunriseHour;                   // Midnight to sunrise
  
  const total = dayLength + eveningLength + nightLength + morningLength; // Should = 24
  
  // Convert to angles (360 degrees total)
  const dayAngle = (dayLength / total) * 360;
  const eveningAngle = (eveningLength / total) * 360;
  const nightAngle = (nightLength / total) * 360;
  const morningAngle = (morningLength / total) * 360;
  
  // Calculate start angles (starting from top = midnight)
  // Order: Morning (midnight to sunrise), Day (sunrise to noon), Evening (noon to sunset), Night (sunset to midnight)
  return {
    day: dayAngle,
    evening: eveningAngle,
    night: nightAngle,
    morning: morningAngle,
    startAngles: {
      morning: 0,                                    // Starts at midnight (top)
      day: morningAngle,                             // Starts at sunrise
      evening: morningAngle + dayAngle,              // Starts at noon
      night: morningAngle + dayAngle + eveningAngle, // Starts at sunset
    }
  };
}

/**
 * Get approximate sunrise/sunset hours based on day of year and season
 * Uses simplified calculation - can be enhanced with actual location data
 */
export function getSeasonalSunTimes(dayOfYear: number): { sunrise: number; sunset: number; solarNoon: number } {
  // Approximate seasonal variation
  // Day 1 = Spring equinox-ish, Day 91 = Summer solstice-ish, etc.
  
  // Summer solstice around day 91 (longest day)
  // Winter solstice around day 273 (shortest day)
  
  const baseLength = 12; // Hours of daylight at equinox
  const variation = 3;   // Max hours variation from equinox
  
  // Calculate position in year (0 = winter solstice equivalent)
  // Shift so day 91 = summer solstice (longest day)
  const angle = ((dayOfYear - 91 + 364) % 364) / 364 * 2 * Math.PI;
  const daylightHours = baseLength + variation * Math.cos(angle);
  
  const halfDaylight = daylightHours / 2;
  const solarNoon = 12; // Keep solar noon at 12 for simplicity
  
  return {
    sunrise: solarNoon - halfDaylight,
    sunset: solarNoon + halfDaylight,
    solarNoon: solarNoon
  };
}
