/**
 * Remnants Wheel Calendar API Endpoint
 * 
 * Returns current server timestamp and sacred calendar data for Remnants Wheel Calendar component.
 * Provides server-side computed calendar data to ensure consistency across clients.
 */

import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CalendarData {
  timestamp: string;
  year: number;
  dayOfYear: number;
  month: number;
  dayOfMonth: number;
  weekDay: number;
  isSabbath: boolean;
  isHighSabbath: boolean;
  isFeast: boolean;
  feastName?: string;
  isIntercalary: boolean;
  isDayOutOfTime: boolean;
  isTequfah: boolean;
  partOfDay: 'Day' | 'Evening' | 'Night' | 'Morning';
  unix: number;
  timezone: string;
}

// Month structure: [days, startsOnWeekDay]
const MONTHS = [
  { days: 30, startsOn: 1 },
  { days: 30, startsOn: 6 },
  { days: 31, startsOn: 3 },
  { days: 30, startsOn: 4 },
  { days: 30, startsOn: 6 },
  { days: 31, startsOn: 1 },
  { days: 30, startsOn: 4 },
  { days: 30, startsOn: 6 },
  { days: 31, startsOn: 2 },
  { days: 30, startsOn: 1 },
  { days: 30, startsOn: 6 },
  { days: 31, startsOn: 1 },
];

// Feast days by month and day
const FEAST_DAYS: Record<number, Record<number, { name: string; isHighSabbath: boolean }>> = {
  1: {
    1: { name: 'New Year', isHighSabbath: false },
    15: { name: 'Unleavened Bread (1st day)', isHighSabbath: false },
    21: { name: 'Unleavened Bread (last day)', isHighSabbath: false },
  },
  2: { 1: { name: 'New Month Feast', isHighSabbath: false } },
  3: {
    1: { name: 'New Month Feast', isHighSabbath: false },
    15: { name: 'Shavuot (1st Feast of Weeks)', isHighSabbath: false },
  },
  4: { 1: { name: 'New Month Feast', isHighSabbath: false } },
  5: {
    1: { name: 'New Month Feast', isHighSabbath: false },
    3: { name: 'Feast of New Wine', isHighSabbath: false },
  },
  6: {
    1: { name: 'New Month Feast', isHighSabbath: false },
    22: { name: 'Feast of New Oil', isHighSabbath: false },
  },
  7: {
    1: { name: 'Yom Teruah', isHighSabbath: false },
    10: { name: 'Yom Kippur', isHighSabbath: true },
    15: { name: 'Sukkot (1st day)', isHighSabbath: false },
    22: { name: 'Shemini Atzeret (Simchat Torah)', isHighSabbath: false },
  },
  8: { 1: { name: 'New Month Feast', isHighSabbath: false } },
  9: { 1: { name: 'New Month Feast', isHighSabbath: false } },
  10: { 1: { name: 'New Month Feast', isHighSabbath: false } },
  11: { 1: { name: 'New Month Feast', isHighSabbath: false } },
  12: { 1: { name: 'New Month Feast', isHighSabbath: false } },
};

// Intercalary days (31st days of months 3, 6, 10, 12)
const INTERCALARY_DAYS = [
  { month: 3, day: 31 },
  { month: 6, day: 31 },
  { month: 10, day: 31 },
  { month: 12, day: 31 },
];

function calculateSacredCalendar(date: Date): CalendarData {
  // Base date: Year 6028, Day 1 starts on a specific date
  // Adjust this to your actual calendar start date
  const baseDate = new Date('2025-01-01T00:00:00Z');
  const daysSinceBase = Math.floor((date.getTime() - baseDate.getTime()) / (1000 * 60 * 60 * 24));
  
  const year = 6028;
  const dayOfYear = ((daysSinceBase % 364) + 364) % 364 + 1;
  
  // Calculate month and day of month
  let remainingDays = dayOfYear;
  let month = 1;
  let dayOfMonth = 1;
  
  for (let i = 0; i < MONTHS.length; i++) {
    if (remainingDays <= MONTHS[i].days) {
      month = i + 1;
      dayOfMonth = remainingDays;
      break;
    }
    remainingDays -= MONTHS[i].days;
  }
  
  // Calculate week day (1-7, where 7 is Sabbath)
  const weekDay = ((dayOfYear - 1) % 7) + 1;
  const isSabbath = weekDay === 7;
  
  // Check for feast days
  const feast = FEAST_DAYS[month]?.[dayOfMonth];
  const isFeast = !!feast;
  const isHighSabbath = isSabbath || (feast?.isHighSabbath ?? false);
  const feastName = feast?.name;
  
  // Check for intercalary days
  const isIntercalary = INTERCALARY_DAYS.some(d => d.month === month && d.day === dayOfMonth);
  
  // Days out of time (typically 5 days between year end and new year)
  const isDayOutOfTime = dayOfYear > 364;
  
  // Tequfah (equinox - straight shadow day)
  const isTequfah = month === 7 && (dayOfMonth === 2 || dayOfMonth === 3);
  
  // Determine part of day based on hour
  const hour = date.getUTCHours();
  let partOfDay: 'Day' | 'Evening' | 'Night' | 'Morning';
  if (hour >= 6 && hour < 12) {
    partOfDay = 'Morning';
  } else if (hour >= 12 && hour < 18) {
    partOfDay = 'Day';
  } else if (hour >= 18 && hour < 24) {
    partOfDay = 'Evening';
  } else {
    partOfDay = 'Night';
  }
  
  return {
    timestamp: date.toISOString(),
    year,
    dayOfYear,
    month,
    dayOfMonth,
    weekDay,
    isSabbath,
    isHighSabbath,
    isFeast,
    feastName,
    isIntercalary,
    isDayOutOfTime,
    isTequfah,
    partOfDay,
    unix: date.getTime(),
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  };
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Public endpoint - no authentication required
  try {
    const now = new Date();
    const calendarData = calculateSacredCalendar(now);

    return new Response(JSON.stringify(calendarData), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in remnants-wheel-calendar function:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : String(error) }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

