/**
 * Calendar Now API Endpoint
 * 
 * Returns current server timestamp and calendar data for the bead calendar widget.
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

  // Public endpoint - no authentication required
  // Accept requests with or without authorization header
  try {
    const now = new Date();
    
    // Calculate calendar data
    // Simplified calculation - in production, use actual calendar utilities
    // Base year: 6028 (sacred calendar year)
    // Day 1 of Year 6028 starts on a specific date
    const baseDate = new Date('2025-01-01T00:00:00Z'); // Adjust to actual start date
    const daysSinceBase = Math.floor((now.getTime() - baseDate.getTime()) / (1000 * 60 * 60 * 24));
    const year = 6028;
    const dayOfYear = (daysSinceBase % 364) + 1; // 364-day year
    
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

