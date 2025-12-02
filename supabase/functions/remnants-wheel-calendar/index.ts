import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function calculateCreatorDate(date = new Date()) {
  const localYear = date.getFullYear();
  const localMonth = date.getMonth();
  const localDate = date.getDate();
  const localHour = date.getHours();
  const localMinute = date.getMinutes();

  const currentTimeMinutes = localHour * 60 + localMinute;
  const sunriseTimeMinutes = 5 * 60 + 13;

  let effectiveYear = localYear;
  let effectiveMonth = localMonth;
  let effectiveDate = localDate;

  if (currentTimeMinutes < sunriseTimeMinutes) {
    const prevDayDate = new Date(localYear, localMonth, localDate);
    prevDayDate.setDate(prevDayDate.getDate() - 1);
    effectiveYear = prevDayDate.getFullYear();
    effectiveMonth = prevDayDate.getMonth();
    effectiveDate = prevDayDate.getDate();
  }

  const epochYear = 2025;
  const epochMonth = 2;
  const epochDate = 20;

  let totalDays = 0;
  let currentYear = epochYear;
  let currentMonth = epochMonth;
  let currentDate = epochDate;

  const gregorianDaysPerMonth = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  const isLeapYear = (year) => (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);

  while (
    currentYear < effectiveYear ||
    (currentYear === effectiveYear && currentMonth < effectiveMonth) ||
    (currentYear === effectiveYear && currentMonth === effectiveMonth && currentDate < effectiveDate)
  ) {
    totalDays++;
    currentDate++;

    let daysInCurrentMonth = gregorianDaysPerMonth[currentMonth];
    if (currentMonth === 1 && isLeapYear(currentYear)) {
      daysInCurrentMonth = 29;
    }

    if (currentDate > daysInCurrentMonth) {
      currentDate = 1;
      currentMonth++;
      if (currentMonth > 11) {
        currentMonth = 0;
        currentYear++;
      }
    }
  }

  const daysPerMonth = [30, 30, 31, 30, 30, 31, 30, 30, 31, 30, 30, 31];
  let year = 6028;
  let remainingDays = totalDays;

  while (remainingDays >= 365) {
    remainingDays -= 365;
    year++;
  }

  let month = 1;
  let day = remainingDays + 1;

  while (day > daysPerMonth[month - 1]) {
    day -= daysPerMonth[month - 1];
    month++;
    if (month > 12) {
      month = 1;
      year++;
    }
  }

  const monthDays = [30, 30, 31, 30, 30, 31, 30, 30, 31, 30, 30, 31];
  let dayOfYear = 0;
  for (let i = 0; i < month - 1; i++) {
    dayOfYear += monthDays[i];
  }
  dayOfYear += day;

  const STARTING_WEEKDAY_YEAR_6028 = 4;
  const weekDay = ((dayOfYear - 1 + STARTING_WEEKDAY_YEAR_6028 - 1) % 7) + 1;

  return {
    year,
    month,
    day,
    weekDay,
    dayOfYear,
  };
}

function getCreatorTime(date = new Date()) {
  const sunriseMinutes = 320; // 5:20 AM local
  const nowMinutes = date.getHours() * 60 + date.getMinutes() + date.getSeconds() / 60;

  let elapsed = nowMinutes - sunriseMinutes;
  if (elapsed < 0) elapsed += 1440;

  const part = Math.floor(elapsed / 80) + 1;
  const minute = Math.floor(elapsed % 80) + 1;

  const ordinal = (n) => {
    if (n >= 11 && n <= 13) return 'th';
    const last = n % 10;
    return last === 1 ? 'st' : last === 2 ? 'nd' : last === 3 ? 'rd' : 'th';
  };

  const displayText = `${part}${ordinal(part)} part ${minute}${ordinal(minute)} min`;

  return { part, minute, displayText };
}

function getWheelAngles(dayOfYear, progress) {
  const totalDays = dayOfYear - 1 + progress;

  return {
    sunRot: -(totalDays / 366) * 360,
    leaderRot: -Math.floor((dayOfYear - 1) / 91) * 90,
    civilRot: -(totalDays / 364) * 360,
    weekRot: -(totalDays * (360 / 7)),
    lunarRot: -(((dayOfYear - 1 + progress) % 354) / 354) * 360,
    partRot: -(progress * 360),
  };
}

function buildDisplayLines(date, time, progress) {
  const lines = [
    `Year ${date.year} • Month ${date.month} • Day ${date.day}`,
    `Weekday ${date.weekDay} • Part ${time.part}/18`,
    `Day ${date.dayOfYear} of 364 • ${progress > 1 ? 'Overflow' : 'Regular Day'}`,
  ];

  return lines;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const now = new Date();
    const creatorDate = calculateCreatorDate(now);
    const creatorTime = getCreatorTime(now);
    const progress = ((creatorTime.part - 1) * 80 + (creatorTime.minute - 1)) / 1440;
    const wheel = getWheelAngles(creatorDate.dayOfYear, progress);

    const response = {
      timestamp: now.toISOString(),
      calendar: creatorDate,
      time: creatorTime,
      wheel,
      displayLines: buildDisplayLines(creatorDate, creatorTime, progress),
    };

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error('Remnants-Wheel-Calendar function error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal Server Error', details: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
