import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface ModerationRequest {
  content_type: 'message' | 'media' | 'room' | 'orchard' | 'forum_post';
  content_id: string;
  user_id: string;
  text_content?: string;
  media_url?: string;
  metadata?: Record<string, unknown>;
}

interface Violation {
  type: 'profanity' | 'explicit' | 'gambling' | 'manipulation';
  severity: 'low' | 'medium' | 'high' | 'critical';
  detected_terms: string[];
  confidence: number;
}

interface ModerationResponse {
  is_clean: boolean;
  violations: Violation[];
  action_taken: 'none' | 'flagged' | 'hidden' | 'blocked';
  flag_id?: string;
}

// Text matching with word boundaries
function findMatches(text: string, wordList: string[]): string[] {
  const lowerText = text.toLowerCase();
  const matches: string[] = [];
  
  for (const word of wordList) {
    const lowerWord = word.toLowerCase();
    // Check for whole word or phrase match
    if (lowerWord.includes(' ')) {
      // Phrase matching
      if (lowerText.includes(lowerWord)) {
        matches.push(word);
      }
    } else {
      // Word boundary matching
      const regex = new RegExp(`\\b${lowerWord}\\b`, 'gi');
      if (regex.test(text)) {
        matches.push(word);
      }
    }
  }
  
  return matches;
}

// Determine severity based on violations
function determineSeverity(violations: Violation[]): 'low' | 'medium' | 'high' | 'critical' {
  const severities = violations.map(v => v.severity);
  if (severities.includes('critical')) return 'critical';
  if (severities.includes('high')) return 'high';
  if (severities.includes('medium')) return 'medium';
  return 'low';
}

// Determine action based on severity
function determineAction(severity: string): 'none' | 'flagged' | 'hidden' | 'blocked' {
  switch (severity) {
    case 'critical': return 'blocked';
    case 'high': return 'blocked';
    case 'medium': return 'hidden';
    default: return 'flagged';
  }
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const request: ModerationRequest = await req.json();
    console.log('Moderation request:', JSON.stringify(request, null, 2));

    if (!request.content_type || !request.content_id || !request.user_id) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: content_type, content_id, user_id' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch word lists from database
    const { data: wordLists, error: wordListError } = await supabase
      .from('moderation_word_lists')
      .select('*')
      .eq('is_active', true);

    if (wordListError) {
      console.error('Error fetching word lists:', wordListError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch moderation word lists' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const violations: Violation[] = [];

    // Text content moderation
    if (request.text_content) {
      for (const list of wordLists || []) {
        const matches = findMatches(request.text_content, list.words || []);
        if (matches.length > 0) {
          violations.push({
            type: list.category as Violation['type'],
            severity: list.severity as Violation['severity'],
            detected_terms: matches,
            confidence: 1.0 // Word list matches are 100% confident
          });
        }
      }
    }

    // Media content moderation using AI (if media_url provided and Lovable AI key exists)
    if (request.media_url && lovableApiKey) {
      try {
        console.log('Analyzing media with AI:', request.media_url);
        
        const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${lovableApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'google/gemini-3-flash-preview',
            messages: [
              {
                role: 'system',
                content: `You are a content moderation AI. Analyze the provided image/media URL and detect any violations of community standards. 
                
Categories to check:
- profanity: Text containing foul language, slurs, or vulgar expressions
- explicit: Nudity, pornography, sexual content, or explicit imagery
- gambling: References to betting, casinos, lottery, or gambling
- manipulation: Scam patterns, aggressive sales tactics, or manipulative content

Respond in JSON format:
{
  "violations": [
    {
      "type": "profanity|explicit|gambling|manipulation",
      "severity": "low|medium|high|critical",
      "detected_terms": ["term1", "term2"],
      "confidence": 0.0-1.0
    }
  ]
}

If no violations are found, return: {"violations": []}
Only return the JSON, no other text.`
              },
              {
                role: 'user',
                content: [
                  {
                    type: 'text',
                    text: 'Analyze this image for content moderation violations:'
                  },
                  {
                    type: 'image_url',
                    image_url: { url: request.media_url }
                  }
                ]
              }
            ],
            max_tokens: 500
          })
        });

        if (aiResponse.ok) {
          const aiData = await aiResponse.json();
          const aiContent = aiData.choices?.[0]?.message?.content;
          
          if (aiContent) {
            try {
              const aiResult = JSON.parse(aiContent);
              if (aiResult.violations && Array.isArray(aiResult.violations)) {
                violations.push(...aiResult.violations);
              }
            } catch (parseError) {
              console.error('Failed to parse AI response:', parseError);
            }
          }
        } else {
          console.error('AI moderation request failed:', await aiResponse.text());
        }
      } catch (aiError) {
        console.error('Error during AI moderation:', aiError);
        // Continue without AI moderation if it fails
      }
    }

    // Build response
    const response: ModerationResponse = {
      is_clean: violations.length === 0,
      violations,
      action_taken: 'none'
    };

    // If violations found, create flag in database
    if (violations.length > 0) {
      const overallSeverity = determineSeverity(violations);
      const action = determineAction(overallSeverity);
      response.action_taken = action;

      // Get all detected terms across all violations
      const allTerms = violations.flatMap(v => v.detected_terms);
      const primaryViolation = violations[0];
      const avgConfidence = violations.reduce((sum, v) => sum + v.confidence, 0) / violations.length;

      // Insert content flag
      const { data: flagData, error: flagError } = await supabase
        .from('content_flags')
        .insert({
          content_type: request.content_type,
          content_id: request.content_id,
          user_id: request.user_id,
          violation_type: primaryViolation.type,
          severity: overallSeverity,
          detected_terms: allTerms,
          auto_action_taken: action,
          ai_confidence: avgConfidence,
          status: 'pending'
        })
        .select('id')
        .single();

      if (flagError) {
        console.error('Error creating content flag:', flagError);
      } else if (flagData) {
        response.flag_id = flagData.id;
        console.log('Content flag created:', flagData.id);
        
        // Alert is automatically created via trigger
      }
    }

    console.log('Moderation response:', JSON.stringify(response, null, 2));

    return new Response(
      JSON.stringify(response),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Moderation error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
