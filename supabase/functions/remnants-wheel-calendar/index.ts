const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const calculateCreatorDate = (inputDate) => {
  const date = inputDate || new Date();
  const localYear = date.getFullYear();
  const localMonth = date.getMonth();
  const localDate = date.getDate();
  const localHour = date.getHours();
  const localMinute = date.getMinutes();

  const currentTimeMinutes = localHour * 60 + localMinute;
  const sunriseTimeMinutes = 5 * 60 + 13;

  let effectiveYear = localYear;
  let effectiveMonth = localMonth;
  let effectiveDay = localDate;

  if (currentTimeMinutes < sunriseTimeMinutes) {
    const prev = new Date(localYear, localMonth, localDate);
    prev.setDate(prev.getDate() - 1);
    effectiveYear = prev.getFullYear();
    effectiveMonth = prev.getMonth();
    effectiveDay = prev.getDate();
  }

  const epoch = { year: 2025, month: 2, day: 20 };
  const gregorianDays = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  const isLeapYear = (year) => (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);

  let totalDays = 0;
  let current = { ...epoch };

  while (
    current.year < effectiveYear ||
    (current.year === effectiveYear && current.month < effectiveMonth) ||
    (current.year === effectiveYear && current.month === effectiveMonth && current.day < effectiveDay)
  ) {
    totalDays += 1;
    current.day += 1;

    let daysInCurrentMonth = gregorianDays[current.month];
    if (current.month === 1 && isLeapYear(current.year)) {
      daysInCurrentMonth = 29;
    }

    if (current.day > daysInCurrentMonth) {
      current.day = 1;
      current.month += 1;
      if (current.month > 11) {
        current.month = 0;
        current.year += 1;
      }
    }
  }

  const sacredMonthLengths = [30, 30, 31, 30, 30, 31, 30, 30, 31, 30, 30, 31];
  let year = 6028;
  let remainingDays = totalDays;

  while (remainingDays >= 365) {
    remainingDays -= 365;
    year += 1;
  }

  let month = 1;
  let day = remainingDays + 1;

  while (day > sacredMonthLengths[month - 1]) {
    day -= sacredMonthLengths[month - 1];
    month += 1;
    if (month > 12) {
      month = 1;
      year += 1;
    }
  }

  let dayOfYear = 0;
  for (let i = 0; i < month - 1; i += 1) {
    dayOfYear += sacredMonthLengths[i];
  }
  dayOfYear += day;

  const STARTING_WEEKDAY = 4;
  const weekDay = ((dayOfYear - 1 + STARTING_WEEKDAY - 1) % 7) + 1;

  return { year, month, day, weekDay, dayOfYear };
};

const getCreatorTime = (inputDate) => {
  const date = inputDate || new Date();
  const sunriseMinutes = 320;
  const nowMinutes = date.getHours() * 60 + date.getMinutes() + date.getSeconds() / 60;

  let elapsed = nowMinutes - sunriseMinutes;
  if (elapsed < 0) elapsed += 1440;

  const part = Math.floor(elapsed / 80) + 1;
  const minute = Math.floor(elapsed % 80) + 1;

  const ordinal = (n) => {
    if (n >= 11 && n <= 13) return 'th';
    const last = n % 10;
    if (last === 1) return 'st';
    if (last === 2) return 'nd';
    if (last === 3) return 'rd';
    return 'th';
  };

  const displayText = `${part}${ordinal(part)} part ${minute}${ordinal(minute)} min`;

  return { part, minute, displayText };
};

const getWheelAngles = (dayOfYear, progress) => {
  const totalDays = dayOfYear - 1 + progress;
  return {
    sunRot: -(totalDays / 366) * 360,
    leaderRot: -Math.floor((dayOfYear - 1) / 91) * 90,
    civilRot: -(totalDays / 364) * 360,
    weekRot: -(totalDays * (360 / 7)),
    lunarRot: -(((dayOfYear - 1 + progress) % 354) / 354) * 360,
    partRot: -(progress * 360),
  };
};

const buildDisplayLines = (date, time, progress) => [
  `Year ${date.year} • Month ${date.month} • Day ${date.day}`,
  `Weekday ${date.weekDay} • Part ${time.part}/18`,
  `Day ${date.dayOfYear} of 364 • ${progress > 1 ? 'Overflow' : 'Regular Day'}`,
];

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
