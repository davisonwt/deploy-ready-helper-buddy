/**
 * Calendar Now API Endpoint
 * 
 * Returns current server timestamp and calendar data for CalendarWheel component.
 * This ensures server-side computed angles match client-side rendering for SEO.
 */

import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Public endpoint - works with or without authorization header
  // NOTE: You must disable "Verify JWT" in Supabase Dashboard Settings
  // for this function to work without authentication
  try {
    const now = new Date();
    
    // Calculate calendar data using sacred calendar epoch
    // Epoch: Tequvah (Vernal Equinox) March 20, 2025 = Year 6028, Month 1, Day 1
    // This matches the logic in customCalendar.ts getCreatorDate()
    const CREATOR_EPOCH = new Date('2025-03-20T00:00:00Z');
    const msDiff = now.getTime() - CREATOR_EPOCH.getTime();
    const totalDays = Math.floor(msDiff / (24 * 60 * 60 * 1000));
    
    // Calculate year and day of year
    // Note: Year calculation uses 365 days per year (matching customCalendar.ts)
    // but the sacred calendar has 364 days total per year
    let year = 6028;
    let remainingDays = totalDays;
    
    // Calculate year (using 365 days per year for the loop, matching customCalendar.ts)
    const isLongYear = (y: number) => false; // Year 6028 is not a long year
    while (remainingDays >= (365 + (isLongYear(year) ? 1 : 0))) {
      remainingDays -= 365 + (isLongYear(year) ? 1 : 0);
      year++;
    }
    
    // Day of year is 1-based (Day 1 = first day of the year)
    // For Nov 28, 2025: March 20 to Nov 28 = 253 days, so dayOfYear = 254
    const dayOfYear = remainingDays + 1;
    
    // Ensure timestamp is accurate
    const timestamp = now.toISOString();
    const unixMs = now.getTime();
    
    const response = {
      timestamp,
      year,
      dayOfYear,
      unix: unixMs,
      unixSeconds: Math.floor(unixMs / 1000),
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
    };

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in calendar-now function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

