/**
 * 🕊️ Sabbath & Feast Day Detection for Garden Guide
 * 
 * Determines if a given YHWH calendar day is a rest day
 * (weekly Sabbath or festival Sabbath) where no garden work should be done.
 */

export interface RestDayInfo {
  isRestDay: boolean;
  type: 'sabbath' | 'feast' | null;
  name: string | null;
  message: string;
}

/**
 * Check if a YHWH calendar day is a weekly Sabbath (every 7th day)
 */
export function isWeeklySabbath(weekDay: number): boolean {
  return weekDay === 7;
}

/**
 * Get feast day info for a given month and day in YHWH calendar
 */
export function getFeastInfo(month: number, day: number): { name: string; isRestDay: boolean } | null {
  // Month 1 feasts
  if (month === 1) {
    if (day === 14) return { name: 'Pesach Preparation', isRestDay: false };
    if (day === 15) return { name: 'Feast of Unleavened Bread (Day 1)', isRestDay: true };
    if (day === 21) return { name: 'Feast of Unleavened Bread (Day 7)', isRestDay: true };
    if (day >= 16 && day <= 20) return { name: 'Feast of Unleavened Bread', isRestDay: false };
  }
  // Month 2 feasts
  if (month === 2) {
    if (day === 1) return { name: 'New Month', isRestDay: false };
    if (day === 14) return { name: 'Second Pesach', isRestDay: false };
    if (day === 15) return { name: 'Unleavened Bread (Day 1)', isRestDay: true };
    if (day === 21) return { name: 'Unleavened Bread (Day 7)', isRestDay: true };
    if (day >= 16 && day <= 20) return { name: 'Unleavened Bread', isRestDay: false };
  }
  // Month 3 feasts
  if (month === 3) {
    if (day === 15) return { name: 'Shavuot', isRestDay: true };
  }
  // Month 5 feasts
  if (month === 5) {
    if (day === 3) return { name: 'Feast of New Wine', isRestDay: true };
  }
  // Month 6 feasts
  if (month === 6) {
    if (day === 22) return { name: 'Feast of New Oil', isRestDay: true };
  }
  // Month 7 feasts
  if (month === 7) {
    if (day === 1) return { name: 'Yowm Teruah (Day of Trumpets)', isRestDay: true };
    if (day === 10) return { name: 'Yowm Kippur (Day of Atonement)', isRestDay: true };
    if (day === 15) return { name: 'Sukkot (Day 1)', isRestDay: true };
    if (day === 22) return { name: 'Shemini Atzeret', isRestDay: true };
    if (day >= 16 && day <= 21) return { name: 'Sukkot', isRestDay: false };
  }
  return null;
}

/**
 * Get complete rest day info for garden guide
 */
export function getRestDayInfo(weekDay: number, month: number, day: number): RestDayInfo {
  const feast = getFeastInfo(month, day);
  const isSabbath = isWeeklySabbath(weekDay);

  if (isSabbath && feast?.isRestDay) {
    return {
      isRestDay: true,
      type: 'feast',
      name: `Shabbat & ${feast.name}`,
      message: `🕊️ Today is Shabbat and ${feast.name} — a holy rest day. Let both you and your garden rest. No planting, harvesting, or soil work. Enjoy the Creator's provision and reflect on His goodness.`,
    };
  }

  if (isSabbath) {
    return {
      isRestDay: true,
      type: 'sabbath',
      name: 'Shabbat',
      message: '🕊️ Today is Shabbat — a day of rest for you and your garden. No planting, harvesting, or garden work. Take time to rest, reflect, and enjoy the beauty of creation.',
    };
  }

  if (feast?.isRestDay) {
    return {
      isRestDay: true,
      type: 'feast',
      name: feast.name,
      message: `🕊️ Today is ${feast.name} — a festival rest day. Let your garden rest too. No work to be done. Celebrate and give thanks for the harvest and the Creator's provision.`,
    };
  }

  return {
    isRestDay: false,
    type: null,
    name: null,
    message: '',
  };
}
