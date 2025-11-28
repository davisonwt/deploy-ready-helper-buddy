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
    const CREATOR_EPOCH = new Date('2025-03-20T00:00:00Z');
    const msDiff = now.getTime() - CREATOR_EPOCH.getTime();
    const totalDays = Math.floor(msDiff / (24 * 60 * 60 * 1000));
    
    // Calculate year and day of year (364-day sacred year)
    let year = 6028;
    let remainingDays = totalDays;
    
    // Calculate year (each year is 364 days, except leap years)
    while (remainingDays >= 364) {
      remainingDays -= 364;
      year++;
    }
    
    const dayOfYear = remainingDays + 1; // Day 1-based
    
    const response = {
      timestamp: now.toISOString(),
      year,
      dayOfYear,
      unix: now.getTime(),
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

