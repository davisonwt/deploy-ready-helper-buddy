import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { memberName, offering, personalStory, myGoal, communityBenefit, tone } = await req.json();
    
    console.log('Generating community offering for:', memberName);

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    // Construct the specialized prompt
    const systemPrompt = `You are the "Heart of Sow2Grow" - an AI that understands our community is built on mutual support, not transactions. You help members share their stories and needs in a way that inspires genuine bestowing.

CORE PRINCIPLES:
- We "bestow" rather than "buy" - it's an act of community support
- Every offering has a story behind it
- We celebrate both the giver and receiver
- Larger "orchards" represent collective dreams, not just products

Write in warm, authentic, community-focused language. Avoid commercial marketing jargon.`;

    const userPrompt = `<CONTEXT>
Member's Name: ${memberName}
What I'm Offering: ${offering}
The Story Behind This: ${personalStory}
What This Helps Me Achieve: ${myGoal}
Community Benefit: ${communityBenefit}
Tone: ${tone}
</CONTEXT>

<YOUR_TASK>
Generate a "Community Offering Pack" with these elements:

1. "community_description": A 2-3 paragraph heartfelt description focusing on the story and mutual benefit
2. "invitation_to_bestow": An array with 3 different ways to phrase the ask that feel like invitations to participate
3. "community_hashtags": An array of 10-15 relevant hashtags mixing practical and inspirational (#CommunityBestowing #MutualSupport #GrowingTogether)
4. "acknowledgment_templates": An array with 2 ways to thank bestowers that strengthen community bonds
5. "story_prompts": An array with 3 questions to help the member share more of their journey
6. "orchard_vision": If applicable, describe how this offering moves the community toward larger collective goals

Return the response as a valid JSON object with these exact keys.
</YOUR_TASK>`;

    console.log('Calling Lovable AI Gateway...');

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.8,
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI Gateway error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again in a moment.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'AI credits exhausted. Please add credits to your workspace.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      throw new Error(`AI Gateway error: ${response.status} ${errorText}`);
    }

    const data = await response.json();
    console.log('AI Gateway response received');

    const generatedText = data.choices[0].message.content;
    
    // Try to parse the response as JSON
    let offering_pack;
    try {
      // Remove markdown code blocks if present
      const cleanedText = generatedText.replace(/```json\n?|\n?```/g, '').trim();
      offering_pack = JSON.parse(cleanedText);
    } catch (parseError) {
      console.error('Failed to parse AI response as JSON:', parseError);
      // Return a structured error with the raw text
      offering_pack = {
        error: 'Failed to parse response',
        raw_response: generatedText
      };
    }

    return new Response(
      JSON.stringify({ offering_pack }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in generate-community-offering function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
